# Curso de Claude

Repositorio de prácticas del curso de Udemy **[Curso completo de Claude Code: crea aplicaciones con IA](https://sinco.udemy.com/course/curso-completo-de-claude-code-crea-aplicaciones-con-ia)**, impartido por el profesor **[Santiago Hernández](https://sinco.udemy.com/user/shramos/)**.

Cada sección del curso tiene su propia carpeta (`Tema_N/`) con los prompts que se usaron y los proyectos que Claude generó a partir de ellos.

---

## 📚 Secciones del curso

| # | Sección | Carpeta | Estado |
|---|---------|---------|--------|
| 1 | [Introducción a Claude](#1-introducción-a-claude) | [`Tema_1/`](Tema_1/) | ✅ Completado |
| 2 | _Por definir_ | `Tema_2/` | ⏳ Pendiente |

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

## 🛠️ Requisitos generales

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
- Python 3.12 o superior
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
└── Tema_1/                          # Introducción a Claude
    ├── proyecto_1_prompt.txt
    ├── proyecto_final_prompts.txt
    ├── Proyecto_1/                  # Calculadora con Streamlit
    └── Proyecto_2/                  # To-Do API (FastAPI + SQLite + Streamlit)
```
