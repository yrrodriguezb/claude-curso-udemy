# Patrones del proyecto (seguridad)

## Stack
- Express + TypeScript, SQLite (`better-sqlite3`) con SQL directo.
- Auth JWT: `src/auth/auth.middleware.ts` → `authenticate()`, `authorize(...roles)`.
- Roles: admin (total), doctor (pacientes asignados), patient (solo su registro).

## Por documentar en la primera revisión
- Orden de middlewares en `src/index.ts`
- Cómo se filtra el acceso por rol en cada servicio
- Convención de parametrización de queries
- Qué expone `middleware/error-handler.ts` al cliente
