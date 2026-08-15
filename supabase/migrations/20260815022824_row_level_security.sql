-- Row Level Security de todas as tabelas.
--
-- O app e o MCP falam direto com o PostgREST, então a autorização precisa viver
-- aqui: nenhuma política confia em `user_id` vindo do cliente, apenas em auth.uid().
--
-- Catálogo (titles, seasons, episodes) é dado público do TMDB, não pessoal.
-- No MVP o próprio app grava esse cache ao selecionar um título, então a escrita
-- fica liberada a usuários autenticados — o pior caso é poluir o cache, e as
-- constraints UNIQUE já impedem duplicatas. Exclusão de catálogo não tem política:
-- ninguém apaga catálogo pelo cliente. Quando houver Edge Function de TMDB, basta
-- trocar estas políticas de escrita por `to service_role`.

-- ---------------------------------------------------------------------------
-- Privilégios de tabela
-- ---------------------------------------------------------------------------
--
-- RLS filtra linhas, mas só depois de o papel ter privilégio sobre a tabela.
-- `authenticated` recebe o necessário e as políticas abaixo decidem o resto;
-- `anon` não recebe nada, então visitante sem sessão nem chega às políticas.

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update on public.titles to authenticated;
grant select, insert, update on public.seasons to authenticated;
grant select, insert, update on public.episodes to authenticated;
grant select, insert, update, delete on public.watch_events to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "Perfil próprio é legível pelo dono"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Perfil próprio é editável pelo dono"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- O insert fica a cargo do trigger de cadastro (security definer); o dono ainda
-- pode inserir o próprio perfil caso o registro não exista por algum motivo.
create policy "Perfil próprio pode ser criado pelo dono"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Perfil próprio pode ser removido pelo dono"
  on public.profiles for delete
  to authenticated
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Catálogo: titles, seasons, episodes
-- ---------------------------------------------------------------------------

alter table public.titles enable row level security;
alter table public.seasons enable row level security;
alter table public.episodes enable row level security;

create policy "Catálogo é legível por quem está autenticado"
  on public.titles for select to authenticated using (true);

create policy "Catálogo pode ser criado por quem está autenticado"
  on public.titles for insert to authenticated with check (true);

create policy "Catálogo pode ser atualizado por quem está autenticado"
  on public.titles for update to authenticated using (true) with check (true);

create policy "Temporadas são legíveis por quem está autenticado"
  on public.seasons for select to authenticated using (true);

create policy "Temporadas podem ser criadas por quem está autenticado"
  on public.seasons for insert to authenticated with check (true);

create policy "Temporadas podem ser atualizadas por quem está autenticado"
  on public.seasons for update to authenticated using (true) with check (true);

create policy "Episódios são legíveis por quem está autenticado"
  on public.episodes for select to authenticated using (true);

create policy "Episódios podem ser criados por quem está autenticado"
  on public.episodes for insert to authenticated with check (true);

create policy "Episódios podem ser atualizados por quem está autenticado"
  on public.episodes for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- watch_events
-- ---------------------------------------------------------------------------

alter table public.watch_events enable row level security;

create policy "Exibições próprias são legíveis pelo dono"
  on public.watch_events for select
  to authenticated
  using (user_id = (select auth.uid()));

-- O WITH CHECK recusa qualquer tentativa de gravar evento em nome de outra conta,
-- mesmo que o cliente informe user_id explicitamente.
create policy "Exibições próprias podem ser criadas pelo dono"
  on public.watch_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Exibições próprias podem ser editadas pelo dono"
  on public.watch_events for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Exibições próprias podem ser removidas pelo dono"
  on public.watch_events for delete
  to authenticated
  using (user_id = (select auth.uid()));
