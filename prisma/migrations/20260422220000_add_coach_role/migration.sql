-- AlterEnum
-- Adds 'coach' to SystemRole. Idempotent: skip if value already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public."SystemRole"'::regtype
      AND enumlabel = 'coach'
  ) THEN
    ALTER TYPE "SystemRole" ADD VALUE 'coach';
  END IF;
END
$$;
