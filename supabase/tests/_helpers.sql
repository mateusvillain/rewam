-- Asserções compartilhadas pelas verificações de banco.
-- Concatenado antes de cada suíte por supabase/tests/run.sh; não rodar sozinho.

begin;

create or replace function pg_temp.expect_count(label text, stmt text, expected bigint)
returns void language plpgsql as $$
declare
  found_count bigint;
begin
  execute stmt into found_count;
  if found_count <> expected then
    raise exception 'FALHOU: % retornou % linhas, esperado %', label, found_count, expected;
  end if;
  raise notice 'ok (% linha(s)) — %', found_count, label;
end;
$$;

-- Só aceita a recusa que interessa: falta de privilégio (inclui violação de
-- política de RLS) ou violação de constraint. Qualquer outro erro — um typo no
-- SQL, por exemplo — propaga e derruba a verificação em vez de passar por verde.
create or replace function pg_temp.expect_failure(label text, stmt text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
    raise exception 'FALHOU: % foi aceito e deveria ter sido rejeitado', label;
  exception
    when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then
      raise notice 'ok (rejeitado: %) — %', sqlstate, label;
  end;
end;
$$;

create or replace function pg_temp.act_as(user_id uuid)
returns void language plpgsql as $$
begin
  execute format('set local role authenticated');
  execute format('set local request.jwt.claims = %L', json_build_object('sub', user_id, 'role', 'authenticated')::text);
end;
$$;
