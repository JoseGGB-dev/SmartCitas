# Auditoria funcional SmartCitas

Fecha de revision: 2026-07-20  
Proyecto: SmartCitas  
Alcance: frontend React/TypeScript, integracion Supabase, migraciones SQL, RLS, documentacion y modulo Java `api/` conservado como referencia.

## 1. Resumen ejecutivo

SmartCitas es una aplicacion React con TanStack Start, React Query y Supabase Auth/Database. El proyecto compila con TypeScript y el build de produccion pasa fuera del sandbox. La arquitectura actual depende de Supabase para autenticacion, datos y autorizacion mediante RLS.

El sistema no esta listo para produccion. Los riesgos principales estan en autorizacion por roles/RLS demasiado amplia para personal medico, flujo de registro todavia fragil frente a configuracion de Supabase, lint fallando por formato, ausencia de pruebas automatizadas funcionales reales en frontend, y rutas privadas protegidas solo por sesion a nivel router, dejando la autorizacion fina en servicios y RLS.

No se modifico codigo funcional durante esta auditoria. Unicamente se genero este informe solicitado.

## 2. Estado general del proyecto

| Area          | Estado                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Instalacion   | `node_modules` y `package-lock.json` presentes. No se ejecuto `npm install` para evitar cambios.         |
| TypeScript    | Correcto. `npm.cmd run typecheck` pasa.                                                                  |
| Lint          | Falla por formato Prettier en 3 archivos.                                                                |
| Test frontend | `npm test` ejecuta solo `typecheck`; no hay pruebas funcionales reales.                                  |
| Build         | Pasa fuera del sandbox; dentro del sandbox falla por `EPERM readlink C:\Users\JoseG`.                    |
| Supabase      | Cliente configurado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.                           |
| Backend Java  | Existe carpeta `api/`, README indica que es referencia historica. No se pudo testear por falta de Maven. |
| Produccion    | No apto sin corregir hallazgos altos.                                                                    |

## 3. Tecnologias realmente encontradas

- React 19.2.7
- TypeScript 5.9.3
- Vite 8.1.4
- TanStack Start 1.168.27
- TanStack Router 1.170.17
- TanStack React Query 5.101.2
- Supabase JS 2.110.2
- Tailwind CSS 4.3.2 mediante `@tailwindcss/vite`
- Sonner para notificaciones
- Lucide React para iconos
- ESLint 9 y Prettier 3
- Nitro para salida server
- Spring Boot 3.3.5 en carpeta `api/` historica

## 4. Comandos ejecutados

| Comando                                | Resultado                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `Get-ChildItem -Force`                 | Estructura inspeccionada.                                                 |
| `rg --files`                           | Inventario de archivos obtenido.                                          |
| `npm.cmd run typecheck`                | Pasa.                                                                     |
| `npm.cmd run lint`                     | Falla por Prettier.                                                       |
| `npm.cmd test`                         | Pasa, pero solo ejecuta typecheck.                                        |
| `npm.cmd run build`                    | Falla en sandbox por permisos Nitro; pasa con permisos fuera del sandbox. |
| `npm.cmd run format:check`             | Falla en 3 archivos.                                                      |
| `npm.cmd audit --audit-level=moderate` | Pasa fuera del sandbox: 0 vulnerabilidades.                               |
| `mvn.cmd test` en `api/`               | No verificable: Maven no esta instalado.                                  |

## 5. Resultado de instalacion

No se ejecuto instalacion porque el repositorio ya contiene `node_modules` y `package-lock.json`. Ejecutar `npm install` podria modificar el lockfile y la regla de esta etapa indica no modificar archivos.

Gestor detectado: npm.

## 6. Resultado de lint

`npm.cmd run lint` falla.

Archivos afectados:

- `src/lib/api/admin.ts`
- `src/lib/api/supabase-api.ts`
- `src/routes/auth.tsx`

Tipo de error: formato Prettier. No se corrigio por instruccion de no modificar codigo.

## 7. Resultado de TypeScript

`npm.cmd run typecheck` pasa sin errores.

## 8. Resultado de pruebas

`npm test` pasa, pero el script solo ejecuta `npm run typecheck`. No existen pruebas unitarias, integracion o E2E reales para el frontend.

El modulo Java contiene pruebas en:

- `api/src/test/java/com/smartcitas/common/StateTransitionServiceTest.java`
- `api/src/test/java/com/smartcitas/priority/PriorityCalculationServiceTest.java`

No se pudieron ejecutar porque Maven no esta disponible en el entorno.

## 9. Resultado del build

Primer intento dentro del sandbox: falla con `EPERM: operation not permitted, readlink 'C:\Users\JoseG'` en plugin `nitro:externals`.

