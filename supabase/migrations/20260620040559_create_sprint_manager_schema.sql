/*
# Create Sprint Manager Schema

1. New Tables
- `pbis` (Product Backlog Items)
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `description` (text)
  - `status` (text, default 'backlog') — backlog, in_progress, done
  - `priority` (text, default 'medium') — low, medium, high, critical
  - `story_points` (integer)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- `sprints`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `goal` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `status` (text, default 'planning') — planning, active, completed
  - `created_at` (timestamp)

- `sprint_pbis` (junction table for PBI <-> Sprint assignment)
  - `id` (uuid, primary key)
  - `sprint_id` (uuid, references sprints)
  - `pbi_id` (uuid, references pbis)
  - `status` (text, default 'todo') — todo, in_progress, done
  - `created_at` (timestamp)

- `kanban_boards`
  - `id` (uuid, primary key)
  - `sprint_id` (uuid, references sprints)
  - `name` (text, not null)
  - `created_at` (timestamp)

- `kanban_columns`
  - `id` (uuid, primary key)
  - `board_id` (uuid, references kanban_boards)
  - `name` (text, not null)
  - `position` (integer)
  - `created_at` (timestamp)

- `kanban_cards`
  - `id` (uuid, primary key)
  - `column_id` (uuid, references kanban_columns)
  - `sprint_pbi_id` (uuid, references sprint_pbis)
  - `title` (text, not null)
  - `description` (text)
  - `position` (integer)
  - `created_at` (timestamp)

2. Security
- Enable RLS on all tables.
- Single-tenant app: allow anon + authenticated full CRUD.
*/

CREATE TABLE IF NOT EXISTS pbis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'backlog',
  priority text NOT NULL DEFAULT 'medium',
  story_points integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  goal text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planning',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprint_pbis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  pbi_id uuid NOT NULL REFERENCES pbis(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'todo',
  created_at timestamptz DEFAULT now(),
  UNIQUE(sprint_id, pbi_id)
);

CREATE TABLE IF NOT EXISTS kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  sprint_pbi_id uuid REFERENCES sprint_pbis(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pbis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_pbis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;

-- pbis policies
DROP POLICY IF EXISTS "anon_select_pbis" ON pbis;
CREATE POLICY "anon_select_pbis" ON pbis FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pbis" ON pbis;
CREATE POLICY "anon_insert_pbis" ON pbis FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pbis" ON pbis;
CREATE POLICY "anon_update_pbis" ON pbis FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pbis" ON pbis;
CREATE POLICY "anon_delete_pbis" ON pbis FOR DELETE TO anon, authenticated USING (true);

-- sprints policies
DROP POLICY IF EXISTS "anon_select_sprints" ON sprints;
CREATE POLICY "anon_select_sprints" ON sprints FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sprints" ON sprints;
CREATE POLICY "anon_insert_sprints" ON sprints FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sprints" ON sprints;
CREATE POLICY "anon_update_sprints" ON sprints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sprints" ON sprints;
CREATE POLICY "anon_delete_sprints" ON sprints FOR DELETE TO anon, authenticated USING (true);

-- sprint_pbis policies
DROP POLICY IF EXISTS "anon_select_sprint_pbis" ON sprint_pbis;
CREATE POLICY "anon_select_sprint_pbis" ON sprint_pbis FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sprint_pbis" ON sprint_pbis;
CREATE POLICY "anon_insert_sprint_pbis" ON sprint_pbis FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sprint_pbis" ON sprint_pbis;
CREATE POLICY "anon_update_sprint_pbis" ON sprint_pbis FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sprint_pbis" ON sprint_pbis;
CREATE POLICY "anon_delete_sprint_pbis" ON sprint_pbis FOR DELETE TO anon, authenticated USING (true);

-- kanban_boards policies
DROP POLICY IF EXISTS "anon_select_kanban_boards" ON kanban_boards;
CREATE POLICY "anon_select_kanban_boards" ON kanban_boards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_kanban_boards" ON kanban_boards;
CREATE POLICY "anon_insert_kanban_boards" ON kanban_boards FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_kanban_boards" ON kanban_boards;
CREATE POLICY "anon_update_kanban_boards" ON kanban_boards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_kanban_boards" ON kanban_boards;
CREATE POLICY "anon_delete_kanban_boards" ON kanban_boards FOR DELETE TO anon, authenticated USING (true);

-- kanban_columns policies
DROP POLICY IF EXISTS "anon_select_kanban_columns" ON kanban_columns;
CREATE POLICY "anon_select_kanban_columns" ON kanban_columns FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_kanban_columns" ON kanban_columns;
CREATE POLICY "anon_insert_kanban_columns" ON kanban_columns FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_kanban_columns" ON kanban_columns;
CREATE POLICY "anon_update_kanban_columns" ON kanban_columns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_kanban_columns" ON kanban_columns;
CREATE POLICY "anon_delete_kanban_columns" ON kanban_columns FOR DELETE TO anon, authenticated USING (true);

-- kanban_cards policies
DROP POLICY IF EXISTS "anon_select_kanban_cards" ON kanban_cards;
CREATE POLICY "anon_select_kanban_cards" ON kanban_cards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_kanban_cards" ON kanban_cards;
CREATE POLICY "anon_insert_kanban_cards" ON kanban_cards FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_kanban_cards" ON kanban_cards;
CREATE POLICY "anon_update_kanban_cards" ON kanban_cards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_kanban_cards" ON kanban_cards;
CREATE POLICY "anon_delete_kanban_cards" ON kanban_cards FOR DELETE TO anon, authenticated USING (true);
