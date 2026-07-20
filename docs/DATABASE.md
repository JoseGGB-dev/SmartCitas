# Base de Datos

Motor: Supabase Database sobre PostgreSQL.

Migraciones: `supabase/migrations`.

## Tablas principales

- `profiles`
- `user_roles`
- `patients`
- `facilities`
- `specialties`
- `doctors`
- `doctor_specialties`
- `medical_slots`
- `appointment_requests`
- `waiting_list_entries`
- `priority_evaluations`
- `appointments`
- `slot_offers`
- `notification_attempts`
- `audit_logs`

## Datos medicos del paciente

La tabla `patients` conserva los datos usados por la priorizacion:

- `disease`: enfermedad principal registrada.
- `chronic_condition`: indica si la enfermedad es cronica.
- `vulnerability_condition`: indica condicion adicional de vulnerabilidad.
- `priority_points`: puntaje vigente calculado.
- `priority_level`: nivel `Alta`, `Media` o `Baja`.
- `registered_at`: fecha base de registro para ordenamiento.

## Restricciones clave

- Documentos de paciente unicos cuando existen.
- Nivel de prioridad restringido a `Alta`, `Media` o `Baja`.
- Capacidad disponible no negativa y no mayor que la capacidad total.
- Una cita activa por paciente y cupo.
- Una oferta pendiente por cupo.
- Una oferta pendiente por entrada de lista de espera.
- Idempotencia unica por paciente y clave.

## Indices

Incluye indices para busqueda por paciente, documento, estado de cupos, estado de citas, especialidad, fecha de cupo, lista de espera, puntaje y auditoria.

## Roles

- `patient`
- `operator`
- `doctor`
- `auditor`
- `admin`

El frontend normaliza estos valores a `PATIENT`, `OPERATOR`, `DOCTOR`, `AUDITOR` y `ADMIN`.
