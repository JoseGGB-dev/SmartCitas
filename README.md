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

## Estructura

```text
src/
  components/      Componentes reutilizables de interfaz
  integrations/    Cliente y tipos de Supabase
  lib/api/         Funciones de acceso a datos
  routes/          Pantallas y rutas de la aplicacion
  styles.css       Estilos globales
supabase/
  migrations/      Esquema, funciones y politicas de base de datos
docs/              Documentacion tecnica del proyecto
api/               Servicio Java conservado como referencia tecnica
public/            Recursos publicos de la aplicacion
```

## Variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

No uses claves `service_role` en variables `VITE_` ni en el frontend.

## Requisitos

- Node.js 22 o superior.
- npm.
- Proyecto Supabase configurado.
- Migraciones SQL aplicadas desde `supabase/migrations`.

## Instalacion

Con Docker:

```bash
docker compose up --build
```

Sin Docker:

```bash
npm install
npm run dev
```

Antes de ejecutar la aplicacion, aplicar las migraciones ubicadas en `supabase/migrations` y configurar las variables publicas de Supabase.

## Ejecucion local

```bash
npm run dev
```

La aplicacion queda disponible por defecto en `http://localhost:3000`.

## Build

```bash
npm run typecheck
npm run lint
npm run build
```

## Roles

- `PATIENT`: crea solicitudes, ve ofertas, confirma o rechaza citas y consulta su prioridad.
- `OPERATOR`: crea cupos, consulta lista de espera y ejecuta reasignacion.
- `DOCTOR`: consulta agenda y marca citas completadas.
- `AUDITOR`: consulta auditoria y evaluaciones sin modificar datos.
- `ADMIN`: administra pacientes, medicos, catalogos, usuarios, roles, estadisticas y auditoria.

Los roles se guardan en `public.user_roles` de Supabase y se normalizan a `ADMIN`, `AUDITOR`, `DOCTOR`, `OPERATOR` y `PATIENT` en el frontend.

## Seguridad y RLS

El proyecto utiliza Row Level Security en Supabase para limitar lectura y escritura de tablas por propietario y por roles operativos. Las migraciones incluyen politicas para pacientes, citas, cupos, auditoria, catalogos, medicos y prioridad.

Para despliegues reales, revisa siempre que:

- El registro de usuarios este configurado correctamente en Supabase Auth.
- No exista ninguna clave `service_role` en el frontend.
- Las politicas RLS esten aplicadas en el proyecto remoto.
- Los archivos `.env` no esten versionados.

## Comandos

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Despliegue

Crear un servicio `smartcitas-web` con la raiz del repositorio y configurar las variables publicas de Supabase. No guardar secretos en Git y no exponer `service_role` en variables `VITE_`.

## Estado del proyecto

Version funcional preparada para exposicion universitaria. El frontend compila, pasa TypeScript, lint, formato y build de produccion. Antes de usarlo en produccion real se recomienda ampliar pruebas automatizadas y revisar politicas RLS con usuarios reales de prueba.

## Proximas mejoras

- Agregar pruebas end-to-end para registro, login, roles y prioridad.
- Implementar recuperacion de contrasena.
- Agregar paginacion real en listados administrativos.
- Consolidar migraciones SQL para despliegues nuevos.
- Mejorar code splitting para reducir el tamano de bundles.

## Documentacion

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/DATABASE.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `docs/ROADMAP.md`
