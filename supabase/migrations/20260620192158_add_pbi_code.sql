-- Sequence for PBI codes
CREATE SEQUENCE IF NOT EXISTS pbis_code_seq START 1;

-- Add code column
ALTER TABLE pbis ADD COLUMN IF NOT EXISTS code TEXT;

-- Assign codes to existing PBIs in creation order
DO $$
DECLARE
  r RECORD;
  seq_val INT;
BEGIN
  FOR r IN SELECT id FROM pbis ORDER BY created_at LOOP
    seq_val := nextval('pbis_code_seq');
    UPDATE pbis SET code = 'PB' || LPAD(seq_val::text, 4, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Trigger function to auto-assign code on insert
CREATE OR REPLACE FUNCTION assign_pbi_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'PB' || LPAD(nextval('pbis_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pbis_code_trigger ON pbis;
CREATE TRIGGER pbis_code_trigger
  BEFORE INSERT ON pbis
  FOR EACH ROW EXECUTE FUNCTION assign_pbi_code();