Segundo intento fuera del sandbox: pasa correctamente.

Advertencia relevante:

- Chunks mayores a 500 kB, especialmente paquetes de TanStack/Supabase. Recomendado revisar code splitting.

## 10. Inventario de rutas

### Publicas

| Ruta      | Archivo                 | Funcion           |
| --------- | ----------------------- | ----------------- |
| `/`       | `src/routes/index.tsx`  | Inicio publico.   |
| `/auth`   | `src/routes/auth.tsx`   | Login y registro. |
| `/health` | `src/routes/health.tsx` | Estado tecnico.   |

### Privadas base

| Ruta              | Archivo                                   | Proteccion                                      |
| ----------------- | ----------------------------------------- | ----------------------------------------------- |
| `/_authenticated` | `src/routes/_authenticated/route.tsx`     | Verifica usuario con `supabase.auth.getUser()`. |
| `/dashboard`      | `src/routes/_authenticated/dashboard.tsx` | Redirige segun rol.                             |

### Paciente

| Ruta                 | Archivo                                           |
| -------------------- | ------------------------------------------------- |
| `/patient/dashboard` | `src/routes/_authenticated/patient/dashboard.tsx` |
| `/patient/profile`   | `src/routes/_authenticated/patient/profile.tsx`   |
| `/patient/priority`  | `src/routes/_authenticated/patient/priority.tsx`  |

### Administrador

| Ruta                | Archivo                                          |
| ------------------- | ------------------------------------------------ |
| `/admin/dashboard`  | `src/routes/_authenticated/admin/dashboard.tsx`  |
| `/admin/patients`   | `src/routes/_authenticated/admin/patients.tsx`   |
| `/admin/priorities` | `src/routes/_authenticated/admin/priorities.tsx` |
| `/admin/doctors`    | `src/routes/_authenticated/admin/doctors.tsx`    |
| `/admin/catalogs`   | `src/routes/_authenticated/admin/catalogs.tsx`   |

### Otros roles

| Ruta                  | Archivo                                            |
| --------------------- | -------------------------------------------------- |
| `/operator/dashboard` | `src/routes/_authenticated/operator/dashboard.tsx` |
| `/doctor/dashboard`   | `src/routes/_authenticated/doctor/dashboard.tsx`   |
| `/auditor/dashboard`  | `src/routes/_authenticated/auditor/dashboard.tsx`  |

## 11. Inventario de funcionalidades

### Implementada y comprobada estaticamente

- Inicio de sesion con Supabase Auth.
- Registro de usuario con Supabase Auth.
- Persistencia de sesion mediante Supabase client.
- Cierre de sesion con limpieza de React Query.
- Dashboard y redireccion por rol.
- Perfil de paciente.
- Solicitudes de cita de paciente.
- Ofertas de cupo: aceptar/rechazar.
- Tabla de prioridad del paciente.
- Panel admin: usuarios, estadisticas, auditoria.
- Panel admin: pacientes.
- Panel admin: prioridad.
- Panel admin: medicos.
- Panel admin: catalogos.
- Operador: cupos, lista de espera, asignacion.
- Doctor: agenda y completar citas.
- Auditor: logs y evaluaciones.

### Implementada parcialmente

- Autorizacion por rol en rutas: existe en servicios y RLS, pero no en `beforeLoad` de rutas especificas.
- Registro: depende de configuracion externa de Supabase y triggers SQL; ha presentado errores 400/500 durante pruebas manuales del usuario.
- Prioridad: existe algoritmo SQL y funcion TypeScript auxiliar; riesgo de divergencia.
- Build: pasa fuera del sandbox, pero falla dentro por permisos ambientales.
- Tests: solo typecheck; no hay pruebas funcionales.

### Declarada, pero no encontrada

- Recuperacion de contrasena.
- Cambio de contrasena.
- Eliminacion de pacientes desde UI.
- Paginacion real en tablas.
- Confirmaciones antes de operaciones sensibles.

### Encontrada, pero no funcional o riesgosa

- `npm run lint` falla.
- Fallback de registro intenta login ante cualquier 400 en `src/routes/auth.tsx`.
- RLS de citas permite a cualquier `doctor` actualizar cualquier cita por rol.
- Vista de prioridad del paciente muestra nombres/enfermedad de otros pacientes.

### No verificable

- Registro real contra Supabase actual sin acceso al dashboard y logs internos.
- RLS en ambiente remoto aplicado exactamente en orden actual.
- Tests Java por falta de Maven.
- Flujos E2E en navegador con usuarios reales de prueba.

### Funcionalidad adicional no documentada exhaustivamente

