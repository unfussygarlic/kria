-- Set passwords for Supabase service roles
-- Runs after supabase/postgres creates the roles

DO $$
DECLARE
  pwd TEXT := current_setting('app.settings.postgres_password', true);
BEGIN
  -- Fallback to environment variable via a simpler method
  IF pwd IS NULL OR pwd = '' THEN
    pwd := 'postgres';
  END IF;

  -- Only alter if role exists
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE format('ALTER ROLE authenticator WITH LOGIN PASSWORD %L', pwd);
    RAISE NOTICE 'Set password for authenticator';
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE format('ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD %L', pwd);
    RAISE NOTICE 'Set password for supabase_auth_admin';
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    EXECUTE format('ALTER ROLE supabase_storage_admin WITH LOGIN PASSWORD %L', pwd);
    RAISE NOTICE 'Set password for supabase_storage_admin';
  END IF;

  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE format('ALTER ROLE supabase_admin WITH LOGIN PASSWORD %L', pwd);
    RAISE NOTICE 'Set password for supabase_admin';
  END IF;
END $$;
