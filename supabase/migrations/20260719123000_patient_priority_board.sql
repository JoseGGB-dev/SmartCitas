CREATE OR REPLACE FUNCTION public.get_patient_priority_board()
RETURNS TABLE (
  id UUID,
  position INTEGER,
  patient_name TEXT,
  points NUMERIC,
  priority_level TEXT,
  status TEXT,
  is_current_patient BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- La tabla de posiciones se calcula desde Supabase para mantener un orden único y consistente.
  WITH current_patient AS (
    SELECT p.id
    FROM public.patients p
    WHERE p.profile_id = auth.uid()
    LIMIT 1
  ),
  scored AS (
    -- Si ya existe una evaluacion guardada, se reutiliza; si no, se calcula con datos actuales.
    SELECT
      w.id,
      COALESCE(
        NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
        p.email,
        pr.email,
        'Paciente'
      ) AS patient_name,
      COALESCE(
        pe.total_score,
        (
          CASE
            WHEN p.birth_date IS NOT NULL
              AND date_part('year', age(current_date, p.birth_date)) >= 65 THEN 25
            WHEN p.birth_date IS NOT NULL
              AND date_part('year', age(current_date, p.birth_date)) >= 50 THEN 12
            ELSE 0
          END
          + CASE WHEN p.chronic_condition THEN 25 ELSE 0 END
          + LEAST(
              GREATEST(
                floor(extract(epoch FROM (now() - w.waiting_since)) / 86400)::integer,
                0
              ) * 2,
              40
            )
        )::numeric
      ) AS points,
      w.status,
      w.patient_id,
      w.waiting_since
    FROM public.waiting_list_entries w
    JOIN public.patients p ON p.id = w.patient_id
    LEFT JOIN public.profiles pr ON pr.id = p.profile_id
    LEFT JOIN LATERAL (
      SELECT total_score
      FROM public.priority_evaluations pe
      WHERE pe.waiting_list_entry_id = w.id
      ORDER BY pe.evaluated_at DESC, pe.id DESC
      LIMIT 1
    ) pe ON true
    WHERE w.status IN ('ACTIVE', 'TEMPORARILY_OFFERED', 'ASSIGNED')
  ),
  ranked AS (
    SELECT
      scored.id,
      scored.patient_name,
      scored.points,
      CASE
        WHEN scored.points >= 70 THEN 'Alta'
        WHEN scored.points >= 35 THEN 'Media'
        ELSE 'Baja'
      END AS priority_level,
      scored.status,
      scored.patient_id,
      row_number() OVER (
        ORDER BY scored.points DESC, scored.waiting_since ASC, scored.id ASC
      )::integer AS position
    FROM scored
  )
  SELECT
    ranked.id,
    ranked.position,
    ranked.patient_name,
    ranked.points,
    ranked.priority_level,
    ranked.status::text,
    COALESCE(
      ranked.patient_id = (SELECT current_patient.id FROM current_patient),
      false
    ) AS is_current_patient
  FROM ranked
  ORDER BY ranked.position;
$$;

GRANT EXECUTE ON FUNCTION public.get_patient_priority_board() TO authenticated;
