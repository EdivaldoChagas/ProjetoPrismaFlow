/*
# Auth: Profiles table + card assignee/completion fields

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, not null)
  - `full_name` (text)
  - `avatar_url` (text)
  - `role` (text, 'admin' or 'member', default 'member')
  - `created_at` (timestamp)

2. Modified Tables
- `kanban_cards`
  - added `completed_at` (timestamptz) — when the card was marked done
  - added `assigned_to` (uuid, references auth.users) — responsible person
- `pbi_attachments`
  - added `user_id` (uuid, references auth.users) — who created the comment/attachment

3. Functions / Triggers
- `handle_new_user()` — auto-creates a profile row whenever a new auth user signs up.
  The first user ever registered is automatically assigned the 'admin' role.

4. Security
- RLS enabled on `profiles`.
- All authenticated users can read all profiles (needed for assignee dropdowns).
- Users can only update their own profile.
- Existing anon-accessible tables are unchanged.

5. Notes
- First registered user becomes admin automatically (first-use bootstrap).
- Subsequent users invited by admin get the 'member' role.
- Google OAuth users get their name/avatar auto-populated from raw_user_meta_data.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- trigger: auto-create profile on user signup; first user = admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM profiles;
  INSERT INTO profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN existing_count = 0 THEN 'admin' ELSE 'member' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- extend kanban_cards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kanban_cards' AND column_name='completed_at') THEN
    ALTER TABLE kanban_cards ADD COLUMN completed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kanban_cards' AND column_name='assigned_to') THEN
    ALTER TABLE kanban_cards ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- extend pbi_attachments with user_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pbi_attachments' AND column_name='user_id') THEN
    ALTER TABLE pbi_attachments ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
