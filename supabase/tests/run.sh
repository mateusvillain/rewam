#!/usr/bin/env bash
# Roda uma suíte de verificação de banco contra o Supabase local.
#
#   supabase/tests/run.sh supabase/tests/rls.sql
#
# Cada suíte roda dentro da transação aberta em _helpers.sql e termina com
# rollback, então nada persiste no banco.
set -euo pipefail

suite="${1:?uso: run.sh <arquivo.sql>}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

container="$(docker ps -qf name=supabase_db_ | head -1)"
if [ -z "$container" ]; then
  echo "Supabase local não está no ar. Rode 'pnpm db:start' antes." >&2
  exit 1
fi

cat "$here/_helpers.sql" "$suite" | docker exec -i "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1
