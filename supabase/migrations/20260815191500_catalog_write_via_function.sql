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
-- A saída é uma função `security definer`: ela tem o privilégio que o papel
-- `authenticated` perde aqui, e só sabe fazer uma coisa — gravar um título a
-- partir dos campos normalizados. Não aceita SQL, tabela nem coluna arbitrária.

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
    -- Duração é o único campo que não se deixa apagar por omissão. Quem chega
    -- pela busca não conhece a duração, e sobrescrever com NULL apagaria o que
    -- o detalhe já tinha gravado. Correção do TMDB (148 -> 150) continua valendo,
    -- porque valor presente sempre ganha.
    runtime_minutes = coalesce(excluded.runtime_minutes, t.runtime_minutes)
  returning * into saved;

  return saved;
end;
$$;

comment on function public.upsert_title is
  'Grava a cópia mínima de um título do TMDB. Único caminho de escrita de catálogo para o app.';

-- Catálogo é cache de dado público, mas escrever exige sessão: sem isto, um
-- visitante anônimo poderia encher a tabela.
revoke execute on function public.upsert_title from public, anon;
grant execute on function public.upsert_title to authenticated;
