-- Refuerza el alta de usuarios para evitar errores internos durante el registro.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'patient';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS disease TEXT,
  ADD COLUMN IF NOT EXISTS vulnerability_condition BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_level TEXT NOT NULL DEFAULT 'Baja',
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.metadata_boolean(_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(COALESCE(_value, ''))) IN ('true', 't', '1', 'yes', 'si') THEN true
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text;
  given_name text;
  family_name text;
  requested_role text;
  is_admin_user boolean;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  given_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), display_name);
  family_name := NULLIF(NEW.raw_user_meta_data->>'last_name', '');
  requested_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  is_admin_user := requested_role = 'admin' OR lower(COALESCE(NEW.email, '')) = 'admin@admin.com';

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    document_type,
    document_number,
    phone,
    address,
    district,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    display_name,
    given_name,
    family_name,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'document_type', ''), 'DNI'),
    NULLIF(NEW.raw_user_meta_data->>'document_number', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', ''),
    NULLIF(NEW.raw_user_meta_data->>'district', ''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    document_type = EXCLUDED.document_type,
    document_number = EXCLUDED.document_number,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    district = EXCLUDED.district,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  IF is_admin_user THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.user_roles
    WHERE user_id = NEW.id
      AND role <> 'admin';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'patient')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.patients (
      profile_id,
      first_name,
      last_name,
      document_number,
      email,
      birth_date,
      sex,
      phone,
      address,
      district,
      disease,
      chronic_condition,
      vulnerability_condition,
      active
    )
    VALUES (
      NEW.id,
      given_name,
      family_name,
      NULLIF(NEW.raw_user_meta_data->>'document_number', ''),
      NEW.email,
      NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date,
      NULLIF(NEW.raw_user_meta_data->>'sex', ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'address', ''),
      NULLIF(NEW.raw_user_meta_data->>'district', ''),
      NULLIF(NEW.raw_user_meta_data->>'disease', ''),
      public.metadata_boolean(NEW.raw_user_meta_data->>'chronic_condition'),
      public.metadata_boolean(NEW.raw_user_meta_data->>'vulnerability_condition'),
      true
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      document_number = EXCLUDED.document_number,
      email = EXCLUDED.email,
      birth_date = EXCLUDED.birth_date,
      sex = EXCLUDED.sex,
      phone = EXCLUDED.phone,
      address = EXCLUDED.address,
      district = EXCLUDED.district,
      disease = EXCLUDED.disease,
      chronic_condition = EXCLUDED.chronic_condition,
      vulnerability_condition = EXCLUDED.vulnerability_condition,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
