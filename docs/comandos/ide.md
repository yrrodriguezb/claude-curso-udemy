# Comando `/ide`

> Referencia profesional del comando `/ide` de Claude Code: qué hace, cómo funciona por dentro, cómo configurarlo y cómo resolver problemas de conexión entre la terminal y tu editor (VS Code, Cursor, Windsurf, JetBrains).

| Campo | Valor |
|---|---|
| **Comando** | `/ide` |
| **Tipo** | Comando slash integrado (built-in) |
| **Ámbito** | Sesión actual de Claude Code en la terminal |
| **Editores compatibles** | VS Code y derivados (Cursor, Windsurf, VSCodium…) y IDEs de JetBrains (IntelliJ, PyCharm, WebStorm, Rider, GoLand…) |
| **Requisito** | Extensión/plugin de Claude Code instalado en el IDE |

---

## Índice

1. [Resumen](#1-resumen)
2. [¿Qué gana Claude al conectarse al IDE?](#2-qué-gana-claude-al-conectarse-al-ide)
3. [Uso básico](#3-uso-básico)
4. [Arquitectura: cómo funciona por dentro](#4-arquitectura-cómo-funciona-por-dentro)
5. [Formas de conectarse](#5-formas-de-conectarse)
6. [Configuración](#6-configuración)
7. [Herramientas que expone el IDE](#7-herramientas-que-expone-el-ide)
8. [Atajos de teclado útiles](#8-atajos-de-teclado-útiles)
9. [Flujos de trabajo avanzados](#9-flujos-de-trabajo-avanzados)
10. [Solución de problemas](#10-solución-de-problemas)
11. [Seguridad y buenas prácticas](#11-seguridad-y-buenas-prácticas)
12. [Chuleta rápida](#12-chuleta-rápida)

---

## 1. Resumen

`/ide` **conecta la sesión de Claude Code que corre en tu terminal con un editor de código abierto**. Una vez conectado, Claude y el IDE comparten contexto en ambos sentidos: Claude ve lo que seleccionas y los errores del editor, y el IDE muestra los cambios de Claude como diffs nativos.

Ejemplo real en este repositorio:

```text
> /ide
  No IDE selected.

> /ide
  Connected to Visual Studio Code.
```

- La primera vez no había ningún IDE disponible o elegido (por ejemplo, VS Code aún no tenía la carpeta abierta o la extensión no estaba activa).
- La segunda vez, con VS Code listo, el comando lo detectó y estableció la conexión.

---

## 2. ¿Qué gana Claude al conectarse al IDE?

| Capacidad | Sin `/ide` | Con `/ide` |
|---|---|---|
| **Ver diffs** | Diff en texto dentro de la terminal | Diff visual nativo en el editor, con aceptar/rechazar |
| **Contexto de selección** | Tienes que copiar/pegar código o usar `@archivo` | Claude ve automáticamente la selección o el archivo activo |
| **Diagnósticos** | Claude debe ejecutar linters/compiladores manualmente | Claude lee los errores y warnings del editor (Pylance, ESLint, TS…) |
| **Referencias a archivos** | Escribir rutas a mano | Atajo para insertar `@archivo#L10-20` desde el editor |
| **Jupyter** | Ejecutar scripts por terminal | Puede ejecutar código en el kernel del notebook activo (VS Code) |

> 💡 **En una frase:** sin `/ide`, Claude "trabaja a ciegas" respecto a tu editor; con `/ide`, ve lo que tú ves.

---

## 3. Uso básico

### Sintaxis

```text
/ide
```

No recibe argumentos. Al ejecutarlo:

1. Claude Code busca IDEs disponibles cuyo espacio de trabajo coincida con el directorio actual.
2. Si hay **uno**, se conecta directamente.
3. Si hay **varios**, muestra un selector para elegir.
4. Si hay **ninguno**, informa `No IDE selected` (o similar).

### Paso a paso (VS Code)

1. Instala la extensión **Claude Code** en VS Code (Marketplace) — o deja que Claude Code la instale automáticamente la primera vez que lo ejecutes en la terminal integrada.
2. Abre en VS Code la **misma carpeta** donde ejecutas `claude`.
3. En la terminal, dentro de Claude Code, ejecuta `/ide`.
4. Verifica la conexión: verás un indicador del IDE conectado en la interfaz de Claude Code y, al seleccionar texto en el editor, Claude indicará cuántas líneas tiene seleccionadas.

---

## 4. Arquitectura: cómo funciona por dentro

```text
┌──────────────────────┐     WebSocket local (127.0.0.1)     ┌──────────────────────────┐
│  Claude Code (CLI)   │ ◄─────────────────────────────────► │  Extensión / plugin IDE  │
│  en la terminal      │        protocolo MCP + token        │  (VS Code / JetBrains)   │
└──────────┬───────────┘                                     └────────────┬─────────────┘
           │ lee                                                          │ escribe
           ▼                                                              ▼
   ~/.claude/ide/<puerto>.lock  ◄──────────────── registro del IDE ───────┘
```

1. **Registro:** al iniciarse, la extensión del IDE abre un servidor local y escribe un archivo *lock* en `~/.claude/ide/` (por ejemplo `22552.lock`). Ese archivo contiene el puerto, las carpetas del workspace, el nombre del IDE y un token de autenticación.
2. **Descubrimiento:** `/ide` lee esos archivos lock y filtra los IDEs cuyo workspace contiene tu directorio actual.
3. **Conexión:** Claude Code se conecta por WebSocket a `localhost` usando el token. La comunicación usa el protocolo **MCP** (Model Context Protocol): el IDE actúa como un servidor MCP llamado `ide`.
4. **Intercambio:** a partir de ahí, el IDE envía eventos (selección, archivo activo) y expone herramientas (`getDiagnostics`, `executeCode`), mientras que Claude solicita abrir diffs en el editor.

> 🔎 Puedes ver los IDEs registrados en tu máquina con:
> ```bash
> ls ~/.claude/ide/
> ```
> Cada `.lock` corresponde a una ventana/instancia de IDE con la extensión activa.

---

## 5. Formas de conectarse

| Método | Cómo | Cuándo usarlo |
|---|---|---|
| **Terminal integrada del IDE** | Ejecuta `claude` dentro de la terminal de VS Code/JetBrains | Conexión automática; la forma más sencilla |
| **Terminal externa + `/ide`** | Ejecuta `claude` en Windows Terminal, PowerShell, iTerm… y luego `/ide` | Prefieres una terminal separada del editor |
| **Flag al iniciar** | `claude --ide` | Conectarse automáticamente al arrancar si hay exactamente un IDE válido |
| **Auto-conexión global** | Activar la opción de auto-conectar IDE en `/config` | Siempre trabajas con el IDE abierto |
| **Panel de la extensión** | Usar la interfaz gráfica de Claude Code dentro de VS Code | Prefieres chat visual en vez de terminal |

---

## 6. Configuración

### 6.1 Desde `/config`

Dentro de Claude Code, ejecuta `/config` y revisa:

- **Diff tool**: `auto` muestra los diffs en el IDE cuando está conectado; `terminal` los mantiene en la terminal.
- **Auto-connect to IDE** (terminal externa): conecta automáticamente sin ejecutar `/ide`.

### 6.2 Variables de entorno

| Variable | Efecto |
|---|---|
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1` | Evita que Claude Code instale automáticamente la extensión del IDE |

### 6.3 Comando del editor en el `PATH`

Para la instalación automática de la extensión en VS Code y derivados, el CLI del editor debe estar disponible:

| Editor | Comando esperado |
|---|---|
| VS Code | `code` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| VSCodium | `codium` |

En VS Code: `Ctrl+Shift+P` → **Shell Command: Install 'code' command in PATH** (en Windows normalmente ya viene configurado al instalar).

---

## 7. Herramientas que expone el IDE

Con la conexión activa, el IDE se registra como servidor MCP `ide` y Claude obtiene herramientas adicionales:

| Herramienta | Descripción | Ejemplo de prompt |
|---|---|---|
| `mcp__ide__getDiagnostics` | Lee errores y warnings del panel *Problems* del editor (para un archivo o todo el workspace) | *"Revisa los errores de Pylance en `src/main.py` y corrígelos"* |
| `mcp__ide__executeCode` | Ejecuta código Python en el kernel del notebook Jupyter activo | *"Ejecuta una celda que cargue el CSV y muestre `df.describe()`"* |

Además, de forma implícita:

- **Selección actual / archivo activo** → se adjunta como contexto a tu siguiente prompt.
- **Diffs** → las propuestas de edición se abren en el visor de diferencias del IDE.

> ⚠️ `executeCode` ejecuta código real en tu kernel: modifica variables y estado del notebook. Úsalo conscientemente.

---

## 8. Atajos de teclado útiles

| Acción | Windows / Linux | macOS |
|---|---|---|
| Abrir Claude Code desde el editor | `Ctrl+Esc` | `Cmd+Esc` |
| Insertar referencia al archivo/selección actual (`@archivo#L1-10`) | `Alt+Ctrl+K` | `Cmd+Option+K` |

> Los atajos pueden variar según la versión de la extensión y tus keybindings; revísalos en *Keyboard Shortcuts* buscando "Claude".

---

## 9. Flujos de trabajo avanzados

### 9.1 Corrección guiada por diagnósticos

```text
> Usa los diagnósticos del IDE para listar todos los errores de tipo del proyecto
  y corrígelos uno por uno, verificando de nuevo los diagnósticos al terminar.
```

Claude llama a `getDiagnostics`, corrige y vuelve a verificar, sin que tengas que ejecutar `mypy`/`pyright` manualmente.

### 9.2 Prompts basados en selección

1. Selecciona una función en el editor (por ejemplo, en `src/todos_service.py`).
2. En la terminal escribe:
   ```text
   > Escribe tests de pytest para esta función, incluyendo casos borde
   ```
3. Claude usa la selección como contexto, sin rutas ni copiar/pegar.

### 9.3 Revisión de cambios con diff nativo

Combina `/ide` con el modo de permisos por defecto: cada edición propuesta se abre como diff en VS Code, puedes revisarla con resaltado de sintaxis y aceptarla o rechazarla. Ideal junto a [checkpoints](../checkpoint.md) para deshacer si algo sale mal.

### 9.4 Varias ventanas / varios proyectos

- Si tienes varias ventanas del IDE abiertas, `/ide` muestra un selector: elige la que contiene tu proyecto.
- Puedes ejecutar `/ide` de nuevo en cualquier momento para **cambiar** de IDE o reconectarte.
- Con **git worktrees**, abre cada worktree en su propia ventana del IDE y conecta cada sesión de Claude a la ventana correspondiente.

### 9.5 Notebooks de ciencia de datos

```text
> En el notebook abierto, ejecuta código para cargar data.csv,
  muestra los nulos por columna y propón una limpieza.
```

Claude ejecuta en el kernel activo, lee el resultado y ajusta el siguiente paso.

---

## 10. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `No IDE selected` / no aparece ningún IDE | El IDE no tiene abierta la carpeta del proyecto | Abre en el IDE la misma carpeta (o una carpeta padre) donde ejecutas `claude` |
| | Extensión no instalada o no activa | Instálala desde el Marketplace y recarga la ventana (`Developer: Reload Window`) |
| | No existe lock en `~/.claude/ide/` | Recarga el IDE para que la extensión vuelva a registrarse |
| La extensión no se instala sola | El comando `code`/`cursor` no está en el `PATH` | Instala el comando en el PATH o instala la extensión manualmente |
| | Instalación automática desactivada | Revisa `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` |
| Aparecen varios IDEs y eliges el incorrecto | Varias ventanas con carpetas que se solapan | Vuelve a ejecutar `/ide` y elige el correcto, o cierra las ventanas sobrantes |
| Los diffs salen en la terminal y no en el IDE | `Diff tool` configurado como `terminal` | Cambia a `auto` en `/config` |
| Funciona en Windows pero no en **WSL** | IDE en Windows y Claude en WSL usan redes/rutas distintas | Usa la extensión *Remote - WSL* y ejecuta `claude` desde la terminal remota de VS Code; revisa el firewall de Windows |
| JetBrains no conecta | Plugin no reiniciado o IDE remoto | Reinicia el IDE tras instalar el plugin; en Remote Development, instala el plugin en el host remoto |
| Se conectaba y dejó de hacerlo | El IDE se reinició y cambió de puerto | Ejecuta `/ide` de nuevo |

### Diagnóstico rápido

```bash
# 1. ¿Hay IDEs registrados?
ls ~/.claude/ide/

# 2. ¿El CLI del editor está en el PATH?
code --version

# 3. ¿La extensión está instalada?
code --list-extensions | grep -i claude
```

---

## 11. Seguridad y buenas prácticas

- 🔒 **Conexión local:** la comunicación ocurre solo en `127.0.0.1` y requiere el token del archivo lock, por lo que otros equipos de la red no pueden conectarse.
- 🧾 **Contexto compartido:** todo lo que selecciones en el editor puede enviarse como contexto al modelo. **No selecciones secretos** (`.env`, claves, tokens) mientras trabajas con Claude.
- 🧪 **Diagnósticos ≠ tests:** que el panel *Problems* esté limpio no garantiza que el código funcione; pide también que Claude ejecute `pytest`.
- ⚙️ **Revisa los diffs:** la integración con el IDE hace muy cómoda la revisión; aprovéchala en lugar de aceptar todo automáticamente.
- 📁 **Una carpeta, una sesión:** abre en el IDE exactamente la carpeta del proyecto para evitar conexiones a la ventana equivocada.

---

## 12. Chuleta rápida

| Quiero… | Hacer |
|---|---|
| Conectar Claude al IDE | `/ide` |
| Cambiar de IDE / reconectar | `/ide` otra vez |
| Conectar al iniciar | `claude --ide` |
| Conectar siempre automáticamente | `/config` → auto-connect to IDE |
| Ver diffs en el editor | `/config` → Diff tool: `auto` |
| Ver IDEs registrados | `ls ~/.claude/ide/` |
| Evitar la auto-instalación de la extensión | `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL=1` |
| Abrir Claude desde el editor | `Ctrl+Esc` (`Cmd+Esc` en macOS) |
| Referenciar la selección actual | `Alt+Ctrl+K` (`Cmd+Option+K` en macOS) |

---

### Ver también

- [Checkpoints en Claude Code](../checkpoint.md)
- Documentación oficial: [Integraciones con IDE de Claude Code](https://docs.claude.com/en/docs/claude-code/ide-integrations)
