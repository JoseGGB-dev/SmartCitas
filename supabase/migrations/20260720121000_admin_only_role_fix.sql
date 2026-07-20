-- Limpia roles heredados del usuario administrador principal.
DELETE FROM public.user_roles roles_to_remove
USING public.profiles profile
WHERE roles_to_remove.user_id = profile.id
  AND lower(profile.email) = 'admin@admin.com'
  AND roles_to_remove.role <> 'admin';

-- Si cualquier usuario tiene rol admin, ese rol queda como unico rol operativo.
DELETE FROM public.user_roles roles_to_remove
WHERE roles_to_remove.role <> 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles admin_roles
    WHERE admin_roles.user_id = roles_to_remove.user_id
      AND admin_roles.role = 'admin'
  );

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
  given_name := COALESCE(NEW.raw_user_meta_data->>'first_name', display_name);
  family_name := NEW.raw_user_meta_data->>'last_name';
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
      NEW.raw_user_meta_data->>'document_number',
      NEW.email,
      NULLIF(NEW.raw_user_meta_data->>'birth_date', '')::date,
      NEW.raw_user_meta_data->>'sex',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'district',
      NULLIF(NEW.raw_user_meta_data->>'disease', ''),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'chronic_condition', '')::boolean, false),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'vulnerability_condition', '')::boolean, false),
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
