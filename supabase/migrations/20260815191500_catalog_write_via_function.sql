-- Escrita de catálogo por função com privilégio próprio (E3.7).
--
-- Levantado no code review da E1.3. O briefing pede que a escrita de catálogo
-- venha de backend confiável, mas o MVP não tem Edge Function e é o próprio app
-- que preenche o cache ao selecionar um título — então as políticas liberaram
-- `insert` e `update` a `authenticated`.
--
-- O `insert` aberto era aceitável: catálogo é dado público do TMDB e as
-- constraints UNIQUE impedem duplicata. O `update` aberto não: qualquer conta
-- podia reescrever `titles.runtime_minutes`, que alimenta as estatísticas de
-- **todas** as contas. Uma pessoa mal-intencionada mudaria a duração de um
-- filme popular e distorceria o total de quem nunca ouviu falar dela.
--
-- ---------------------------------------------------------------------------
-- Até onde isto protege, e até onde não
-- ---------------------------------------------------------------------------
--
-- Sem backend confiável, não há como saber se a duração que chega é a que o
-- TMDB informou. O que dá para garantir é que ela seja escrita **uma vez**:
-- quem observa primeiro grava, e nenhuma chamada posterior reescreve. Um
-- `coalesce(excluded, atual)` — a forma intuitiva — não serviria, porque valor
-- presente sempre ganharia e o ataque seria idêntico ao do `update` aberto, só
-- que por RPC.
--
-- Risco que permanece: envenenar um título **antes** de qualquer pessoa
-- selecioná-lo. É bem menor que reescrever catálogo existente — não atinge o
-- que já está certo, e some quando a escrita de catálogo passar a vir de uma
-- Edge Function com `service_role`.
--
-- Os demais campos (título, pôster, data) continuam sobrescritíveis: são
-- apresentação, não entram em conta nenhuma, e mantê-los atualizáveis é o que
-- permite ao TMDB corrigir um nome errado.

-- ---------------------------------------------------------------------------
-- Fecha a escrita direta
-- ---------------------------------------------------------------------------

drop policy "Catálogo pode ser criado por quem está autenticado" on public.titles;
drop policy "Catálogo pode ser atualizado por quem está autenticado" on public.titles;
drop policy "Temporadas podem ser criadas por quem está autenticado" on public.seasons;
drop policy "Temporadas podem ser atualizadas por quem está autenticado" on public.seasons;
drop policy "Episódios podem ser criados por quem está autenticado" on public.episodes;
drop policy "Episódios podem ser atualizados por quem está autenticado" on public.episodes;

-- Remover a política não basta: sem revogar o privilégio de tabela, uma política
-- nova criada por engano voltaria a abrir a escrita. As duas camadas caem juntas.
revoke insert, update on public.titles from authenticated;
revoke insert, update on public.seasons from authenticated;
revoke insert, update on public.episodes from authenticated;

-- ---------------------------------------------------------------------------
-- Upsert de título
-- ---------------------------------------------------------------------------

create function public.upsert_title(
  p_tmdb_id integer,
  p_media_type public.media_type,
  p_title text,
  p_original_title text default null,
  p_poster_path text default null,
  p_release_date date default null,
  p_runtime_minutes integer default null
)
returns public.titles
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.titles;
begin
  if auth.uid() is null then
    raise exception 'Só uma sessão autenticada pode gravar catálogo.'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(btrim(p_title), '') = '' then
    raise exception 'Título de catálogo não pode ser vazio.'
      using errcode = 'check_violation';
  end if;

  insert into public.titles as t (
    tmdb_id, media_type, title, original_title, poster_path, release_date, runtime_minutes
  )
  values (
    p_tmdb_id, p_media_type, btrim(p_title), p_original_title, p_poster_path,
    p_release_date, p_runtime_minutes
  )
  on conflict (tmdb_id, media_type) do update set
    title = excluded.title,
    original_title = excluded.original_title,
    poster_path = excluded.poster_path,
    release_date = excluded.release_date,
    -- Duração só é gravada enquanto não houver uma. O valor atual vem primeiro
    -- no coalesce de propósito: invertê-lo deixaria qualquer conta rebaixar a
    -- duração de um título alheio, que é exatamente o risco que esta migração
    -- existe para fechar.
    runtime_minutes = coalesce(t.runtime_minutes, excluded.runtime_minutes)
  returning * into saved;

  return saved;
