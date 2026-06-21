/*
# Add PBI Tasks and Attachments

1. New Tables
- `kanban_card_tasks`
  - `id` (uuid, primary key)
  - `card_id` (uuid, references kanban_cards)
  - `title` (text, not null)
  - `completed` (boolean, default false)
  - `created_at` (timestamp)

- `pbi_attachments`
  - `id` (uuid, primary key)
  - `card_id` (uuid, references kanban_cards)
  - `type` (text, not null) — 'comment', 'file', 'screenshot'
  - `content` (text) — for comments or base64 data URLs for images
  - `filename` (text) — for files
  - `created_at` (timestamp)

2. Security
- Enable RLS on both tables.
- Single-tenant: allow anon + authenticated full CRUD.
*/

CREATE TABLE IF NOT EXISTS kanban_card_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pbi_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text,
  filename text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_card_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbi_attachments ENABLE ROW LEVEL SECURITY;

-- kanban_card_tasks policies
DROP POLICY IF EXISTS "anon_select_kanban_card_tasks" ON kanban_card_tasks;
CREATE POLICY "anon_select_kanban_card_tasks" ON kanban_card_tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_kanban_card_tasks" ON kanban_card_tasks;
CREATE POLICY "anon_insert_kanban_card_tasks" ON kanban_card_tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_kanban_card_tasks" ON kanban_card_tasks;
CREATE POLICY "anon_update_kanban_card_tasks" ON kanban_card_tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_kanban_card_tasks" ON kanban_card_tasks;
CREATE POLICY "anon_delete_kanban_card_tasks" ON kanban_card_tasks FOR DELETE TO anon, authenticated USING (true);

-- pbi_attachments policies
DROP POLICY IF EXISTS "anon_select_pbi_attachments" ON pbi_attachments;
CREATE POLICY "anon_select_pbi_attachments" ON pbi_attachments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pbi_attachments" ON pbi_attachments;
CREATE POLICY "anon_insert_pbi_attachments" ON pbi_attachments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pbi_attachments" ON pbi_attachments;
CREATE POLICY "anon_update_pbi_attachments" ON pbi_attachments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pbi_attachments" ON pbi_attachments;
CREATE POLICY "anon_delete_pbi_attachments" ON pbi_attachments FOR DELETE TO anon, authenticated USING (true);
