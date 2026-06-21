-- Create backlog_tabs table
CREATE TABLE IF NOT EXISTS backlog_tabs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backlog_tabs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_backlog_tabs" ON backlog_tabs;
CREATE POLICY "anon_select_backlog_tabs" ON backlog_tabs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_backlog_tabs" ON backlog_tabs;
CREATE POLICY "anon_insert_backlog_tabs" ON backlog_tabs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_backlog_tabs" ON backlog_tabs;
CREATE POLICY "anon_update_backlog_tabs" ON backlog_tabs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_backlog_tabs" ON backlog_tabs;
CREATE POLICY "anon_delete_backlog_tabs" ON backlog_tabs FOR DELETE TO anon, authenticated USING (true);

-- Insert default tabs
INSERT INTO backlog_tabs (name, position) VALUES ('A Fazer', 0), ('Fazendo', 1), ('Concluído', 2);

-- Add tab_id to pbis
ALTER TABLE pbis ADD COLUMN IF NOT EXISTS tab_id uuid REFERENCES backlog_tabs(id) ON DELETE SET NULL;

-- Assign existing PBIs to the "A Fazer" tab
DO $$
DECLARE
  default_tab_id uuid;
BEGIN
  SELECT id INTO default_tab_id FROM backlog_tabs WHERE name = 'A Fazer' ORDER BY position LIMIT 1;
  UPDATE pbis SET tab_id = default_tab_id WHERE tab_id IS NULL;
END $$;
