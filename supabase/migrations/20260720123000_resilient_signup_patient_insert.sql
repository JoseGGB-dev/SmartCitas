-- Evita que errores secundarios del perfil paciente bloqueen el alta en Supabase Auth.
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
  clean_document_number text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  given_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), display_name);
  family_name := NULLIF(NEW.raw_user_meta_data->>'last_name', '');
  requested_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  is_admin_user := requested_role = 'admin' OR lower(COALESCE(NEW.email, '')) = 'admin@admin.com';
  clean_document_number := NULLIF(NEW.raw_user_meta_data->>'document_number', '');

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
    clean_document_number,
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

    -- Si el DNI ya existe, se registra el paciente sin duplicar el documento para no abortar Auth.
    IF EXISTS (
      SELECT 1
      FROM public.patients existing_patient
      WHERE existing_patient.document_number = clean_document_number
        AND existing_patient.profile_id IS DISTINCT FROM NEW.id
    ) THEN
      clean_document_number := NULL;
    END IF;

    BEGIN
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
        clean_document_number,
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
    EXCEPTION
      WHEN unique_violation THEN
        INSERT INTO public.patients (
          profile_id,
          first_name,
          last_name,
          email,
          phone,
          active
        )
        VALUES (
          NEW.id,
          given_name,
          family_name,
          NEW.email,
          NULLIF(NEW.raw_user_meta_data->>'phone', ''),
          true
        )
        ON CONFLICT (profile_id) DO NOTHING;
    END;
  END IF;

  RETURN NEW;
END;
$$;
