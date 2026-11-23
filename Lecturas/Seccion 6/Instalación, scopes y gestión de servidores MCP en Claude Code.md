# 🔌 Instalación, scopes y gestión de servidores MCP en Claude Code

> El **Model Context Protocol (MCP)** es la forma estándar de conectar Claude Code con herramientas externas (bases de datos, navegadores, APIs, repositorios) sin salir de la sesión.
>
> Esta lectura reúne los comandos esenciales, los **tres scopes** que deciden dónde está disponible cada servidor y lo que diferencia a Claude Code de otros clientes MCP.

Documentos relacionados: [Permisos personalizados](./Permisos%20personalizados%20con%20Claude%20Code.md) · [Hooks de seguridad](./Hooks%20de%20seguridad%20en%20Claude%20Code.md) · [Sandboxing](./Sandboxing%20con%20Claude%20Code.md)

---

## 📑 Tabla de contenido

1. [Nivel 0 — ¿Qué es MCP y qué problema resuelve?](#-nivel-0--qué-es-mcp-y-qué-problema-resuelve)
2. [Nivel 1 — Arquitectura: cliente, servidor y transporte](#-nivel-1--arquitectura-cliente-servidor-y-transporte)
3. [Nivel 1 — Comandos de gestión](#-nivel-1--comandos-de-gestión)
4. [Nivel 2 — Los tres scopes de MCP](#-nivel-2--los-tres-scopes-de-mcp)
5. [Nivel 2 — Gestión en sesión con `/mcp`](#-nivel-2--gestión-en-sesión-con-mcp)
6. [Nivel 2 — Tool Search: carga inteligente de herramientas](#-nivel-2--tool-search-carga-inteligente-de-herramientas)
7. [Nivel 3 — Configuración manual en `.mcp.json`](#-nivel-3--configuración-manual-en-mcpjson)
8. [Nivel 3 — Qué expone un servidor: tools, resources y prompts](#-nivel-3--qué-expone-un-servidor-tools-resources-y-prompts)
9. [Nivel 4 — MCP y permisos: controlar lo que Claude puede usar](#-nivel-4--mcp-y-permisos-controlar-lo-que-claude-puede-usar)
10. [Nivel 4 — Seguridad con servidores MCP](#-nivel-4--seguridad-con-servidores-mcp)
11. [Particularidades en Windows](#-particularidades-en-windows)
12. [Diagnóstico de problemas](#-diagnóstico-de-problemas)
13. [Chuleta rápida](#-chuleta-rápida)
14. [Checklist de experto](#-checklist-de-experto)

---

## 🟢 Nivel 0 — ¿Qué es MCP y qué problema resuelve?

Sin MCP, cada herramienta de IA necesita una integración propia con cada servicio externo. Con **N** clientes y **M** servicios, eso son **N × M** integraciones.

MCP define **un único protocolo**: cada servicio publica un servidor MCP una vez y cualquier cliente compatible (Claude Code, Claude Desktop, IDEs…) lo puede usar.

```
        SIN MCP (N × M integraciones)              CON MCP (N + M)

  Claude Code ─┬─► GitHub                    Claude Code ─┐          ┌─► GitHub
               ├─► Postgres                  Claude Desk. ├─► MCP ◄──┼─► Postgres
               └─► Navegador                 IDE ─────────┘          └─► Navegador
  Otro cliente ─┬─► GitHub
                ├─► Postgres                 Un protocolo, todos se entienden
                └─► Navegador                (como USB para la IA)
```

💡 **Analogía:** MCP es el "puerto USB" de los agentes de IA. No importa el fabricante del dispositivo: si habla el protocolo, se conecta.

---

## 🔵 Nivel 1 — Arquitectura: cliente, servidor y transporte

```
┌───────────────────────────┐                     ┌──────────────────────────┐
│       CLAUDE CODE         │                     │      SERVIDOR MCP        │
│      (cliente MCP)        │                     │                          │
│                           │    TRANSPORTE       │  • tools     (acciones)  │
│  Claude decide usar una   │ ◄─────────────────► │  • resources (datos)     │
│  herramienta y la invoca  │  stdio  |  HTTP     │  • prompts   (plantillas)│
│                           │                     │                          │
└───────────────────────────┘                     └────────────┬─────────────┘
                                                               │
                                                               ▼
                                                  GitHub, Postgres, Playwright,
                                                  Jira, Slack, tu API interna...
```

### Tipos de transporte

| Transporte | Dónde corre el servidor | Cómo se conecta | Cuándo usarlo |
|---|---|---|---|
| **stdio** *(por defecto)* | En tu máquina, como proceso hijo | Entrada/salida estándar | Herramientas locales: Playwright, filesystem, scripts propios |
| **HTTP** *(recomendado para remotos)* | En un servidor remoto | Peticiones HTTP, con soporte **OAuth 2.1** | Servicios SaaS: GitHub, Notion, Sentry, Jira… |
| **SSE** *(legacy)* | En un servidor remoto | Server-Sent Events | Solo por compatibilidad. ❌ No usar en implementaciones nuevas |

```
  stdio                                     HTTP
  ─────                                     ────
  Claude Code                               Claude Code
      │ lanza el proceso                        │ HTTPS + OAuth / token
      ▼                                         ▼
  npx @playwright/mcp  (tu PC)              https://api.servicio.com/mcp  (nube)
```

> **Regla práctica:** si el servidor necesita tocar algo de **tu máquina** (navegador, archivos, BD local) → `stdio`. Si es un **servicio en la nube** → `http`.

---

## 🔵 Nivel 1 — Comandos de gestión

Toda la administración se hace con el subcomando `claude mcp`:

```bash
# Añadir un servidor MCP (transporte stdio, por defecto)
claude mcp add <nombre> -- <comando> [args...]

# Añadir un servidor MCP remoto (transporte HTTP)
claude mcp add --transport http <nombre> <url>

# Añadir un servidor remoto con cabecera de autenticación
claude mcp add --transport http <nombre> <url> --header "Authorization: Bearer $TOKEN"

# Añadir con variables de entorno
claude mcp add -e API_KEY=xxx <nombre> -- <comando>

# Añadir desde configuración JSON directa
claude mcp add-json <nombre> '{"command": "npx", "args": ["-y", "paquete"]}'

# Listar servidores instalados y su estado de conexión
claude mcp list

# Inspeccionar la configuración y estado de un servidor concreto
claude mcp get <nombre>

# Eliminar un servidor
claude mcp remove <nombre>

# Importar servidores desde Claude Desktop (macOS y WSL)
claude mcp add-from-claude-desktop

# Restablecer las aprobaciones de servidores de .mcp.json
claude mcp reset-project-choices
```

### Anatomía de `claude mcp add`

```
claude mcp add  --scope project  -e API_KEY=xxx  mi-servidor  --  npx -y @org/paquete --flag
               └──────┬───────┘ └─────┬──────┘  └─────┬────┘  │  └───────────┬──────────┘
                  opciones de Claude Code         nombre    separador   comando del servidor
                  (SIEMPRE antes del nombre)                  (--)      (se pasa tal cual)
```

⚠️ **El `--` importa:** todo lo que va después se entrega intacto al servidor. Sin él, flags como `--headless` serían interpretados por `claude` y no por el servidor.

> **Nota sobre transportes:** hoy el transporte **HTTP** (con OAuth 2.1) es el recomendado para servidores remotos. **SSE** sigue funcionando por compatibilidad, pero es *legacy*.

---

## 🟡 Nivel 2 — Los tres scopes de MCP

Cada servidor tiene un **scope** que decide **dónde está disponible** y **quién lo ve**. Elegirlo bien evita filtrar credenciales y evita que el equipo tenga que reconfigurar lo mismo una y otra vez.

```
                         ¿QUIÉN LO VE?
                   Solo yo              Todo el equipo
               ┌──────────────────┬──────────────────────┐
   Un solo     │  🔹 LOCAL         │  🔹 PROJECT           │
   proyecto    │  (por defecto)    │  .mcp.json (en Git)   │
¿DÓNDE?        ├──────────────────┼──────────────────────┤
   Todos mis   │  🔹 USER          │        —              │
   proyectos   │  ~/.claude.json   │                       │
               └──────────────────┴──────────────────────┘
```

| | 🔹 **local** *(por defecto)* | 🔹 **project** | 🔹 **user** |
|---|---|---|---|
| **Flag** | `--scope local` | `--scope project` | `--scope user` |
| **Almacenamiento** | `~/.claude.json`, bajo la ruta del proyecto | `.mcp.json` en la raíz del proyecto | `~/.claude.json` (global) |
| **Disponibilidad** | Solo tú, solo en este proyecto | Todo el equipo (se versiona en Git) | Solo tú, en todos tus proyectos |
| **Uso típico** | Experimentos, credenciales sensibles | Servidores que todo el equipo necesita | Herramientas personales (buscadores, notas…) |

### Dónde vive cada cosa en disco

```
~/  (tu home)
└── .claude.json
    ├── "mcpServers": { ... }            ◄── scope USER   (global)
    └── "projects": {
          "C:/Repos/mi-app": {
            "mcpServers": { ... }        ◄── scope LOCAL  (solo este proyecto)
          }
        }

mi-app/  (tu repositorio)
├── .mcp.json                            ◄── scope PROJECT (se sube a Git)
└── .claude/
    ├── settings.json
    └── settings.local.json              ◄── ⚠️ NO es donde va el MCP "local"
```

⚠️ **Atención con la terminología:** el scope `local` de MCP se guarda en `~/.claude.json` (tu home), mientras que la configuración local general de Claude Code vive en `.claude/settings.local.json` (dentro del proyecto). **No los confundas.**

### Ejemplos prácticos

```bash
# Solo para ti en este proyecto (por defecto)
claude mcp add playwright -- npx -y @playwright/mcp --headless

# Compartido con el equipo vía Git
claude mcp add --scope project --transport http github https://api.githubcopilot.com/mcp

# Disponible en todos tus proyectos
claude mcp add --scope user brave-search -- npx -y @brave/brave-search-mcp-server
```

### Precedencia

Si el **mismo nombre** existe en varios scopes, gana el más específico:

```
   local  ──►  project  ──►  user
  (gana)                   (pierde)
```

Útil para **sobrescribir** en tu máquina un servidor del equipo (por ejemplo, apuntar `postgres` a tu BD local) sin tocar el `.mcp.json` compartido.

### 🧭 ¿Qué scope elijo?

```
¿Lo necesita todo el equipo en este repo?
   ├── Sí ──► ¿Contiene secretos en texto plano?
   │             ├── Sí ──► ❌ Sácalos a variables de entorno, luego ──► PROJECT
   │             └── No ──► ✅ PROJECT
   └── No ──► ¿Lo usas en todos tus proyectos?
                 ├── Sí ──► ✅ USER
                 └── No ──► ✅ LOCAL
```

### Aprobación de servidores de proyecto

Por seguridad, los servidores definidos en `.mcp.json` **no se activan solos**: la primera vez Claude Code te pide aprobarlos. Así un `git pull` no puede meter un servidor malicioso en tu sesión sin que lo veas. Para volver a decidir, usa `claude mcp reset-project-choices`.

También puedes controlarlo desde `settings.json`:

```json
{
  "enableAllProjectMcpServers": false,
  "enabledMcpjsonServers": ["playwright", "github"],
  "disabledMcpjsonServers": ["postgres"]
}
```

---

## 🟡 Nivel 2 — Gestión en sesión con `/mcp`

Dentro de una sesión interactiva puedes gestionar servidores sin cerrarla:

| Comando | Qué hace |
|---|---|
| `/mcp` | Abre el panel de gestión MCP (estado, herramientas, autenticación) |
| `/mcp enable <nombre>` | Habilita un servidor |
| `/mcp disable <nombre>` | Deshabilita un servidor |
| `/mcp enable all` | Habilita todos |
| `/mcp disable all` | Deshabilita todos |

`/mcp` también gestiona la **autenticación OAuth 2.1** de los servidores remotos:

```
 /mcp ──► eliges el servidor ──► se abre el navegador ──► inicias sesión y autorizas
                                                                   │
 Claude Code guarda el token de forma segura y lo renueva  ◄───────┘
```

💡 Deshabilitar servidores que no usas en una tarea reduce ruido y la superficie de riesgo.

---

## 🟡 Nivel 2 — Tool Search: carga inteligente de herramientas

Muchos clientes MCP cargan **por adelantado** las definiciones (schemas) de **todas** las herramientas de **todos** los servidores. Cada definición ocupa tokens de la ventana de contexto, aunque nunca se use.

Claude Code usa **Tool Search (lazy loading)**: descubre las herramientas **bajo demanda** y solo carga el schema de las que realmente va a usar.

```
  CARGA ANTICIPADA (otros clientes)          TOOL SEARCH (Claude Code)

  Ventana de contexto                        Ventana de contexto
  ┌─────────────────────────────┐            ┌─────────────────────────────┐
  │███████ github (40 tools)    │            │▒ índice de nombres          │
  │██████  playwright (25 tools)│            │█ schema de la tool usada    │
  │█████   jira (30 tools)      │            │                             │
  │████    postgres (10 tools)  │            │                             │
  │░░░░ espacio para tu trabajo │            │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
  └─────────────────────────────┘            │░░░░ espacio para tu trabajo │
                                             └─────────────────────────────┘
```

- Reduce el consumo de contexto en torno a un **~95 %**.
- Permite conectar **más de 10 servidores** sin saturar la ventana.
- Se activa automáticamente cuando las definiciones de herramientas MCP ocupan una parte significativa del contexto.

💡 Usa `/context` para ver cuánto contexto consume cada componente, incluidas las herramientas MCP.

---

## 🟠 Nivel 3 — Configuración manual en `.mcp.json`

Para equipos, la configuración compartida se define en `.mcp.json` en la raíz del proyecto:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp", "--headless"]
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp",
      "headers": {
        "Authorization": "Bearer ${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

### Campos según el transporte

| Campo | stdio | http | Descripción |
|---|:-:|:-:|---|
| `type` | opcional (`"stdio"`) | `"http"` | Tipo de transporte |
| `command` | ✅ | — | Ejecutable a lanzar |
| `args` | ✅ | — | Argumentos del comando |
| `env` | ✅ | — | Variables de entorno para el proceso |
| `url` | — | ✅ | Endpoint del servidor remoto |
| `headers` | — | ✅ | Cabeceras HTTP (p. ej. `Authorization`) |

### Variables de entorno

Los valores en `command`, `args`, `env`, `url` y `headers` admiten expansión de variables:

| Sintaxis | Resultado |
|---|---|
| `${VAR}` | Valor de `VAR` en tu shell |
| `${VAR:-valor}` | Valor de `VAR`, o `valor` si no existe |

Se expanden **al iniciar la sesión**, desde el entorno del shell que lanzó `claude`. Si una variable no existe y no tiene valor por defecto, Claude Code muestra un *warning* pero intenta conectar igualmente.

```
  .mcp.json (en Git)                Tu shell (NO en Git)             Servidor MCP
  ──────────────────                ────────────────────             ────────────
  "Bearer ${GITHUB_TOKEN}"  ──►     GITHUB_TOKEN=ghp_abc123   ──►    "Bearer ghp_abc123"
       placeholder                       valor real                    lo que recibe
```

🔐 **Buena práctica de seguridad:** nunca incrustes secretos directamente en `.mcp.json`. Usa referencias a variables de entorno y carga los valores reales desde tu shell o desde un `.env` fuera del control de versiones (añádelo al `.gitignore`). Lo veremos en la siguiente clase con un ejemplo real.

---

## 🟠 Nivel 3 — Qué expone un servidor: tools, resources y prompts

Un servidor MCP puede ofrecer tres tipos de capacidades, y Claude Code las presenta de forma distinta:

| Capacidad | Qué es | Cómo la usas en Claude Code | Ejemplo |
|---|---|---|---|
| **Tools** | Acciones que Claude puede ejecutar | Claude las invoca solo cuando las necesita | `mcp__github__create_issue` |
| **Resources** | Datos que puedes adjuntar al contexto | Con `@` en el prompt | `@github:issue://123` |
| **Prompts** | Plantillas predefinidas por el servidor | Como slash commands | `/mcp__github__pr_review 456` |

### Convención de nombres de las tools

```
   mcp__github__create_issue
   └┬┘  └─┬──┘  └────┬─────┘
 prefijo servidor  herramienta
```

Este nombre es clave: es el que usas en **permisos** y **hooks** (ver siguiente nivel).

---

## 🔴 Nivel 4 — MCP y permisos: controlar lo que Claude puede usar

Las herramientas MCP pasan por el **mismo sistema de permisos** que `Bash`, `Read` o `Edit`. Por defecto, Claude pide confirmación la primera vez que va a usar una herramienta MCP.

```json
{
  "permissions": {
    "allow": [
      "mcp__playwright",
      "mcp__github__get_issue",
      "mcp__github__list_pull_requests"
    ],
    "deny": [
      "mcp__github__delete_repository",
      "mcp__postgres__execute"
    ]
  }
}
```

| Regla | Alcance |
|---|---|
| `mcp__playwright` | **Todas** las herramientas del servidor `playwright` |
| `mcp__github__get_issue` | Solo esa herramienta concreta |

> ⚠️ Las reglas MCP **no** usan comodines tipo `mcp__github__*`: para todo el servidor se usa solo `mcp__github`.

### Hooks sobre herramientas MCP

Los hooks `PreToolUse` también pueden filtrar llamadas MCP usando un `matcher` con regex:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__postgres__.*",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/validar-sql.js" }]
      }
    ]
  }
}
```

Así puedes, por ejemplo, bloquear cualquier `DROP` o `DELETE` sin `WHERE` antes de que llegue a la base de datos.

---

## 🔴 Nivel 4 — Seguridad con servidores MCP

Un servidor MCP es **código de terceros** que corre con tus permisos y/o accede a tus cuentas. Trátalo como cualquier dependencia.

```
                       RIESGOS                               MITIGACIÓN
  ┌──────────────────────────────────────────┐   ┌─────────────────────────────────────┐
  │ 1. Servidor malicioso o comprometido      │──►│ Solo fuentes oficiales / auditadas   │
  │ 2. Prompt injection: el servidor trae     │──►│ Revisa acciones; deny a tools        │
  │    contenido externo (webs, issues...)    │   │ destructivas; hooks de validación    │
  │    con instrucciones ocultas              │   │                                      │
  │ 3. Secretos filtrados en .mcp.json        │──►│ ${VAR} + .env en .gitignore          │
  │ 4. Permisos excesivos del token           │──►│ Tokens de mínimo privilegio (solo    │
  │                                           │   │ lectura cuando sea posible)          │
  │ 5. Servidor de equipo no revisado         │──►│ Aprobación explícita de .mcp.json    │
  └──────────────────────────────────────────┘   └─────────────────────────────────────┘
```

**Principios:**

- 🔍 **Confía en el origen**: prefiere servidores oficiales del proveedor del servicio.
- 🔑 **Mínimo privilegio**: si solo necesitas leer issues, usa un token de solo lectura.
- 🧱 **Defensa en capas**: permisos + hooks + sandbox. Recuerda que un servidor stdio corre como proceso local.
- 🧹 **Higiene**: elimina (`claude mcp remove`) lo que ya no uses.

---

## 🪟 Particularidades en Windows

En **Windows nativo** (no WSL), los servidores stdio que usan `npx` necesitan el envoltorio `cmd /c`, porque `npx` es un script `.cmd` que no se puede lanzar directamente:

```bash
# ❌ Puede fallar con "Connection closed"
claude mcp add playwright -- npx -y @playwright/mcp

# ✅ Correcto en Windows nativo
claude mcp add playwright -- cmd /c npx -y @playwright/mcp
```

En `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp", "--headless"]
    }
  }
}
```

---

## 🩺 Diagnóstico de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `claude mcp list` muestra ✗ *Failed to connect* | El comando no arranca o falta una dependencia | Ejecuta el comando del servidor a mano en la terminal para ver el error |
| *Connection closed* en Windows | Falta `cmd /c` con `npx` | Ver [Particularidades en Windows](#-particularidades-en-windows) |
| El servidor tarda en arrancar y falla | Timeout de arranque | Aumenta `MCP_TIMEOUT` (ms), p. ej. `MCP_TIMEOUT=10000 claude` |
| Respuestas de una tool truncadas | Límite de salida | Ajusta `MAX_MCP_OUTPUT_TOKENS` |
| Error 401 / no autorizado | Token caducado o sin OAuth | `/mcp` → autenticar de nuevo |
| *Warning* de variable no definida | `${VAR}` no existe en el shell | Exporta la variable antes de lanzar `claude` o usa `${VAR:-default}` |
| No aparece un servidor de `.mcp.json` | No fue aprobado | `claude mcp reset-project-choices` y aprobarlo |
| Un flag llega a `claude` y no al servidor | Falta el separador `--` | `claude mcp add nombre -- comando --flag` |

Para más detalle, lanza Claude Code con `claude --debug`.

---

## 📋 Chuleta rápida

```
┌─────────────────────────── CLAUDE MCP — CHULETA ───────────────────────────┐
│ AÑADIR                                                                     │
│   stdio   claude mcp add <n> -- <cmd> [args]                               │
│   http    claude mcp add --transport http <n> <url>                        │
│   json    claude mcp add-json <n> '<json>'                                 │
│   env     -e CLAVE=valor          header  --header "Authorization: ..."    │
│   scope   --scope local | project | user                                   │
│                                                                            │
│ GESTIONAR     list · get <n> · remove <n> · add-from-claude-desktop        │
│ EN SESIÓN     /mcp · /mcp enable|disable <n|all> · /context                │
│                                                                            │
│ ARCHIVOS      local/user → ~/.claude.json     project → ./.mcp.json        │
│ PRECEDENCIA   local > project > user                                       │
│ PERMISOS      mcp__<servidor>  |  mcp__<servidor>__<tool>                  │
│ SECRETOS      ${VAR} y ${VAR:-default}  — nunca en texto plano             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de experto

- [ ] Sé distinguir cuándo usar `stdio` y cuándo `http`, y evito SSE en proyectos nuevos.
- [ ] Pongo siempre las opciones **antes** del nombre y uso `--` para separar el comando del servidor.
- [ ] Elijo el scope correcto: `local` para pruebas/secretos, `project` para el equipo, `user` para lo personal.
- [ ] No confundo el scope `local` de MCP (`~/.claude.json`) con `.claude/settings.local.json`.
- [ ] Mi `.mcp.json` no contiene secretos: solo `${VAR}`, y el `.env` está en `.gitignore`.
- [ ] Reviso y apruebo conscientemente los servidores de `.mcp.json` que llegan por Git.
- [ ] Controlo las herramientas MCP con reglas `allow`/`deny` (`mcp__servidor__tool`).
- [ ] Uso hooks `PreToolUse` para validar herramientas MCP sensibles (BD, despliegues).
- [ ] Uso tokens de mínimo privilegio y servidores de fuentes confiables.
- [ ] En Windows nativo envuelvo `npx` con `cmd /c`.
- [ ] Sé diagnosticar con `claude mcp list`, `claude mcp get`, `/mcp` y `claude --debug`.