- Modulo Java `api/` de referencia.
- Endpoints de salud.
- Auditoria en `audit_logs`.
- Gestion de medicos y catalogos.

## 12. Matriz de trazabilidad

| Codigo | Funcionalidad                 | Rol            | Ruta                                     | Archivos                     | Tablas/servicios                   | Estado          | Evidencia                             | Problema                                                                                              | Severidad | Recomendacion                                           |
| ------ | ----------------------------- | -------------- | ---------------------------------------- | ---------------------------- | ---------------------------------- | --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| RF-01  | Registro de usuarios          | Visitante      | `/auth`                                  | `auth.tsx`                   | Supabase Auth, `handle_new_user`   | Parcial         | `signUp` implementado                 | Depende de signup habilitado y trigger; fallback 400 confuso                                          | Alto      | Corregir manejo de errores y validar configuracion Auth |
| RF-02  | Inicio de sesion              | Visitante      | `/auth`                                  | `auth.tsx`                   | Supabase Auth                      | Cumple parcial  | `signInWithPassword`                  | Sin pruebas automatizadas                                                                             | Medio     | Agregar tests                                           |
| RF-03  | Cierre de sesion              | Autenticado    | AppShell                                 | `app-shell.tsx`              | Supabase Auth                      | Cumple          | `signOut`, `queryClient.clear()`      | No probado E2E                                                                                        | Bajo      | Test E2E                                                |
| RF-04  | Persistencia de sesion        | Autenticado    | global                                   | `client.ts`, `__root.tsx`    | Supabase Auth                      | Cumple parcial  | `persistSession`, `onAuthStateChange` | No probado navegador                                                                                  | Bajo      | Test recarga                                            |
| RF-05  | Proteccion de rutas           | Autenticado    | `/_authenticated`                        | `_authenticated/route.tsx`   | Supabase Auth                      | Parcial         | `getUser()`                           | Solo valida sesion, no rol por ruta                                                                   | Alto      | `beforeLoad` por rol                                    |
| RF-06  | Control de acceso por roles   | Todos          | varias                                   | `supabase-api.ts`, RLS       | `user_roles`                       | Parcial         | `requireRole`, RLS                    | Rutas visualmente accesibles si hay sesion; RLS amplia para staff                                     | Alto      | Endurecer rutas y politicas                             |
| RF-07  | Creacion del perfil           | Paciente       | `/auth`                                  | SQL triggers                 | `profiles`, `patients`             | Parcial         | `handle_new_user`                     | Historial de errores 500; multiples migraciones redefinen funcion                                     | Alto      | Consolidar migraciones                                  |
| RF-08  | Actualizacion del perfil      | Paciente       | `/patient/profile`                       | `patients.ts`, `profile.tsx` | `patients`, `profiles`             | Cumple parcial  | Update implementado                   | No valida fecha futura/longitudes/DNI duplicado antes de enviar                                       | Medio     | Validaciones y mensajes especificos                     |
| RF-09  | Consulta informacion personal | Paciente       | `/patient/profile`                       | `patients.ts`                | `patients`                         | Cumple parcial  | Filtra por paciente actual            | RLS staff amplia                                                                                      | Medio     | Revisar minimizacion                                    |
| RF-10  | Registro admin de pacientes   | Admin          | `/admin/patients`                        | `admin.ts`, `patients.tsx`   | `patients`                         | Cumple parcial  | Insert implementado                   | No crea usuario Auth asociado                                                                         | Medio     | Definir si paciente admin requiere cuenta               |
| RF-11  | Listado de pacientes          | Admin          | `/admin/patients`                        | `admin.ts`                   | `patients`                         | Cumple          | Query con busqueda                    | Sin paginacion real                                                                                   | Bajo      | Paginacion server                                       |
| RF-12  | Actualizacion pacientes       | Admin          | `/admin/patients`                        | `admin.ts`                   | `patients`                         | Cumple parcial  | Update implementado                   | Mensajes genericos                                                                                    | Bajo      | Errores especificos                                     |
| RF-13  | Gestion de estado             | Admin          | `/admin/patients`                        | `patients.tsx`               | `patients.active`                  | Cumple parcial  | Checkbox activo                       | Sin confirmacion                                                                                      | Bajo      | Confirmacion para desactivar                            |
| RF-14  | Calculo prioridad             | Admin/Operador | SQL / operador                           | `priority.ts`, SQL           | `patients`, `waiting_list_entries` | Cumple parcial  | SQL y TS existen                      | Doble fuente de verdad potencial                                                                      | Medio     | Unificar formula                                        |
| RF-15  | Tabla ordenada prioridad      | Paciente/Admin | `/patient/priority`, `/admin/priorities` | SQL RPC                      | `get_patient_priority_board`       | Cumple parcial  | Orden por puntos, registro, id        | Muestra datos de otros pacientes                                                                      | Alto      | Anonimizar vista paciente                               |
| RF-16  | Posicion paciente             | Paciente       | `/patient/priority`                      | `priority.tsx`               | RPC                                | Cumple          | `isCurrentPatient`                    | No probado live                                                                                       | Bajo      | Test E2E                                                |
| RF-17  | Proteccion RLS                | Todos          | DB                                       | migraciones                  | todas                              | Parcial         | RLS habilitado                        | Politicas staff demasiado amplias                                                                     | Alto      | Principio de menor privilegio                           |
| RF-18  | Manejo de errores             | Todos          | varias                                   | UI/API                       | Supabase                           | Parcial         | ErrorPanel/toasts                     | Algunos errores genericos; console.error global                                                       | Medio     | Normalizar errores                                      |
| RF-19  | Estados de carga              | Todos          | varias                                   | `LoadingPanel`               | React Query                        | Cumple          | LoadingPanel usado                    | No todos los botones bloquean doble envio por caso                                                    | Bajo      | Revisar mutaciones                                      |
| RF-20  | Datos demostracion            | Todos          | SQL                                      | migraciones                  | catalogs                           | Parcial         | seeds de catalogos                    | Nombres contienen Demo en datos existentes capturados por usuario; SQL actual contiene catalogos base | Medio     | Limpiar base remota                                     |
| RF-21  | Build produccion              | DevOps         | N/A                                      | Vite/Nitro                   | N/A                                | Cumple con nota | Build pasa fuera sandbox              | Advertencia chunks grandes                                                                            | Bajo      | Code splitting                                          |
| RF-22  | Responsive                    | Todos          | UI                                       | Tailwind                     | N/A                                | Parcial         | Tablas con overflow                   | No validado en navegador real                                                                         | Bajo      | QA visual                                               |
| RF-23  | Medicos                       | Admin          | `/admin/doctors`                         | `admin.ts`, `doctors.tsx`    | `doctors`, `doctor_specialties`    | Parcial         | CRUD implementado                     | Rollback manual parcial si falla especialidad                                                         | Medio     | Transaccion RPC                                         |
| RF-24  | Catalogos                     | Admin          | `/admin/catalogs`                        | `admin.ts`, `catalogs.tsx`   | `specialties`, `facilities`        | Parcial         | CRUD implementado                     | Depende de migraciones recientes                                                                      | Medio     | Validar remoto                                          |
| RF-25  | Auditoria                     | Admin/Auditor  | dashboards                               | `auditor.ts`, `admin.ts`     | `audit_logs`                       | Parcial         | Insert y lectura                      | Cualquier autenticado puede insertar audit_logs                                                       | Alto      | Restringir insert o validar actor                       |

