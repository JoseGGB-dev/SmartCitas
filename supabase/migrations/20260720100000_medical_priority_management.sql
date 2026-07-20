ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS disease TEXT,
  ADD COLUMN IF NOT EXISTS vulnerability_condition BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority_level TEXT NOT NULL DEFAULT 'Baja',
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS chk_patients_priority_level;

ALTER TABLE public.patients
  ADD CONSTRAINT chk_patients_priority_level CHECK (priority_level IN ('Alta', 'Media', 'Baja'));

CREATE INDEX IF NOT EXISTS idx_patients_priority_points
  ON public.patients (priority_points DESC, registered_at ASC);

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

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_priority_level(_points numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(_points, 0) >= 70 THEN 'Alta'
    WHEN COALESCE(_points, 0) >= 35 THEN 'Media'
    ELSE 'Baja'
  END
$$;

CREATE OR REPLACE FUNCTION public.get_patient_priority_board()
RETURNS TABLE (
  id UUID,
  "position" INTEGER,
  patient_name TEXT,
  disease TEXT,
  chronic_condition BOOLEAN,
  vulnerability_condition BOOLEAN,
  age INTEGER,
  waiting_days INTEGER,
  points NUMERIC,
  priority_level TEXT,
  status TEXT,
  registered_at TIMESTAMPTZ,
  is_current_patient BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_patient AS (
    SELECT p.id
    FROM public.patients p
    WHERE p.profile_id = auth.uid()
    LIMIT 1
  ),
  latest_waiting AS (
    SELECT DISTINCT ON (w.patient_id)
      w.patient_id,
      w.id AS waiting_list_entry_id,
      w.status,
      w.waiting_since
    FROM public.waiting_list_entries w
    WHERE w.status IN ('ACTIVE', 'TEMPORARILY_OFFERED', 'ASSIGNED')
    ORDER BY w.patient_id, w.waiting_since ASC, w.id ASC
  ),
  scored AS (
    SELECT
      p.id,
      COALESCE(
        NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
        p.email,
        pr.email,
        'Paciente'
      ) AS patient_name,
      p.disease,
      p.chronic_condition,
      p.vulnerability_condition,
      CASE
        WHEN p.birth_date IS NULL THEN NULL
        ELSE floor(date_part('year', age(current_date, p.birth_date)))::integer
      END AS age,
      COALESCE(
        GREATEST(
          floor(extract(epoch FROM (now() - lw.waiting_since)) / 86400)::integer,
          0
        ),
        0
      ) AS waiting_days,
      COALESCE(lw.status::text, 'SIN_SOLICITUD') AS status,
      COALESCE(p.registered_at, p.created_at) AS registered_at,
      (
        CASE
          WHEN p.birth_date IS NOT NULL
            AND date_part('year', age(current_date, p.birth_date)) >= 65 THEN 25
          WHEN p.birth_date IS NOT NULL
            AND date_part('year', age(current_date, p.birth_date)) >= 50 THEN 12
          ELSE 0
        END
        + CASE WHEN p.chronic_condition THEN 25 ELSE 0 END
        + CASE WHEN p.vulnerability_condition THEN 15 ELSE 0 END
        + LEAST(
            COALESCE(
              GREATEST(
                floor(extract(epoch FROM (now() - lw.waiting_since)) / 86400)::integer,
                0
              ) * 2,
              0
            ),
            40
          )
      )::numeric AS calculated_points
    FROM public.patients p
    LEFT JOIN public.profiles pr ON pr.id = p.profile_id
    LEFT JOIN latest_waiting lw ON lw.patient_id = p.id
    WHERE p.active = true
  ),
  ranked AS (
    SELECT
      scored.*,
      row_number() OVER (
        ORDER BY scored.calculated_points DESC, scored.registered_at ASC, scored.id ASC
      )::integer AS ranking_position
    FROM scored
  )
  SELECT
    ranked.id,
    ranked.ranking_position AS "position",
    ranked.patient_name,
    ranked.disease,
    ranked.chronic_condition,
    ranked.vulnerability_condition,
    ranked.age,
    ranked.waiting_days,
    ranked.calculated_points AS points,
    public.calculate_priority_level(ranked.calculated_points) AS priority_level,
    ranked.status,
    ranked.registered_at,
    COALESCE(
      ranked.id = (SELECT current_patient.id FROM current_patient),
      false
    ) AS is_current_patient
  FROM ranked
  ORDER BY ranked.ranking_position;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_patient_priority(_patient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points numeric;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT points
  INTO new_points
  FROM public.get_patient_priority_board()
  WHERE id = _patient_id
  LIMIT 1;

  UPDATE public.patients
  SET
    priority_points = COALESCE(new_points, 0),
    priority_level = public.calculate_priority_level(COALESCE(new_points, 0)),
    updated_at = now()
  WHERE id = _patient_id;
END;
$$;

DROP POLICY IF EXISTS "Patients admin priority update" ON public.patients;
CREATE POLICY "Patients admin priority update" ON public.patients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT EXECUTE ON FUNCTION public.calculate_priority_level(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_priority_board() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_patient_priority(uuid) TO authenticated;
