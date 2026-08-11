DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'smeta') THEN
    CREATE ROLE smeta LOGIN PASSWORD 'ibrohim';
  ELSE
    ALTER ROLE smeta WITH LOGIN PASSWORD 'ibrohim';
  END IF;
END
$$;