## 13. Revision por rol

### Visitante

Puede acceder a `/`, `/auth`, `/health`. Rutas privadas redirigen a `/auth` si no hay usuario.

Riesgo: no se verifico E2E en navegador con redireccion real.

### Paciente

Puede ver dashboard, perfil, solicitudes, citas, ofertas y prioridad.

Riesgo alto: la tabla de prioridad de paciente muestra nombres y enfermedad de otros pacientes (`src/routes/_authenticated/patient/priority.tsx:89`, SQL `patient_name` y `disease`). Esto puede exponer datos personales y de salud.

### Administrador

Puede consultar usuarios, pacientes, prioridad, medicos, catalogos, estadisticas y auditoria.

Riesgo: rol admin se normaliza como exclusivo en frontend, pero la integridad depende de migraciones/triggers recientes.

### Operador

Puede gestionar cupos y asignar pacientes. La asignacion calcula prioridad en frontend TypeScript con limite de 20 candidatos.

Riesgo: selecciona solo primeros 20 por `waiting_since` y luego ordena por score; podria excluir un paciente con mayor prioridad si no cae dentro de esos 20.

### Doctor

Puede ver agenda y completar citas.

Riesgo alto: `completeAppointment` actualiza antes de validar pertenencia (`src/lib/api/doctor.ts:79` y validacion posterior en `:85`). RLS permite update a todo doctor por rol.

### Auditor

Puede ver auditoria y evaluaciones. No se observan mutaciones en auditor.

## 14. Revision de autenticacion

### Registro

Implementado en `src/routes/auth.tsx`.

Validaciones existentes:

- DNI de 8 digitos.
- Telefono 7 a 15 digitos.
- Email por input HTML.
- Password muestra recomendacion de 8 caracteres, pero no se valida localmente.
- Boton deshabilitado con `loading`.

