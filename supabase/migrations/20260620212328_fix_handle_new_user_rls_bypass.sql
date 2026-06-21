
-- Recreate handle_new_user with SET row_security = off so RLS never
-- blocks the profiles insert, and wrap in EXCEPTION so auth user
-- creation never fails even if profile upsert has an unexpected error.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
SET row_security = off
LANGUAGE plpgsql
AS $$
DECLARE
  existing_count INT;
  assigned_role TEXT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM profiles;

  IF NEW.email = 'edivaldo.b.chagas@gmail.com' THEN
    assigned_role := 'admin';
  ELSIF existing_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'member';
  END IF;

  INSERT INTO profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      role  = CASE
                WHEN NEW.email = 'edivaldo.b.chagas@gmail.com' THEN 'admin'
                ELSE profiles.role
              END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation due to profile errors
  RETURN NEW;
END;
$$;
