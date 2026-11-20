# 🧩 Permisos personalizados con Claude Code

> Además de los **modos** (ver [Modos de permisos de Claude Code](./Modos%20de%20permisos%20de%20Claude%20Code.md)), Claude Code tiene un sistema de **reglas granulares** que controla qué herramientas concretas puede usar, con qué argumentos y sobre qué rutas o dominios.
>
> **Modo** = comportamiento por defecto de la sesión · **Reglas** = excepciones precisas a ese comportamiento.

---

## 📑 Tabla de contenido

1. [Nivel 0 — La idea en 1 minuto](#-nivel-0--la-idea-en-1-minuto)
2. [Nivel 1 — Orden de evaluación](#-nivel-1--orden-de-evaluación)
3. [Nivel 1 — Dónde se escriben las reglas](#-nivel-1--dónde-se-escriben-las-reglas)
4. [Nivel 2 — Sintaxis de reglas](#-nivel-2--sintaxis-de-reglas)
5. [Nivel 2 — Reglas de Bash en detalle](#-nivel-2--reglas-de-bash-en-detalle)
6. [Nivel 3 — Patrones para Read y Edit](#-nivel-3--patrones-para-read-y-edit)
7. [Nivel 3 — WebFetch, MCP, subagentes y otras herramientas](#-nivel-3--webfetch-mcp-subagentes-y-otras-herramientas)
8. [Nivel 4 — Limitaciones y cómo cerrarlas](#-nivel-4--limitaciones-y-cómo-cerrarlas)
9. [Nivel 4 — Hooks: permisos programables](#-nivel-4--hooks-permisos-programables)
10. [Nivel 5 — Sandbox y políticas de organización](#-nivel-5--sandbox-y-políticas-de-organización)
11. [Recetas listas para copiar](#-recetas-listas-para-copiar)
12. [Depuración y errores comunes](#-depuración-y-errores-comunes)
13. [Checklist de experto](#-checklist-de-experto)
14. [Fe de erratas del material original](#-fe-de-erratas-del-material-original)

---

## 🟢 Nivel 0 — La idea en 1 minuto

Cada vez que Claude quiere usar una herramienta (`Bash`, `Read`, `Edit`, `WebFetch`, una herramienta MCP…), Claude Code busca una regla que coincida en tres listas:

| Lista | Efecto |
|-------|--------|
| `allow` | Se ejecuta **sin preguntar**. |
| `ask` | **Siempre** pide confirmación, aunque el modo lo permitiría. |
| `deny` | Se **bloquea** siempre; Claude recibe el rechazo. |

```json
{
  "permissions": {
    "allow": ["Bash(npm run test *)"],
    "ask":   ["Bash(git push *)"],
    "deny":  ["Read(./.env)"]
  }
}
```

Si ninguna regla coincide, decide el **modo activo** (`default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`).

---

## 🟢 Nivel 1 — Orden de evaluación

```
deny  →  ask  →  allow  →  (sin coincidencia: decide el modo)
```

- Las reglas se evalúan en ese orden y **la primera que coincide gana**.
- Por eso `deny` **siempre** gana sobre `allow`: una restricción de seguridad no se puede anular con una regla más permisiva, ni siquiera desde otro archivo de configuración.
- El orden **no depende de la posición** dentro del array ni del archivo: un `deny` en tu settings de usuario bloquea aunque el proyecto tenga un `allow` equivalente.
- Las reglas `deny` siguen aplicándose en modos permisivos como `bypassPermissions`: se omiten los diálogos, no las denegaciones explícitas.

**Ejemplo:**

```json
{
  "permissions": {
    "allow": ["Bash(git *)"],
    "ask":   ["Bash(git push *)"],
    "deny":  ["Bash(git push --force *)"]
  }
}
```

| Comando | Resultado | Por qué |
|---------|-----------|---------|
| `git status` | ✅ allow | Solo coincide `Bash(git *)` |
| `git push origin main` | ❓ ask | `ask` se evalúa antes que `allow` |
| `git push --force origin main` | ⛔ deny | `deny` se evalúa primero |

> [!TIP]
> Patrón muy útil: **`allow` amplio + `ask`/`deny` específicos**. Das fluidez general y proteges solo los casos peligrosos.

---

## 🟢 Nivel 1 — Dónde se escriben las reglas

| Prioridad | Ubicación | Alcance | ¿Versionado? |
|:-:|-----------|---------|:-:|
| 1 | Settings gestionados (`managed-settings.json`, MDM, políticas) | Toda la organización | Lo impone IT |
| 2 | Flags CLI: `--allowedTools`, `--disallowedTools` | Solo esa sesión | — |
| 3 | `.claude/settings.local.json` | Tú, en este proyecto | ❌ (git-ignorado) |
| 4 | `.claude/settings.json` | Todo el equipo, en este proyecto | ✅ |
| 5 | `~/.claude/settings.json` | Tú, en todos tus proyectos | — |

Puntos clave:

- **Las listas se combinan** entre niveles (no se reemplazan): las reglas de todos los archivos se suman y luego se aplica `deny → ask → allow`.
- La "prioridad" importa para valores escalares (p. ej. `defaultMode`) y para lo que los settings gestionados pueden **bloquear**.
- Al pulsar **"Sí, no volver a preguntar"** en un diálogo, la regla se guarda normalmente en `.claude/settings.local.json`.

### Gestión interactiva: `/permissions`

```text
/permissions
```

- Lista todas las reglas activas y **de qué archivo provienen**.
- Permite añadir/eliminar reglas en cada lista y elegir el archivo destino.
- Muestra las **denegaciones recientes** (útil para saber qué bloqueó el modo `auto` o `dontAsk`).
- Gestiona los **directorios de trabajo** adicionales.

### Directorios adicionales

Por defecto Claude solo trabaja dentro del directorio del proyecto. Para darle acceso a otras carpetas:

```bash
claude --add-dir ../shared-lib
```

```json
{ "permissions": { "additionalDirectories": ["../shared-lib/"] } }
```

O en sesión: `/add-dir ../shared-lib`.

---

## 🟡 Nivel 2 — Sintaxis de reglas

Formato: **`Herramienta`** o **`Herramienta(especificador)`**. El nombre de la herramienta distingue mayúsculas (`Bash`, no `bash`).

### Coincidencia total (sin paréntesis)

| Regla | Captura |
|-------|---------|
| `Bash` | Todos los comandos Bash |
| `Read` | Todas las lecturas de archivo |
| `Edit` | Todas las ediciones de archivo (incluye las herramientas que escriben archivos) |
| `WebFetch` | Todas las peticiones web |
| `Bash(*)` | Equivalente a `Bash` a secas |

### Coincidencia específica (con especificador)

| Regla | Captura |
|-------|---------|
| `Bash(uv run pytest)` | Solo el comando exacto `uv run pytest` |
| `Bash(uv run *)` | Cualquier comando que empiece por `uv run ` |
| `Read(./.env)` | El archivo `.env` del directorio actual |
| `WebFetch(domain:api.anthropic.com)` | Peticiones a ese dominio |
| `mcp__puppeteer` | Todas las herramientas del servidor MCP `puppeteer` |
| `mcp__puppeteer__puppeteer_navigate` | Una herramienta MCP concreta |
| `Agent(Explore)` | El subagente `Explore` |

---

## 🟡 Nivel 2 — Reglas de Bash en detalle

### Wildcards en cualquier posición

```json
{
  "permissions": {
    "allow": [
      "Bash(uv run *)",
      "Bash(git commit *)",
      "Bash(* --version)",
      "Bash(* --help *)"
    ]
  }
}
```

### El espacio antes de `*` importa

| Regla | `ls -la` | `lsof` | Motivo |
|-------|:-:|:-:|--------|
| `Bash(ls *)` | ✅ | ❌ | Exige espacio o fin de cadena tras `ls` (límite de palabra) |
| `Bash(ls*)` | ✅ | ✅ | Sin límite de palabra |
| `Bash(ls:*)` | ✅ | ❌ | **Sintaxis heredada** equivalente a `Bash(ls *)` (obsoleta) |

> [!NOTE]
> Verás `Bash(npm run test:*)` en muchos ejemplos antiguos (incluido el documento de modos). Funciona, pero la forma **actual recomendada** es `Bash(npm run test *)`.

### Operadores de shell

Claude Code entiende `&&`, `||`, `;` y `|`. Cada subcomando se evalúa **por separado**:

- `Bash(npm test *)` **no** autoriza `npm test && rm -rf build`: `rm -rf build` necesita su propia regla.
- Al aprobar un comando compuesto con *"Sí, no volver a preguntar"*, se guarda **una regla por subcomando** (máx. 5), no una regla para toda la cadena.

### Comandos envoltorio

Algunos envoltorios comunes (`timeout`, `time`, `nice`, `nohup`, `xargs`…) se ignoran al comparar: `timeout 30 npm test` se evalúa como `npm test`. No ocurre lo mismo con `bash -c "..."`, `sh -c`, `env VAR=x cmd` o `npx`, que conviene tratar con cuidado.

### Las reglas sobre argumentos son frágiles ⚠️

Intentar restringir **argumentos** con patrones es poco fiable:

```json
"allow": ["Bash(curl http://github.com/ *)"]
```

Esta regla **no** cubre (ni protege frente a):

- Opciones antes de la URL: `curl -X GET http://github.com/...`
- Otro protocolo: `curl https://github.com/...`
- Redirecciones: `curl -L http://bit.ly/xyz` → acaba en otro dominio
- Variables: `URL=http://github.com && curl $URL`
- Espacios extra: `curl  http://github.com`

**Mejor estrategia:**

1. `deny` sobre la herramienta de red en Bash: `Bash(curl *)`, `Bash(wget *)`.
2. `allow` sobre `WebFetch(domain:github.com)` para lo legítimo.
3. Para lógica fina → **hooks** (Nivel 4). Para garantías reales → **sandbox** (Nivel 5).

### Windows: PowerShell

En Windows, Claude Code puede usar también la herramienta `PowerShell`, con su propia regla: `PowerShell(Get-ChildItem *)`. Una regla `Bash(...)` **no** cubre comandos PowerShell y viceversa; si trabajas en Windows, duplica las reglas críticas en ambas.

---

## 🟠 Nivel 3 — Patrones para Read y Edit

Siguen la especificación de **`.gitignore`**, con cuatro tipos de ruta según el prefijo:

| Prefijo | Significado | Ejemplo |
|---------|-------------|---------|
| `//ruta` | **Absoluta** desde la raíz del filesystem | `Read(//etc/passwd)` |
| `~/ruta` | Desde el *home* del usuario | `Read(~/.ssh/*)` |
| `/ruta` | Relativa a la **raíz del proyecto** | `Edit(/src/**/*.py)` |
| `ruta` o `./ruta` | Relativa al **directorio actual** | `Read(.env)` |

> [!WARNING]
> **Contraintuitivo:** `/Users/alice/file` **no** es absoluta: es relativa a la raíz del proyecto. Para una ruta absoluta real: `//Users/alice/file`.

### Windows

Las rutas se normalizan a formato POSIX antes de compararse: `C:\Users\alice` → `/c/Users/alice`.

| Objetivo | Regla |
|----------|-------|
| Todos los `.env` de la unidad C: | `Read(//c/**/.env)` |
| Tu carpeta `.ssh` | `Read(~/.ssh/**)` |
| Un archivo absoluto | `Read(//c/Users/alice/secreto.txt)` |

### `*` vs `**`

- `*` → coincide dentro de **un solo directorio**.
- `**` → coincide **recursivamente** en todos los subdirectorios.

| Regla | `src/pixelforge/processor.py` | `src/pixelforge/filters/vignette.py` |
|-------|:-:|:-:|
| `Read(/src/*/*.py)` | ✅ | ❌ |
| `Read(/src/**/*.py)` | ✅ | ✅ |

### Reglas típicas de protección de secretos

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(**/.env)",
      "Read(./secrets/**)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(**/appsettings.Production.json)",
      "Edit(./.env*)"
    ]
  }
}
```

> [!TIP]
> `Read(.env)` solo cubre el `.env` del directorio actual. Si hay varios (monorepo), usa `Read(**/.env)`.

### Rutas protegidas

Independientemente de tus reglas, Claude Code pide confirmación (o deniega) para escribir en rutas sensibles de configuración como `.git/` o la propia configuración de `.claude/`, para evitar que una instrucción maliciosa se auto-conceda permisos.

---

## 🟠 Nivel 3 — WebFetch, MCP, subagentes y otras herramientas

### WebFetch y WebSearch

```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:docs.anthropic.com)",
      "WebFetch(domain:learn.microsoft.com)",
      "WebFetch(domain:*.github.com)"
    ],
    "deny": ["WebSearch"]
  }
}
```

### Herramientas MCP

Formato: `mcp__<servidor>__<herramienta>`.

| Regla | Captura |
|-------|---------|
| `mcp__github` | Todas las herramientas del servidor `github` |
| `mcp__github__*` | Igual que la anterior (wildcard) |
| `mcp__github__get_issue` | Solo esa herramienta |

Patrón recomendado: permitir lectura, preguntar en escritura.

```json
{
  "permissions": {
    "allow": ["mcp__github__get_*", "mcp__github__list_*", "mcp__github__search_*"],
    "ask":   ["mcp__github__create_*", "mcp__github__update_*", "mcp__github__merge_*"]
  }
}
```

### Subagentes

```json
{
  "permissions": {
    "allow": ["Agent(Explore)", "Agent(Plan)"],
    "deny":  ["Agent(mi-agente-experimental)"]
  }
}
```

> [!NOTE]
> Los subagentes heredan las reglas de permisos de la sesión: un `deny` sobre `Read(./.env)` también los afecta.

---

## 🔴 Nivel 4 — Limitaciones y cómo cerrarlas

### Read/Edit no controlan los subprocesos de Bash

| Regla | Bloquea la herramienta `Read` | Bloquea `cat .env` en Bash |
|-------|:-:|:-:|
| `Read(./.env)` | ✅ | ❌ |

- Las reglas `deny` de `Read` y `Edit` aplican a las herramientas internas de Claude (`Read`, `Edit`, `Write`, `Grep`, `Glob`…).
- En `Grep` y `Glob` se aplican de **mejor esfuerzo**: no es una barrera infalible.
- **No** se aplican a `cat`, `type`, `Get-Content`, `sed`, `python -c`, etc. ejecutados por Bash/PowerShell.

### Cómo cerrar el hueco (de menos a más robusto)

| Capa | Ejemplo | Robustez |
|------|---------|:-:|
| 1. Denegar también en Bash | `Bash(cat .env*)`, `Bash(* .env*)` | 🟡 Eludible |
| 2. Usar `ask` en Bash por defecto | No poner `allow: ["Bash"]` | 🟡 Depende de que revises |
| 3. Hook `PreToolUse` | Script que busca `.env` en cualquier comando | 🟠 Bueno |
| 4. **Sandbox** | Aislamiento a nivel de SO | 🟢 Real |
| 5. No tener el secreto en disco | Gestor de secretos / variables inyectadas | 🟢 El mejor |

---

## 🔴 Nivel 4 — Hooks: permisos programables

Cuando los patrones no bastan, un hook **`PreToolUse`** ejecuta tu código antes de cada herramienta y decide.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|PowerShell",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/guard.mjs" }]
      }
    ]
  }
}
```

`.claude/hooks/guard.mjs`:

```js
const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const input = JSON.parse(Buffer.concat(chunks).toString());
const cmd = input.tool_input?.command ?? "";

const peligroso = [/\.env\b/i, /rm\s+-rf\s+\//, /git\s+push\s+.*--force/, /DROP\s+(TABLE|DATABASE)/i];

const decision = peligroso.some((re) => re.test(cmd))
  ? { permissionDecision: "deny", permissionDecisionReason: `Bloqueado por política: ${cmd}` }
  : null;

if (decision) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", ...decision } }));
}
process.exit(0);
```

- `permissionDecision` puede ser `"allow"`, `"deny"` o `"ask"`.
- Alternativa simple: salir con código **`2`**; el texto de `stderr` se envía a Claude como motivo del bloqueo.
- Un `deny` del hook bloquea aunque exista un `allow`; un `allow` del hook **no** anula un `deny` de las reglas.
- Usos típicos: bloquear según la rama de git (`main`), el horario, el contenido de un SQL, o registrar (auditar) cada comando.

---

## 🔴 Nivel 5 — Sandbox y políticas de organización

### Sandbox

Las reglas y los hooks actúan sobre **lo que Claude pide**; el sandbox actúa sobre **lo que el proceso puede hacer** a nivel de sistema operativo.

```text
/sandbox
```

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true
  },
  "permissions": {
    "allow": ["WebFetch(domain:registry.npmjs.org)", "WebFetch(domain:api.nuget.org)"],
    "deny":  ["Read(./.env)", "Edit(./config/**)"]
  }
}
```

- **Filesystem:** reutiliza las reglas `deny` de `Read`/`Edit` → ahora sí bloquean `cat .env`.
- **Red:** combina las reglas `WebFetch(domain:...)` con la lista de dominios permitidos del sandbox → bloquea `curl` a dominios no autorizados.
- `autoAllowBashIfSandboxed`: como el aislamiento ya protege, los comandos Bash dentro del sandbox pueden ejecutarse sin diálogo.

### Políticas de organización (settings gestionados)

| Clave | Efecto |
|-------|--------|
| `permissions.deny` | Denegaciones que ningún usuario puede anular |
| `permissions.disableBypassPermissionsMode: "disable"` | Prohíbe `bypassPermissions` / `--dangerously-skip-permissions` |
| `allowManagedPermissionRulesOnly: true` | Solo valen las reglas de la organización; se ignoran las de usuario/proyecto |
| `allowManagedHooksOnly: true` | Solo se ejecutan los hooks definidos por la organización |

---

## 📦 Recetas listas para copiar

### Proyecto Node.js (npm)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm test *)",
      "Bash(npx tsc *)",
      "Bash(node --version)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "ask": [
      "Bash(npm install *)",
      "Bash(npm publish *)",
      "Bash(git push *)"
    ],
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Bash(wget *)"
    ]
  }
}
```

### Proyecto .NET 6 + SQL

```json
{
  "permissions": {
    "allow": [
      "Bash(dotnet build *)",
      "Bash(dotnet test *)",
      "Bash(dotnet restore *)",
      "PowerShell(dotnet build *)",
      "PowerShell(dotnet test *)"
    ],
    "ask": [
      "Bash(dotnet ef database update *)",
      "Bash(dotnet ef migrations remove *)",
      "Bash(dotnet add package *)",
      "Bash(sqlcmd *)"
    ],
    "deny": [
      "Read(**/appsettings.Production.json)",
      "Read(**/secrets.json)",
      "Read(**/*.pfx)",
      "Bash(dotnet ef database drop *)"
    ]
  }
}
```

### Modo solo-lectura para auditoría

```json
{
  "permissions": {
    "defaultMode": "dontAsk",
    "allow": ["Read", "Grep", "Glob", "Bash(git log *)", "Bash(git diff *)"],
    "deny":  ["Edit", "WebFetch", "WebSearch"]
  }
}
```

### CI/CD

```bash
claude -p "Corrige los errores de lint y ejecuta los tests" \
  --permission-mode dontAsk \
  --allowedTools "Read" "Edit" "Bash(npm run lint *)" "Bash(npm test *)" \
  --disallowedTools "Bash(git push *)" "WebFetch"
```

---

## 🩺 Depuración y errores comunes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Mi `allow` no tiene efecto | Hay un `ask`/`deny` que también coincide (quizá en otro archivo) | `/permissions` muestra el origen de cada regla |
| `Bash(npm test)` sigue preguntando con `npm test -- --watch` | Sin `*` la regla es **exacta** | `Bash(npm test *)` |
| `Bash(ls*)` permite `lsof` | Falta el espacio (sin límite de palabra) | `Bash(ls *)` |
| `Read(/etc/hosts)` no bloquea | `/` = raíz del **proyecto** | `Read(//etc/hosts)` |
| `Read(/src/*.py)` no cubre subcarpetas | `*` es un solo nivel | `Read(/src/**/*.py)` |
| Claude lee el `.env` con `cat` | `Read` no controla Bash | Hook o sandbox |
| Regla en Windows no coincide | Ruta con `C:\` | Usar `//c/...` |
| `bash(...)` no funciona | El nombre distingue mayúsculas | `Bash(...)` |
| JSON inválido = reglas ignoradas | Coma sobrante o comillas | Validar el JSON; `/doctor` ayuda a detectar errores de configuración |

---

## ✅ Checklist de experto

- [ ] Entiendo que **`deny → ask → allow`** y que la primera coincidencia gana.
- [ ] Sé en qué archivo va cada regla (equipo vs personal vs organización).
- [ ] Uso `Bash(cmd *)` y no la sintaxis heredada `cmd:*`.
- [ ] Distingo `//`, `~/`, `/` y `./` en reglas de rutas.
- [ ] Distingo `*` de `**`.
- [ ] Protejo secretos con `deny` en `Read` **y** sé que eso no basta frente a Bash.
- [ ] No confío en reglas de argumentos de Bash como barrera de seguridad.
- [ ] Uso `ask` para acciones irreversibles o externas (push, despliegues, migraciones, instalación de paquetes).
- [ ] Tengo un hook `PreToolUse` para lo que los patrones no pueden expresar.
- [ ] Activo el **sandbox** cuando necesito garantías reales.
- [ ] Reviso periódicamente `/permissions` y elimino reglas obsoletas.

---

## 📝 Fe de erratas del material original

Al verificar el contenido base se ajustó lo siguiente:

| Original | Corrección |
|----------|------------|
| "`Bash(ls:*)` es la sintaxis **moderna** equivalente a `Bash(ls *)`" | Es al revés: `:*` es la sintaxis **heredada/obsoleta**; la actual es `Bash(ls *)`. Siguen siendo equivalentes. |
| Documento de modos: "`/ruta` relativa a la ubicación del archivo de settings" | Según la documentación actual, `/ruta` es relativa a la **raíz del proyecto** (coincide con este documento). |

**Temas añadidos:** ubicación y combinación de reglas entre archivos, `/permissions`, directorios adicionales, fragilidad de reglas sobre argumentos, envoltorios de comandos, herramienta `PowerShell` en Windows, rutas protegidas, patrones MCP, hooks `PreToolUse` con ejemplo, configuración de sandbox, políticas gestionadas, recetas para Node y .NET, tabla de depuración y checklist.

---

> 📚 **Referencia oficial:** [Permisos (IAM)](https://docs.anthropic.com/en/docs/claude-code/iam) · [Settings](https://docs.anthropic.com/en/docs/claude-code/settings) · [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) · [Sandboxing](https://docs.anthropic.com/en/docs/claude-code/sandboxing)
