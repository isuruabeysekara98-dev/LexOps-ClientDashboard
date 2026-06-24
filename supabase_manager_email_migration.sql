-- Add manager_email column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager_email TEXT;

-- Pre-populate Nautilus Law project with Mark's email
UPDATE projects
SET manager_email = 'mark@lex-ops.io'
WHERE client_name ILIKE '%Nautilus%';
