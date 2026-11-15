# Curso de Claude

Repositorio de prácticas del curso de Udemy **[Curso completo de Claude Code: crea aplicaciones con IA](https://sinco.udemy.com/course/curso-completo-de-claude-code-crea-aplicaciones-con-ia)**, impartido por el profesor **[Santiago Hernández](https://sinco.udemy.com/user/shramos/)**.

Cada sección del curso tiene su propia carpeta (`Tema_N/`) con los prompts que se usaron y los proyectos que Claude generó a partir de ellos.

---

## 📚 Secciones del curso

| # | Sección | Carpeta | Estado |
|---|---------|---------|--------|
| 1 | [Introducción a Claude](#1-introducción-a-claude) | [`Tema_1/`](Tema_1/) | ✅ Completado |
| 2 | _Por definir_ | `Tema_2/` | ⏳ Pendiente |
| 4 | [Prompting profesional para Claude Code](#4-prompting-profesional-para-claude-code) | [`Tema_3/`](Tema_3/) | 🚧 En curso |

---

## 📖 Documentación

Guías de apoyo sobre funcionalidades de Claude Code, ubicadas en la carpeta [`docs/`](docs/).

| Documento | Descripción |
|---|---|
| [`checkpoint.md`](docs/checkpoint.md) | **Checkpoints en Claude Code**: qué son, cómo rebobinar con `Esc` `Esc` / `/rewind` en la terminal y el IDE, opciones de restauración, limitaciones, y uso avanzado con Git, sesiones (`--resume`, `--fork-session`), hooks y worktrees. |

### ⌨️ Comandos

Referencia detallada de comandos slash de Claude Code, ubicada en [`docs/comandos/`](docs/comandos/).

| Comando | Documento | Descripción |
|---|---|---|
| `/ide` | [`ide.md`](docs/comandos/ide.md) | Conecta la sesión de la terminal con VS Code o JetBrains: diffs nativos, contexto de selección, diagnósticos del editor, configuración, arquitectura y solución de problemas. |

---

## 1. Introducción a Claude

Primer contacto con Claude Code como asistente de desarrollo: se le describe lo que se quiere construir en lenguaje natural y Claude crea los archivos, el entorno, las pruebas y ejecuta la aplicación.

### Temas abordados

- **Escribir prompts efectivos para programar**: describir requisitos, tecnologías, endpoints y estructura de archivos de forma clara y concreta.
- **Referenciar archivos en el prompt** con `@` (por ejemplo `@requirements.txt`) para darle contexto a Claude.
- **Prompts encadenados**: construir un proyecto por etapas (primero la API, luego la interfaz) en una misma conversación.
- **Generación de código Python** con buena estructura (`src/`, `tests/`, `requirements.txt`).
- **Entornos virtuales**: pedir a Claude que cree un `.venv` por proyecto e instale las dependencias.
- **Pruebas automáticas con pytest**: que Claude escriba los tests y los ejecute para verificar su propio trabajo.
- **Interfaces web con Streamlit**: calculadora y panel de control visual.
- **APIs REST con FastAPI + SQLite**: endpoints CRUD, modelos Pydantic y manejo centralizado de errores.
- **Ejecución de procesos**: arrancar servidores (`uvicorn`, `streamlit`) en segundo plano desde Claude Code.
- **Documentación y buenas prácticas**: `README.md` y `.gitignore` generados para cada proyecto.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`proyecto_1_prompt.txt`](Tema_1/proyecto_1_prompt.txt) | Prompt usado para crear la interfaz Streamlit de la calculadora. |
| [`Proyecto_1/`](Tema_1/Proyecto_1/) | **Calculadora con Streamlit**: lógica en `src/calculator.py`, pruebas con pytest y UI web en `app.py`. |
| [`proyecto_final_prompts.txt`](Tema_1/proyecto_final_prompts.txt) | Los dos prompts del proyecto final (API REST + panel Streamlit). |
| [`Proyecto_2/`](Tema_1/Proyecto_2/) | **To-Do API**: API REST con FastAPI y SQLite, tests con pytest + httpx y panel de control en Streamlit (`app_ui.py`). |

Cada proyecto tiene su propio `README.md` con instrucciones detalladas de instalación y ejecución.

---

## 4. Prompting profesional para Claude Code

Cómo escribir instrucciones que produzcan resultados predecibles y verificables. Todo se practica sobre **Snap**, un acortador de URLs que se construye prompt a prompt: primero la API y después su interfaz web.

### Temas abordados

- **Las cinco piezas de un prompt profesional**: contexto, tarea, restricciones, formato y verificación. Cuando el resultado falla, casi siempre falta una de ellas.
- **Patrones por tipo de tarea**: implementar una feature, depurar (causa raíz antes del fix), refactorizar (los tests existentes pasan sin tocarlos), explorar (solo lectura), escribir tests (happy path, edge cases y errores), documentar (pensando en quién lo va a leer) y pedir justificación (alternativas, trade-offs y riesgos).
- **Dividir tareas complejas en pasos verificables**: cada prompt hace una cosa y termina con una comprobación (tests, schema, `package.json`).
- **Encadenamiento y restricción progresiva**: analizar → proponer opciones → elegir una → plan detallado sin implementar → revisar riesgos → implementar → documentar y hacer commit.
- **Restricciones explícitas** como "no implementes nada", "solo lectura" o "implementa SOLO X" para controlar el alcance de cada paso.
- **Verificación de punta a punta**: arrancar el servidor y probar el flujo real en el navegador, no solo los tests.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`Patrones de prompt para claude code.md.txt`](Tema_3/Patrones%20de%20prompt%20para%20claude%20code.md.txt) | Lectura de la sección: la estructura de cinco piezas y los siete patrones con esquema, ejemplo y por qué funcionan. |
| [`prompts_dividir_tareas_complejas_pasos_verificables.txt`](Tema_3/prompts_dividir_tareas_complejas_pasos_verificables.txt) | Seis prompts para añadir autenticación JWT a Snap paso a paso: dependencias, tabla `users`, servicio, rutas, middleware y protección de endpoints. |
| [`prompts_encadenamiento_y_restriccion_progresiva.txt`](Tema_3/prompts_encadenamiento_y_restriccion_progresiva.txt) | Seis prompts encadenados para diseñar e implementar el endpoint de dashboard (totales y tendencias, índices, tests y documentación). |
| [`prompt_interfaz_grafica_snap.txt`](Tema_3/prompt_interfaz_grafica_snap.txt) | Seis prompts para crear la interfaz web de Snap: análisis de la API, comparación de opciones, plan, login/registro, dashboard y revisión final. |
| [`Proyecto_1/`](Tema_3/Proyecto_1/) | **Snap**: API en Express 5 + TypeScript + SQLite (`better-sqlite3`) con autenticación JWT, URLs cortas con registro de clicks, dashboard por usuario y tests con Vitest. En [`web/`](Tema_3/Proyecto_1/web/), SPA en React 19 + Vite + TypeScript, que por ahora tiene las páginas de login y registro. |

#### Ejecutar Snap

```bash
cd Tema_3/Proyecto_1
npm install
npm test             # tests de la API
npm start            # API en http://localhost:3000

# En otra terminal: interfaz web
cd web
npm install
npm run dev          # http://localhost:5173/app/
```

---

## 🛠️ Requisitos generales

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
- Python 3.12 o superior (secciones 1 y 2)
- Node.js 22 o superior (Tema_3)
- Git

## 🚀 Cómo usar este repositorio

1. Entra a la carpeta del proyecto que quieras probar, por ejemplo:

   ```bash
   cd Tema_1/Proyecto_1
   ```

2. Crea el entorno virtual e instala las dependencias:

   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux / macOS
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. Sigue las instrucciones del `README.md` de ese proyecto para ejecutar los tests y la aplicación.

## 📁 Estructura

```
Claude/
├── README.md
├── .gitignore
├── docs/                            # Documentación de apoyo
│   ├── checkpoint.md                # Guía de checkpoints en Claude Code
│   └── comandos/                    # Referencia de comandos slash
│       └── ide.md                   # Comando /ide
├── Tema_1/                          # Introducción a Claude
│   ├── proyecto_1_prompt.txt
│   ├── proyecto_final_prompts.txt
│   ├── Proyecto_1/                  # Calculadora con Streamlit
│   └── Proyecto_2/                  # To-Do API (FastAPI + SQLite + Streamlit)
└── Tema_3/                          # Prompting profesional para Claude Code
    ├── Patrones de prompt para claude code.md.txt
    ├── prompts_dividir_tareas_complejas_pasos_verificables.txt
    ├── prompts_encadenamiento_y_restriccion_progresiva.txt
    ├── prompt_interfaz_grafica_snap.txt
    └── Proyecto_1/                  # Snap: acortador de URLs
        ├── src/                     # API (Express + TypeScript + SQLite)
        └── web/                     # Interfaz web (React + Vite)
```
