# Roadmap

## Implementado

- Frontend React + TanStack Start conectado directamente a Supabase.
- Supabase Auth como proveedor de identidad.
- Supabase Database con migraciones SQL y RLS.
- Roles normalizados para paciente, operador, medico, auditor y administrador.
- Paneles separados por rol.
- Gestion de pacientes, medicos y catalogos desde administracion.
- Solicitudes, lista de espera, cupos, ofertas, citas, evaluaciones y auditoria persistentes.
- Vista de perfil y prioridad para pacientes.
- Docker Compose para ejecutar el frontend.
- Documentacion tecnica inicial.

## Siguientes mejoras

- Mover `assignNextPatient` a una Edge Function o funcion SQL transaccional para concurrencia estricta.
- Agregar cobertura automatizada de interfaz y flujos de datos.
- Crear expiracion programada de ofertas pendientes.
- Parametrizar reglas por especialidad y sede.
- Agregar proveedor real de notificaciones autorizado.
- Incorporar cola asincrona y reintentos.
- Medir tiempos de espera y tasa de reasignacion.
- Integracion futura con sistemas institucionales.
- Observabilidad avanzada, backups, restauracion y evaluacion de capacidad.
