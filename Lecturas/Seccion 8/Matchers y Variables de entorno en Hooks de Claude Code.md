# 🎯 Matchers y Variables de entorno en Hooks de Claude Code

> El campo **`matcher`** es un **regex** que decide si un hook se activa o no. Lo importante es que **lo que filtra cambia según el evento**: en unos filtra el nombre de la herramienta, en otros cómo se inició la sesión, en otros el nombre de un archivo.
>
> Además, los hooks tienen acceso a **variables de entorno** que Claude Code establece automáticamente, y reciben los datos del evento como **JSON por stdin**. No confundas unas con otros.

Documentos relacionados: [Eventos y Hooks disponibles en Claude Code](./Eventos%20y%20Hooks%20disponibles%20en%20Claude%20Code.md) · [Hooks de seguridad en Claude Code](../Seccion%206/Hooks%20de%20seguridad%20en%20Claude%20Code.md)

---

## 📑 Tabla de contenido

**Parte 1 — Qué filtra el matcher en cada evento**

1. [Reglas generales del matcher](#-reglas-generales-del-matcher)
2. [Eventos de herramientas](#-eventos-de-herramientas-nombre-de-la-herramienta)
3. [SessionStart](#-sessionstart-cómo-se-inició-la-sesión)
4. [SessionEnd](#-sessionend-por-qué-terminó-la-sesión)
5. [Notification](#-notification-tipo-de-notificación)
6. [SubagentStart y SubagentStop](#-subagentstart-y-subagentstop-tipo-de-agente)
7. [ConfigChange](#-configchange-fuente-de-configuración)
8. [FileChanged](#-filechanged-nombre-de-archivo-basename)
9. [StopFailure](#-stopfailure-tipo-de-error)
10. [InstructionsLoaded](#-instructionsloaded-razón-de-carga)
11. [PreCompact y PostCompact](#-precompact-y-postcompact-qué-disparó-la-compactación)
12. [Elicitation y ElicitationResult](#-elicitation-y-elicitationresult-nombre-del-servidor-mcp)
13. [Eventos sin soporte de matcher](#-eventos-sin-soporte-de-matcher)

**Parte 2 — Variables de entorno disponibles en hooks**

14. [Variables para todos los hooks](#-variables-de-entorno-para-todos-los-hooks)
15. [`$CLAUDE_ENV_FILE`](#-claude_env_file-persistir-variables-de-sesión)
16. [Lo que NO son variables de entorno](#-lo-que-no-son-variables-de-entorno-campos-json)
17. [`CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`](#-claude_code_sessionend_hooks_timeout_ms)
18. [Nota sobre `$CLAUDECODE`](#-nota-sobre-claudecode)
19. [Resumen](#-resumen)

---

# Parte 1 — Qué filtra el matcher en cada evento

## 📐 Reglas generales del matcher

- Es una **expresión regular**: puedes combinar valores con pipe (`Edit|Write`) o usar comodines (`mcp__memory__.*`).
- Si **omites** el matcher, lo dejas **vacío** (`""`) o pones **`"*"`**, el hook se activa **siempre** que ocurra ese evento.
- El campo contra el que se compara **depende del evento** (tabla resumen):

| Evento(s) | El matcher filtra… | Campo JSON |
|---|---|---|
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | Nombre de la herramienta | `tool_name` |
| `SessionStart` | Cómo se inició la sesión | `source` |
| `SessionEnd` | Por qué terminó la sesión | razón de cierre |
| `Notification` | Tipo de notificación | tipo |
| `SubagentStart`, `SubagentStop` | Tipo de agente | tipo de agente |
| `ConfigChange` | Fuente de configuración | fuente |
| `FileChanged` | Nombre del archivo (basename) | — |
| `StopFailure` | Tipo de error | tipo de error |
| `InstructionsLoaded` | Razón de carga | razón |
| `PreCompact`, `PostCompact` | Qué disparó la compactación | disparador |
| `Elicitation`, `ElicitationResult` | Nombre del servidor MCP | servidor |

---

## 🔧 Eventos de herramientas: nombre de la herramienta

El matcher se compara contra el campo **`tool_name`** del JSON que recibe el hook. Son los eventos más usados: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest` y `PermissionDenied`.

### Herramientas built-in

| Matcher | Descripción |
|---|---|
| `Bash` | Comandos de shell |
| `Edit` | Reemplazar texto en un archivo existente |
| `Write` | Crear o sobrescribir un archivo |
| `MultiEdit` | Múltiples ediciones en un archivo |
| `Read` | Leer contenido de un archivo |
| `Glob` | Buscar archivos por patrón |
| `Grep` | Buscar contenido en archivos con regex |
| `WebFetch` | Obtener contenido de una URL |
| `WebSearch` | Buscar en la web |
| `Agent` | Crear un subagente |
| `AskUserQuestion` | Preguntar al usuario |
| `ExitPlanMode` | Salir del modo plan |
| `Notebook*` | Herramientas de notebook (regex con `*`) |

### Herramientas MCP

El patrón es **`mcp__<servidor>__<herramienta>`**:

| Matcher | Qué captura |
|---|---|
| `mcp__memory__create_entities` | Herramienta específica del servidor Memory |
| `mcp__github__search_repositories` | Herramienta específica del servidor GitHub |
| `mcp__memory__.*` | Todas las herramientas del servidor Memory |
| `mcp__.*__write.*` | Cualquier herramienta que contenga `write`, de cualquier servidor |

> 💡 Como el matcher es regex, `Edit|Write|MultiEdit` activa el hook cuando Claude edita o escribe **cualquier** archivo.

**Ejemplo — Formatear el código solo después de ediciones de archivo:**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write 2>/dev/null; exit 0"
          }
        ]
      }
    ]
  }
}
```

**Ejemplo — Auditar todas las operaciones del servidor MCP de memoria:**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date -Is) | Memory MCP operation\" >> ~/mcp-audit.log"
          }
        ]
      }
    ]
  }
}
```

---

## 🚀 SessionStart: cómo se inició la sesión

El matcher se compara contra el campo **`source`** del JSON.

| Matcher | Cuándo ocurre |
|---|---|
| `startup` | Sesión nueva (el usuario ejecutó `claude`) |
| `resume` | Sesión reanudada con `--resume`, `--continue` o `/resume` |
| `clear` | Después de ejecutar `/clear` |
| `compact` | Después de una compactación automática o manual |

Muy útil para distinguir comportamientos: por ejemplo, **re-inyectar contexto crítico solo después de compactación** (cuando Claude "olvida" información), sin ejecutar el hook en cada inicio normal.

> 📢 El **stdout** de `SessionStart` se añade como **contexto visible para Claude**: lo que imprimas con `echo` llega directamente al modelo.

**Ejemplo — Re-inyectar contexto solo después de compactación:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'RECORDATORIO: Este proyecto usa Python 3.12 con FastAPI. BD: PostgreSQL. Todos los endpoints requieren validación Pydantic.'"
          }
        ]
      }
    ]
  }
}
```

**Ejemplo — Cargar variables de entorno solo en sesiones nuevas:**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/setup-env.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 🏁 SessionEnd: por qué terminó la sesión

| Matcher | Razón |
|---|---|
| `clear` | El usuario ejecutó `/clear` |
| `resume` | El usuario cambió de sesión con `/resume` interactivo |
| `logout` | El usuario cerró sesión |
| `prompt_input_exit` | El usuario salió mientras la entrada de prompt estaba visible |
| `bypass_permissions_disabled` | Se deshabilitó el modo bypass de permisos |
| `other` | Cualquier otra razón de cierre |

**Ejemplo — Guardar un log solo cuando la sesión termina normalmente:**

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "other|prompt_input_exit",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date -Is) | Sesión finalizada\" >> .claude/logs/sessions.log"
          }
        ]
      }
    ]
  }
}
```

> ⏱️ Los hooks `SessionEnd` tienen un **timeout por defecto de solo 1.5 segundos**. Si necesitas más tiempo, establece `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` antes de lanzar Claude Code (ver [Parte 2](#-claude_code_sessionend_hooks_timeout_ms)).

---

## 🔔 Notification: tipo de notificación

| Matcher | Situación |
|---|---|
| `permission_prompt` | Claude necesita que apruebes un permiso |
| `idle_prompt` | Claude ha estado inactivo y necesita tu atención |
| `auth_success` | Autenticación completada con éxito |
| `elicitation_dialog` | Un servidor MCP pide input del usuario |

Permite configurar alertas diferentes según la situación: una notificación **urgente** cuando Claude espera permisos, y una más **suave** cuando simplemente está idle.

**Ejemplo — Notificación de escritorio solo cuando se requieren permisos:**

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude necesita permisos\" with title \"⚠️ Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

---

## 🤖 SubagentStart y SubagentStop: tipo de agente

| Matcher | Agente |
|---|---|
| `Bash` | Subagente de tipo Bash |
| `Explore` | Subagente de exploración |
| `Plan` | Subagente de planificación |
| *nombre custom* | Cualquier agente definido en `.claude/agents/` |

**Ejemplo — Inyectar contexto de seguridad a subagentes de exploración:**

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "Explore",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SubagentStart\",\"additionalContext\":\"No leas archivos .env ni .key\"}}'"
          }
        ]
      }
    ]
  }
}
```

---

## ⚙️ ConfigChange: fuente de configuración

| Matcher | Archivo / fuente |
|---|---|
| `user_settings` | `~/.claude/settings.json` |
| `project_settings` | `.claude/settings.json` |
| `local_settings` | `.claude/settings.local.json` |
| `policy_settings` | Managed policy settings (admin) |
| `skills` | Archivos de `.claude/skills/` |

> ⚠️ Los cambios en `policy_settings` **no pueden ser bloqueados** por hooks, aunque el hook **sí se ejecuta** (útil para auditoría).

**Ejemplo — Auditar cualquier cambio en la configuración del proyecto:**

```json
{
  "hooks": {
    "ConfigChange": [
      {
        "matcher": "project_settings|local_settings",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$(date -Is) | Config changed\" >> .claude/logs/config-audit.log"
          }
        ]
      }
    ]
  }
}
```

---

## 📄 FileChanged: nombre de archivo (basename)

A diferencia del resto, aquí el matcher especifica **qué archivos vigilar**. Es una lista separada por pipes de **nombres de archivo** (sin ruta, solo el basename).

| Matcher | Archivos vigilados |
|---|---|
| `.envrc` | Solo `.envrc` |
| `.env` | Solo `.env` |
| `.envrc\|.env` | Ambos archivos |
| `package.json` | `package.json` |
| `Dockerfile` | El `Dockerfile` |

Especialmente útil combinado con [`CLAUDE_ENV_FILE`](#-claude_env_file-persistir-variables-de-sesión) para **recargar variables de entorno automáticamente** cuando cambian archivos de configuración.

**Ejemplo — Recargar variables cuando cambia `.envrc` (integración con direnv):**

```json
{
  "hooks": {
    "FileChanged": [
      {
        "matcher": ".envrc|.env",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/reload-env.sh"
          }
        ]
      }
    ]
  }
}
```

Y el script `reload-env.sh`:

```bash
#!/bin/bash
# Recargar variables cuando cambia .envrc o .env
if [ -n "$CLAUDE_ENV_FILE" ]; then
    if [ -f .envrc ]; then
        direnv export bash >> "$CLAUDE_ENV_FILE" 2>/dev/null
    fi
fi
exit 0
```

---

## 💥 StopFailure: tipo de error

| Matcher | Error |
|---|---|
| `rate_limit` | Límite de tasa alcanzado |
| `authentication_failed` | Fallo de autenticación |
| `billing_error` | Error de facturación |
| `invalid_request` | Petición inválida |
| `server_error` | Error del servidor |
| `max_output_tokens` | Se alcanzó el límite máximo de tokens de salida |
| `unknown` | Error no identificado |

**Ejemplo — Alerta específica para rate limits:**

```json
{
  "hooks": {
    "StopFailure": [
      {
        "matcher": "rate_limit",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Rate limit alcanzado. Espera antes de continuar.'"
          }
        ]
      }
    ]
  }
}
```

---

## 📚 InstructionsLoaded: razón de carga

| Matcher | Razón |
|---|---|
| `session_start` | Archivos cargados al iniciar sesión |
| `nested_traversal` | Carga lazy al acceder a un subdirectorio con su propio `CLAUDE.md` |
| `path_glob_match` | Carga lazy cuando una regla condicional con `paths:` coincide |
| `include` | Archivo cargado por inclusión desde otro archivo de instrucciones |
| `compact` | Archivos recargados después de una compactación |

> 👀 Este evento es **solo de observación**: no puedes bloquear ni modificar la carga de instrucciones.

---

## 🗜️ PreCompact y PostCompact: qué disparó la compactación

| Matcher | Disparador |
|---|---|
| `manual` | El usuario ejecutó `/compact` |
| `auto` | Compactación automática cuando la ventana de contexto se llenó |

---

## 💬 Elicitation y ElicitationResult: nombre del servidor MCP

El matcher se compara contra el **nombre del servidor MCP** que está solicitando input del usuario. Los valores dependen de los servidores MCP que tengas configurados.

---

## 🚫 Eventos sin soporte de matcher

Estos eventos **no soportan matchers** y se disparan **siempre**:

| Evento | Se ejecuta… |
|---|---|
| `UserPromptSubmit` | Al enviar un prompt |
| `Stop` | Cuando Claude termina de responder |
| `TeammateIdle` | Cuando un teammate va a entrar en idle |
| `TaskCreated` | Al crear una tarea |
| `TaskCompleted` | Al completar una tarea |
| `WorktreeCreate` | Al crear un worktree |
| `WorktreeRemove` | Al eliminar un worktree |
| `CwdChanged` | Al cambiar de directorio |

> ⚠️ Si añades un campo `matcher` a estos eventos, será **ignorado silenciosamente**.

---

# Parte 2 — Variables de entorno disponibles en hooks

Los hooks tienen acceso a ciertas **variables de entorno** que Claude Code establece automáticamente. Además, reciben **datos del evento como JSON** por stdin (hooks `command`) o como body del POST (hooks HTTP).

| Tipo de dato | Cómo se accede | Ejemplo |
|---|---|---|
| Variable de entorno | `$VARIABLE` | `"$CLAUDE_PROJECT_DIR"` |
| Campo JSON del evento | `jq` / parseo de stdin | `jq -r '.tool_name'` |

---

## 🌍 Variables de entorno para todos los hooks

### `$CLAUDE_PROJECT_DIR`

Ruta absoluta a la **raíz del proyecto**. Es la variable más usada para referenciar scripts relativos al proyecto. **Siempre envuélvela en comillas** para manejar rutas con espacios.

```json
{
  "type": "command",
  "command": "python3 \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/mi-hook.py"
}
```

### `$CLAUDE_CODE_REMOTE`

Se establece como `"true"` cuando Claude Code se ejecuta en un **entorno web remoto** (por ejemplo, Claude Code en la web). **No se establece en la CLI local**. Útil para que un hook se comporte diferente en entornos remotos.

```bash
#!/bin/bash
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
    echo "Ejecutando en entorno remoto, saltando notificación de escritorio"
    exit 0
fi
osascript -e 'display notification "Tarea completada" with title "Claude Code"'
```

---

## 💾 `$CLAUDE_ENV_FILE`: persistir variables de sesión

Variable especial **solo disponible en tres eventos**: `SessionStart`, `CwdChanged` y `FileChanged`.

Contiene la ruta a un archivo temporal donde puedes escribir sentencias `export` que se aplicarán a **todos los comandos Bash subsiguientes** de la sesión.

> ✅ Usa **append (`>>`)** para no sobrescribir variables establecidas por otros hooks.

```bash
#!/bin/bash
# .claude/hooks/setup-env.sh (hook de SessionStart)
if [ -n "$CLAUDE_ENV_FILE" ]; then
    echo 'export NODE_ENV=development' >> "$CLAUDE_ENV_FILE"
    echo 'export PYTHONDONTWRITEBYTECODE=1' >> "$CLAUDE_ENV_FILE"
    echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

### Patrón avanzado: capturar el diff del entorno

Captura todas las variables que establece un script de setup (como `nvm use`) comparando el estado **antes y después**:

```bash
#!/bin/bash
ENV_BEFORE=$(export -p | sort)

# Ejecutar setup que modifica el entorno
source ~/.nvm/nvm.sh
nvm use 20

if [ -n "$CLAUDE_ENV_FILE" ]; then
    ENV_AFTER=$(export -p | sort)
    comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi
exit 0
```

---

## ❌ Lo que NO son variables de entorno (campos JSON)

Un error común es confundir los datos que llegan por **JSON stdin** con variables de entorno. Los siguientes se acceden con **`jq`**, **no** con `$VARIABLE`:

| Campo JSON | Descripción |
|---|---|
| `session_id` | Identificador de la sesión actual |
| `transcript_path` | Ruta al archivo JSON de la conversación |
| `cwd` | Directorio de trabajo actual |
| `permission_mode` | Modo de permisos activo (`"default"`, `"auto"`, `"plan"`, etc.) |
| `hook_event_name` | Nombre del evento que se disparó |
| `tool_name` | Nombre de la herramienta (en eventos de tool) |
| `tool_input` | Parámetros de la herramienta (en eventos de tool) |

**En Bash:**

```bash
#!/bin/bash
input=$(cat)  # Leer todo el JSON de stdin
session_id=$(echo "$input" | jq -r '.session_id')
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
command=$(echo "$input" | jq -r '.tool_input.command // empty')
```

**En Python:**

```python
import sys, json
data = json.load(sys.stdin)
session_id = data.get("session_id", "unknown")
tool_name = data.get("tool_name", "")
```

---

## ⏱️ `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`

No es una variable que usen los hooks internamente: **la estableces tú antes de lanzar Claude Code** para controlar cuánto pueden tardar los hooks de `SessionEnd`.

El valor por defecto es **1500 ms (1.5 segundos)**, bastante corto. Si tus hooks de limpieza necesitan más tiempo:

```bash
CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=5000 claude
```

---

## 📝 Nota sobre `$CLAUDECODE`

La variable `CLAUDECODE` (sin guion bajo) se establece como `1` en los shells que Claude Code genera con la herramienta Bash y en sesiones tmux. Pero **no se establece dentro de hooks**.

> 🚫 No la uses en tus scripts de hooks: siempre estará vacía. Existe para que tus scripts **normales** (no hooks) puedan detectar si están ejecutándose dentro de un shell de Claude Code.

---

## 🧾 Resumen

| Concepto | Clave |
|---|---|
| **Matcher** | Regex; lo que filtra depende del evento. Vacío, omitido o `*` = siempre |
| **Eventos de tool** | Filtran por `tool_name` (built-in o `mcp__<servidor>__<herramienta>`) |
| **SessionStart** | `startup`, `resume`, `clear`, `compact`; su stdout llega a Claude |
| **FileChanged** | Matcher = basenames a vigilar |
| **Sin matcher** | `UserPromptSubmit`, `Stop`, `CwdChanged`, etc. → matcher ignorado |
| **`$CLAUDE_PROJECT_DIR`** | Raíz del proyecto; siempre entre comillas |
| **`$CLAUDE_CODE_REMOTE`** | `"true"` solo en entornos web remotos |
| **`$CLAUDE_ENV_FILE`** | Solo `SessionStart`, `CwdChanged`, `FileChanged`; usar `>>` |
| **Campos JSON** | `session_id`, `tool_name`, `cwd`… → se leen con `jq`, no con `$` |
| **Timeout SessionEnd** | 1.5 s por defecto; ajustable con `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` |
| **`$CLAUDECODE`** | No disponible dentro de hooks |
