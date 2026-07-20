# Despliegue

## Railway

Crear un servicio:

1. `smartcitas-web`

## smartcitas-web

Root directory: raiz del repositorio.

Variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Health check:

```text
/health
```

## Supabase

Aplicar las migraciones de `supabase/migrations` y configurar:

- Site URL: dominio publico del frontend.
- Redirect URLs: dominio del frontend y dominio Railway.
- Google OAuth si se usa proveedor Google.
- Roles en `public.user_roles`: `admin`, `auditor`, `doctor`, `operator`, `patient`.

No usar `service_role` en variables `VITE_`.