Problemas:

- El codigo intenta login ante cualquier error `400` de signup (`src/routes/auth.tsx:119`), lo que genero error adicional `/token 422`.
- No valida contrasena minima localmente antes de enviar.
- No valida fecha futura.
- No valida duplicidad de DNI antes de signup.
- Depende de que Supabase tenga `Enable signups` activo y `Confirm email` desactivado.
- Triggers de signup fueron redefinidos en varias migraciones, lo que aumenta riesgo de drift.

### Inicio de sesion

Implementado con `supabase.auth.signInWithPassword`.

Problemas:

- No hay pruebas negativas automatizadas.
- Mensajes de error traducidos, pero pueden revelar si un correo existe segun respuesta de Supabase.

### Sesion

Supabase client usa `persistSession`, `autoRefreshToken`, `detectSessionInUrl`. `RootComponent` invalida router/query en cambios de Auth. `AppShell` limpia React Query al cerrar sesion.

### Recuperacion de contrasena

No encontrada.

## 15. Revision de perfiles

Perfil paciente implementado en:

- `src/routes/_authenticated/patient/profile.tsx`
- `src/lib/api/patients.ts`

Cumple:

- Carga perfil.
- Actualiza `patients`.
- Sincroniza parte de `profiles`.
- Valida DNI y telefono.
- Usa loading y error panel.

Debilidades:

- No valida fecha futura.
- No valida longitudes maximas.
- No normaliza espacios de todos los campos antes de guardar.
- No muestra errores especificos de duplicidad de DNI.
- `writeAudit` no verifica errores al insertar auditoria.

## 16. Revision de pacientes admin

Implementado en:

- `src/routes/_authenticated/admin/patients.tsx`
- `src/lib/api/admin.ts`

Cumple:

- Listado.
- Busqueda por nombre, DNI, correo.
- Crear paciente.
- Editar paciente.
- Estado activo.
- Invalidacion de query tras guardar.

No implementado:

- Eliminacion.
- Paginacion real.
- Confirmacion antes de desactivar.
- Creacion de usuario Auth asociado desde admin.

## 17. Revision de prioridad

Prioridad real de tabla:

- SQL `public.get_patient_priority_board()` en `supabase/migrations/20260720100000_medical_priority_management.sql`
- Puntos: edad >=65: 25, edad >=50: 12, cronica: 25, vulnerabilidad: 15, dias espera * 2 con maximo 40.
- Orden: puntos desc, `registered_at` asc, `id` asc.
- Nivel: `calculate_priority_level`: Alta >=70, Media >=35, Baja resto.

Prioridad operador:

- `src/lib/priority.ts` y `src/lib/api/operator.ts`
- Misma formula aparente.
- Riesgo: `assignNextPatient` trae 20 candidatos ordenados por espera y luego ordena en memoria por score. Esto no garantiza elegir el mayor score global.

Almacenamiento:

- `patients.priority_points` y `patients.priority_level` pueden actualizarse por `recalculate_patient_priority`.
- La tabla de prioridad calcula dinamicamente aunque existan columnas almacenadas.

Manipulacion:

- Paciente puede actualizar condicion cronica/vulnerabilidad en su perfil, lo cual afecta prioridad. Es funcional, pero requiere validacion o revision administrativa si el proceso real lo exige.

## 18. Revision de React Query

Fortalezas:

- Query keys por dominio: `patient`, `admin`, `operator`, `doctor`, `catalog`.
- Invalidaciones tras mutaciones principales.
- Loading/error/empty states recurrentes.

Debilidades:

- No hay estrategia global de retry/staleTime.
- Algunas mutaciones hacen varias escrituras secuenciales sin transaccion.
- Errores parciales pueden dejar datos inconsistentes.
- `writeAudit` no propaga errores porque no revisa resultado.
- Registro usa estado `loading` compartido para login y signup; correcto visualmente, pero puede confundir si se alternan tabs.

## 19. Revision de Supabase

Cliente:

- `src/integrations/supabase/client.ts`
- Usa publishable key desde `VITE_SUPABASE_PUBLISHABLE_KEY`.
- No se encontro `service_role` en frontend.

Variables:

- `.env.local` contiene `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_API_URL`.
- `VITE_API_URL` es residual y debe eliminarse si no se usa backend local.

Consultas:

- Predominan selects especificos.
- Algunos `select("*")` en servicios internos (`getOrCreatePatient`, `currentDoctor`, `acceptOffer`) deben revisarse por minimizacion.

## 20. Revision de base de datos

Tablas encontradas:

- `profiles`
- `user_roles`
- `specialties`
- `facilities`
- `patients`
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

