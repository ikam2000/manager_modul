-- PostgreSQL RLS для tenant isolation (multi-tenant security)
-- Применение: sudo -u postgres psql -d ikamdocs -f migrations/ADD_rls_tenant_isolation.sql
--
-- Политика: если установлена переменная app.tenant_ids (через set_config в приложении),
-- отображаются только строки с company_id IN (tenant_ids).
-- Если переменная не установлена — доступны все строки (обратная совместимость).
--
-- Чтобы RLS начал фильтровать, приложение должно вызывать перед запросами:
--   SELECT set_config('app.tenant_ids', '1,2,3', true);
-- (true = только для текущей транзакции)

-- Функция-хелпер: текущие tenant_id как массив, NULL = без фильтра
CREATE OR REPLACE FUNCTION app_current_tenant_ids() RETURNS int[] AS $$
DECLARE
  s text;
BEGIN
  s := current_setting('app.tenant_ids', true);
  IF s IS NULL OR s = '' OR s = '*' THEN
    RETURN NULL;
  END IF;
  RETURN string_to_array(s, ',')::int[];
END;
$$ LANGUAGE plpgsql STABLE;

-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_suppliers_tenant ON suppliers;
CREATE POLICY rls_suppliers_tenant ON suppliers
  FOR ALL USING (
    app_current_tenant_ids() IS NULL
    OR company_id = ANY(app_current_tenant_ids())
  );

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_documents_tenant ON documents;
CREATE POLICY rls_documents_tenant ON documents
  FOR ALL USING (
    app_current_tenant_ids() IS NULL
    OR company_id = ANY(app_current_tenant_ids())
  );

-- api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_api_keys_tenant ON api_keys;
CREATE POLICY rls_api_keys_tenant ON api_keys
  FOR ALL USING (
    app_current_tenant_ids() IS NULL
    OR company_id = ANY(app_current_tenant_ids())
  );

-- oauth_connections
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_oauth_connections_tenant ON oauth_connections;
CREATE POLICY rls_oauth_connections_tenant ON oauth_connections
  FOR ALL USING (
    app_current_tenant_ids() IS NULL
    OR company_id = ANY(app_current_tenant_ids())
  );

-- mapping_profiles
ALTER TABLE mapping_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_mapping_profiles_tenant ON mapping_profiles;
CREATE POLICY rls_mapping_profiles_tenant ON mapping_profiles
  FOR ALL USING (
    app_current_tenant_ids() IS NULL
    OR company_id = ANY(app_current_tenant_ids())
  );

-- sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_sync_logs_tenant ON sync_logs;
CREATE POLICY rls_sync_logs_tenant ON sync_logs
  FOR ALL USING (
    app_current_tenant_ids() IS NULL
    OR company_id = ANY(app_current_tenant_ids())
  );
