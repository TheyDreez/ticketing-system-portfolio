-- Migration 4: Fix Missing Department in Tickets Table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS department TEXT;

-- Backfill data based on the author's current department (Resolves empty department for old tickets)
UPDATE tickets t
SET department = u.department
FROM users u
WHERE t.author_email = u.email AND t.department IS NULL;
