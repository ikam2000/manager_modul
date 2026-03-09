#!/bin/bash
# Выполнение миграций для ikamdocs
# Использование:
#   ./run_migrations.sh                    # через DATABASE_URL из .env
#   ./run_migrations.sh postgresql://user:pass@host:5432/ikamdocs
#   sudo -u postgres ./run_migrations.sh   # с правами postgres

set -e
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

DB="${1:-$DATABASE_URL}"
if [ -z "$DB" ]; then
  echo "Укажите DATABASE_URL в .env или передайте строку подключения аргументом"
  exit 1
fi

# psql не понимает postgresql+asyncpg
DB_PSQL=$(echo "$DB" | sed 's|postgresql+asyncpg://|postgresql://|')

MIGRATIONS=(
  migrations/ADD_role_trader.sql
  migrations/ADD_trader_nomenclature_fields.sql
  migrations/ADD_trader_supplier_markup.sql
  migrations/ADD_trader_category_markup.sql
  migrations/ADD_trader_default_markup_to_companies.sql
  migrations/ADD_oauth_connections.sql
)

for f in "${MIGRATIONS[@]}"; do
  echo "==> $f"
  psql "$DB_PSQL" -f "$f"
done

echo "Готово."
