# Snap — URL shortener con analytics

## Comandos
- Dev: `npm run dev` (tsx watch, puerto 3000)
- Build: `npm run build` (tsc)
- Start: `npm start` (ejecuta dist/index.js)
- Test: `npm test` (vitest run)
- Test watch: `npm run test:watch`
- Test módulo: `npm test -- src/urls`

## Stack
- Runtime: Node.js 22 + TypeScript strict (ESM)
- Framework: Express 4
- Base de datos: SQLite con better-sqlite3 (archivo: snap.db)
- Auth: bcryptjs (hash) + jsonwebtoken (JWT)
- Tests: vitest + supertest

## Arquitectura
- Sin ORM: queries SQL directas con funciones helper tipadas
- Capas obligatorias: handler → service → repository. NUNCA saltar capas
- Cada módulo expone su router de Express, que se monta en src/index.ts

## Estructura del proyecto
```
src/
├── index.ts          — entry point, configuración Express, middleware global
├── auth/             — registro, login, middleware JWT
├── urls/             — CRUD de URLs cortas (crear, listar, eliminar)
├── clicks/           — registro y consulta de analytics por URL
├── db/               — conexión SQLite, migraciones, seeds
│   ├── migrations/   — archivos NNN-descripcion.sql
│   └── seeds/        — datos de desarrollo
└── shared/           — tipos compartidos, utilidades, middleware de errores
```

## Esquema de base de datos
- users(id, email, password_hash, name, created_at)
- urls(id, code, original_url, user_id → users, created_at)
- clicks(id, url_id → urls, clicked_at)
- Índices: idx_urls_user_id, idx_clicks_url_id_date

## Reglas de código
- SIEMPRE TypeScript strict, NUNCA usar `any` (usar `unknown` si es necesario)
- SIEMPRE import/export ESM, NUNCA require/module.exports
- Nombres de variables y funciones: camelCase
- Nombres de archivos: kebab-case
- Funciones async siempre con try/catch y errores tipados
- Cada endpoint DEBE tener al menos 1 test de integración con supertest

## Auth
- Las contraseñas se hashean con bcryptjs antes de almacenar
- IMPORTANT: Nunca loguear ni retornar password_hash en ninguna respuesta
- Los tokens JWT se envían en header `Authorization: Bearer <token>`
- El middleware de auth decodifica el token y adjunta `req.user` con { id, email }

## Base de datos
- Migraciones en src/db/migrations/ con formato NNN-descripcion.sql
- IMPORTANT: Crear siempre una nueva migración; nunca modificar una existente
- Los seeds de desarrollo van en src/db/seeds/

## Git
- Branch principal: main
- Feature branches: feat/nombre-corto
- NUNCA commitear directamente a main
