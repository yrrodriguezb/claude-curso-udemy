# Checkpoints en Claude Code

> Guía de nivel básico a avanzado sobre qué son los checkpoints, cómo funcionan y cómo usarlos en Claude Code, tanto en la **terminal (CLI)** como en la **extensión del IDE (VS Code / JetBrains)** y la app de escritorio.

---

## Índice

1. [Nivel básico: ¿qué es un checkpoint?](#1-nivel-básico-qué-es-un-checkpoint)
2. [Cómo funcionan los checkpoints en Claude Code](#2-cómo-funcionan-los-checkpoints-en-claude-code)
3. [Usar checkpoints en la terminal (CLI)](#3-usar-checkpoints-en-la-terminal-cli)
4. [Usar checkpoints en el IDE / app de escritorio](#4-usar-checkpoints-en-el-ide--app-de-escritorio)
5. [Nivel intermedio: opciones de restauración](#5-nivel-intermedio-opciones-de-restauración)
6. [Limitaciones importantes](#6-limitaciones-importantes)
7. [Nivel avanzado: checkpoints + Git](#7-nivel-avanzado-checkpoints--git)
8. [Nivel avanzado: sesiones, reanudar y bifurcar](#8-nivel-avanzado-sesiones-reanudar-y-bifurcar)
9. [Nivel avanzado: automatizar con hooks y worktrees](#9-nivel-avanzado-automatizar-con-hooks-y-worktrees)
10. [Flujos de trabajo recomendados](#10-flujos-de-trabajo-recomendados)
11. [Chuleta rápida](#11-chuleta-rápida)

---

## 1. Nivel básico: ¿qué es un checkpoint?

Un **checkpoint** (punto de control) es una "foto" del estado de tu trabajo en un momento dado, a la que puedes volver si algo sale mal. Es la misma idea que el "guardado" en un videojuego: si pierdes, regresas al último punto guardado en lugar de empezar de cero.

En Claude Code, un checkpoint guarda:

- **El estado de los archivos** que Claude editó.
- **El punto de la conversación** en el que estabas.

### ¿Para qué sirve?

| Situación | Cómo ayuda el checkpoint |
|---|---|
| Claude hizo un cambio que rompió el proyecto | Vuelves al estado anterior al cambio |
| Quieres probar un enfoque distinto | Regresas y le das otra instrucción |
| La conversación se desvió del objetivo | Rebobinas la conversación a un punto útil |
| Quieres experimentar sin miedo | Sabes que siempre puedes deshacer |

> 💡 **Idea clave:** los checkpoints son un "Ctrl+Z" a nivel de sesión. Te permiten ser más atrevido al pedirle cambios a Claude.

---

## 2. Cómo funcionan los checkpoints en Claude Code

Claude Code crea checkpoints **automáticamente**, no tienes que hacer nada para activarlos:

- **Cada mensaje (prompt) que envías crea un nuevo checkpoint.**
- Antes de que Claude edite un archivo con sus herramientas de edición (`Edit`, `Write`, etc.), se guarda el estado previo.
- Los checkpoints **persisten entre sesiones**: si cierras y reanudas una conversación, todavía puedes rebobinar.
- Se limpian automáticamente junto con las sesiones antiguas (por defecto, a los 30 días; configurable con `cleanupPeriodDays` en `settings.json`).

```text
Prompt 1 ──► checkpoint A ──► Claude edita main.py
Prompt 2 ──► checkpoint B ──► Claude edita tests/test_todos.py
Prompt 3 ──► checkpoint C ──► Claude crea src/todos_service.py
                  ▲
                  └── puedes volver a A, B o C
```

---

## 3. Usar checkpoints en la terminal (CLI)

En la terminal hay dos formas de abrir el menú de rebobinado:

### Opción A: atajo de teclado

Presiona **`Esc` dos veces** (`Esc` + `Esc`) con el campo de entrada vacío.

### Opción B: comando slash

```text
/rewind
```

### Paso a paso

1. Inicia Claude Code en tu proyecto:
   ```bash
   claude
   ```
2. Trabaja normalmente, por ejemplo:
   ```text
   > Refactoriza src/main.py para separar la lógica en un servicio
   ```
3. Si el resultado no te gusta, presiona `Esc` `Esc` (o escribe `/rewind`).
4. Aparece una lista con tus mensajes anteriores. Usa las flechas `↑` / `↓` para elegir el punto al que quieres volver y presiona `Enter`.
5. Elige qué quieres restaurar (ver [sección 5](#5-nivel-intermedio-opciones-de-restauración)).
6. El mensaje que elegiste vuelve a aparecer en el campo de entrada para que lo edites y lo reenvíes si quieres.

---

## 4. Usar checkpoints en el IDE / app de escritorio

En la **extensión de VS Code** (y en la app de escritorio) los checkpoints funcionan con el mismo mecanismo, pero de forma visual:

1. Pasa el cursor sobre un mensaje tuyo anterior en el panel de Claude.
2. Usa la opción de **rebobinar / restaurar** que aparece en ese mensaje.
3. Elige si quieres restaurar el código, la conversación o ambos.

Ventajas del IDE:

- Ves los **diffs** de cada cambio antes de aceptarlo o después de restaurar.
- Puedes combinarlo con el control de código fuente integrado (pestaña *Source Control*) para revisar qué cambió.

> 📝 La terminal integrada del IDE también acepta `claude` y `/rewind`, por lo que todo lo de la sección 3 aplica igual.

---

## 5. Nivel intermedio: opciones de restauración

Al seleccionar un punto en el menú de rebobinado, Claude Code te ofrece varias opciones:

| Opción | ¿Qué hace? | Cuándo usarla |
|---|---|---|
| **Restaurar código y conversación** | Vuelve los archivos y el chat a ese punto | El cambio fue malo y quieres empezar de nuevo desde ahí |
| **Restaurar solo la conversación** | Rebobina el chat, pero **mantiene** los cambios en archivos | El código está bien, pero la conversación se llenó de ruido |
| **Restaurar solo el código** | Revierte los archivos, pero **mantiene** el historial del chat | Quieres que Claude recuerde lo que intentó y por qué falló |
| **Resumir desde aquí** | Compacta la conversación desde ese punto en un resumen | Liberar contexto sin perder la idea general |
| **Cancelar** | No hace nada | Te arrepentiste 🙂 |

### Ejemplo práctico

```text
> Agrega validación de fechas a los TODOs           ← checkpoint 1
> Ahora cambia la base de datos a SQLite            ← checkpoint 2  (rompe todo)
> Arregla los tests                                 ← checkpoint 3  (empeora)
```

- Si quieres descartar **todo lo de SQLite**: rebobina al checkpoint 2 → *Restaurar código y conversación* → reescribe el prompt con más detalle.
- Si quieres que Claude **aprenda del error**: rebobina al checkpoint 2 → *Restaurar solo el código* → dile: *"El intento anterior con SQLite falló porque X, hazlo de esta otra forma"*.

---

## 6. Limitaciones importantes

Los checkpoints **no** son un sistema de control de versiones completo. Ten en cuenta:

1. **Los comandos de shell no se rastrean.** Si Claude ejecuta `rm archivo.py`, `mv`, `git checkout`, migraciones de base de datos, `npm install`, etc., esos efectos **no** se revierten al rebobinar. Solo se rastrean las ediciones hechas con las herramientas de edición de archivos.
2. **Los cambios externos no se rastrean.** Lo que edites tú manualmente fuera de Claude, u otra sesión de Claude en paralelo, no forma parte del checkpoint (salvo que coincida con un archivo que la sesión actual también modificó).
3. **Efectos fuera de tu máquina no se deshacen:** despliegues, llamadas a APIs, mensajes enviados, `git push`, etc.
4. **Son locales a la sesión**: no se comparten con tu equipo.

> ⚠️ **Regla de oro:** piensa en los checkpoints como un "deshacer local rápido" y en **Git** como el "historial permanente".

---

## 7. Nivel avanzado: checkpoints + Git

La estrategia más robusta es **combinar** ambos:

| | Checkpoints | Git |
|---|---|---|
| Granularidad | Por cada prompt | Por cada commit que tú decidas |
| Automático | ✅ Sí | ❌ No (a menos que lo automatices) |
| Rastrea comandos de shell | ❌ No | ✅ Sí (el resultado en archivos) |
| Compartible con el equipo | ❌ No | ✅ Sí |
| Rebobina la conversación | ✅ Sí | ❌ No |

### Flujo recomendado

```bash
# 1. Antes de una tarea grande, deja el árbol limpio
git status
git add -A && git commit -m "Punto estable antes de refactor"

# 2. (Opcional) Trabaja en una rama
git switch -c refactor/todos-service

# 3. Trabaja con Claude; usa Esc Esc / /rewind para iteraciones pequeñas

# 4. Cuando algo funcione, consolida con un commit
git add -A && git commit -m "Extrae TodosService"

# 5. Si todo salió mal, Git es tu red de seguridad final
git restore .            # descarta cambios sin commit
git switch main          # o abandona la rama
```

También puedes pedirle a Claude directamente:

```text
> Haz commit de los cambios actuales con un mensaje descriptivo
```

---

## 8. Nivel avanzado: sesiones, reanudar y bifurcar

Como los checkpoints viven dentro de una sesión, es útil saber gestionarlas:

| Comando | Qué hace |
|---|---|
| `claude --continue` (o `-c`) | Continúa la conversación más reciente del directorio actual |
| `claude --resume` (o `-r`) | Muestra una lista de sesiones para elegir cuál reanudar |
| `/resume` | Lo mismo, desde dentro de Claude Code |
| `claude --resume <id> --fork-session` | Reanuda una sesión pero creando una **copia nueva**, dejando la original intacta |
| `/compact` | Resume la conversación para liberar contexto |
| `/clear` | Empieza una conversación limpia |

### Técnica: "explorar dos caminos"

1. Llegas a un punto de decisión (por ejemplo, *¿SQLite o JSON?*).
2. Bifurcas la sesión con `--fork-session` y pruebas una alternativa en cada una.
3. Te quedas con la que funcione mejor (idealmente cada una en su propia rama o worktree de Git).

---

## 9. Nivel avanzado: automatizar con hooks y worktrees

### 9.1 Commits automáticos con hooks

Puedes crear un "checkpoint de Git" automático cada vez que Claude edita un archivo usando un **hook** `PostToolUse` en `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "git add -A && git commit -q -m \"wip: checkpoint automático de Claude\" --no-verify || true"
          }
        ]
      }
    ]
  }
}
```

- ✅ Cada edición queda en el historial de Git (incluso si después hay comandos de shell destructivos).
- ⚠️ Genera muchos commits: úsalo en una rama de trabajo y luego compáctalos con `git reset --soft <commit-base>` o un *squash merge*.
- ⚠️ `--no-verify` omite los hooks de Git; quítalo si tu proyecto depende de ellos.

> Puedes pedirle a Claude que configure esto por ti: *"configura un hook que haga commit después de cada edición"*.

### 9.2 Aislamiento con Git worktrees

Para experimentos grandes, trabaja en un **worktree** separado: tu directorio principal no se toca.

```bash
git worktree add ../Proyecto_2-experimento -b experimento
cd ../Proyecto_2-experimento
claude
```

Si el experimento falla, simplemente lo eliminas:

```bash
git worktree remove ../Proyecto_2-experimento
git branch -D experimento
```

### 9.3 Plan mode como "checkpoint preventivo"

Antes de cambios grandes, usa **Plan Mode** (`Shift+Tab` hasta llegar a *plan mode*): Claude analiza y propone un plan **sin modificar archivos**. Así evitas tener que rebobinar después.

---

## 10. Flujos de trabajo recomendados

### 🟢 Principiante
1. Haz commit antes de empezar.
2. Pide cambios pequeños, uno a la vez.
3. Si algo sale mal: `Esc` `Esc` → elige el mensaje → *Restaurar código y conversación*.

### 🟡 Intermedio
1. Trabaja en una rama.
2. Usa *Restaurar solo el código* para que Claude conserve el aprendizaje de los intentos fallidos.
3. Usa *Restaurar solo la conversación* o `/compact` para limpiar el contexto.
4. Haz commit cada vez que llegues a un estado estable.

### 🔴 Avanzado
1. Usa Plan Mode para tareas grandes.
2. Usa worktrees + `--fork-session` para explorar alternativas en paralelo.
3. Automatiza commits con hooks en ramas de trabajo.
4. Evita que Claude ejecute comandos destructivos sin permiso (configura `permissions` en `settings.json`), ya que esos no se pueden rebobinar.

---

## 11. Chuleta rápida

| Quiero... | Terminal (CLI) | IDE / Desktop |
|---|---|---|
| Abrir el menú de rebobinado | `Esc` `Esc` o `/rewind` | Opción de rebobinar sobre el mensaje |
| Deshacer código y chat | *Restaurar código y conversación* | Igual |
| Deshacer solo el código | *Restaurar solo el código* | Igual |
| Limpiar el chat sin tocar código | *Restaurar solo la conversación* / `/compact` | Igual |
| Retomar una sesión anterior | `claude -c` / `claude -r` / `/resume` | Historial de sesiones |
| Probar una alternativa sin perder la original | `claude -r <id> --fork-session` | Nueva sesión + rama |
| Red de seguridad permanente | `git commit` | Source Control |

---

### Resumen final

- Los **checkpoints** se crean solos con cada prompt y te dejan volver atrás en código y conversación.
- Se acceden con **`Esc` `Esc`** o **`/rewind`**.
- **No** rastrean comandos de shell ni efectos externos → combínalos siempre con **Git**.
- En nivel avanzado: hooks para commits automáticos, worktrees para aislar experimentos y `--fork-session` para explorar caminos alternativos.
