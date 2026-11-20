# Lectura: Reglas modulares de memoria en Claude Code

> De básico a experto: cómo dividir las instrucciones de `CLAUDE.md` en reglas pequeñas, enfocadas y que se cargan solo cuando hacen falta.

---

## Índice

1. [El problema que resuelven](#1-el-problema-que-resuelven)
2. [Repaso: la jerarquía de memoria](#2-repaso-la-jerarquía-de-memoria)
3. [Nivel básico: la carpeta `.claude/rules/`](#3-nivel-básico-la-carpeta-clauderules)
4. [Nivel intermedio: reglas condicionales con `paths`](#4-nivel-intermedio-reglas-condicionales-con-paths)
5. [Nivel intermedio: importaciones con `@`](#5-nivel-intermedio-importaciones-con-)
6. [Nivel avanzado: reglas de usuario, symlinks y CLAUDE.md por subcarpeta](#6-nivel-avanzado-reglas-de-usuario-symlinks-y-claudemd-por-subcarpeta)
7. [Nivel experto: diseño de un sistema de reglas](#7-nivel-experto-diseño-de-un-sistema-de-reglas)
8. [Ejemplo completo: proyecto Node + React](#8-ejemplo-completo-proyecto-node--react)
9. [Errores comunes](#9-errores-comunes)
10. [Cómo verificar qué se está cargando](#10-cómo-verificar-qué-se-está-cargando)
11. [Resumen / chuleta](#11-resumen--chuleta)

---

## 1. El problema que resuelven

Todo lo que escribes en memoria consume tokens de contexto **en cada sesión**. Un `CLAUDE.md` único que crece sin control termina así:

```markdown
# CLAUDE.md  (450 líneas 😱)
## Comandos ...
## Convenciones de API ...
## Reglas de React ...
## Reglas de SQL y migraciones ...
## Reglas de tests ...
## Seguridad ...
```

Problemas:

| Problema | Consecuencia |
|---|---|
| Archivo largo (>200 líneas) | Claude sigue las instrucciones de forma menos consistente |
| Reglas de React cargadas mientras editas SQL | Tokens desperdiciados y ruido |
| Un solo archivo editado por todo el equipo | Conflictos de merge, nadie sabe quién es dueño de qué |
| Difícil de mantener | Reglas obsoletas que nadie borra |

**Las reglas modulares** dividen esa memoria en archivos pequeños, temáticos y, opcionalmente, **condicionados a rutas de archivos**.

---

## 2. Repaso: la jerarquía de memoria

Antes de modularizar, hay que saber dónde vive cada pieza. Claude Code carga memoria desde varios niveles:

| Nivel | Ubicación | Alcance | ¿Se versiona en git? |
|---|---|---|---|
| Política empresarial (managed) | Windows: `C:\Program Files\ClaudeCode\CLAUDE.md`<br>macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`<br>Linux: `/etc/claude-code/CLAUDE.md` | Toda la organización | No (lo gestiona TI) |
| Usuario | `~/.claude/CLAUDE.md` y `~/.claude/rules/*.md` | Todos tus proyectos | No |
| Proyecto | `./CLAUDE.md` o `./.claude/CLAUDE.md` | El repositorio | Sí |
| Reglas de proyecto | `./.claude/rules/**/*.md` | El repositorio (todas o por rutas) | Sí |
| Local de proyecto | `./CLAUDE.local.md` | Solo tú, en este repo | No (va en `.gitignore`) |
| Subcarpetas | `./src/auth/CLAUDE.md`, etc. | Esa parte del árbol | Sí |

Ideas clave:

- Claude busca `CLAUDE.md` **desde el directorio actual hacia arriba** hasta la raíz y los carga todos.
- Los `CLAUDE.md` de **subcarpetas** se cargan **bajo demanda**, cuando Claude lee archivos dentro de esa subcarpeta.
- Lo más específico tiene prioridad: las reglas del proyecto pesan más que las de usuario.

> 💡 En este mismo curso ya tienes ejemplos: `Tema_3/Proyecto_1/CLAUDE.md` (proyecto) y `Tema_3/Proyecto_1/src/auth/CLAUDE.md` (subcarpeta).

---

## 3. Nivel básico: la carpeta `.claude/rules/`

### Qué es

Una carpeta donde pones archivos `.md`, **uno por tema**. Claude Code los descubre automáticamente (incluso en subcarpetas) y los carga como parte de la memoria del proyecto, con la misma prioridad que `.claude/CLAUDE.md`.

No hay que registrarlos en ningún lado ni importarlos: **existen → se cargan**.

### Estructura mínima

```
mi-proyecto/
├── CLAUDE.md                 ← visión general, comandos, arquitectura
└── .claude/
    └── rules/
        ├── code-style.md     ← convenciones de código
        ├── testing.md        ← cómo escribir y correr tests
        └── security.md       ← reglas de seguridad
```

### Ejemplo de regla sin condiciones

`.claude/rules/code-style.md`

```markdown
# Estilo de código

- Usa async/await. NUNCA uses .then().
- Usa funciones arrow para callbacks.
- Nombra archivos en kebab-case con sufijo de capa: `user.service.ts`, `user.routes.ts`.
- Exporta con named exports; no uses export default.
```

Esta regla **no tiene frontmatter**, así que se carga **siempre**, en cada sesión, igual que el `CLAUDE.md`.

### Buenas prácticas básicas

- **Un tema por archivo.** `testing.md`, no `varios.md`.
- **Nombres descriptivos.** El nombre del archivo debe decir qué contiene.
- **Instrucciones imperativas y verificables.** "Usa X", "NUNCA hagas Y", no "intenta que el código sea limpio".
- **Cortos.** Si una regla supera ~50–80 líneas, probablemente son dos reglas.

---

## 4. Nivel intermedio: reglas condicionales con `paths`

Aquí está el verdadero poder. Agregando **frontmatter YAML** con el campo `paths`, la regla solo se aplica cuando Claude trabaja con archivos que coinciden con esos patrones glob.

### Sintaxis

`.claude/rules/api.md`

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "src/**/*.routes.ts"
---

# Reglas de API

- Todo endpoint valida el body con zod antes de usarlo.
- Responde errores con el formato `{ error: { code, message } }`.
- Usa los códigos HTTP correctos: 400 validación, 401 sin auth, 403 sin permiso, 404 no existe.
- Cada endpoint nuevo requiere su test en el mismo directorio (`*.test.ts`).
```

Cuando Claude edita `src/api/users.ts` → la regla se activa.
Cuando Claude edita `web/src/App.tsx` → la regla **no** ocupa contexto.

### Patrones glob soportados

| Patrón | Coincide con |
|---|---|
| `**/*.ts` | Todos los `.ts` en cualquier carpeta |
| `src/**/*` | Todo dentro de `src/` |
| `*.md` | Markdown solo en la raíz |
| `src/components/*.tsx` | `.tsx` directamente en `components/` (no subcarpetas) |
| `src/**/*.{ts,tsx}` | `.ts` y `.tsx` dentro de `src/` (expansión con llaves) |
| `{src,lib}/**/*.ts` | `.ts` dentro de `src/` o `lib/` |
| `**/*.test.ts` | Cualquier archivo de test |

### ¿Cuándo usar `paths` y cuándo no?

| Tipo de instrucción | ¿`paths`? | Por qué |
|---|---|---|
| Convenciones generales del lenguaje | No | Aplican a todo |
| Seguridad (no loguear secretos, etc.) | No | Debe estar siempre presente |
| Reglas de componentes React | Sí → `web/**/*.tsx` | Irrelevantes en el backend |
| Reglas de migraciones SQL | Sí → `**/migrations/**` | Solo importan al tocar migraciones |
| Reglas de tests | Sí → `**/*.test.ts` | Solo al escribir/editar tests |

> ⚠️ Matiz importante: las reglas con `paths` se activan cuando Claude **lee o trabaja** con un archivo que coincide. Si pides "crea un endpoint nuevo" y Claude todavía no ha abierto ningún archivo de `src/api/`, la regla puede no estar cargada aún. Por eso lo **crítico** (seguridad, convenciones globales) va sin `paths`.

---

## 5. Nivel intermedio: importaciones con `@`

Otra forma de modularizar es **importar** archivos desde un `CLAUDE.md` con la sintaxis `@ruta`.

```markdown
# CLAUDE.md

Visión general del proyecto: @README.md
Scripts disponibles: @package.json

## Instrucciones adicionales
- Flujo de git: @docs/git-workflow.md
- Preferencias personales: @~/.claude/mis-preferencias.md
```

Reglas de las importaciones:

- Rutas **relativas** (al archivo que importa) o **absolutas**; `~` funciona para tu home.
- Las importaciones pueden ser **recursivas**, con un máximo de **5 niveles** de profundidad.
- **No** se evalúan dentro de bloques de código ni de `` `código inline` `` (así puedes escribir `@algo` sin importarlo).
- La primera vez que un proyecto importa archivos externos, Claude Code pide aprobación.

### `@` vs `.claude/rules/`: ¿cuál uso?

| Criterio | Importación `@` | `.claude/rules/` |
|---|---|---|
| Reutilizar docs que ya existen (README, docs/) | ✅ Ideal | ❌ Habría que duplicar |
| Carga condicional por ruta | ❌ Siempre se carga | ✅ Con `paths` |
| Descubrimiento automático | ❌ Hay que referenciarlo | ✅ Automático |
| Compartir archivos personales sin versionarlos | ✅ `@~/.claude/...` | ⚠️ Solo vía `~/.claude/rules/` |

Regla práctica: **instrucciones para Claude → `.claude/rules/`**; **documentación que ya existe para humanos → `@`**.

> ⚠️ Una importación `@` **no ahorra tokens**: el contenido importado se carga completo. Solo organiza. Lo que ahorra tokens es `paths`.

---

## 6. Nivel avanzado: reglas de usuario, symlinks y CLAUDE.md por subcarpeta

### 6.1 Reglas de usuario: `~/.claude/rules/`

Funcionan igual que las de proyecto, pero aplican a **todos tus proyectos**. Se cargan **antes** que las del proyecto, así que las del proyecto tienen prioridad si hay conflicto.

```
~/.claude/
├── CLAUDE.md
└── rules/
    ├── commits.md        ← tu convención de commits (HD-, DESARROLLO-HD-, INTERNO-TAREA-)
    └── csharp.md         ← preferencias de .NET, con paths: ["**/*.cs"]
```

Ejemplo `~/.claude/rules/csharp.md`:

```markdown
---
paths:
  - "**/*.cs"
  - "**/*.csproj"
---

# Preferencias C#

- Target .NET 6; no uses APIs de versiones posteriores.
- Usa `async Task` en todo acceso a base de datos; nunca `.Result` ni `.Wait()`.
- Consultas SQL siempre parametrizadas; NUNCA concatenes strings en SQL.
```

Así tu `~/.claude/CLAUDE.md` global queda corto y las reglas de C# no aparecen cuando trabajas en Node.

### 6.2 Compartir reglas entre repositorios con symlinks

`.claude/rules/` admite enlaces simbólicos. Útil si varios repos comparten un estándar común:

```bash
# Linux / macOS / Git Bash
ln -s ~/estandares-empresa/rules ./.claude/rules/empresa
ln -s ~/estandares-empresa/rules/seguridad.md ./.claude/rules/seguridad.md
```

```powershell
# Windows PowerShell (requiere modo desarrollador o admin)
New-Item -ItemType SymbolicLink -Path .\.claude\rules\empresa -Target C:\estandares\rules
```

Los symlinks circulares se detectan y se ignoran.

### 6.3 `CLAUDE.md` en subcarpetas vs reglas con `paths`

Ambos logran "instrucciones solo para una parte del código". Diferencias:

| | `src/auth/CLAUDE.md` | `.claude/rules/auth.md` con `paths: ["src/auth/**"]` |
|---|---|---|
| Dónde vive | Junto al código | Centralizado en `.claude/rules/` |
| Granularidad | Por carpeta | Por cualquier patrón (extensión, sufijo, varias carpetas) |
| Ej. "todos los `*.test.ts`" | ❌ No se puede | ✅ `**/*.test.ts` |
| Visibilidad para el equipo | Alta (está al lado del código) | Requiere saber que existe `rules/` |

Recomendación: usa **subcarpeta** cuando la regla es de un **módulo** concreto (auth, pagos); usa **`rules/` con `paths`** cuando la regla es **transversal** (todos los tests, todos los componentes, todas las migraciones).

### 6.4 Monorepos: excluir memoria ajena

En monorepos grandes puedes acabar cargando `CLAUDE.md` de otros equipos. El setting `claudeMdExcludes` (en `.claude/settings.local.json`) permite omitir archivos por patrón:

```json
{
  "claudeMdExcludes": [
    "**/otro-equipo/CLAUDE.md",
    "**/otro-equipo/.claude/rules/**"
  ]
}
```

---

## 7. Nivel experto: diseño de un sistema de reglas

### 7.1 Principio de las tres capas

```
┌─────────────────────────────────────────────────────────┐
│ CAPA 1 · Siempre cargado (mínimo indispensable)         │
│   CLAUDE.md raíz: qué es el proyecto, comandos, mapa    │
│   rules/ sin paths: seguridad, convenciones globales    │
├─────────────────────────────────────────────────────────┤
│ CAPA 2 · Condicional por tipo de archivo                │
│   rules/ con paths: frontend, api, tests, migraciones   │
├─────────────────────────────────────────────────────────┤
│ CAPA 3 · Conocimiento bajo demanda                      │
│   CLAUDE.md de subcarpetas, docs referenciados          │
│   (o Skills, si es un procedimiento largo)              │
└─────────────────────────────────────────────────────────┘
```

Objetivo: la **capa 1** debería ser lo más pequeña posible. Pregúntate por cada línea: *"¿esto causaría un error si faltara en una tarea que no tiene nada que ver?"*. Si la respuesta es no, baja a la capa 2 o 3.

### 7.2 Memoria vs Skills vs Hooks

Cuando las reglas crecen, a veces el problema no es de organización sino de herramienta equivocada:

| Necesidad | Herramienta correcta |
|---|---|
| "Siempre usa async/await" (convención breve) | Regla de memoria |
| "Para crear un módulo nuevo sigue estos 12 pasos" (procedimiento) | **Skill** (se carga solo cuando se usa) |
| "Formatea con Prettier después de cada edición" (garantía determinista) | **Hook** |
| "Nunca leas `.env`" (restricción dura) | **Permisos** (`deny` en settings) + regla como respaldo |

La memoria es **orientativa**: Claude la sigue con alta probabilidad pero no al 100 %. Si algo **debe** cumplirse siempre, usa un hook o un permiso.

### 7.3 Escribir reglas que Claude realmente sigue

```markdown
# ❌ Débil
- Trata de manejar bien los errores.

# ✅ Fuerte
- Envuelve todo handler de Express en `asyncHandler()` de `src/utils/async-handler.ts`.
- NUNCA devuelvas `err.stack` al cliente; usa `toPublicError(err)`.
```

Claves:

1. **Concreto y verificable**: nombra archivos, funciones, comandos exactos.
2. **Imperativo**: "Usa", "NUNCA", "SIEMPRE" (con moderación; si todo es MAYÚSCULAS, nada destaca).
3. **Con el porqué** cuando no es obvio: "Usa `dayjs`, no `moment` (moment está deprecado y pesa 300 KB)". El porqué ayuda a Claude a generalizar a casos no listados.
4. **Sin contradicciones** entre archivos. Si `rules/api.md` y `src/api/CLAUDE.md` dicen cosas distintas, el resultado es impredecible.

### 7.4 Gobernanza en equipo

- Revisa los cambios a `.claude/rules/` en los PR como cualquier otro código.
- Considera un `CODEOWNERS`: `/.claude/rules/security.md @equipo-seguridad`.
- Haz limpieza periódica: si una regla documenta algo que el linter ya controla, bórrala.
- Cuando Claude repita un error, **primero** pregúntate si falta una regla; **después**, si la regla existe pero está enterrada o es ambigua.

---

## 8. Ejemplo completo: proyecto Node + React

Basado en la estructura de `Tema_3/Proyecto_1` (API Express en `src/`, frontend en `web/`).

### Estructura final

```
Proyecto_1/
├── CLAUDE.md                          ← CAPA 1 (≈40 líneas)
├── CLAUDE.local.md                    ← tus notas personales (gitignored)
├── .claude/
│   └── rules/
│       ├── security.md                ← CAPA 1 (sin paths)
│       ├── code-style.md              ← CAPA 1 (sin paths)
│       ├── backend/
│       │   ├── api.md                 ← CAPA 2: src/**/*.routes.ts
│       │   └── repositories.md        ← CAPA 2: src/**/*.repository.ts
│       ├── frontend/
│       │   └── react.md               ← CAPA 2: web/**/*.{ts,tsx}
│       └── testing.md                 ← CAPA 2: **/*.test.ts
└── src/
    └── auth/
        └── CLAUDE.md                  ← CAPA 3: reglas del módulo auth
```

### `CLAUDE.md` (raíz)

```markdown
# Acortador de URLs

API REST en Express + TypeScript (`src/`) y frontend React + Vite (`web/`).

## Comandos
- `npm run dev` — levanta la API en :3000
- `npm test` — corre Vitest (todos los tests)
- `npm run lint` — ESLint; debe pasar antes de cualquier commit

## Arquitectura
- Cada módulo vive en `src/<modulo>/` con archivos `<modulo>.routes.ts`,
  `<modulo>.service.ts`, `<modulo>.repository.ts`, `<modulo>.types.ts`.
- Las rutas NUNCA acceden al repositorio directamente; pasan por el service.

## Más reglas
Las reglas específicas están en `.claude/rules/` y se cargan según el archivo que edites.
```

### `.claude/rules/security.md` (siempre activa)

```markdown
# Seguridad

- NUNCA leas, imprimas ni hagas commit de `.env` o archivos con secretos.
- Contraseñas: solo con bcrypt (cost ≥ 10). NUNCA las devuelvas en respuestas ni logs.
- Toda entrada del usuario se valida con zod antes de usarse.
```

### `.claude/rules/backend/api.md`

```markdown
---
paths:
  - "src/**/*.routes.ts"
  - "src/app.ts"
---

# Rutas de API

- Valida `req.body`, `req.params` y `req.query` con el schema zod de `<modulo>.types.ts`.
- Errores: `{ error: { code: string, message: string } }`.
- Rutas protegidas usan `authMiddleware` de `src/auth/auth.middleware.ts`.
- Registra cada router nuevo en `src/app.ts`.
```

### `.claude/rules/backend/repositories.md`

```markdown
---
paths:
  - "src/**/*.repository.ts"
---

# Repositorios

- Único lugar donde se toca la base de datos.
- Devuelven tipos de dominio de `<modulo>.types.ts`, nunca filas crudas.
- Consultas parametrizadas siempre.
```

### `.claude/rules/frontend/react.md`

```markdown
---
paths:
  - "web/**/*.{ts,tsx}"
---

# Frontend React

- Componentes funcionales con hooks; nada de clases.
- Llamadas HTTP solo a través de `web/src/api/`; los tipos viven en `web/src/api/types.ts`.
- Validaciones de formularios en `web/src/auth/validation.ts` o equivalente por módulo.
```

### `.claude/rules/testing.md`

```markdown
---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Tests

- Framework: Vitest. Usa `describe`/`it`, no `test`.
- Un archivo de test por módulo: `<modulo>.test.ts` junto al código.
- Para rutas usa supertest contra `app`, no levantes el servidor.
- Corre solo el archivo afectado: `npx vitest run src/auth/auth.test.ts`.
```

### `src/auth/CLAUDE.md` (subcarpeta)

```markdown
# Módulo auth

- Los JWT expiran en 15 min; el refresh token en 7 días. No cambies estos valores sin preguntar.
- `auth.service.ts` no debe importar Express; recibe y devuelve datos planos.
```

### ¿Qué se carga en cada escenario?

| Tarea | Se carga |
|---|---|
| "¿Qué hace este proyecto?" | `CLAUDE.md`, `security.md`, `code-style.md` |
| Editar `src/urls/urls.routes.ts` | Lo anterior + `api.md` |
| Editar `src/auth/auth.repository.ts` | Lo anterior + `repositories.md` + `src/auth/CLAUDE.md` |
| Editar `web/src/App.tsx` | Capa 1 + `react.md` |
| Arreglar `src/auth/auth.test.ts` | Capa 1 + `testing.md` + `src/auth/CLAUDE.md` |

Resultado: en lugar de cargar ~300 líneas siempre, cargas ~60 de base y solo lo que la tarea necesita.

---

## 9. Errores comunes

| Error | Síntoma | Solución |
|---|---|---|
| Frontmatter mal formado (falta `---` o indentación YAML) | La regla se carga siempre o nunca | Revisa que empiece en la línea 1 con `---` y cierre con `---` |
| Glob sin comillas con `*` o `{}` al inicio | YAML lo interpreta mal | Pon los patrones entre comillas: `"**/*.ts"` |
| Rutas absolutas en `paths` | Nunca coincide | Los patrones son **relativos a la raíz del proyecto** |
| Reglas críticas con `paths` | Claude las ignora al crear archivos nuevos | Las reglas críticas van **sin** `paths` |
| Duplicar la misma regla en varios archivos | Al cambiarla en uno, quedan contradicciones | Un dato, un lugar |
| Usar `@` pensando que ahorra tokens | El contexto sigue igual de lleno | Usa `paths` para carga condicional |
| Archivos que no terminan en `.md` | No se cargan | Solo se descubren archivos `.md` |
| Meter procedimientos largos en rules | Contexto inflado | Muévelos a una Skill |

---

## 10. Cómo verificar qué se está cargando

- **`/memory`**: muestra los archivos de memoria cargados en la sesión y permite abrirlos para editarlos.
- **`/context`**: muestra cuánto contexto ocupa cada fuente (memoria, herramientas, conversación). Úsalo para medir el ahorro tras modularizar.
- **Pregúntale a Claude**: "¿Qué reglas de `.claude/rules/` tienes cargadas ahora mismo?". Repite la pregunta después de abrir un archivo de `web/` para ver la carga condicional en acción.
- **`/init`**: genera un `CLAUDE.md` inicial; luego divídelo tú en reglas.

### Ejercicio práctico

1. En `Tema_3/Proyecto_1`, crea `.claude/rules/testing.md` con `paths: ["**/*.test.ts"]` y una regla llamativa, por ejemplo: "Todo test empieza con un comentario `// Caso: ...`".
2. Abre una sesión nueva y pide: "Explícame `src/app.ts`". Pregunta si conoce alguna regla de tests → no debería.
3. Pide: "Agrega un test a `src/urls/routes.test.ts`". Verifica que el test generado incluye el comentario `// Caso:`.

---

## 11. Resumen / chuleta

```text
¿Dónde pongo esta instrucción?

¿Aplica a TODOS mis proyectos?
 ├─ Sí → ~/.claude/CLAUDE.md  o  ~/.claude/rules/<tema>.md
 └─ No → ¿Es solo para mí en este repo?
          ├─ Sí → CLAUDE.local.md
          └─ No → ¿Aplica a todo el repo y es crítica?
                   ├─ Sí → CLAUDE.md raíz (breve)  o  .claude/rules/<tema>.md SIN paths
                   └─ No → ¿Es de un módulo/carpeta concreta?
                            ├─ Sí → <carpeta>/CLAUDE.md
                            └─ No (transversal: tests, tsx, migraciones...)
                                  → .claude/rules/<tema>.md CON paths

¿Es un procedimiento largo de varios pasos?   → Skill
¿Tiene que cumplirse SIEMPRE, sin excepción?  → Hook o permiso
¿Ya existe como documentación para humanos?   → @importarlo
```

**Plantilla de regla:**

```markdown
---
paths:
  - "patrón/**/*.ext"
---

# <Tema>

- <Instrucción imperativa, concreta y verificable>.
- <NUNCA/SIEMPRE ...> (<por qué, si no es obvio>).
```

**Las 5 ideas que debes llevarte:**

1. `.claude/rules/*.md` se descubren solos; un archivo por tema.
2. Sin `paths` → siempre cargada. Con `paths` → solo al trabajar con archivos que coinciden.
3. `@import` organiza, pero **no** ahorra contexto; `paths` sí.
4. Lo crítico va siempre cargado; lo específico, condicionado.
5. La memoria orienta; los hooks y permisos garantizan.
