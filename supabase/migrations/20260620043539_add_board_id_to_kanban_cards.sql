-- Add board_id column to kanban_cards
ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES kanban_boards(id) ON DELETE CASCADE;

-- Update existing cards to have board_id based on their column
UPDATE kanban_cards SET board_id = (
  SELECT kb.id FROM kanban_boards kb
  JOIN kanban_columns kc ON kc.board_id = kb.id
  WHERE kc.id = kanban_cards.column_id
  LIMIT 1
)
WHERE board_id IS NULL;