Funciones:

- `has_role`
- `has_any_role`
- `handle_new_user`
- `calculate_priority_level`
- `get_patient_priority_board`
- `recalculate_patient_priority`
- `metadata_boolean`
- `cleanup_admin_extra_roles`

Triggers:

- `on_auth_user_created`
- `profiles_set_updated_at`
- `cleanup_admin_extra_roles_on_change`

Indices/restricciones relevantes:

- `patients.profile_id` unico inicial, luego se permite null.
- `uq_patients_document_number`
- `doctors.profile_id` unico.
- `doctors.professional_license` unico.
- `doctor_specialties` PK compuesta.
- Unicos para citas/ofertas activas.

## 21. Revision de RLS

RLS esta activado en tablas principales. Evaluacion resumida:

| Tabla                | RLS | Lectura             | Escritura                                          | Observacion                                      |
| -------------------- | --- | ------------------- | -------------------------------------------------- | ------------------------------------------------ |
| profiles             | Si  | propietario o staff | propietario/admin                                  | Staff ve perfiles completos.                     |
| user_roles           | Si  | propietario o admin | admin                                              | Correcto en intencion.                           |
| specialties          | Si  | autenticados        | admin                                              | Catalogo publico para autenticados.              |
| facilities           | Si  | autenticados        | admin                                              | Catalogo publico para autenticados.              |
| patients             | Si  | propietario o staff | propietario/admin/operator                         | Staff amplio puede ver PII.                      |
| doctors              | Si  | todos autenticados  | admin/operator                                     | Lectura global aceptable si no hay PII sensible. |
| doctor_specialties   | Si  | autenticados        | admin/operator                                     | Correcto.                                        |
| medical_slots        | Si  | autenticados        | admin/operator                                     | Lectura global de cupos.                         |
| appointment_requests | Si  | propietario o staff | propietario/admin/operator                         | Staff amplio.                                    |
| waiting_list_entries | Si  | propietario o staff | propietario/admin/operator                         | Staff amplio.                                    |
| priority_evaluations | Si  | staff               | admin/operator insert                              | Paciente no ve evaluaciones.                     |
| appointments         | Si  | propietario o staff | propietario/admin/operator insert, staff update    | Doctor puede actualizar cualquier cita.          |
| slot_offers          | Si  | propietario o staff | admin/operator insert, owner/admin/operator update | Paciente puede actualizar su oferta.             |
| audit_logs           | Si  | admin/auditor       | cualquier autenticado insert                       | Insert demasiado amplio.                         |

## 22. Revision de seguridad

### Hallazgos principales

#### SC-SEC-01: Doctor puede actualizar citas ajenas

- Severidad: Alto
- Archivo: `src/lib/api/doctor.ts:73-85`, `supabase/migrations/20260719090000_supabase_only_smartcitas.sql:320`
- Descripcion: la funcion actualiza `appointments.status` antes de validar que la cita pertenece al doctor. La politica RLS permite update a cualquier `doctor`.
- Reproduccion: un usuario doctor llama `completeAppointment(id)` con id de una cita ajena.
- Resultado esperado: rechazo antes de actualizar.
- Resultado obtenido: update puede ejecutarse antes de validacion frontend.
- Riesgo: alteracion no autorizada de citas.
- Solucion: RLS debe validar relacion `appointment -> medical_slot -> doctor.profile_id = auth.uid()`. El frontend debe filtrar antes del update.
- Esfuerzo: Medio.

#### SC-SEC-02: Tabla de prioridad del paciente expone datos de otros pacientes

- Severidad: Alto
- Archivo: `src/routes/_authenticated/patient/priority.tsx:89`, SQL `get_patient_priority_board`
- Descripcion: paciente ve nombres, enfermedad, condiciones y estado de otros pacientes.
- Riesgo: exposicion de datos personales y de salud.
- Solucion: vista paciente debe anonimizar terceros o devolver solo posicion propia y ranking sin PII.
- Esfuerzo: Medio.

#### SC-SEC-03: Audit logs insertables por cualquier autenticado

- Severidad: Alto
- Archivo: `supabase/migrations/20260719090000_supabase_only_smartcitas.sql:339`
- Descripcion: `CREATE POLICY ... FOR INSERT ... WITH CHECK (true)`.
- Riesgo: usuario autenticado podria insertar eventos falsos.
- Solucion: restringir insert a funciones RPC `SECURITY DEFINER` o validar actor/accion.
- Esfuerzo: Medio.

#### SC-SEC-04: Registro maneja cualquier 400 como usuario existente

