ALTER TABLE public.patients
  ALTER COLUMN profile_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_document_number
  ON public.patients (document_number)
  WHERE document_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_name_search
  ON public.patients (last_name, first_name);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT;

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

DROP POLICY IF EXISTS "Profiles admin update" ON public.profiles;
CREATE POLICY "Profiles admin update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Patients admin insert" ON public.patients;
DROP POLICY IF EXISTS "Patients admin update" ON public.patients;
CREATE POLICY "Patients admin insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Patients admin update" ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Catalog specialties managed by admin" ON public.specialties;
DROP POLICY IF EXISTS "Catalog facilities managed by admin" ON public.facilities;
CREATE POLICY "Catalog specialties managed by admin" ON public.specialties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Catalog facilities managed by admin" ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "User roles managed by admin" ON public.user_roles;
CREATE POLICY "User roles managed by admin" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  display_name text;
  given_name text;
  family_name text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  given_name := COALESCE(NEW.raw_user_meta_data->>'first_name', display_name);
  family_name := NEW.raw_user_meta_data->>'last_name';

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
    COALESCE(NEW.raw_user_meta_data->>'document_type', 'DNI'),
    NEW.raw_user_meta_data->>'document_number',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'district',
    NEW.raw_user_meta_data->>'avatar_url'
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
    active
  )
  VALUES (
    NEW.id,
    given_name,
    family_name,
    NEW.raw_user_meta_data->>'document_number',
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date,
    NEW.raw_user_meta_data->>'sex',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'district',
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
    updated_at = now();

  RETURN NEW;
END;
$$;
