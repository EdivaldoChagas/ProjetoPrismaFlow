-- Add status_key to kanban_columns so dragging a card into a column updates the linked PBI status
ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS status_key text;