- Severidad: Medio
- Archivo: `src/routes/auth.tsx:119`
- Descripcion: cualquier `400` dispara intento de login.
- Riesgo: errores confusos, llamadas innecesarias, posible enumeracion.
- Solucion: intentar login solo si `isRegisteredUserError(error.message)`.
- Esfuerzo: Bajo.

#### SC-SEC-05: Rutas privadas no validan rol en `beforeLoad`

- Severidad: Alto
- Archivo: `src/routes/_authenticated/route.tsx`
- Descripcion: solo valida sesion. La proteccion por rol depende de servicios/RLS.
- Riesgo: acceso visual a rutas no permitidas y errores tardios.
- Solucion: `beforeLoad` por grupo de ruta o helper `requireRouteRole`.
- Esfuerzo: Medio.

#### SC-SEC-06: Variable residual `VITE_API_URL`

- Severidad: Bajo
- Archivo: `.env.local`
- Descripcion: variable de backend local/residual existe aunque la app sea Supabase-only.
- Riesgo: confusion operacional.
- Solucion: eliminar cuando se confirme no uso.
- Esfuerzo: Bajo.

#### SC-SEC-07: No hay secretos evidentes en codigo fuente

- Severidad: Informativo
- Evidencia: busqueda de `service_role`, tokens y patrones comunes no encontro secretos completos en codigo. `.env.local` existe y no se imprimieron valores.

## 23. Revision de experiencia de usuario y accesibilidad

Fortalezas:

- Inputs con labels.
- Botones deshabilitados durante cargas principales.
- Estados Loading/Error/Empty.
- Tablas con `overflow-x-auto`.
- 404 personalizada.
- Foco visible por clases Tailwind en botones base.

Debilidades:

- Mensajes de error via toast no estan asociados a campos.
- No hay `aria-live` explicito para errores.
- Tablas grandes dependen de scroll horizontal.
- Formularios no validan fecha futura ni longitudes.
- No hay confirmaciones para acciones sensibles como desactivar pacientes/medicos.
- No se ejecuto QA visual con navegador por falta de entorno controlado y para evitar mutaciones de datos.

## 24. Datos de demostracion encontrados

Busquedas en codigo no encontraron patrones activos `Demo`, `Prueba`, `MVP`, `console.log`, `debugger`, `TODO`, `FIXME`, `localhost:8080`, `/api/v1` ni `apiRequest`.

Observaciones:

- Migracion inicial inserta catalogos base de especialidades y sedes. No se consideran necesariamente datos demo si son catalogo inicial.
- En capturas previas del usuario aparecieron sedes con "Demo"; eso podria existir en la base remota y debe limpiarse directamente en Supabase si sigue presente.
- La carpeta `api/` es backend historico y no participa segun README; requiere decision del equipo para conservarla.

## 25. Deuda tecnica

- Lint/Prettier fallando.
- Varias migraciones redefinen `handle_new_user`; conviene consolidar para produccion.
- Sin pruebas frontend reales.
- Sin test E2E.
- Sin test RLS automatizado.
- Mutaciones multipaso sin transacciones RPC.
- `src/routeTree.gen.ts` es generado; debe excluirse de revisiones manuales.
- `src/integrations/supabase/types.ts` puede quedar desactualizado frente a migraciones recientes.
- `api/` historico aumenta superficie de mantenimiento.

## 26. Funcionalidades no implementadas

- Recuperacion de contrasena.
- Cambio de contrasena.
- Eliminacion de pacientes.
- Paginacion real.
- Confirmaciones para acciones sensibles.
- Panel de gestion de roles desde UI.
- Pruebas automatizadas funcionales.
- Tests RLS.

## 27. Funcionalidades parcialmente implementadas

- Registro.
- Control de rol por ruta.
- Priorizacion.
- Auditoria.
- Gestion de medicos/catalogos.
- Build en sandbox.
- Responsive verificado solo estaticamente.

## 28. Riesgos para produccion

1. Autorizacion RLS insuficiente para doctor en update de citas.
2. Exposicion de informacion de pacientes en tabla de prioridad.
3. Auditoria manipulable por usuarios autenticados.
4. Registro dependiente de configuracion manual de Supabase y trigger complejo.
5. Sin pruebas automatizadas reales.
6. Lint falla.
7. Migraciones acumuladas y parcialmente correctivas sin consolidacion.

## 29. Plan de pruebas recomendado

### Autenticacion

- Registro exitoso con correo nuevo.
- Registro con correo existente.
- Registro con signup deshabilitado.
- Login correcto.
- Login contrasena incorrecta.
- Login usuario inexistente.
- Sesion persistente tras recarga.
- Logout limpia cache y redirige.

### Roles y rutas

