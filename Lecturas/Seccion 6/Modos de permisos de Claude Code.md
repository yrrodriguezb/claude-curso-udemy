# 🔐 Modos de permisos de Claude Code

> Los **modos de permiso** controlan si Claude pregunta antes de actuar. Cada tarea necesita un nivel de autonomía distinto: supervisión total para trabajo sensible, pocas interrupciones para un refactor largo o solo lectura mientras exploras código nuevo.
>
> **La pregunta clave:** *¿cuánto confías en lo que Claude va a hacer?*

---

## 📑 Tabla de contenido

1. [Conceptos básicos](#-1-conceptos-básicos)
2. [Los 6 modos disponibles](#-2-los-6-modos-disponibles)
3. [Cómo cambiar de modo](#-3-cómo-cambiar-de-modo)
4. [Reglas de permisos: allow, ask y deny](#-4-reglas-de-permisos-allow-ask-y-deny)
5. [Sintaxis de las reglas](#-5-sintaxis-de-las-reglas)
6. [Dónde se configuran: jerarquía de settings](#-6-dónde-se-configuran-jerarquía-de-settings)
7. [Flags de la línea de comandos](#-7-flags-de-la-línea-de-comandos)
8. [Nivel experto: hooks, sandbox y CI/CD](#-8-nivel-experto-hooks-sandbox-y-cicd)
9. [Buenas prácticas y seguridad](#-9-buenas-prácticas-y-seguridad)
10. [Chuleta rápida](#-10-chuleta-rápida)

---

## 🟢 1. Conceptos básicos

Cada vez que Claude quiere usar una **herramienta** (leer un archivo, editarlo, ejecutar un comando, acceder a la web, llamar a un servidor MCP…), Claude Code decide entre tres resultados:

| Resultado | Qué pasa |
|-----------|----------|
| ✅ **Permitir** | La acción se ejecuta sin preguntar. |
| ❓ **Preguntar** | Aparece un diálogo para que apruebes o rechaces. |
| ⛔ **Denegar** | La acción se bloquea y Claude recibe el rechazo. |

Esa decisión depende de dos cosas que trabajan juntas:

- **El modo de permiso activo** → el comportamiento *por defecto* de la sesión.
- **Las reglas de permisos** (`allow` / `ask` / `deny`) → excepciones concretas por herramienta, comando o ruta.

### Tipos de herramientas según su riesgo

| Tipo | Ejemplos | ¿Pide aprobación en modo `default`? |
|------|----------|-------------------------------------|
| Solo lectura | `Read`, `Glob`, `Grep` | ❌ No |
| Modificación de archivos | `Edit`, `Write`, `NotebookEdit` | ✅ Sí (hasta el fin de la sesión si eliges "no volver a preguntar") |
| Comandos de shell | `Bash` | ✅ Sí (si eliges "no volver a preguntar" se guarda de forma permanente para ese proyecto y comando) |
| Red / externas | `WebFetch`, `WebSearch`, herramientas MCP | ✅ Sí |

> [!TIP]
> Cuando apruebas una acción, el diálogo suele ofrecer **"Sí, y no volver a preguntar"**. Así vas construyendo tu lista de permisos sin editar archivos a mano.

---

## 🧭 2. Los 6 modos disponibles

| Modo | Leer | Editar | Ejecutar comandos | Ideal para | Riesgo |
|------|:----:|:------:|:-----------------:|------------|:------:|
| `default` | ✅ | ❓ | ❓ | Primeros pasos, trabajo sensible, repos desconocidos | 🟢 Bajo |
| `acceptEdits` | ✅ | ✅ | ❓ | Iterar sobre código que revisas activamente | 🟡 Medio |
| `plan` | ✅ | ⛔ | ⛔ | Explorar y planificar antes de tocar nada | 🟢 Mínimo |
| `auto` | ✅ | ✅* | ✅* | Tareas largas sin fatiga de aprobaciones | 🟠 Medio-alto |
| `dontAsk` | ✅** | ✅** | ✅** | CI/CD y scripts automatizados | 🟡 Controlado |
| `bypassPermissions` | ✅ | ✅ | ✅ | **Solo** contenedores o VMs aisladas | 🔴 Alto |

\* Con verificación de un clasificador en segundo plano.
\*\* Solo si la herramienta está **pre-aprobada** explícitamente; lo demás se deniega.

### 🔹 `default` — supervisión total
Claude solo **lee** archivos sin preguntar. Cualquier modificación o comando requiere tu aprobación explícita.
**Úsalo cuando:** empiezas con Claude Code, trabajas en algo sensible (producción, datos, credenciales) o exploras un repositorio desconocido.

### 🔹 `acceptEdits` — edición fluida
Claude **lee y edita** archivos sin interrupciones; los comandos de shell siguen requiriendo aprobación.
**Úsalo cuando:** iteras sobre código que estás revisando (por ejemplo, con `git diff` o el panel de cambios del IDE). Mantienes un flujo ágil sin renunciar a la revisión.

### 🔹 `plan` — analizar antes de actuar
Claude solo puede **leer e investigar**: no edita ni ejecuta comandos que modifiquen nada. Al terminar te presenta un **plan** para que lo apruebes; al aceptarlo, sales del modo plan y Claude empieza a implementar.
**Úsalo cuando:** exploras un codebase nuevo, diseñas un refactor grande o quieres validar el enfoque antes de cambiar código.

> [!TIP]
> Un flujo muy efectivo: **`plan` → revisar el plan → `acceptEdits` → revisar el diff**. Separa el "pensar" del "hacer".

### 🔹 `auto` — autonomía con red de seguridad
Habilita todas las acciones, pero un **clasificador en segundo plano** revisa cada una y bloquea o escala las que parecen sospechosas o destructivas (por ejemplo, borrados masivos, `git push --force`, exfiltración de datos).
**Úsalo cuando:** lanzas tareas largas (migraciones, refactors amplios) y las aprobaciones constantes se vuelven un cuello de botella.

> [!NOTE]
> El clasificador **reduce** el riesgo, no lo elimina. Combínalo con reglas `deny` para lo que nunca debe ocurrir.

### 🔹 `dontAsk` — lista cerrada
Solo ejecuta las herramientas **pre-aprobadas** (reglas `allow` o `--allowedTools`). Todo lo demás se **deniega automáticamente**, sin preguntar (no hay nadie para responder).
**Úsalo cuando:** ejecutas Claude en pipelines CI/CD o scripts, donde el conjunto de acciones permitidas debe estar definido de antemano.

### 🔹 `bypassPermissions` — sin controles
Permite **todo** sin verificaciones.

> [!CAUTION]
> Úsalo **solo** en contenedores, devcontainers o máquinas virtuales aisladas y desechables, **nunca en tu máquina principal**. Un error o una inyección de prompt (por ejemplo, desde un archivo o una web maliciosa) podría borrar archivos, filtrar secretos o ejecutar código arbitrario.

---

## 🔄 3. Cómo cambiar de modo

### Durante una sesión

Pulsa **`Shift + Tab`** para ciclar entre modos. El modo actual se muestra en la barra de estado.

```
default ──► acceptEdits ──► plan ──► auto ──┐
   ▲                                         │
   └─────────────────────────────────────────┘
```

| Modo | ¿Aparece en el ciclo `Shift+Tab`? |
|------|-----------------------------------|
| `default`, `acceptEdits`, `plan` | ✅ Siempre |
| `auto` | Solo si arrancaste con `--enable-auto-mode` |
| `bypassPermissions` | Solo si arrancaste con `--permission-mode bypassPermissions` o `--dangerously-skip-permissions` |
| `dontAsk` | ❌ Nunca: debe activarse al inicio |

### Al iniciar la sesión

```bash
claude --permission-mode plan
claude --permission-mode acceptEdits
claude --permission-mode auto --enable-auto-mode
claude --permission-mode dontAsk
claude --permission-mode bypassPermissions   # ⚠️ Solo en entornos aislados
```

### Como modo por defecto (persistente)

En `settings.json`:

```json
{
  "permissions": {
    "defaultMode": "acceptEdits"
  }
}
```

---

## 📜 4. Reglas de permisos: allow, ask y deny

Los modos definen el comportamiento general; las **reglas** afinan casos concretos.

| Lista | Efecto |
|-------|--------|
| `allow` | Se ejecuta sin preguntar. |
| `ask` | Siempre pide confirmación (aunque el modo lo permitiría). |
| `deny` | Se bloquea siempre. |

### ⚖️ Orden de precedencia

```
deny  >  ask  >  allow
```

Si una acción coincide con varias reglas, **gana la más restrictiva**. Un `deny` no se puede "saltar" con un `allow`.

### Gestionar reglas de forma interactiva

```text
/permissions
```

Abre un panel para ver, añadir y eliminar reglas, e indica de qué archivo de configuración proviene cada una.

### Ejemplo completo

```json
{
  "permissions": {
    "defaultMode": "default",
    "allow": [
      "Bash(npm run test:*)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Edit(src/**)"
    ],
    "ask": [
      "Bash(git push:*)",
      "Bash(npm install:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(rm -rf:*)",
      "Bash(curl:*)",
      "WebFetch"
    ],
    "additionalDirectories": ["../shared-lib/"]
  }
}
```

---

## 🧩 5. Sintaxis de las reglas

Formato general: **`Herramienta`** o **`Herramienta(especificador)`**.

| Regla | Significado |
|-------|-------------|
| `Read` | Cualquier lectura. |
| `Bash(npm run build)` | Ese comando exacto. |
| `Bash(npm run test:*)` | Comandos que **empiezan** por `npm run test`. |
| `Edit(src/**)` | Editar cualquier archivo bajo `src/`. |
| `Read(./.env)` | El archivo `.env` relativo al directorio actual. |
| `Read(~/.ssh/**)` | Ruta relativa a tu *home*. |
| `Read(//etc/hosts)` | Ruta **absoluta** (doble barra). |
| `Edit(/docs/**)` | Ruta relativa a la **ubicación del archivo de settings**. |
| `WebFetch(domain:github.com)` | Peticiones solo a ese dominio. |
| `mcp__github` | Todas las herramientas del servidor MCP `github`. |
| `mcp__github__create_issue` | Una herramienta MCP concreta. |

> [!WARNING]
> Las reglas de `Bash` se basan en patrones de texto y **pueden eludirse** (opciones antes del comando, variables, redirecciones, `bash -c "..."`). No las uses como única barrera de seguridad: para bloquear red o rutas de forma fiable, combínalas con `deny` en `WebFetch`/`Read` y con el **sandbox** (ver sección 8).

> [!NOTE]
> Claude Code reconoce operadores de shell como `&&`: una regla `Bash(npm run test:*)` **no** autoriza `npm run test && rm -rf /`.

---

## 🗂️ 6. Dónde se configuran: jerarquía de settings

De **mayor** a **menor** prioridad:

| # | Nivel | Ubicación | ¿Se comparte? |
|:-:|-------|-----------|---------------|
| 1 | **Enterprise / gestionado** | `managed-settings.json` (definido por la organización) | Impuesto por IT, no se puede sobrescribir |
| 2 | **Argumentos CLI** | `--permission-mode`, `--allowedTools`… | Solo esa sesión |
| 3 | **Proyecto local** | `.claude/settings.local.json` | ❌ Personal (en `.gitignore`) |
| 4 | **Proyecto compartido** | `.claude/settings.json` | ✅ Versionado con el equipo |
| 5 | **Usuario** | `~/.claude/settings.json` | Todos tus proyectos |

> [!TIP]
> - Reglas del **equipo** (p. ej., denegar `.env`, permitir `npm test`) → `.claude/settings.json`.
> - Preferencias **personales** → `.claude/settings.local.json` o `~/.claude/settings.json`.
> - Políticas **corporativas** (p. ej., prohibir `bypassPermissions`) → settings gestionados.

---

## 🛠️ 7. Flags de la línea de comandos

| Flag | Descripción |
|------|-------------|
| `--permission-mode <modo>` | Modo inicial de la sesión. |
| `--enable-auto-mode` | Habilita el modo `auto`. |
| `--dangerously-skip-permissions` | Equivale a `bypassPermissions`. ⚠️ |
| `--allowedTools "<reglas>"` | Herramientas pre-aprobadas para la sesión. |
| `--disallowedTools "<reglas>"` | Herramientas bloqueadas para la sesión. |
| `--add-dir <ruta>` | Da acceso a directorios fuera del proyecto. |
| `--permission-prompt-tool <mcp_tool>` | En modo no interactivo, delega las aprobaciones a una herramienta MCP. |
| `-p "<prompt>"` | Modo no interactivo (*headless*), típico de scripts y CI. |

Ejemplo:

```bash
claude --permission-mode acceptEdits \
       --allowedTools "Bash(npm run test:*)" "Bash(git diff:*)" \
       --disallowedTools "Bash(git push:*)" "WebFetch"
```

---

## 🚀 8. Nivel experto: hooks, sandbox y CI/CD

### 8.1 Hooks `PreToolUse`: permisos programables

Un hook se ejecuta **antes** de cada uso de herramienta y puede **aprobar, denegar o pedir confirmación** con lógica propia (expresiones regulares, horario, rama de git, etc.). Se evalúa además de las reglas de permisos.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/validar-bash.js" }
        ]
      }
    ]
  }
}
```

El script recibe la llamada en JSON por `stdin` y puede bloquearla saliendo con código `2` (el mensaje de `stderr` se envía a Claude) o devolviendo un JSON con la decisión.

### 8.2 Sandbox

Con `/sandbox` (o la configuración `sandbox` en settings) los comandos `Bash` se ejecutan con **aislamiento a nivel de sistema operativo**: el sistema de archivos queda limitado al proyecto y la red a los dominios permitidos. Así puedes conceder más autonomía con mucho menos riesgo. Es la defensa más sólida frente a la inyección de prompts.

### 8.3 CI/CD y automatización

```bash
claude -p "Ejecuta los tests y corrige los fallos de lint" \
  --permission-mode dontAsk \
  --allowedTools "Read" "Edit" "Bash(npm run test:*)" "Bash(npm run lint:*)"
```

Recomendaciones:
- Usa **`dontAsk`** con una lista **mínima** de `--allowedTools`.
- Si necesitas `bypassPermissions`, hazlo **solo dentro de un contenedor efímero**, sin credenciales de producción y con red restringida.
- Inyecta secretos con permisos mínimos y de corta duración.

### 8.4 Políticas de organización

Con settings gestionados (`managed-settings.json`) un administrador puede:
- Desactivar el modo bypass: `"permissions": { "disableBypassPermissionsMode": "disable" }`.
- Imponer reglas `deny` que ningún usuario puede sobrescribir.
- Restringir servidores MCP, hooks o directorios permitidos.

---

## 🛡️ 9. Buenas prácticas y seguridad

1. **Empieza restrictivo y abre poco a poco.** Es más fácil añadir un `allow` que deshacer un desastre.
2. **Protege siempre los secretos:** `deny` sobre `.env`, `secrets/`, `~/.ssh/`, `~/.aws/`, etc.
3. **Usa `plan` para cambios grandes** y revisa el plan antes de ejecutar.
4. **Revisa el diff** aunque estés en `acceptEdits` o `auto`. Trabaja sobre git para poder revertir.
5. **Usa `ask` para acciones irreversibles o externas:** `git push`, despliegues, migraciones de base de datos, instalación de paquetes.
6. **Comparte reglas de equipo** en `.claude/settings.json` para que todos trabajen con la misma base segura.
7. **Desconfía del contenido externo:** webs, issues o archivos descargados pueden contener instrucciones maliciosas (*prompt injection*). Cuanta más autonomía, más importa.
8. **Nunca uses `bypassPermissions`** fuera de un entorno aislado y desechable.
9. **Audita periódicamente** con `/permissions` y elimina reglas que ya no necesites.

### 🧠 ¿Qué modo elijo?

```
¿Estás en un contenedor/VM aislado y desechable?
 ├─ Sí → ¿Necesitas cero interrupciones? → bypassPermissions
 └─ No
     ├─ ¿Es un pipeline/script sin humano? ............ dontAsk
     ├─ ¿Solo quieres entender o planificar? .......... plan
     ├─ ¿Es trabajo sensible o un repo desconocido? ... default
     ├─ ¿Iteras y revisas los cambios tú mismo? ....... acceptEdits
     └─ ¿Tarea larga y confías en el clasificador? .... auto
```

---

## ⚡ 10. Chuleta rápida

| Necesito… | Hago… |
|-----------|-------|
| Cambiar de modo en la sesión | `Shift + Tab` |
| Empezar en modo plan | `claude --permission-mode plan` |
| Ver o editar reglas | `/permissions` |
| Modo por defecto persistente | `"defaultMode"` en `settings.json` |
| Permitir los tests siempre | `"allow": ["Bash(npm run test:*)"]` |
| Bloquear el `.env` | `"deny": ["Read(./.env)"]` |
| Confirmar siempre los push | `"ask": ["Bash(git push:*)"]` |
| Acceder a otra carpeta | `--add-dir ../otra` o `additionalDirectories` |
| Aislar comandos de shell | `/sandbox` |
| Ejecutar en CI | `claude -p "..." --permission-mode dontAsk --allowedTools ...` |

---

> 📚 **Referencia oficial:** [Documentación de permisos de Claude Code](https://docs.anthropic.com/en/docs/claude-code/iam) · [Settings](https://docs.anthropic.com/en/docs/claude-code/settings) · [Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
