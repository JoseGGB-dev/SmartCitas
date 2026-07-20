# Capa de Datos

La aplicacion ya no consume una API REST local. Los componentes usan funciones estables en `src/lib/api/*`, y esas funciones consultan Supabase directamente.

## Adaptadores

- `auth.ts`: `supabase.auth.getUser()` y `profiles`/`user_roles`.
- `catalogs.ts`: `specialties`, `facilities`.
- `patients.ts`: `appointment_requests`, `waiting_list_entries`, `appointments`, `slot_offers`, tablero de prioridad.
- `operator.ts`: `waiting_list_entries`, `medical_slots`, `priority_evaluations`, `slot_offers`, `appointments`.
- `doctor.ts`: `medical_slots`, `appointments`.
- `admin.ts`: `profiles`, `user_roles`, `patients`, prioridades, `audit_logs`, estadisticas agregadas.
- `auditor.ts`: `audit_logs`, `priority_evaluations`.

## Contratos

Los nombres de funciones y los tipos de respuesta se mantienen compatibles con React Query:

- Listas: `PageResponse<T>`.
- Usuario: `UserProfile` con `id`, `email`, `name` y `roles: RoleCode[]`.
- Roles soportados: `ADMIN`, `AUDITOR`, `DOCTOR`, `OPERATOR`, `PATIENT`.

## Errores

Las consultas lanzan errores de Supabase o `ApiError` cuando falla autenticacion/autorizacion local del adaptador.