- Visitante accede a `/admin/dashboard`.
- Paciente accede directo a `/admin/patients`.
- Admin accede a `/patient/profile`.
- Doctor intenta completar cita ajena.
- Operador intenta editar catalogos si no corresponde.

### Paciente

- Actualizar perfil valido.
- DNI invalido.
- DNI duplicado.
- Telefono invalido.
- Fecha futura.
- Campos con espacios.
- Usuario sin paciente asociado.

### Administrador

- Crear paciente.
- Editar paciente.
- Desactivar paciente.
- Buscar paciente.
- Crear medico con CMP duplicado.
- Crear sede/especialidad con codigo duplicado.

### Prioridad

- Paciente sin solicitud.
- Paciente con solicitud activa.
- Empate de puntos.
- Edad 49, 50, 64, 65.
- Espera >20 dias.
- Cambio de condicion cronica.
- Desactivacion de paciente.
- Verificar que paciente no vea PII ajena.

### RLS

- Tests SQL con usuarios anon, patient, doctor, operator, admin, auditor.
- Intento de update por patient a otro `patient_id`.
- Insert audit falso.
- Doctor update cita ajena.
- Manipular `profile_id`/`patient_id`.

### E2E

- Flujo registro -> perfil -> solicitud -> prioridad.
- Flujo admin crea cupo -> operador asigna -> paciente acepta -> doctor completa.

## 30. Plan de correccion priorizado

| Prioridad | Correccion                                                                  | Severidad | Esfuerzo |
| --------- | --------------------------------------------------------------------------- | --------- | -------- |
| 1         | Corregir RLS de `appointments` para doctor propietario del slot             | Alto      | Medio    |
| 2         | Anonimizar tabla de prioridad para pacientes                                | Alto      | Medio    |
| 3         | Restringir insercion en `audit_logs`                                        | Alto      | Medio    |
| 4         | Agregar guardas por rol en rutas `beforeLoad`                               | Alto      | Medio    |
| 5         | Corregir fallback de signup `authStatus === 400`                            | Medio     | Bajo     |
| 6         | Ejecutar Prettier/lint fix                                                  | Medio     | Bajo     |
| 7         | Consolidar migraciones de `handle_new_user`                                 | Medio     | Alto     |
| 8         | Implementar pruebas frontend y RLS                                          | Medio     | Alto     |
| 9         | Revisar asignacion de prioridad en operador para no limitar a 20 por espera | Medio     | Medio    |
| 10        | Eliminar `VITE_API_URL` residual                                            | Bajo      | Bajo     |

## 31. Conclusion

El sistema no esta apto para produccion en este momento. La base funcional existe y el build pasa, pero hay riesgos de autorizacion y privacidad que deben corregirse antes de una entrega formal.

## 32. Resumen final obligatorio

| Categoria                       | Total |
| ------------------------------- | ----- |
| Funcionalidades revisadas       | 25    |
| Funcionalidades correctas       | 6     |
| Funcionalidades parciales       | 15    |
| Funcionalidades no funcionales  | 1     |
| Funcionalidades no verificables | 3     |
| Errores criticos                | 0     |
| Errores altos                   | 5     |
| Errores medios                  | 7     |
| Errores bajos                   | 5     |
| Pruebas aprobadas               | 3     |
| Pruebas fallidas                | 2     |
| Riesgos para produccion         | 7     |

### Respuestas directas

1. El sistema compila: si, TypeScript pasa.
2. El sistema inicia correctamente: no verificado con servidor dev interactivo; build de produccion pasa fuera del sandbox.
3. La autenticacion funciona: parcialmente; login implementado, registro depende de configuracion Supabase y presenta historial de errores.
4. Los roles estan protegidos: parcialmente; servicios/RLS tienen controles, rutas no validan rol en `beforeLoad`.
5. RLS esta correctamente implementado: parcialmente; existe, pero algunas politicas son demasiado amplias.
6. Los pacientes pueden ver datos ajenos: si, en la tabla de prioridad se muestran nombres/enfermedad de otros pacientes.
7. La tabla de prioridad funciona correctamente: parcialmente; SQL ordena por puntos, pero privacidad y doble fuente de formula requieren correccion.
8. Existen datos de demostracion: no se encontraron en codigo; pueden existir en base remota segun capturas previas.
9. Existen secretos expuestos: no se encontraron en codigo; `.env.local` existe y no se imprimieron valores.
10. El proyecto esta listo para produccion: no.
11. Cinco correcciones mas urgentes:
    - Endurecer RLS de citas para doctores.
    - Anonimizar prioridad visible a pacientes.
    - Restringir escritura de auditoria.
    - Agregar proteccion por rol en rutas.
    - Corregir flujo de registro y errores de signup.
