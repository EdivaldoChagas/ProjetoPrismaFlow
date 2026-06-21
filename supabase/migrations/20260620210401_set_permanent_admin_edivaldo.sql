/*
# Garantir admin permanente para edivaldo.b.chagas@gmail.com

1. Alterações
- Atualiza a função `handle_new_user` para que o e-mail
  edivaldo.b.chagas@gmail.com sempre receba o papel 'admin',
  independentemente da ordem de cadastro.
- O ON CONFLICT atualiza para 'admin' se esse e-mail já tiver um perfil
  com papel diferente.
- Upsert imediato: se o usuário já existir em auth.users, cria ou
  atualiza o perfil para 'admin'.

2. Notas
- Nenhum outro perfil é alterado.
- O primeiro usuário genérico ainda recebe 'admin' se não for esse e-mail.
*/

-- Atualiza trigger para blindar o admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE
    SET role = CASE
      WHEN NEW.email = 'edivaldo.b.chagas@gmail.com' THEN 'admin'
      ELSE profiles.role
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Se o usuário já existir em auth.users, garante perfil admin agora
INSERT INTO profiles (id, email, full_name, avatar_url, role)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url',
  'admin'
FROM auth.users u
WHERE u.email = 'edivaldo.b.chagas@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
