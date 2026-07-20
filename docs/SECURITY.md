# Seguridad

## Autenticacion

Supabase Auth administra el inicio de sesion, registro y renovacion de sesion. El navegador usa la clave publicable de Supabase.

No usar `service_role` en variables del frontend.

## Autorizacion

Los permisos se aplican con Row Level Security en Supabase.

- `PATIENT`: puede ver sus datos, actualizar su perfil y consultar su prioridad.
- `OPERATOR`: puede gestionar cupos, lista de espera y asignacion.
- `DOCTOR`: puede consultar agenda y completar citas asignadas.
- `AUDITOR`: puede consultar auditoria y evaluaciones.
- `ADMIN`: puede gestionar pacientes, medicos, catalogos, roles, estadisticas y auditoria.

No se confia en ocultar botones como mecanismo de seguridad.

## Datos sensibles

- No registrar tokens, contrasenas, historias clinicas ni diagnosticos.
- Pacientes ven su posicion y nivel de prioridad, no reglas internas completas de otros pacientes.
- Auditoria registra acciones administrativas y operativas relevantes.

## Concurrencia

La fase actual usa restricciones unicas, version de cupos e idempotencia. Para concurrencia estricta de asignacion masiva, mover `assignNextPatient` a una Edge Function o funcion SQL transaccional.
