#!/usr/bin/env bash
# Применяет миграции из migrations/ по порядку и записывает в schema_migrations.
# Запуск: из backend/ — ./migrate.sh [опционально: DATABASE_URL или пусто = psql -d ikamdocs]
# На сервере: cd /var/ikamdocs/backend && sudo -u postgres ./migrate.sh
# Локально: cd backend && ./migrate.sh  или  DATABASE_URL="postgresql://user:pass@host/ikamdocs" ./migrate.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-migrations}"

if [ -n "$DATABASE_URL" ]; then
  PSQL_CMD="psql \"$DATABASE_URL\""
else
  PSQL_CMD="psql -d ikamdocs"
fi

# Порядок: сначала реестр (0001), затем миграции в историческом порядке.
# Новые миграции добавлять в конец массива.
ORDERED_MIGRATIONS=(
  "0001_schema_migrations.sql"
  "ADD_demo_and_limits.sql"
  "ADD_entity_registry.sql"
  "ADD_company_phone_email.sql"
  "ADD_supplier_manufacturer_requisites.sql"
  "ADD_customers_and_links.sql"
  "FIX_entity_tree_500.sql"
  "ADD_oauth_connections.sql"
  "ADD_role_trader.sql"
  "ADD_trader_nomenclature_fields.sql"
  "ADD_trader_extended_fields.sql"
  "ADD_trader_supplier_markup.sql"
  "ADD_trader_category_markup.sql"
  "ADD_trader_default_markup_to_companies.sql"
  "ADD_trader_markup_history.sql"
  "ADD_trader_trial_and_plans.sql"
  "ADD_trader_limits_3_suppliers_50_per_supplier.sql"
  "UPDATE_trader_plans_limits.sql"
  "ADD_trader_tables_grants.sql"
  "ADD_company_provider_credentials.sql"
  "ADD_sessions_ip_user_agent_region.sql"
  "ADD_import_jobs.sql"
  "ADD_mapping_profiles_and_sync_logs.sql"
)

for f in "${ORDERED_MIGRATIONS[@]}"; do
  path="$MIGRATIONS_DIR/$f"
  if [ ! -f "$path" ]; then
    echo "[migrate] skip (not found): $f"
    continue
  fi
  # Проверяем, применена ли уже (для первой миграции таблица создаётся в этом же цикле)
  applied=$($PSQL_CMD -t -A -c "SELECT 1 FROM schema_migrations WHERE version = '$f' LIMIT 1" 2>/dev/null || true)
  applied=$(echo "$applied" | tr -d '[:space:]')
  if [ -n "$applied" ]; then
    echo "[migrate] already applied: $f"
    continue
  fi
  echo "[migrate] applying: $f"
  $PSQL_CMD -f "$path"
  $PSQL_CMD -c "INSERT INTO schema_migrations(version) VALUES ('$f') ON CONFLICT (version) DO NOTHING"
done
echo "[migrate] done."
