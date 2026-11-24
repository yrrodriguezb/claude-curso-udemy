# 🪝 Eventos y Hooks disponibles en Claude Code

> Un **hook** es un script, endpoint HTTP, prompt LLM o subagente que **se ejecuta automáticamente** cuando ocurre un evento específico en Claude Code.
>
> A diferencia de las instrucciones en `CLAUDE.md` (que son *sugerencias* que el modelo puede o no seguir), los hooks son **deterministas**: garantizan que la acción se ejecuta siempre, sin excepción.
>
> **Analogía:** si `CLAUDE.md` es un cartel de *"por favor, cierra la puerta al salir"*, un hook es un **mecanismo automático** que cierra la puerta cada vez que alguien pasa.

Documentos relacionados: [Hooks de seguridad en Claude Code](../Seccion%206/Hooks%20de%20seguridad%20en%20Claude%20Code.md) · [Modos de permisos](../Seccion%206/Modos%20de%20permisos%20de%20Claude%20Code.md)

---

## 📑 Tabla de contenido

1. [Anatomía de un hook](#-anatomía-de-un-hook)
2. [Los cuatro tipos de handler](#-los-cuatro-tipos-de-handler)
3. [Eventos disponibles](#-eventos-disponibles)
4. [Exit codes y comunicación](#-exit-codes-y-comunicación)
5. [Qué eventos puede bloquear el exit code 2](#-qué-eventos-puede-bloquear-el-exit-code-2)
6. [Errores comunes](#-errores-comunes)
7. [Resumen](#-resumen)

---

## 🧩 Anatomía de un hook

Los hooks se declaran en los archivos de configuración (`~/.claude/settings.json`, `.claude/settings.json` o `.claude/settings.local.json`) con tres niveles:

```json
{
  "hooks": {
    "PostToolUse": [                       // 1. Evento
      {
        "matcher": "Edit|Write",           // 2. Filtro (qué herramienta)
        "hooks": [
          {                                // 3. Handler (qué se ejecuta)
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_PROJECT_DIR\""
          }
        ]
      }
    ]
  }
}
```

| Nivel | Qué define | Ejemplo |
|-------|-----------|---------|
| **Evento** | *Cuándo* se dispara | `PreToolUse`, `Stop`, `SessionStart` |
| **Matcher** | *Sobre qué* aplica (en eventos de herramientas) | `Bash`, `Edit\|Write`, `mcp__github__.*` |
| **Handler** | *Qué* se ejecuta | `command`, `http`, `prompt`, `agent` |

> [!TIP]
> Usa el comando `/hooks` dentro de Claude Code para ver y gestionar los hooks activos sin editar el JSON a mano.

---

## 🛠️ Los cuatro tipos de handler

| Tipo | Descripción | Cuándo usarlo |
|------|-------------|---------------|
| `command` | Ejecuta un comando shell. Recibe JSON por **stdin**, devuelve resultado por **exit code + stdout**. | Scripts locales, validaciones rápidas, formateo, notificaciones. |
| `http` | Envía un **POST HTTP** con el JSON del evento a una URL. | Integración con servicios externos, webhooks, APIs de equipo. |
| `prompt` | Envía un prompt a un modelo Claude para una evaluación **sí/no** en un solo turno. | Decisiones que requieren **juicio semántico**, no reglas fijas. |
| `agent` | Genera un **subagente** con acceso a herramientas (`Read`, `Grep`, `Glob`) para verificar condiciones. | Validaciones complejas que necesitan inspeccionar archivos o código. |

### Ejemplos rápidos

**`command`** — lintear después de editar:

```json
{ "type": "command", "command": "npm run lint --silent" }
```

**`http`** — enviar cada evento a un servicio de auditoría del equipo:

```json
{ "type": "http", "url": "https://auditoria.miempresa.local/claude-hooks" }
```

**`prompt`** — que un modelo decida si Claude realmente terminó:

```json
{
  "type": "prompt",
  "prompt": "Revisa si la tarea pedida quedó completa. Contexto: $ARGUMENTS"
}
```

**`agent`** — verificar con herramientas antes de cerrar el turno:

```json
{
  "type": "agent",
  "prompt": "Verifica que todos los archivos modificados tengan pruebas unitarias asociadas."
}
```

> [!NOTE]
> Regla práctica: empieza siempre por `command`. Sube a `prompt` o `agent` solo cuando una regla fija (regex, `jq`, script) **no** sea suficiente: son más lentos y consumen tokens.

---

## 📅 Eventos disponibles

Claude Code expone **más de 20 eventos** en su ciclo de vida. Estos son los más utilizados en flujos de trabajo profesionales, agrupados por momento:

### 🔵 Sesión

| Evento | Cuándo se dispara | Uso típico |
|--------|-------------------|------------|
| `SessionStart` | Al iniciar o reanudar una sesión. | Cargar contexto, variables de entorno, verificar dependencias. |
| `SessionEnd` | Al terminar una sesión. | Cleanup, logging final. |
| `InstructionsLoaded` | Cuando se carga un `CLAUDE.md` o `.claude/rules/*.md`. | Auditoría, observabilidad. |
| `ConfigChange` | Cuando cambia un archivo de configuración. | Auditoría, bloquear cambios no autorizados. |
| `CwdChanged` | Cuando cambia el directorio de trabajo. | Recargar variables de entorno (como `direnv`). |
| `FileChanged` | Cuando un archivo vigilado cambia en disco. | Recargar `.envrc`, `.env`, etc. |

### 🟢 Prompt y respuesta

| Evento | Cuándo se dispara | Uso típico |
|--------|-------------------|------------|
| `UserPromptSubmit` | Al enviar un prompt, **antes** de que Claude lo procese. | Enriquecer contexto, validar, filtrar prompts. |
| `Stop` | Cuando Claude termina de responder. | Tests finales, reportes, **forzar que continúe**. |
| `StopFailure` | Cuando el turno termina por error de API. | Logging de errores, alertas de rate limit. |
| `Notification` | Cuando Claude envía una alerta. | Notificaciones de escritorio / Slack. |

### 🟠 Herramientas y permisos

| Evento | Cuándo se dispara | Uso típico |
|--------|-------------------|------------|
| `PreToolUse` | **Antes** de ejecutar una herramienta. | Validar, bloquear, modificar inputs. **Único evento que puede bloquear herramientas.** |
| `PermissionRequest` | Cuando se muestra el diálogo de permisos. | Auto-aprobar o auto-denegar permisos programáticamente. |
| `PermissionDenied` | Cuando el clasificador de *auto mode* deniega una llamada. | Logging, o permitir reintento con `retry: true`. |
| `PostToolUse` | Después de que la herramienta se ejecute **con éxito**. | Formatear, lintear, logging, inyectar contexto. |
| `PostToolUseFailure` | Después de que una herramienta **falle**. | Logging de errores, alertas, contexto correctivo. |

### 🟣 Subagentes y equipos

| Evento | Cuándo se dispara | Uso típico |
|--------|-------------------|------------|
| `SubagentStart` | Cuando se crea un subagente. | Setup de entorno, inyección de contexto al subagente. |
| `SubagentStop` | Cuando un subagente termina. | Validar el output del subagente. |
| `TaskCreated` | Cuando se crea una tarea (*agent teams*). | Validar convenciones de nombres, requerir descripciones. |
| `TaskCompleted` | Cuando se marca una tarea como completada. | Ejecutar tests antes de cerrar una tarea. |
| `TeammateIdle` | Cuando un teammate va a entrar en idle. | *Quality gates* antes de que un teammate deje de trabajar. |

### ⚪ Contexto, worktrees y MCP

| Evento | Cuándo se dispara | Uso típico |
|--------|-------------------|------------|
| `PreCompact` / `PostCompact` | Antes / después de la compactación de contexto. | Re-inyectar contexto crítico tras compactación. |
| `WorktreeCreate` / `WorktreeRemove` | Al crear / eliminar un worktree. | Soporte para VCS no-git (SVN, Perforce, Mercurial). |
| `Elicitation` / `ElicitationResult` | Cuando un servidor MCP pide input al usuario. | Responder programáticamente a elicitaciones MCP. |

### Visualizando el ciclo de vida

```
SessionStart
    │
    ▼
UserPromptSubmit ──► (Claude piensa)
                          │
                          ▼
                 ┌──► PreToolUse ──► [PermissionRequest] ──► herramienta
                 │                                               │
                 │                    PostToolUse ◄── éxito ─────┤
                 │             PostToolUseFailure ◄── fallo ─────┘
                 │                          │
                 └──────── más herramientas ┘
                          │
                          ▼
                        Stop ──► (esperando nuevo prompt)
    │
    ▼
SessionEnd
```

---

## 🚦 Exit codes y comunicación

Los hooks de tipo `command` se comunican con Claude Code mediante **exit codes**, **stdout** y **stderr**:

| Exit code | Significado | Comportamiento |
|:---------:|-------------|----------------|
| `0` | ✅ Éxito | `stdout` se parsea como JSON para campos de control. En `UserPromptSubmit` y `SessionStart`, `stdout` se añade como **contexto visible para Claude**. |
| `2` | ⛔ Error **bloqueante** | `stderr` se envía a Claude como error. **Bloquea la operación** (en eventos que lo soporten). |
| Otro (`1`, `3`…) | ⚠️ Error **no bloqueante** | `stderr` se muestra solo en modo verbose. **La ejecución continúa.** |

> [!IMPORTANT]
> **Exit code `1` NO bloquea.** Es un error no bloqueante. Si tu hook debe impedir una acción, usa **`exit 2`**. Esta es una fuente muy común de bugs.

### Ejemplo: bloquear `rm -rf` con exit 2

```bash
#!/usr/bin/env bash
# .claude/hooks/bloquear-rm.sh
comando=$(jq -r '.tool_input.command // empty')

if echo "$comando" | grep -qE 'rm\s+-rf'; then
  echo "Bloqueado: no se permite 'rm -rf' en este proyecto." >&2
  exit 2   # ← bloquea y Claude recibe el mensaje de stderr
fi

exit 0
```

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/bloquear-rm.sh" }
        ]
      }
    ]
  }
}
```

### Alternativa: control fino con JSON en stdout (exit 0)

En lugar de `exit 2`, un hook puede salir con `0` y devolver JSON con la decisión:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "No se permite 'rm -rf' en este proyecto."
  }
}
```

`permissionDecision` admite `allow`, `deny` o `ask`, lo que permite más matices que un simple bloqueo.

---

## 🧱 Qué eventos puede bloquear el exit code 2

No todos los eventos soportan bloqueo. Esta es la forma más clara de verlo:

| ✅ Sí puede bloquear (exit 2) | ❌ No puede bloquear |
|------------------------------|---------------------|
| `PreToolUse` | `PostToolUse` |
| `PermissionRequest` | `PostToolUseFailure` |
| `UserPromptSubmit` | `PermissionDenied` |
| `Stop` | `Notification` |
| `SubagentStop` | `SubagentStart` |
| `TeammateIdle` | `SessionStart` |
| `TaskCreated` | `SessionEnd` |
| `TaskCompleted` | `CwdChanged` |
| `ConfigChange` | `FileChanged` |
| `Elicitation` | `PreCompact` |
| `ElicitationResult` | `PostCompact` |
| | `StopFailure` |
| | `InstructionsLoaded` |

> [!TIP]
> **Regla mnemotécnica:** puedes bloquear lo que **todavía no ha pasado** (una herramienta por ejecutarse, un prompt por procesarse, un turno por cerrarse). Lo que **ya ocurrió** (`PostToolUse`, `SessionStart`, `PostCompact`…) solo se puede observar, registrar o complementar con contexto.

> [!NOTE]
> En `Stop` y `SubagentStop`, "bloquear" significa **obligar a Claude a seguir trabajando**: el mensaje de `stderr` le indica qué le falta por hacer (por ejemplo, "los tests están fallando").

---

## ❌ Errores comunes

| Error | Consecuencia | Solución |
|-------|-------------|----------|
| Usar `exit 1` para bloquear | La acción **se ejecuta igual** | Usar `exit 2` |
| Bloquear en `PostToolUse` | La herramienta **ya se ejecutó**; no hay nada que deshacer | Mover la validación a `PreToolUse` |
| Escribir el motivo del bloqueo en `stdout` con `exit 2` | Claude no ve el motivo | En `exit 2`, el mensaje va por **`stderr`** |
| Imprimir texto no-JSON en `stdout` con `exit 0` | Claude Code no puede parsear los campos de control | Dejar `stdout` vacío o devolver JSON válido |
| `Stop` que siempre bloquea | Bucle infinito: Claude nunca termina | Revisar `stop_hook_active` en el input y salir con `0` si ya está activo |
| Usar `agent` o `prompt` para reglas simples | Lentitud y consumo de tokens | Preferir `command` con `jq`/regex |

---

## 📌 Resumen

- Un hook es **determinista**: se ejecuta siempre, a diferencia de `CLAUDE.md`.
- Hay **4 tipos de handler**: `command`, `http`, `prompt` y `agent`.
- Hay **más de 20 eventos**; los más usados son `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop` y `SessionStart`.
- **`exit 0`** = éxito · **`exit 2`** = bloquear · **cualquier otro** = error no bloqueante.
- **Solo algunos eventos** pueden bloquear: los que ocurren *antes* de que algo suceda.
- `PreToolUse` es el **único evento que puede bloquear herramientas**.
