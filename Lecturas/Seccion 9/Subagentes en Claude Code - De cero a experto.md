# 🤖 Subagentes en Claude Code — De cero a experto

> Esta lectura es la **guía integral** de la sección: parte de *qué es un subagente* y llega hasta **arquitecturas multiagente** de equipo, con archivos listos para copiar, un análisis campo por campo del **frontmatter**, patrones de orquestación, depuración y un modelo de **seguridad**.
>
> **Idea central:** un subagente es un **trabajador especializado** con su propia ventana de contexto, sus propias herramientas y su propio prompt. El hilo principal **delega**, el subagente **trabaja aislado** y devuelve **solo el resultado**. El frontmatter define **el entorno** del trabajador; el cuerpo del archivo define **su conducta**.

> [!NOTE]
> Los diagramas usan **Mermaid**, que se renderiza en GitHub y en VS Code (con la vista previa de Markdown o la extensión *Markdown Preview Mermaid Support*).

> [!IMPORTANT]
> Claude Code evoluciona rápido. Los nombres de campos y valores aquí descritos corresponden a la documentación vigente al escribir esta lectura. Ante la duda, consulta `/agents` dentro de Claude Code o la documentación oficial de *subagents*.

---

## 📑 Tabla de contenido

**Nivel 0 — Fundamentos**
1. [¿Por qué existen los subagentes?](#1-por-qué-existen-los-subagentes)
2. [Modelo mental: orquestador y trabajadores](#2-modelo-mental-orquestador-y-trabajadores)
3. [Subagentes integrados (los que ya usas sin saberlo)](#3-subagentes-integrados-los-que-ya-usas-sin-saberlo)
4. [Dónde viven los subagentes: alcance y precedencia](#4-dónde-viven-los-subagentes-alcance-y-precedencia)
5. [Tu primer subagente, paso a paso](#5-tu-primer-subagente-paso-a-paso)

**Nivel 1 — Anatomía: el frontmatter campo por campo**
6. [Estructura del archivo: configuración vs. comportamiento](#6-estructura-del-archivo-configuración-vs-comportamiento)
7. [Identidad: `name`, `description`, `color`](#7-identidad-name-description-color)
8. [Capacidades: `tools`, `disallowedTools`, `mcpServers`, `skills`](#8-capacidades-tools-disallowedtools-mcpservers-skills)
9. [Motor: `model` y `effort`](#9-motor-model-y-effort)
10. [Límites: `permissionMode` y `maxTurns`](#10-límites-permissionmode-y-maxturns)
11. [Ciclo de vida: `hooks`, `memory`, `background`, `isolation`](#11-ciclo-de-vida-hooks-memory-background-isolation)
12. [El cuerpo: escribir un buen system prompt](#12-el-cuerpo-escribir-un-buen-system-prompt)

**Nivel 2 — Uso diario**
13. [Cómo se invoca un subagente](#13-cómo-se-invoca-un-subagente)
14. [Recetario de subagentes](#14-recetario-de-subagentes)

**Nivel 3 — Avanzado**
15. [Patrones de orquestación](#15-patrones-de-orquestación)
16. [Contexto, tokens y costos](#16-contexto-tokens-y-costos)
17. [Subagentes vs. skills vs. hooks vs. CLAUDE.md vs. comandos](#17-subagentes-vs-skills-vs-hooks-vs-claudemd-vs-comandos)

**Nivel 4 — Experto: calidad, seguridad y operación**
18. [Depuración y troubleshooting](#18-depuración-y-troubleshooting)
19. [Seguridad: mínimo privilegio y modelo de amenazas](#19-seguridad-mínimo-privilegio-y-modelo-de-amenazas)
20. [Proyecto integrador: un equipo de agentes para el repo](#20-proyecto-integrador-un-equipo-de-agentes-para-el-repo)
21. [Ejercicios y checklist final](#21-ejercicios-y-checklist-final)
22. [Resumen](#22-resumen)

---

# Nivel 0 — Fundamentos

## 1. ¿Por qué existen los subagentes?

Una sesión de Claude Code tiene **una sola ventana de contexto**. Todo lo que Claude lee (archivos, salidas de comandos, resultados de búsquedas) se acumula ahí. Eso provoca tres problemas:

| Problema | Sin subagentes | Con subagentes |
|----------|----------------|----------------|
| **Contaminación del contexto**: buscar en 40 archivos llena la conversación de ruido | 🔴 El hilo principal se llena de basura que ya no necesita | ✅ El subagente lee los 40 archivos y devuelve 10 líneas de conclusión |
| **Especialización**: un buen *reviewer* necesita otro "carácter" que un buen *implementador* | 🟡 Cambias el prompt a mano en cada tarea | ✅ Cada rol tiene su prompt fijo y versionado |
| **Control**: explorar no debería poder borrar archivos | 🟡 Confías en que Claude "no lo haga" | ✅ El subagente de exploración **no tiene** `Write` ni `Edit` |
| **Costo y velocidad**: no toda tarea necesita el modelo más potente | 🔴 Todo corre con el mismo modelo | ✅ Exploración con `haiku`, arquitectura con `opus` |
| **Paralelismo**: investigar tres módulos a la vez | 🔴 Secuencial | ✅ Tres subagentes simultáneos |

> [!TIP]
> **Regla de oro:** si una tarea **genera mucho contexto que luego no necesitas**, o requiere **un rol/límites distintos**, es candidata a subagente. Si solo necesitas una instrucción más, basta con `CLAUDE.md` o una skill.

---

## 2. Modelo mental: orquestador y trabajadores

El hilo principal (la conversación contigo) actúa como **orquestador**. Cuando decide delegar, usa la herramienta **`Agent`** (antes llamada `Task`) para lanzar un subagente con un **prompt de delegación**. El subagente arranca **con contexto limpio**, trabaja con sus propias herramientas y, al terminar, devuelve **un único mensaje final** al orquestador.

```mermaid
flowchart LR
    U["👤 Tú"] -->|prompt| M["🧠 Hilo principal<br/>(orquestador)"]
    M -->|"Agent(prompt de delegación)"| S1["🔍 Subagente A<br/>contexto propio"]
    M -->|"Agent(prompt de delegación)"| S2["🧪 Subagente B<br/>contexto propio"]
    S1 -->|"resumen final"| M
    S2 -->|"resumen final"| M
    M -->|respuesta| U

    S1 -.->|Read / Grep / Glob| FS[("📁 Repo")]
    S2 -.->|Bash: npm test| FS
```

Cuatro reglas que explican casi todo su comportamiento:

1. **Contexto aislado.** El subagente **no ve** tu conversación. Solo recibe: su system prompt (el cuerpo del archivo) + detalles básicos del entorno + el prompt de delegación que redacta el orquestador.
2. **Solo vuelve el resultado.** Todo lo que el subagente leyó se queda en *su* contexto. Al hilo principal regresa solo su mensaje final.
3. **No hay anidamiento.** Un subagente **no puede lanzar otros subagentes**. La orquestación siempre la hace el hilo principal.
4. **El frontmatter manda.** Herramientas, modelo, permisos y límites se aplican por configuración, no por "buena voluntad" del modelo.

### Ciclo de vida de una delegación

```mermaid
sequenceDiagram
    participant U as Tú
    participant M as Hilo principal
    participant H as Motor de hooks
    participant S as Subagente
    U->>M: "Revisa la seguridad del módulo de pagos"
    M->>M: Compara la tarea con las description disponibles
    M->>H: SubagentStart (matcher = nombre del agente)
    M->>S: Agent(subagent_type="security-reviewer", prompt="...")
    loop hasta terminar o llegar a maxTurns
        S->>S: Razona y usa sus herramientas permitidas
    end
    S->>H: SubagentStop
    S-->>M: Mensaje final (informe)
    M-->>U: Respuesta integrada
```

> [!IMPORTANT]
> Como el subagente **no ve tu conversación**, la calidad del resultado depende muchísimo del **prompt de delegación**. Un buen orquestador le pasa rutas, criterios y formato de salida esperado. Tú puedes influir en eso con la `description` y con tus propias instrucciones.

---

## 3. Subagentes integrados (los que ya usas sin saberlo)

Claude Code trae subagentes listos para usar. Los más relevantes:

| Subagente | Para qué | Características |
|-----------|----------|-----------------|
| **Explore** | Buscar y entender código | Rápido (modelo ligero), **solo lectura**. Claude lo usa para barridos amplios del repo |
| **Plan** | Investigar antes de proponer un plan (en *plan mode*) | Solo lectura, orientado a diseño |
| **general-purpose** | Tareas complejas de varios pasos | Todas las herramientas, mismo nivel que el hilo principal |
| Otros auxiliares | p. ej. configurar la *status line* o responder dudas sobre Claude Code | Muy específicos |

Puedes **desactivar** cualquiera mediante permisos:

```json
{
  "permissions": {
    "deny": ["Agent(Explore)"]
  }
}
```

> [!TIP]
> Si creas un subagente propio con el **mismo nombre** que uno integrado, el tuyo tiene prioridad en ese alcance. Úsalo con cuidado: es un buen modo de personalizar `Explore`, y también una forma fácil de romperlo.

---

## 4. Dónde viven los subagentes: alcance y precedencia

Un subagente es un archivo `.md` en una carpeta `agents/`. Según dónde lo pongas cambia quién lo ve:

| Alcance | Ubicación | ¿Quién lo usa? | ¿Se versiona? |
|---------|-----------|----------------|---------------|
| **Sesión (CLI)** | `claude --agents '{...json...}'` | Solo esa ejecución | No |
| **Proyecto** | `.claude/agents/*.md` | Todo el equipo en ese repo | ✅ Sí (recomendado) |
| **Usuario** | `~/.claude/agents/*.md` | Tú, en todos tus proyectos | No |
| **Plugin** | `agents/` dentro de un plugin instalado | Quien instale el plugin | En el repo del plugin |

**Precedencia** cuando dos tienen el mismo `name`:

```mermaid
flowchart LR
    A["--agents (CLI)"] --> B[".claude/agents/ (proyecto)"] --> C["~/.claude/agents/ (usuario)"] --> D["plugins"]
    style A fill:#2e7d32,color:#fff
    style D fill:#9e9e9e,color:#fff
```

*Gana el de la izquierda.* Así un proyecto puede "sobrescribir" un agente genérico de tu usuario con una versión adaptada al repo.

Definición por CLI (útil en scripts y CI):

```bash
claude --agents '{
  "revisor-rapido": {
    "description": "Revisa diffs pequeños. Use proactively tras cambios.",
    "prompt": "Eres un revisor de código conciso...",
    "tools": ["Read", "Grep", "Glob"],
    "model": "haiku"
  }
}'
```

> [!NOTE]
> Los archivos se cargan al **iniciar la sesión**. Si creas o editas uno a mano mientras Claude Code está abierto, usa `/agents` (que recarga) o reinicia la sesión.

---

## 5. Tu primer subagente, paso a paso

### Paso 1 — Créalo con `/agents` (recomendado la primera vez)

```
/agents
```

El asistente interactivo te deja elegir alcance (proyecto/usuario), generar el prompt con Claude, seleccionar herramientas y modelo, y elegir un color. Al final escribe el archivo por ti.

### Paso 2 — O escríbelo a mano

```markdown
<!-- .claude/agents/explorador.md -->
---
name: explorador
description: >
  Explora el código para responder preguntas del tipo "¿dónde se hace X?" o
  "¿cómo funciona Y?". Use proactively cuando haya que leer muchos archivos.
tools: Read, Grep, Glob
model: haiku
color: cyan
---

Eres un explorador de código. Tu único objetivo es **localizar y explicar**,
nunca modificar.

Proceso:
1. Busca con Grep/Glob antes de abrir archivos completos.
2. Lee solo los fragmentos relevantes.
3. Responde con:
   - **Respuesta** (2-4 líneas)
   - **Evidencia**: lista de `ruta:línea` con una frase cada una
   - **Dudas abiertas** si las hay
```

### Paso 3 — Pruébalo de forma explícita

```
Usa el subagente explorador para encontrar dónde se valida el email del usuario.
```

### Paso 4 — Verifica que se comportó como esperabas

- ¿Apareció en la interfaz como tarea de subagente (con su color)?
- ¿Usó **solo** `Read`, `Grep`, `Glob`?
- ¿Volvió un informe corto con `ruta:línea`, en vez de volcar archivos enteros?

Si todo encaja, prueba sin nombrarlo (*"¿dónde se valida el email?"*) para comprobar que la **delegación automática** funciona gracias a la `description`.

---

# Nivel 1 — Anatomía: el frontmatter campo por campo

## 6. Estructura del archivo: configuración vs. comportamiento

Un subagente es un archivo Markdown con un **frontmatter YAML** (entre dos líneas `---`) y un **cuerpo**:

```markdown
---
name: mi-agente              # Identificador único, minúsculas y guiones
description: >               # CRÍTICO: Claude usa esto para decidir cuándo delegar
  Descripción clara de cuándo usar este agente.
  Incluir "Use proactively" fomenta delegación automática.
tools: Read, Grep, Glob      # Herramientas permitidas (allowlist)
disallowedTools: Write, Edit # Herramientas prohibidas (denylist)
model: sonnet                # sonnet | opus | haiku | inherit | ID completo
permissionMode: default      # default | acceptEdits | auto | dontAsk | bypassPermissions | plan
maxTurns: 20                 # Máximo de turnos antes de parar
skills:                      # Skills precargadas en el contexto del subagente
  - api-conventions
mcpServers:                  # Servidores MCP disponibles para este subagente
  - github                   # Referencia a un MCP ya configurado
  - playwright:              # Definición inline (solo existe para este subagente)
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
hooks:                       # Hooks del ciclo de vida del subagente
  PreToolUse: [...]
memory: project              # user | project | local
background: false            # true = siempre en background
effort: medium               # low | medium | high | max (si el modelo lo soporta)
isolation: worktree          # copia aislada del repo vía git worktree
color: blue                  # red, blue, green, yellow, purple, orange, pink, cyan
---

Aquí va el system prompt en Markdown.
```

```mermaid
flowchart TB
    subgraph F["Frontmatter (YAML) → ENTORNO"]
        direction LR
        I["Identidad<br/>name · description · color"]
        C["Capacidades<br/>tools · disallowedTools<br/>mcpServers · skills"]
        Mo["Motor<br/>model · effort"]
        L["Límites<br/>permissionMode · maxTurns"]
        V["Ciclo de vida<br/>hooks · memory<br/>background · isolation"]
    end
    subgraph B["Cuerpo (Markdown) → CONDUCTA"]
        P["System prompt:<br/>rol, proceso, criterios,<br/>formato de salida"]
    end
    F --> R["🤖 Subagente en ejecución"]
    B --> R
```

> [!IMPORTANT]
> El cuerpo **reemplaza** el system prompt de Claude Code para ese subagente. No recibe las largas instrucciones del hilo principal: solo tu texto + detalles básicos del entorno (directorio de trabajo, plataforma, etc.). Si tu prompt es pobre, el subagente será pobre.

Solo **`name`** y **`description`** son obligatorios. Todo lo demás tiene un valor por defecto razonable:

| Campo | Si lo omites… |
|-------|---------------|
| `tools` | Hereda **todas** las herramientas del hilo principal (incluidas las MCP) |
| `model` | Hereda el modelo del hilo principal (`inherit`) |
| `permissionMode` | Usa el modo normal (`default`) |
| `maxTurns` | Sin límite específico |
| `memory` | Sin memoria persistente |
| `background` | Se ejecuta en primer plano |
| `isolation` | Trabaja directamente sobre tu directorio |

---

## 7. Identidad: `name`, `description`, `color`

### `name`

Identificador único. **Minúsculas y guiones**: `security-reviewer`, `test-runner`, `db-migrator`. Es lo que se usa en `@`-menciones, en `--agent`, en matchers de hooks y en reglas de permisos (`Agent(security-reviewer)`).

### `description` — el campo más importante

Es lo único que el orquestador ve **antes** de delegar. Con ella decide **si** y **cuándo** usar el subagente. Una mala `description` = un subagente que nunca se usa (o que se usa para todo).

| ❌ Mala | ✅ Buena |
|--------|---------|
| `Agente de tests` | `Ejecuta la suite de tests y diagnostica fallos. Use proactively después de modificar código en src/ o cuando el usuario mencione tests rotos.` |
| `Ayuda con la base de datos` | `Diseña y revisa migraciones de SQL Server para el proyecto .NET 6 (EF Core). Úsalo cuando haya cambios en entidades, DbContext o carpeta Migrations/.` |
| `Revisor experto en todo` | `Revisa diffs buscando vulnerabilidades (inyección, secretos, authz). Use proactively antes de crear un commit o PR que toque autenticación o pagos.` |

Fórmula práctica:

```
<QUÉ hace> + <CUÁNDO usarlo (disparadores concretos)> + ["Use proactively" si quieres delegación automática] + [cuándo NO usarlo]
```

> [!TIP]
> Frases como **"Use proactively"** o **"MUST BE USED when…"** aumentan la probabilidad de delegación automática. Y añadir *"No lo uses para…"* evita que se dispare donde no debe.

### `color`

Puramente visual: identifica al subagente en la interfaz cuando está trabajando. Útil cuando varios corren en paralelo. Valores: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`.

> [!TIP]
> Usa una convención de equipo: 🔴 `red` para agentes con escritura o riesgo, 🔵 `blue`/`cyan` para solo lectura, 🟢 `green` para tests/validación.

---

## 8. Capacidades: `tools`, `disallowedTools`, `mcpServers`, `skills`

### `tools` — lista blanca (allowlist)

Solo las herramientas listadas estarán disponibles.

```yaml
tools: Read, Grep, Glob, Bash
```

Herramientas habituales y su nivel de riesgo:

| Herramienta | Qué hace | Riesgo |
|-------------|----------|--------|
| `Read`, `Grep`, `Glob` | Leer y buscar | 🟢 Bajo |
| `WebFetch`, `WebSearch` | Consultar internet | 🟡 Medio (fuga de datos, contenido no confiable) |
| `Edit`, `Write`, `NotebookEdit` | Modificar archivos | 🟠 Alto |
| `Bash` | Ejecutar comandos | 🔴 Muy alto |
| `mcp__<servidor>__<tool>` | Herramientas MCP | Depende del servidor |

### `disallowedTools` — lista negra (denylist)

La alternativa inversa: "todo menos esto". Cómoda cuando quieres casi todo:

```yaml
disallowedTools: Write, Edit, NotebookEdit
```

| Usa `tools` cuando… | Usa `disallowedTools` cuando… |
|---------------------|-------------------------------|
| El agente necesita **pocas** herramientas | El agente necesita **casi todas** |
| La seguridad es prioritaria (por defecto cerrado) | Quieres heredar también futuras herramientas/MCP |
| Ej.: explorador, revisor | Ej.: agente general sin escritura |

> [!WARNING]
> **Por defecto abierto vs. cerrado.** Con `disallowedTools`, cualquier herramienta nueva (p. ej. un MCP que instales mañana) queda **permitida automáticamente**. Para agentes sensibles prefiere siempre `tools`.

### `mcpServers` — MCP por subagente

Dos formas:

```yaml
mcpServers:
  - github            # 1) Referencia a un servidor ya configurado en la sesión
  - playwright:       # 2) Definición inline: existe SOLO dentro de este subagente
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
```

La definición inline es una técnica potente: el servidor (y sus herramientas, que ocupan contexto) **no contamina el hilo principal**. Solo el subagente de pruebas E2E carga Playwright.

### `skills` — conocimiento precargado

```yaml
skills:
  - api-conventions
  - error-handling
```

El contenido completo de esas skills se **inyecta en el contexto del subagente al arrancar**.

> [!IMPORTANT]
> Los subagentes **no heredan** las skills del hilo principal. Si tu subagente necesita las convenciones de API del equipo, decláralas aquí explícitamente.

---

## 9. Motor: `model` y `effort`

### `model`

| Valor | Cuándo usarlo |
|-------|---------------|
| `haiku` | Exploración, búsquedas, clasificación, tareas mecánicas. Rápido y barato |
| `sonnet` | Implementación, revisión de código, la mayoría de tareas |
| `opus` | Arquitectura, depuración difícil, razonamiento profundo |
| `inherit` | Mismo modelo que el hilo principal (comportamiento por defecto) |
| ID completo | Fijar una versión exacta (p. ej. para reproducibilidad en CI) |

> [!TIP]
> Un patrón muy rentable: **hilo principal con modelo potente** que orquesta + **subagentes `haiku`** para leer y buscar. El razonamiento caro se gasta solo donde aporta.

### `effort`

Controla cuánto "piensa" el modelo antes de responder: `low`, `medium`, `high`, `max`. Solo tiene efecto en modelos que soportan niveles de esfuerzo.

| Tarea | `effort` sugerido |
|-------|-------------------|
| Formatear, renombrar, buscar | `low` |
| Implementación estándar, revisión | `medium` |
| Diseño de arquitectura, bugs de concurrencia | `high` / `max` |

---

## 10. Límites: `permissionMode` y `maxTurns`

### `permissionMode`

Define cómo gestiona el subagente las solicitudes de permiso:

| Modo | Comportamiento | Uso típico |
|------|----------------|------------|
| `default` | Pide permiso según las reglas normales | La mayoría de agentes |
| `acceptEdits` | Acepta ediciones de archivos sin preguntar | Formateadores, refactors mecánicos |
| `auto` | Un clasificador decide qué es seguro aprobar | Agentes de implementación supervisados |
| `dontAsk` | Rechaza lo que no esté preaprobado, sin preguntar | Agentes en background / CI |
| `bypassPermissions` | Salta todas las comprobaciones | ⚠️ Solo en contenedores/sandbox desechables |
| `plan` | Solo lectura: investiga y propone, no ejecuta | Arquitectos, planificadores |

> [!WARNING]
> Si el hilo principal ya está en un modo más permisivo (p. ej. `bypassPermissions`), ese modo **prevalece** y el subagente no puede restringirlo vía `permissionMode`. Para restricciones duras usa `tools`/`disallowedTools` y reglas `deny`, no solo el modo.

### `maxTurns`

Número máximo de turnos (ciclos razonar → usar herramienta) antes de detenerse. Es tu **freno de emergencia** contra bucles y costos descontrolados.

| Tipo de agente | `maxTurns` orientativo |
|----------------|------------------------|
| Explorador / búsqueda puntual | 10–15 |
| Revisor de código | 15–25 |
| Implementador / depurador | 30–50 |

---

## 11. Ciclo de vida: `hooks`, `memory`, `background`, `isolation`

### `hooks` — automatización solo para ese subagente

Igual que los hooks de `settings.json` (sección 8), pero **activos solo mientras el subagente se ejecuta**:

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./.claude/hooks/solo-comandos-de-lectura.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "npx prettier --write \"$CLAUDE_PROJECT_DIR\"/src"
  Stop:
    - hooks:
        - type: command
          command: "./.claude/hooks/verificar-tests.sh"
```

> [!NOTE]
> Un hook `Stop` declarado en un subagente se ejecuta cuando **el subagente** termina (equivale a `SubagentStop`). Desde `settings.json` también puedes reaccionar a **todos** los subagentes con los eventos `SubagentStart` y `SubagentStop`, usando el nombre del agente como matcher.

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "security-reviewer",
        "hooks": [{ "type": "command", "command": "./.claude/hooks/archivar-informe.sh" }]
      }
    ]
  }
}
```

### `memory` — aprendizaje entre sesiones

Da al subagente un directorio propio de memoria persistente:

| Valor | Ubicación | Compartida |
|-------|-----------|------------|
| `user` | `~/.claude/agent-memory/<name>/` | Tú, en todos los proyectos |
| `project` | `.claude/agent-memory/<name>/` | El equipo (versionable) |
| `local` | `.claude/agent-memory-local/<name>/` | Solo tú, en este proyecto (no se versiona) |

Al arrancar, el subagente recibe el inicio de su `MEMORY.md` y puede leer/escribir en ese directorio. Ejemplo de uso en el prompt:

```markdown
Al terminar cada revisión, actualiza tu memoria con patrones recurrentes que
hayas detectado en este repo (p. ej. "los controladores olvidan [Authorize]").
Antes de revisar, consulta tu memoria.
```

> [!TIP]
> `memory: project` convierte a un revisor en un revisor que **aprende las manías de tu código** y las comparte con el equipo vía git.

### `background` — trabajo en segundo plano

```yaml
background: true
```

El subagente corre mientras tú sigues trabajando con el hilo principal. También puedes mandar a background una tarea en curso con **Ctrl+B**.

> [!WARNING]
> Un subagente en background **no puede detenerse a preguntarte** en mitad del trabajo. Combínalo con herramientas acotadas y `permissionMode: dontAsk` (o permisos preaprobados) para que no se bloquee ni haga nada inesperado.

### `isolation: worktree` — una copia aislada del repo

```yaml
isolation: worktree
```

El subagente trabaja en un **git worktree** temporal: una copia del repo en otra carpeta, con su propia rama. Ventajas:

- Puede hacer cambios experimentales **sin tocar tu directorio de trabajo**.
- Varios subagentes pueden editar **en paralelo sin pisarse**.
- Si no hizo cambios, el worktree se limpia automáticamente; si los hizo, recibes la ruta/rama para revisarlos.

```mermaid
flowchart LR
    R["📁 Tu repo (main)"] -->|git worktree add| W1["📁 worktree A<br/>agente: refactor-api"]
    R -->|git worktree add| W2["📁 worktree B<br/>agente: refactor-ui"]
    W1 -->|rama con cambios| PR1["🔀 revisar/merge"]
    W2 -->|rama con cambios| PR2["🔀 revisar/merge"]
```

---

## 12. El cuerpo: escribir un buen system prompt

El frontmatter decide **qué puede** hacer; el cuerpo decide **cómo lo hace**. Estructura recomendada:

```markdown
# Rol
Quién eres y cuál es tu única responsabilidad.

# Contexto del proyecto
Stack, convenciones y rutas clave (lo que no puede adivinar).

# Proceso
Pasos numerados, en orden.

# Criterios
Qué es "bueno", qué es "malo", qué priorizar.

# Restricciones
Lo que NUNCA debes hacer.

# Formato de salida
Plantilla exacta del informe final.
```

Buenas prácticas:

| ✅ Haz | ❌ Evita |
|-------|---------|
| Una responsabilidad clara por agente | El "agente que lo hace todo" |
| Definir el **formato de salida** (el orquestador lo consumirá) | Respuestas libres e impredecibles |
| Pedir evidencia `ruta:línea` | Conclusiones sin respaldo |
| Indicar qué hacer si falta información ("devuelve una lista de dudas") | Que invente para completar |
| Prompt conciso y estructurado | Copiar todo tu `CLAUDE.md` dentro |

> [!TIP]
> Piensa en el **mensaje final** como una API: el consumidor es otro modelo. Cuanto más estable sea el formato (secciones fijas, severidades, tablas), mejor podrá el orquestador combinar resultados de varios subagentes.

---

# Nivel 2 — Uso diario

## 13. Cómo se invoca un subagente

| Forma | Ejemplo | Cuándo |
|-------|---------|--------|
| **Automática** | *"¿Dónde se calculan los impuestos?"* → Claude delega en `explorador` | Cuando la `description` encaja |
| **Explícita en lenguaje natural** | *"Usa el subagente test-runner para…"* | Cuando quieres asegurarte |
| **@-mención** | `@agent-security-reviewer revisa el diff actual` | La forma más directa y garantizada |
| **Como hilo principal** | `claude --agent security-reviewer` | Toda la sesión adopta ese agente (prompt, tools, modelo) |
| **En paralelo** | *"Lanza 3 exploradores en paralelo: uno para api/, otro para web/, otro para db/"* | Investigación independiente |
| **Reanudar** | *"Continúa con el subagente anterior y revisa también utils/"* | Seguir con el mismo contexto del subagente |

> [!NOTE]
> Cuando ejecutas `claude --agent <nombre>`, ese agente **es** el hilo principal y por tanto **sí** puede delegar en otros subagentes. Puedes limitar en cuáles con `tools: Agent(test-runner, explorador)`.

### Reanudar subagentes

Cada ejecución de subagente tiene un ID y su transcripción se guarda en disco (dentro de `~/.claude/projects/...`). El orquestador puede **reanudar** un subagente para que continúe con todo su contexto previo, en lugar de empezar de cero. Útil para iteraciones: *"revisa → corrijo → vuelve a revisar"*.

---

## 14. Recetario de subagentes

### 14.1 Revisor de código (solo lectura)

```markdown
<!-- .claude/agents/code-reviewer.md -->
---
name: code-reviewer
description: >
  Revisa cambios de código buscando bugs, legibilidad y violaciones de
  convenciones. Use proactively después de escribir o modificar código y
  antes de un commit. No lo uses para implementar cambios.
tools: Read, Grep, Glob, Bash
model: sonnet
maxTurns: 20
memory: project
color: blue
---

# Rol
Eres un revisor de código senior. Revisas, NO modificas.

# Proceso
1. Ejecuta `git diff --stat` y `git diff` para ver los cambios.
2. Lee el contexto alrededor de cada cambio relevante.
3. Consulta tu memoria por patrones problemáticos conocidos del repo.
4. Evalúa: corrección, manejo de errores, async/await (nunca .then()),
   nombres, duplicación, tests faltantes.

# Restricciones
- Solo comandos git de lectura (diff, log, show, status).

# Formato de salida
## Resumen
Una línea: APROBADO / CAMBIOS SUGERIDOS / BLOQUEANTE

## Hallazgos
| Severidad | Archivo:línea | Problema | Sugerencia |

## Memoria
Patrones nuevos que guardaste (si hay).
```

### 14.2 Ejecutor de tests (Node.js 22)

```markdown
<!-- .claude/agents/test-runner.md -->
---
name: test-runner
description: >
  Ejecuta los tests del proyecto Node y diagnostica fallos. Use proactively
  después de cambios en src/ o cuando el usuario mencione tests que fallan.
tools: Read, Grep, Glob, Bash
model: haiku
maxTurns: 15
color: green
---

Eres un especialista en tests de Node.js 22 (`node --test` / npm test).

1. Ejecuta `npm test 2>&1 | tail -n 80`.
2. Si todo pasa, responde solo: "✅ N tests en verde".
3. Si falla algo, para cada fallo:
   - Test y archivo:línea
   - Causa probable (lee el código implicado)
   - Corrección sugerida (como diff, sin aplicarla)

Nunca modifiques archivos. Nunca desactives ni borres tests.
```

### 14.3 Migraciones de base de datos (.NET 6 + SQL Server)

```markdown
<!-- .claude/agents/db-migrator.md -->
---
name: db-migrator
description: >
  Diseña y revisa migraciones EF Core para SQL Server en el proyecto .NET 6.
  Úsalo cuando cambien entidades, el DbContext o la carpeta Migrations/.
tools: Read, Grep, Glob, Edit, Write, Bash
model: opus
effort: high
permissionMode: default
maxTurns: 30
isolation: worktree
color: red
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./.claude/hooks/bloquear-database-update.sh"
---

Eres un experto en EF Core 6 y SQL Server.

# Proceso
1. Identifica las entidades modificadas y su configuración (Fluent API).
2. Genera la migración: `dotnet ef migrations add <Nombre>`.
3. Revisa el SQL resultante: `dotnet ef migrations script --idempotent`.
4. Señala riesgos: pérdida de datos, columnas NOT NULL sin default,
   índices sobre tablas grandes, bloqueos.

# Restricciones
- NUNCA ejecutes `dotnet ef database update` (el hook lo bloquea).
- Trabajas en un worktree aislado: los cambios se revisan antes de integrarse.

# Salida
- Nombre de la migración y rama del worktree
- Resumen de cambios de esquema
- Tabla de riesgos (Riesgo | Impacto | Mitigación)
```

### 14.4 Auditor de seguridad con memoria

```markdown
<!-- .claude/agents/security-reviewer.md -->
---
name: security-reviewer
description: >
  Audita código en busca de vulnerabilidades: inyección SQL/comandos,
  secretos expuestos, autorización faltante, validación de entrada.
  MUST BE USED antes de commits que toquen auth, pagos o endpoints públicos.
tools: Read, Grep, Glob
model: opus
effort: high
memory: project
color: red
---

Eres un auditor de seguridad (OWASP Top 10). Solo lees.

Busca específicamente:
- Concatenación de strings en SQL (C#: `FromSqlRaw` con interpolación; Node: queries armadas con `+`).
- Secretos en código o config (`apiKey`, `password`, `connectionString`).
- Endpoints sin `[Authorize]` o middleware de auth.
- Entrada de usuario sin validar llegando a fs, exec o SQL.

Salida: tabla `Severidad (Crítica/Alta/Media/Baja) | ruta:línea | Vulnerabilidad | Remediación`.
Actualiza tu memoria con patrones repetidos del repo.
```

### 14.5 Tester E2E con MCP inline

```markdown
<!-- .claude/agents/e2e-tester.md -->
---
name: e2e-tester
description: >
  Prueba flujos de la aplicación web en un navegador real. Úsalo cuando
  haya que verificar visualmente un cambio de UI o reproducir un bug de frontend.
tools: Read, Bash, mcp__playwright__*
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
model: sonnet
maxTurns: 25
background: true
permissionMode: dontAsk
color: purple
---

Eres un QA de frontend. Recibirás una URL y un flujo a verificar.
1. Navega, ejecuta el flujo y toma capturas en los pasos clave.
2. Revisa la consola del navegador por errores.
3. Informa: ✅/❌ por paso, errores de consola y pasos para reproducir.
```

---

# Nivel 3 — Avanzado

## 15. Patrones de orquestación

Recuerda: **solo el hilo principal orquesta**. Estos patrones se piden en lenguaje natural (o se codifican en una skill/comando que el orquestador sigue).

### 15.1 Fan-out / fan-in (investigación en paralelo)

```mermaid
flowchart LR
    M["Orquestador"] --> A["explorador: api/"]
    M --> B["explorador: web/"]
    M --> C["explorador: db/"]
    A --> S["Síntesis en el<br/>hilo principal"]
    B --> S
    C --> S
```

> *"Lanza en paralelo tres exploradores (api/, web/, db/) para averiguar cómo se propaga el `tenantId`. Luego sintetiza."*

Ideal cuando las sub-tareas son **independientes**. Cada explorador gasta su contexto; al tuyo solo llegan tres resúmenes.

### 15.2 Pipeline (cadena secuencial)

```mermaid
flowchart LR
    P["Plan<br/>(architect, plan)"] --> I["Implementar<br/>(hilo principal)"] --> T["test-runner"] --> R["code-reviewer"] --> S["security-reviewer"]
    T -->|❌ falla| I
    R -->|cambios sugeridos| I
```

Cada etapa recibe la salida de la anterior a través del orquestador. Muy útil para un **flujo de "definición de terminado"**.

### 15.3 Implementador + verificador independiente

El agente que escribe el código **no** debería ser el que lo aprueba. Un revisor con contexto limpio no tiene el sesgo de "yo lo hice, seguro está bien".

> *"Implementa la validación. Luego pide al code-reviewer que la revise sin explicarle tu razonamiento, solo el diff."*

### 15.4 Workers aislados en paralelo (worktrees)

Varios subagentes con `isolation: worktree` aplicando cambios independientes (p. ej. migrar 5 módulos a una nueva API) sin conflictos en tu directorio. Al final revisas cada rama.

### 15.5 Juez / votación

Lanzar 2–3 subagentes con el mismo problema (o con enfoques distintos) y que el orquestador compare. Útil para decisiones de diseño o bugs ambiguos. Cuesta más tokens: resérvalo para decisiones importantes.

> [!NOTE]
> Para colaboración más compleja (agentes que se comunican entre sí y comparten una lista de tareas) existen los **agent teams** y los **workflows** de orquestación. Son una capa por encima de los subagentes y se activan explícitamente; los subagentes siguen siendo la pieza base.

---

## 16. Contexto, tokens y costos

```mermaid
flowchart TB
    subgraph Main["Contexto del hilo principal"]
        P1["Tu conversación"]
        R1["Resumen A (≈300 tokens)"]
        R2["Resumen B (≈300 tokens)"]
    end
    subgraph SA["Contexto subagente A"]
        X1["40 archivos leídos<br/>(≈60.000 tokens)"]
    end
    subgraph SB["Contexto subagente B"]
        X2["Salida de tests<br/>(≈20.000 tokens)"]
    end
    SA -->|solo el resumen| R1
    SB -->|solo el resumen| R2
```

Puntos clave:

- **El total de tokens consumidos sube** (cada subagente tiene su propio contexto y relee lo que necesita), pero **el contexto del hilo principal se mantiene limpio**, lo que mejora la calidad de las respuestas en sesiones largas.
- Un subagente **arranca en frío**: cada invocación tiene latencia y vuelve a leer archivos. No delegues tareas triviales de una sola lectura.
- Usa `model: haiku` + `maxTurns` bajo para agentes de alto volumen.
- Diseña **salidas compactas**: un subagente que devuelve 5.000 tokens anula buena parte de su ventaja.

| ¿Delegar? | Sí ✅ | No ❌ |
|-----------|------|------|
| Leer 1 archivo conocido | | ✅ hazlo directo |
| Barrer el repo buscando un patrón | ✅ | |
| Ejecutar tests con salida larga | ✅ | |
| Cambio de una línea | | ✅ |
| Revisión independiente de un diff | ✅ | |
| Tarea que necesita todo el historial de la conversación | | ✅ (el subagente no lo ve) |

---

## 17. Subagentes vs. skills vs. hooks vs. CLAUDE.md vs. comandos

| Mecanismo | Qué es | Contexto | ¿Determinista? | Úsalo para |
|-----------|--------|----------|----------------|-----------|
| **CLAUDE.md** | Instrucciones siempre cargadas | El mismo del hilo | ❌ | Convenciones generales del proyecto |
| **Skill** | Conocimiento/procedimiento que se carga bajo demanda | El mismo del hilo | ❌ | "Cómo hacemos X aquí" |
| **Comando slash** | Prompt reutilizable que tú disparas | El mismo del hilo | ❌ | Atajos para flujos frecuentes |
| **Hook** | Script que reacciona a eventos | Fuera del modelo | ✅ | Lo que debe pasar **siempre** |
| **Subagente** | Trabajador con contexto, tools y modelo propios | **Separado** | ❌ (pero acotado por config) | Tareas aisladas, roles, paralelismo |

Se **combinan**:

- Un subagente **precarga skills** (`skills:`) para conocer convenciones.
- Un subagente tiene **hooks propios** (`hooks:`) que garantizan reglas mientras trabaja.
- Un **comando slash** puede orquestar una cadena de subagentes.
- `CLAUDE.md` del proyecto puede indicar *"tras cada cambio, delega en test-runner"*.

---

# Nivel 4 — Experto: calidad, seguridad y operación

## 18. Depuración y troubleshooting

### Herramientas

| Herramienta | Para qué |
|-------------|----------|
| `/agents` | Ver qué subagentes están cargados, de qué alcance vienen y editarlos |
| `@agent-<nombre>` | Forzar la invocación para descartar problemas de `description` |
| `claude --debug` | Ver carga de archivos, errores de frontmatter, hooks |
| `Ctrl+O` (modo transcript) | Ver en detalle qué hizo el subagente |
| Transcripciones en `~/.claude/projects/...` | Revisar a posteriori cada paso del subagente |

### Flujo de diagnóstico

```mermaid
flowchart TD
    A["El subagente no se comporta como espero"] --> B{"¿Aparece en /agents?"}
    B -->|No| B1["Revisa ubicación, extensión .md,<br/>YAML válido y reinicia la sesión"]
    B -->|Sí| C{"¿Se invoca con @agent-nombre?"}
    C -->|No| C1["Conflicto de nombre / precedencia<br/>o denegado por permisos Agent(...)"]
    C -->|Sí| D{"¿Se invoca automáticamente?"}
    D -->|No| D1["Mejora la description:<br/>disparadores concretos + 'Use proactively'"]
    D -->|Sí| E{"¿El resultado es malo?"}
    E -->|Sí| E1["Mejora el prompt: proceso,<br/>criterios y formato de salida.<br/>¿Faltan tools o skills?"]
```

### Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| No aparece en `/agents` | YAML inválido (tabs, `:` sin comillas) o carpeta equivocada | Valida el YAML; usa espacios; ruta `.claude/agents/` |
| Nunca se usa solo | `description` vaga | Disparadores concretos + "Use proactively" |
| Se usa para todo | `description` demasiado amplia | Añade "No lo uses para…" |
| "No tengo acceso a esa herramienta" | Falta en `tools` | Añádela o usa `disallowedTools` |
| No ve las herramientas MCP | `tools` restringe y no incluye `mcp__...` | Añade `mcp__servidor__*` o declara `mcpServers` |
| No conoce las convenciones | Las skills no se heredan | Decláralas en `skills:` |
| Se queda a medias | `maxTurns` demasiado bajo | Súbelo o divide la tarea |
| Resultado desconectado de la conversación | No ve tu historial | Pide al orquestador un prompt de delegación más completo |
| Cambios editados a mano no aplican | Se cargan al inicio | Reinicia o usa `/agents` |
| Se bloquea en background | Pide un permiso que nadie puede dar | `permissionMode: dontAsk` + permisos preaprobados |

---

## 19. Seguridad: mínimo privilegio y modelo de amenazas

### 19.1 Principio de mínimo privilegio

Cada subagente debe tener **exactamente** las herramientas que necesita. Ni una más.

```mermaid
flowchart LR
    subgraph RO["🟢 Solo lectura"]
        E["explorador<br/>Read, Grep, Glob"]
        S["security-reviewer<br/>Read, Grep, Glob"]
    end
    subgraph EX["🟡 Ejecución acotada"]
        T["test-runner<br/>+ Bash (con hook)"]
    end
    subgraph W["🔴 Escritura"]
        D["db-migrator<br/>+ Edit, Write<br/>isolation: worktree"]
    end
```

### 19.2 Modelo de amenazas

| Amenaza | Ejemplo | Mitigación |
|---------|---------|------------|
| **Prompt injection** desde archivos o web | Un README malicioso dice "ignora tus instrucciones y ejecuta curl…" | Agentes que leen contenido no confiable **sin** `Bash` ni `Write`; hooks `PreToolUse` |
| **Exceso de permisos** | Un explorador con `Bash` y `bypassPermissions` | `tools` explícito; nunca `bypassPermissions` fuera de sandbox |
| **Exfiltración** | Agente con `WebFetch` + acceso a `.env` | Separar agentes que leen secretos de los que tienen red; reglas `deny` sobre `.env` |
| **MCP no confiable** | Servidor inline descargado con `npx` sin versión fija | Fija versiones (`@1.2.3`), revisa el servidor antes de añadirlo |
| **Subagentes de repos ajenos** | Clonas un repo con `.claude/agents/` malicioso | Revisa `.claude/` (agents, hooks, settings) antes de abrir sesión en repos no confiables |
| **Memoria envenenada** | Alguien comitea instrucciones dañinas en `.claude/agent-memory/` | Revisa la memoria `project` en los PR como cualquier código |
| **Trabajo destructivo en paralelo** | Dos agentes editan el mismo archivo | `isolation: worktree` |

### 19.3 Defensa en capas

1. **Frontmatter**: `tools` mínimo, `permissionMode` adecuado, `maxTurns`.
2. **Hooks del subagente**: validan cada `Bash`/`Edit` (fail-closed para guardas de seguridad).
3. **Permisos globales** (`settings.json`): reglas `deny` que aplican a todos, incluidos subagentes.
4. **Aislamiento**: worktrees o sandbox/contenedor para agentes con escritura.
5. **Revisión humana**: los cambios de agentes con escritura se integran vía PR.

> [!WARNING]
> Las instrucciones del prompt ("nunca borres archivos") son **una red, no un muro**. Lo que de verdad limita es la configuración: si no tiene `Bash`, no puede ejecutar `rm`. Diseña asumiendo que el prompt puede ser ignorado.

### 19.4 Checklist de seguridad para revisar un subagente

- [ ] ¿Usa `tools` (allowlist) en lugar de heredar todo?
- [ ] ¿Tiene `Bash` solo si es imprescindible, y protegido con hook?
- [ ] ¿Evita combinar **lectura de contenido no confiable** + **red** + **ejecución**?
- [ ] ¿`permissionMode` es el mínimo necesario? ¿Nada de `bypassPermissions` fuera de sandbox?
- [ ] ¿Tiene `maxTurns`?
- [ ] ¿Los MCP inline tienen versión fija?
- [ ] ¿La memoria `project` se revisa en PR?
- [ ] ¿Los agentes con escritura usan `isolation: worktree` o pasan por revisión?

---

## 20. Proyecto integrador: un equipo de agentes para el repo

Objetivo: un `.claude/` versionado con el que **todo el equipo** tenga el mismo flujo de "definición de terminado".

```
.claude/
├── settings.json
├── agents/
│   ├── explorador.md          # haiku · solo lectura
│   ├── architect.md           # opus · plan · solo lectura
│   ├── test-runner.md         # haiku · Bash con hook
│   ├── code-reviewer.md       # sonnet · lectura + git · memory: project
│   └── security-reviewer.md   # opus · lectura · memory: project
├── agent-memory/
│   ├── code-reviewer/MEMORY.md
│   └── security-reviewer/MEMORY.md
├── hooks/
│   └── solo-comandos-de-lectura.sh
└── commands/
    └── terminado.md           # comando que orquesta el pipeline
```

### `architect.md`

```markdown
---
name: architect
description: >
  Diseña la solución antes de implementar features medianas o grandes.
  Use proactively cuando una tarea afecte a más de 3 archivos o a varias capas.
tools: Read, Grep, Glob
model: opus
effort: high
permissionMode: plan
maxTurns: 25
color: yellow
---

Eres un arquitecto de software. Investigas el código y propones un plan; no implementas.

Salida:
1. **Contexto actual** (archivos y responsabilidades implicadas, con ruta:línea)
2. **Diseño propuesto** (componentes, flujo de datos)
3. **Plan por pasos** (cada paso verificable)
4. **Riesgos y alternativas descartadas**
```

### Hook compartido: Bash solo de lectura

```bash
#!/usr/bin/env bash
# .claude/hooks/solo-comandos-de-lectura.sh
# Guarda de seguridad → FAIL-CLOSED: si falta jq o el JSON es inválido, se bloquea.
set -euo pipefail
cmd=$(jq -r '.tool_input.command // empty') || { echo "Entrada inválida" >&2; exit 2; }

permitidos='^(git (diff|log|show|status)|npm (test|run lint)|node --test|dotnet test|ls|cat|grep|rg)( |$)'
if [[ ! "$cmd" =~ $permitidos ]] || [[ "$cmd" =~ [\;\&\|\`\$\>] ]]; then
  echo "Comando no permitido para este agente: $cmd" >&2
  exit 2
fi
exit 0
```

### Comando orquestador `/terminado`

```markdown
<!-- .claude/commands/terminado.md -->
---
description: Ejecuta el pipeline de definición de terminado sobre los cambios actuales
---

Ejecuta este pipeline sobre los cambios actuales (git diff):

1. Delega en **test-runner**. Si hay fallos, corrígelos y repite (máx. 3 veces).
2. En paralelo, delega en **code-reviewer** y **security-reviewer** pasándoles
   solo el diff, no tu razonamiento.
3. Aplica los hallazgos de severidad Alta/Crítica o BLOQUEANTE.
4. Presenta un resumen final:
   - Tests: estado
   - Revisión: hallazgos aplicados / pendientes
   - Seguridad: hallazgos aplicados / pendientes
   - Propuesta de mensaje de commit siguiendo la convención del equipo
```

### Cómo fluye una tarea

```mermaid
sequenceDiagram
    participant U as Tú
    participant M as Hilo principal
    participant A as architect
    participant T as test-runner
    participant R as code-reviewer
    participant S as security-reviewer
    U->>M: "Añade validación de NIT en el registro de clientes"
    M->>A: Diseña la solución
    A-->>M: Plan en 4 pasos
    M->>M: Implementa
    U->>M: /terminado
    M->>T: Ejecuta tests
    T-->>M: ❌ 1 fallo (caso límite)
    M->>M: Corrige
    M->>T: Ejecuta tests
    T-->>M: ✅ 48 tests
    par revisión en paralelo
        M->>R: Revisa el diff
        M->>S: Audita el diff
    end
    R-->>M: CAMBIOS SUGERIDOS (1 media)
    S-->>M: Sin hallazgos críticos
    M-->>U: Resumen + propuesta de commit
```

---

## 21. Ejercicios y checklist final

### Ejercicios progresivos

1. **Básico.** Crea con `/agents` un subagente `explorador` (haiku, solo lectura). Pregunta algo sobre el repo sin nombrarlo y verifica que se delega.
2. **Description.** Crea dos agentes con descripciones que se solapan (p. ej. "revisa código" y "revisa seguridad"). Observa cuál elige Claude y ajusta las descripciones hasta que la elección sea predecible.
3. **Mismo prompt, distinto entorno.** Copia un agente y cambia solo el frontmatter: uno con `tools: Read, Grep, Glob` y `model: haiku`, otro con escritura y `model: opus`. Compara resultados, tiempo y costo con la misma tarea.
4. **Hooks propios.** Añade a `test-runner` un hook `PreToolUse` que solo permita comandos de test. Intenta que ejecute `rm` y comprueba el bloqueo.
5. **Memoria.** Activa `memory: project` en `code-reviewer`, haz tres revisiones y revisa qué guardó en `.claude/agent-memory/`.
6. **MCP inline.** Crea `e2e-tester` con Playwright inline y confirma que el hilo principal **no** ve esas herramientas.
7. **Paralelo + worktree.** Pide dos refactors independientes con un agente `isolation: worktree` y revisa las ramas resultantes.
8. **Experto.** Monta el proyecto integrador completo y úsalo en una tarea real con `/terminado`.

### Checklist "listo para el equipo"

- [ ] `name` en minúsculas con guiones y único
- [ ] `description` con **qué**, **cuándo** y **cuándo no**
- [ ] `tools` mínimo necesario (allowlist)
- [ ] `model` y `effort` acordes al tipo de tarea
- [ ] `maxTurns` definido
- [ ] `permissionMode` justificado
- [ ] Prompt con rol, proceso, restricciones y **formato de salida**
- [ ] Skills necesarias declaradas en `skills:`
- [ ] Hooks de seguridad si tiene `Bash` o escritura
- [ ] `isolation: worktree` si escribe en paralelo con otros
- [ ] Versionado en `.claude/agents/` y revisado en PR
- [ ] Probado con invocación explícita **y** automática

---

## 22. Resumen

| Concepto | Lo esencial |
|----------|-------------|
| **Qué es** | Un trabajador especializado con contexto, herramientas y modelo propios |
| **Por qué** | Contexto limpio, especialización, control, costo y paralelismo |
| **Dónde** | `.claude/agents/` (equipo), `~/.claude/agents/` (personal), plugins, `--agents` |
| **Frontmatter** | Define el **entorno**: identidad, capacidades, motor, límites, ciclo de vida |
| **Cuerpo** | Define la **conducta**: reemplaza el system prompt de Claude Code |
| **Campo clave** | `description`: decide cuándo se delega |
| **Seguridad** | `tools` mínimo + hooks + permisos + aislamiento; el prompt no es un muro |
| **Límite** | Los subagentes no lanzan subagentes; orquesta el hilo principal |
| **Regla de oro** | Si genera mucho contexto que no necesitas o requiere otro rol/límites → subagente |

> **En una frase:** el frontmatter convierte un prompt suelto en un **worker especializado, reutilizable y controlado**; el cuerpo le da criterio. Dos subagentes con el mismo prompt pero distinto frontmatter son, en la práctica, **dos agentes diferentes**.
