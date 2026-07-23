-- Complete the schema required by the current Rust repositories.
--
-- This migration intentionally sorts before 20260715010000 because that
-- migration reads environments.last_activity while backfilling expires_at.
-- It is idempotent so databases that received these columns manually can
-- apply it without losing data.

ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS estimated_time_minutes INT,
ADD COLUMN IF NOT EXISTS max_score INT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE scenarios
SET estimated_time_minutes = COALESCE(estimated_time_minutes, 30),
    max_score = COALESCE(max_score, 100),
    is_active = COALESCE(is_active, TRUE),
    vm_template_name = COALESCE(vm_template_name, 'Ubuntu_Base_Template');

ALTER TABLE scenarios
ALTER COLUMN vm_template_name SET DEFAULT 'Ubuntu_Base_Template',
ALTER COLUMN vm_template_name SET NOT NULL,
ALTER COLUMN estimated_time_minutes SET DEFAULT 30,
ALTER COLUMN estimated_time_minutes SET NOT NULL,
ALTER COLUMN max_score SET DEFAULT 100,
ALTER COLUMN max_score SET NOT NULL,
ALTER COLUMN is_active SET DEFAULT TRUE,
ALTER COLUMN is_active SET NOT NULL;

ALTER TABLE environments
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

UPDATE environments
SET created_at = COALESCE(created_at, NOW()),
    last_activity = COALESCE(last_activity, created_at, NOW());

ALTER TABLE environments
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN last_activity SET DEFAULT NOW(),
ALTER COLUMN last_activity SET NOT NULL;

-- network_name belonged to an earlier networking design. The current
-- repository does not write it. Preserve the legacy column when present,
-- but allow current INSERT statements to omit it.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'environments'
          AND column_name = 'network_name'
    ) THEN
        ALTER TABLE environments
        ALTER COLUMN network_name DROP NOT NULL;
    END IF;
END
$$;

ALTER TABLE instances
ADD COLUMN IF NOT EXISTS ssh_port INT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

UPDATE instances
SET is_entry_point = COALESCE(is_entry_point, FALSE),
    created_at = COALESCE(created_at, NOW()),
    status = COALESCE(status, 'Stopped'),
    last_activity = COALESCE(last_activity, created_at, NOW());

ALTER TABLE instances
ALTER COLUMN is_entry_point SET DEFAULT FALSE,
ALTER COLUMN is_entry_point SET NOT NULL,
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'Stopped',
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN last_activity SET DEFAULT NOW(),
ALTER COLUMN last_activity SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_environments_user_id
ON environments (user_id);

CREATE INDEX IF NOT EXISTS idx_environments_scenario_id
ON environments (scenario_id);

CREATE INDEX IF NOT EXISTS idx_environments_status
ON environments (status);

CREATE INDEX IF NOT EXISTS idx_instances_environment_id
ON instances (environment_id);

CREATE INDEX IF NOT EXISTS idx_instances_status
ON instances (status);

CREATE UNIQUE INDEX IF NOT EXISTS unique_instance_vm_name
ON instances (vm_name);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_instance_ssh_port
ON instances (ssh_port)
WHERE ssh_port IS NOT NULL
  AND status IN ('Starting', 'Running');
