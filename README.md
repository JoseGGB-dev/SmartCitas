# SmartCitas

Sistema para gestionar listas de espera, cupos medicos liberados, prioridad de atencion y reasignaciones trazables con React, Supabase Auth y Supabase Database.

## Funcionalidades

- Registro y actualizacion de pacientes.
- Gestion de solicitudes de citas medicas.
- Ranking de prioridad basado en puntaje.
- Panel de administracion de pacientes, medicos y catalogos.
- Autenticacion y autorizacion por roles.
- Gestion operativa de cupos y lista de espera.
- Auditoria de acciones relevantes del sistema.

## Problema que resuelve

SmartCitas reduce el uso de procesos manuales para gestionar listas de espera medicas. El sistema registra pacientes, centraliza solicitudes, calcula prioridad mediante reglas auditables y muestra el orden de atencion de forma clara para pacientes y personal autorizado.

## Arquitectura

```text
Usuario
  -> Frontend React + TanStack Start
  -> Supabase Auth
  -> Supabase Database + RLS
```

La aplicacion funciona con Supabase como capa de autenticacion, persistencia y control de acceso. La carpeta `api/` se conserva como referencia historica y no participa en la ejecucion del frontend.

## Tecnologias

- Frontend: React 19, TypeScript, TanStack Start, TanStack Router, TanStack Query, Tailwind CSS 4.
- Servicios administrados: Supabase Auth, Supabase Database, Row Level Security.
- Infraestructura: Docker, Docker Compose, Railway, GitHub Actions.