end;
$$;

comment on function public.upsert_title is
  'Grava a cópia mínima de um título do TMDB. Único caminho de escrita de catálogo para o app. Duração é imutável depois da primeira gravação.';

-- ---------------------------------------------------------------------------
-- Upsert de temporada
-- ---------------------------------------------------------------------------

create function public.upsert_season(
  p_title_id uuid,
  p_tmdb_season_number integer,
  p_name text default null,
  p_episode_count integer default null,
  p_poster_path text default null
)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.seasons;
begin
  if auth.uid() is null then
    raise exception 'Só uma sessão autenticada pode gravar catálogo.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.seasons as s (title_id, tmdb_season_number, name, episode_count, poster_path)
  values (p_title_id, p_tmdb_season_number, p_name, p_episode_count, p_poster_path)
  on conflict (title_id, tmdb_season_number) do update set
    name = excluded.name,
    -- `episode_count` não entra em cálculo de tempo assistido, mas orienta a
    -- listagem: preservá-lo evita que uma chamada sem o dado esvazie a lista.
    episode_count = coalesce(excluded.episode_count, s.episode_count),
    poster_path = excluded.poster_path
  returning * into saved;

  return saved;
end;
$$;

comment on function public.upsert_season is
  'Grava uma temporada do TMDB. Único caminho de escrita de temporada para o app.';

-- ---------------------------------------------------------------------------
-- Upsert de episódio
-- ---------------------------------------------------------------------------

create function public.upsert_episode(
  p_title_id uuid,
  p_season_number integer,
  p_episode_number integer,
  p_tmdb_episode_id integer default null,
  p_name text default null,
  p_runtime_minutes integer default null,
  p_air_date date default null
)
returns public.episodes
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.episodes;
begin
  if auth.uid() is null then
    raise exception 'Só uma sessão autenticada pode gravar catálogo.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.episodes as e (
    title_id, season_id, season_number, episode_number, tmdb_episode_id, name,
    runtime_minutes, air_date
  )
  values (
    p_title_id,
    -- A temporada correspondente, quando já gravada. Fica nulo se ainda não
    -- existir: a coluna é `on delete set null` e o episódio não depende dela
    -- para ser identificado.
    (select s.id from public.seasons s
      where s.title_id = p_title_id and s.tmdb_season_number = p_season_number),
    p_season_number, p_episode_number, p_tmdb_episode_id, p_name,
    p_runtime_minutes, p_air_date
  )
  on conflict (title_id, season_number, episode_number) do update set
    season_id = coalesce(excluded.season_id, e.season_id),
    tmdb_episode_id = coalesce(excluded.tmdb_episode_id, e.tmdb_episode_id),
    name = excluded.name,
    -- Mesma regra da duração de título, pelo mesmo motivo: duração de episódio
    -- alimenta o tempo assistido de séries.
    runtime_minutes = coalesce(e.runtime_minutes, excluded.runtime_minutes),
    air_date = excluded.air_date
  returning * into saved;

  return saved;
end;
$$;

comment on function public.upsert_episode is
  'Grava um episódio do TMDB. Único caminho de escrita de episódio para o app. Duração é imutável depois da primeira gravação.';

-- ---------------------------------------------------------------------------
-- Privilégio de execução
-- ---------------------------------------------------------------------------
--
-- Catálogo é cache de dado público, mas escrever exige sessão: sem isto, um
-- visitante anônimo poderia encher as tabelas.

revoke execute on function public.upsert_title from public, anon;
revoke execute on function public.upsert_season from public, anon;
revoke execute on function public.upsert_episode from public, anon;

grant execute on function public.upsert_title to authenticated;
grant execute on function public.upsert_season to authenticated;
grant execute on function public.upsert_episode to authenticated;
