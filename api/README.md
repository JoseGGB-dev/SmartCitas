# EsSalud SmartCitas API

Servicio Spring Boot conservado como referencia historica de EsSalud SmartCitas. La aplicacion web actual funciona directamente con Supabase.

## Ejecucion local

```bash
cp .env.example .env
mvn spring-boot:run
```

Este servicio no forma parte del flujo de ejecucion del frontend actual.

## Variables

```env
SPRING_PROFILES_ACTIVE=local
DATABASE_URL=jdbc:postgresql://tu-host-postgres:5432/smartcitas
DATABASE_USERNAME=
DATABASE_PASSWORD=
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_JWT_ISSUER=https://TU-PROYECTO.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
CORS_ALLOWED_ORIGINS=https://tu-dominio-frontend
```

El proveedor de notificaciones incluido registra intentos de envio en la base de datos.
