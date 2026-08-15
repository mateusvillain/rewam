-- Verificação das políticas de RLS com duas contas.
--
-- Roda em transação e faz rollback: nada persiste. Executar com o stack local no ar:
--   pnpm db:test:rls
--
-- As asserções (expect_count, expect_failure, act_as) e o BEGIN vêm de _helpers.sql,
-- concatenado por run.sh.
--
-- Cada bloco assume a identidade de uma conta via claims de JWT, exatamente como
-- o PostgREST faz, e confere que ninguém enxerga ou altera dados alheios.

-- Massa de teste criada como superusuário, antes de assumir qualquer identidade.
-- Os perfis não são inseridos aqui: o trigger de cadastro os cria a partir do
-- metadado, e é justamente o comportamento real que queremos exercitar.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', '{"name": "Pessoa A"}'::jsonb),
       ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', '{"name": "Pessoa B"}'::jsonb);

insert into public.titles (id, tmdb_id, media_type, title, runtime_minutes)
values ('aaaaaaaa-0000-0000-0000-000000000001', 27205, 'movie', 'A Origem', 148);

insert into public.watch_events (id, user_id, title_id, duration_minutes)
values ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 148),
       ('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', 148);

-- ---------------------------------------------------------------------------
-- Pessoa A
-- ---------------------------------------------------------------------------
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select pg_temp.expect_count('A enxerga apenas o próprio perfil',
  'select count(*) from public.profiles', 1);

select pg_temp.expect_count('A enxerga apenas as próprias exibições',
  'select count(*) from public.watch_events', 1);

select pg_temp.expect_count('A não enxerga a exibição de B',
  $$select count(*) from public.watch_events where id = 'dddddddd-0000-0000-0000-000000000002'$$, 0);

select pg_temp.expect_count('A lê o catálogo',
  'select count(*) from public.titles', 1);

-- Sem linha visível, o UPDATE/DELETE alheio não falha: afeta zero linhas.
update public.watch_events set duration_minutes = 1
where id = 'dddddddd-0000-0000-0000-000000000002';
select pg_temp.expect_count('update em exibição de B não altera nada',
  $$select count(*) from public.watch_events where id = 'dddddddd-0000-0000-0000-000000000002' and duration_minutes = 1$$, 0);

delete from public.watch_events where id = 'dddddddd-0000-0000-0000-000000000002';

update public.profiles set name = 'Invadido'
where id = '22222222-2222-2222-2222-222222222222';

-- Gravar em nome de outra conta é barrado pelo WITH CHECK.
select pg_temp.expect_failure('A cria exibição em nome de B',
  $$insert into public.watch_events (user_id, title_id, duration_minutes)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', 100)$$);

select pg_temp.expect_failure('A move a própria exibição para B',
  $$update public.watch_events set user_id = '22222222-2222-2222-2222-222222222222'
    where id = 'dddddddd-0000-0000-0000-000000000001'$$);

select pg_temp.expect_failure('A cria perfil alheio',
  $$insert into public.profiles (id, name) values ('22222222-2222-2222-2222-222222222222', 'Falso')$$);

select pg_temp.expect_failure('A apaga catálogo',
  $$delete from public.titles where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$);

-- Perfil some junto com a conta, pela cascata de auth.users; o cliente não apaga.
select pg_temp.expect_failure('A apaga o próprio perfil',
  $$delete from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$);

-- Sem user_id explícito, o default auth.uid() preenche a coluna.
insert into public.watch_events (title_id, duration_minutes)
values ('aaaaaaaa-0000-0000-0000-000000000001', 148);
select pg_temp.expect_count('exibição criada sem user_id pertence a A',
  $$select count(*) from public.watch_events where user_id = '11111111-1111-1111-1111-111111111111'$$, 2);

-- ---------------------------------------------------------------------------
-- Pessoa B
-- ---------------------------------------------------------------------------
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select pg_temp.expect_count('exibição de B sobreviveu ao delete tentado por A',
  $$select count(*) from public.watch_events where id = 'dddddddd-0000-0000-0000-000000000002'$$, 1);

select pg_temp.expect_count('perfil de B manteve o nome original',
  $$select count(*) from public.profiles where id = '22222222-2222-2222-2222-222222222222' and name = 'Pessoa B'$$, 1);

select pg_temp.expect_count('B enxerga apenas a própria exibição',
  'select count(*) from public.watch_events', 1);

-- ---------------------------------------------------------------------------
-- Sem sessão
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

-- Sem GRANT, o papel anônimo sequer alcança as políticas: o banco recusa antes.
select pg_temp.expect_failure('anônimo lê exibições',
  'select count(*) from public.watch_events');

select pg_temp.expect_failure('anônimo lê perfis',
  'select count(*) from public.profiles');

select pg_temp.expect_failure('anônimo lê catálogo',
  'select count(*) from public.titles');

reset role;
rollback;
