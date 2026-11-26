# Curso de Claude

Repositorio de prácticas del curso de Udemy **[Curso completo de Claude Code: crea aplicaciones con IA](https://sinco.udemy.com/course/curso-completo-de-claude-code-crea-aplicaciones-con-ia)**, impartido por el profesor **[Santiago Hernández](https://sinco.udemy.com/user/shramos/)**.

Las secciones prácticas tienen su propia carpeta (`Tema_N/`) con los prompts que se usaron y los proyectos que Claude generó a partir de ellos. Las lecturas teóricas de cada sección están en [`Lecturas/`](Lecturas/).

---

## 📚 Secciones del curso

| # | Sección | Carpeta | Estado |
|---|---------|---------|--------|
| 2 | [Introducción a Claude](#2-introducción-a-claude) | [`Tema_1/`](Tema_1/) | ✅ Completado |
| 3 | [Landing page con React + Vite e iteración visual](#3-landing-page-con-react--vite-e-iteración-visual) | [`Tema_2/`](Tema_2/) | ✅ Completado |
| 4 | [Prompting profesional para Claude Code](#4-prompting-profesional-para-claude-code) | [`Tema_3/`](Tema_3/) | ✅ Completado |
| 5 | [Memoria persistente con Claude Code](#5-memoria-persistente-con-claude-code) | [`Tema_3/`](Tema_3/) · [`Lecturas/Seccion 5/`](Lecturas/Seccion%205/) | ✅ Completado |
| 6 | [Modos de operación, permisos y seguridad](#6-modos-de-operación-permisos-y-seguridad) | [`Tema_5/`](Tema_5/) · [`Lecturas/Seccion 6/`](Lecturas/Seccion%206/) | ✅ Completado |
| 7 | [Servidores MCP: GitHub, SQLite y Playwright](#7-servidores-mcp-github-sqlite-y-playwright) | [`Tema_6/`](Tema_6/) | ✅ Completado |
| 8 | [Hooks y automatización basada en eventos](#8-hooks-y-automatización-basada-en-eventos) | [`Tema_7/`](Tema_7/) · [`Lecturas/Seccion 8/`](Lecturas/Seccion%208/) | ✅ Completado |
| 9 | [Subagentes](#9-subagentes) | [`Tema_8/`](Tema_8/) · [`Lecturas/Seccion 9/`](Lecturas/Seccion%209/) | ✅ Completado |
| 10 | [Skills y plugins](#10-skills-y-plugins) | [`Tema_9/`](Tema_9/) · [`Lecturas/Seccion 10/`](Lecturas/Seccion%2010/) | 🚧 En curso |
| 11 | [Seguridad en el desarrollo con IA](#11-seguridad-en-el-desarrollo-con-ia) | [`Lecturas/Seccion 11/`](Lecturas/Seccion%2011/) | 🚧 En curso |

---

## 📘 Lecturas

Material teórico de cada sección, ubicado en [`Lecturas/`](Lecturas/).

| Sección | Lectura | De qué trata |
|---|---|---|
| 5 | [Escribir instrucciones efectivas en CLAUDE.md](Lecturas/Escribir%20instrucciones%20efectivas%20en%20CLAUDE.md) | Qué incluir y qué no en `CLAUDE.md`, tamaño recomendado (≤ 200 líneas) y cuándo dividirlo. |
| 5 | [Auto memory en Claude Code](Lecturas/Seccion%205/Auto%20memory%20en%20Claude%20Code.md) | Cómo Claude recuerda cosas por sí mismo entre sesiones, dónde lo guarda y cómo controlarlo. |
| 5 | [Reglas modulares de memoria](Lecturas/Seccion%205/Reglas%20modulares%20de%20memoria%20en%20Claude%20Code.md) | Dividir `CLAUDE.md` en reglas pequeñas en `.claude/rules/` que se cargan solo cuando hacen falta. |
| 5 | [Patrones Glob en Claude Code](Lecturas/Seccion%205/Patrones%20Glob%20en%20Claude%20Code.md) | Sintaxis glob para reglas por ruta, permisos y búsquedas. |
| 6 | [Modos de permisos](Lecturas/Seccion%206/Modos%20de%20permisos%20de%20Claude%20Code.md) | `default`, `acceptEdits`, `plan`, `bypassPermissions`… y cuándo usar cada uno. |
| 6 | [Permisos personalizados](Lecturas/Seccion%206/Permisos%20personalizados%20con%20Claude%20Code.md) | Reglas `allow` / `ask` / `deny` por herramienta, argumentos, rutas y dominios. |
| 6 | [Permisos automáticos vs personalizados](Lecturas/Seccion%206/Permisos%20autom%C3%A1ticos%20vs%20permisos%20personalizados.md) | Cómo combina Claude Code los modos con las reglas para decidir si permite, pregunta o deniega. |
| 6 | [Hooks de seguridad](Lecturas/Seccion%206/Hooks%20de%20seguridad%20en%20Claude%20Code.md) | Comandos que se ejecutan automáticamente en el ciclo de vida de la sesión (`PreToolUse`, `PostToolUse`…) para bloquear acciones. |
| 6 | [Sandboxing](Lecturas/Seccion%206/Sandboxing%20con%20Claude%20Code.md) | Aislamiento a nivel de sistema operativo de archivos y red. |
| 6 | [Instalación, scopes y gestión de servidores MCP](Lecturas/Seccion%206/Instalaci%C3%B3n%2C%20scopes%20y%20gesti%C3%B3n%20de%20servidores%20MCP%20en%20Claude%20Code.md) | `claude mcp add`, scopes `local` / `project` / `user`, `.mcp.json`, `/mcp` y permisos sobre tools MCP. |
| 6 | ⚠️ [IMPORTANTE — Seguridad en servidores MCP](Lecturas/Seccion%206/IMPORTANTE%20-%20Seguridad%20en%20servidores%20MCP.md) | Amenazas de MCP de básico a avanzado (prompt injection, tool poisoning, tríada letal, OAuth…) y **checklist de seguridad** para auditar cada servidor. |
| 8 | [Eventos y Hooks disponibles](Lecturas/Seccion%208/Eventos%20y%20Hooks%20disponibles%20en%20Claude%20Code.md) | Catálogo de eventos del ciclo de vida, tipos de handler (`command`, `http`, `prompt`, `agent`) y exit codes. |
| 8 | [Matchers y Variables de entorno en Hooks](Lecturas/Seccion%208/Matchers%20y%20Variables%20de%20entorno%20en%20Hooks%20de%20Claude%20Code.md) | Qué filtra el `matcher` en cada evento, variables `$CLAUDE_*` y el JSON que llega por stdin. |
| 8 | ⚡ [Hooks y automatizaciones basadas en eventos — De cero a experto](Lecturas/Seccion%208/Hooks%20y%20automatizaciones%20basadas%20en%20eventos%20-%20De%20cero%20a%20experto.md) | Guía integral: contrato de entrada/salida, recetario, patrones avanzados, hooks en Node.js testeables, depuración, seguridad y proyecto integrador. |
| 9 | 🤖 [Subagentes en Claude Code — De cero a experto](Lecturas/Seccion%209/Subagentes%20en%20Claude%20Code%20-%20De%20cero%20a%20experto.md) | Guía integral de subagentes: modelo orquestador/trabajadores, alcance y precedencia, **frontmatter campo por campo** (`tools`, `model`, `permissionMode`, `memory`, `isolation`…), recetario (revisor, tests, migraciones EF Core, seguridad, E2E), patrones de orquestación, costos, seguridad y proyecto integrador. |
| 10 | 🧩 [Skills vs Subagentes vs Memoria vs Hooks](Lecturas/Seccion%2010/Skills%20vs%20Subagentes%20vs%20Memoria%20vs%20Hooks.md) | Diferencias entre las cuatro piezas: la memoria dice **qué es verdad**, la skill **cómo se hace**, el subagente **quién lo hace** y el hook **qué ocurre siempre**. |
| 10 | 🧩 [Campos de configuración de una Skill — De cero a avanzado](Lecturas/Seccion%2010/Campos%20de%20configuracion%20de%20una%20Skill%20-%20De%20cero%20a%20avanzado.md) | Frontmatter campo por campo (`description`, `disable-model-invocation`, `argument-hint`, `allowed-tools`, `model`, `paths`, `context: fork`…), archivos de soporte, hooks locales y recetario. |
| 10 | 📦 [Plugins en Claude Code — De cero a experto](Lecturas/Seccion%2010/Plugins%20en%20Claude%20Code%20-%20De%20cero%20a%20experto.md) | Estructura de un plugin (`.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/`, `bin/`, `.mcp.json`, `.lsp.json`), namespacing, pruebas locales, marketplaces, plugins de equipo, versionado y seguridad. |
| 11 | ⚠️ [Patrones peligrosos del código generado por IA](Lecturas/Seccion%2011/Patrones%20peligrosos%20del%20codigo%20generado%20por%20IA.md) | Los siete fallos típicos del código de backend generado por IA (auth olvidada, SQL injection, secretos hardcodeados, error leaking, validación ausente, CORS abierto, permisos planos/IDOR), con su corrección y checklist. |
| 11 | 🔌 [Ciberseguridad en MCP — De cero a experto](Lecturas/Seccion%2011/Ciberseguridad%20en%20MCP%20-%20De%20cero%20a%20experto.md) | Inyección indirecta, tool poisoning, rug pull, tool shadowing, cadena de suministro, confused deputy, SSRF/DNS rebinding, trifecta letal, permisos `mcp__*` y cómo construir un servidor seguro. |
| 11 | 💬 [Ciberseguridad en Prompts — De cero a experto](Lecturas/Seccion%2011/Ciberseguridad%20en%20Prompts%20-%20De%20cero%20a%20experto.md) | OWASP LLM Top 10, prompt injection directa e indirecta, jailbreaks, fuga del system prompt, exfiltración por markdown, defensa en capas, `CLAUDE.md` como vector y red teaming. |
| 11 | 🧩 [Ciberseguridad en Skills y Plugins — De cero a experto](Lecturas/Seccion%2011/Ciberseguridad%20en%20Skills%20y%20Plugins%20-%20De%20cero%20a%20experto.md) | Instrucciones ocultas en `SKILL.md`, `allowed-tools` amplio, hooks y MCP empaquetados, marketplaces, cómo auditar un plugin y políticas de organización. |
| 11 | 🪝 [Ciberseguridad en Hooks — De cero a experto](Lecturas/Seccion%2011/Ciberseguridad%20en%20Hooks%20-%20De%20cero%20a%20experto.md) | El hook como riesgo y como defensa: scripts para bloquear comandos peligrosos, proteger archivos, detectar secretos, auditoría y límites. |
| 11 | 🤖 [Ciberseguridad en Subagentes — De cero a experto](Lecturas/Seccion%2011/Ciberseguridad%20en%20Subagentes%20-%20De%20cero%20a%20experto.md) | Mínimo privilegio por rol, herencia de `tools`, propagación de inyecciones entre agentes, agente lector en cuarentena y equipo de revisión de seguridad. |
| 11 | 🔐 [Ciberseguridad en Permisos, Sandbox y Secretos — De cero a experto](Lecturas/Seccion%2011/Ciberseguridad%20en%20Permisos%2C%20Sandbox%20y%20Secretos%20-%20De%20cero%20a%20experto.md) | Reglas allow/ask/deny, jerarquía de settings, configuración base segura, sandbox, devcontainers, managed settings, CI/CD y modelo de amenazas completo. |
| 11 | 📦 [Dependencias sugeridas por IA (slopsquatting) — De cero a experto](Lecturas/Seccion%2011/Dependencias%20sugeridas%20por%20IA%20%28slopsquatting%29%20-%20De%20cero%20a%20experto.md) | Paquetes alucinados, slopsquatting, typosquatting, dependency confusion, scripts de instalación, npm y NuGet seguros, lockfiles, SBOM y hook para verificar paquetes. |
| 11 | 🕵️ [Privacidad y datos sensibles con IA — De cero a experto](Lecturas/Seccion%2011/Privacidad%20y%20datos%20sensibles%20con%20IA%20-%20De%20cero%20a%20experto.md) | Qué datos salen al proveedor y cuáles quedan en disco, minimización, anonimización y datos sintéticos, enmascaramiento en SQL Server, Ley 1581/GDPR y política de clasificación. |
| 11 | 🧠 [Envenenamiento de memoria — De cero a experto](Lecturas/Seccion%2011/Envenenamiento%20de%20memoria%20-%20De%20cero%20a%20experto.md) | `CLAUDE.md`, auto memory, reglas, imports y memoria de subagentes como vector de inyección persistente; revisión, permisos, CODEOWNERS y auditoría en CI. |
| 11 | 🌐 [Agentes con navegador — De cero a experto](Lecturas/Seccion%2011/Agentes%20con%20navegador%20-%20De%20cero%20a%20experto.md) | Playwright MCP y Claude in Chrome: trifecta letal, abuso de sesiones, exfiltración por navegación, perfil aislado, dominios permitidos y E2E seguro. |
| 11 | 🛡️ [Revisión de seguridad asistida por IA — De cero a experto](Lecturas/Seccion%2011/Revision%20de%20seguridad%20asistida%20por%20IA%20-%20De%20cero%20a%20experto.md) | `/security-review`, prompts de revisión con cobertura explícita, STRIDE, combinación con SAST/SCA/secretos, triaje de hallazgos y tests de regresión. |
| 11 | 🧱 [OWASP Top 10 web y API en Node y .NET — De cero a experto](Lecturas/Seccion%2011/OWASP%20Top%2010%20web%20y%20API%20en%20Node%20y%20.NET%20-%20De%20cero%20a%20experto.md) | Las dos listas OWASP aplicadas a Express y ASP.NET Core: IDOR, mass assignment, JWT, criptografía, rate limiting, inyecciones, SSRF, deserialización, cabeceras y logging. |
| 11 | ⚙️ [Seguridad en CI/CD con Claude — De cero a experto](Lecturas/Seccion%2011/Seguridad%20en%20CI-CD%20con%20Claude%20-%20De%20cero%20a%20experto.md) | Modo headless, input no confiable en eventos de GitHub, `pull_request_target`, permisos del token, `--allowedTools`, separar análisis y acción, y Azure DevOps. |
| 11 | 🏗️ [Seguridad en aplicaciones con la API de Claude — De cero a experto](Lecturas/Seccion%2011/Seguridad%20en%20aplicaciones%20con%20la%20API%20de%20Claude%20-%20De%20cero%20a%20experto.md) | API key, salida como input no confiable, tool use con autorización por sesión, confirmación de acciones, envenenamiento de RAG, aislamiento multi-tenant y control de costes. |

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

## 2. Introducción a Claude

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

## 3. Landing page con React + Vite e iteración visual

Construcción de una landing de conversión completa a partir de un único prompt detallado, dejando el código preparado para ajustar el diseño con el navegador abierto al lado.

### Temas abordados

- **Prompts de briefing completo**: contexto del negocio, público objetivo, propuesta de valor, tono de marca, estructura obligatoria y criterios de diseño en un solo prompt.
- **Pedir análisis y plan antes de implementar**: que Claude diga qué archivos va a crear y proponga un plan breve antes de escribir código.
- **Frontend con React + Vite**: componentes reutilizables (`Button`, `SectionHeader`, `Reveal`, `Icon`) y una carpeta por sección.
- **Estilos fáciles de iterar**: design tokens en `tokens.css` (colores, tipografía, espaciados) y CSS Modules por sección.
- **Contenido separado del diseño**: todo el copy, métricas, testimonios y FAQ en `src/data/content.js`.
- **Iteración visual en caliente**: ajustar layout, responsive y jerarquía visual con el HMR de Vite.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`proyecto_final_prompt.txt`](Tema_2/proyecto_final_prompt.txt) | Prompt completo de la landing de **Automatiza360**: negocio, público, estructura de 14 secciones, copy e instrucciones de implementación. |
| [`Proyecto_1/`](Tema_2/Proyecto_1/) | **Automatiza360**: landing en React 18 + Vite 5 con hero, métricas, problemas, beneficios, cómo funciona, casos de uso, testimonios, FAQ y CTA final. Su `README.md` incluye una guía de dónde cambiar cada cosa. |

#### Ejecutar Automatiza360

```bash
cd Tema_2/Proyecto_1
npm install
npm run dev          # http://localhost:5173
```

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

## 5. Memoria persistente con Claude Code

Cómo darle a Claude contexto duradero sobre un proyecto para que no haya que repetirlo en cada sesión. Se aplica sobre **Snap** (`Tema_3/Proyecto_1`), y la teoría está en [`Lecturas/Seccion 5/`](Lecturas/Seccion%205/).

### Temas abordados

- **`CLAUDE.md` de proyecto**: comandos exactos de build y test, convenciones y decisiones que Claude no podría deducir del código. Solo lo que causaría errores si faltara.
- **`CLAUDE.md` anidados por carpeta**: instrucciones específicas de un módulo (`src/auth/CLAUDE.md`) que se cargan al trabajar en él.
- **Reglas modulares** en `.claude/rules/` con patrones glob para cargarlas solo cuando hacen falta.
- **Auto memory**: lo que Claude guarda por sí mismo entre sesiones y cómo revisarlo o corregirlo.
- **Refactor guiado por la memoria**: el módulo de autenticación de Snap se reorganizó en `auth.routes`, `auth.service`, `auth.repository`, `auth.middleware` y `auth.types` siguiendo las convenciones del `CLAUDE.md`.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`Tema_3/Proyecto_1/CLAUDE.md`](Tema_3/Proyecto_1/CLAUDE.md) | Memoria del proyecto Snap: stack, comandos, estructura y convenciones. |
| [`Tema_3/Proyecto_1/src/auth/CLAUDE.md`](Tema_3/Proyecto_1/src/auth/CLAUDE.md) | Reglas específicas del módulo de autenticación. |
| [`Lecturas/Seccion 5/`](Lecturas/Seccion%205/) | Lecturas de auto memory, reglas modulares y patrones glob (ver [📘 Lecturas](#-lecturas)). |

---

## 6. Modos de operación, permisos y seguridad

Cómo controlar cuánta autonomía tiene Claude y qué puede tocar. Se practica sobre **PixelForge**, un pipeline de procesamiento de imágenes en Python protegido con reglas de permisos y un hook.

### Temas abordados

- **Modos de permisos**: `default`, `acceptEdits`, `plan` (solo lectura para planificar) y `bypassPermissions`, y cuándo conviene cada uno.
- **Reglas granulares** en `.claude/settings.json`: `allow` para comandos seguros (`uv run pytest`, `git status`…) y `deny` para los peligrosos (`rm -rf`, `sudo`, `git push --force`, `curl | sh`, leer `.env`).
- **Hooks `PreToolUse`**: un script que inspecciona cada comando Bash/PowerShell y bloquea (exit 2) cualquier intento de copiar, mover, borrar o sobrescribir las imágenes originales de `input/`.
- **Sandboxing**: aislamiento del sistema de archivos y la red a nivel de sistema operativo.
- **Planificar antes de ejecutar**: el prompt pide estructura, dependencias y plan con la restricción "No ejecutes nada".

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`prompt_construir_pixelForge.txt`](Tema_5/prompt_construir_pixelForge.txt) | Prompt de planificación de PixelForge. |
| [`Proyecto_1/`](Tema_5/Proyecto_1/) | **PixelForge**: lee JPG/PNG de `input/`, genera thumbnails 300x300 con viñeta y watermark `© PixelForge` usando Pillow, y produce una galería HTML/CSS responsive. Tests con pytest. |
| [`Proyecto_1/.claude/settings.json`](Tema_5/Proyecto_1/.claude/settings.json) | Reglas `allow` / `deny` y registro del hook. |
| [`Proyecto_1/scripts/protect-originals.sh`](Tema_5/Proyecto_1/scripts/protect-originals.sh) | Hook que protege las imágenes originales. |
| [`Lecturas/Seccion 6/`](Lecturas/Seccion%206/) | Lecturas de modos, permisos, hooks, sandboxing y MCP (ver [📘 Lecturas](#-lecturas)). |

#### Ejecutar PixelForge

```bash
cd Tema_5/Proyecto_1
python -m venv .venv
.venv\Scripts\activate          # Windows  ·  source .venv/bin/activate en Linux/macOS
pip install -r requirements.txt -r requirements-dev.txt
python main.py                  # procesa input/ y genera output/index.html
pytest
```

---

## 7. Servidores MCP: GitHub, SQLite y Playwright

Conectar Claude Code con herramientas externas mediante el **Model Context Protocol** y combinarlas en un flujo de desarrollo completo.

### Temas abordados

- **Instalación y scopes de MCP**: `claude mcp add`, servidores `stdio` y `http`, y configuración compartida en `.mcp.json`.
- **GitHub MCP**: flujo completo de descubrimiento (listar issues), triaje (crear un issue con labels y criterios de aceptación), implementación (branch y `search_code`) y entrega (PR con `Fixes #XX`). Resultado: el fix de validación de email de Snap ([PR #2](https://github.com/yrrodriguezb/claude-curso-udemy/pull/2)).
- **SQLite MCP**: crear la tabla `waitlist`, insertar datos y verificar con `SELECT` sin escribir scripts.
- **Playwright MCP**: pruebas E2E del flujo completo (landing → registro → login → dashboard) controlando el navegador, con captura como evidencia.
- **Combinar varios MCP** para cerrar el ciclo: Playwright interactúa con el frontend → Express procesa → SQLite guarda → se verifica en la BD con el MCP.
- **Seguridad en MCP**: ver la lectura [IMPORTANTE — Seguridad en servidores MCP](Lecturas/Seccion%206/IMPORTANTE%20-%20Seguridad%20en%20servidores%20MCP.md) y su checklist.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`prompt_mcp_github.txt`](Tema_6/prompt_mcp_github.txt) | Cuatro prompts del flujo de desarrollo con GitHub MCP: descubrimiento, triaje, implementación y entrega. |
| [`prompts_kohi.txt`](Tema_6/prompts_kohi.txt) | Ocho prompts para construir y probar Kōhi combinando los MCP de GitHub, SQLite y Playwright. |
| [`Proyecto_1/`](Tema_6/Proyecto_1/) | **Kōhi**: web de una cafetería de especialidad con lista de espera. API en Express 5 + better-sqlite3 + bcrypt + JWT (`/api/register`, `/api/login`, `/api/me`) y páginas en HTML/CSS vanilla (landing, registro, login y panel con posición en la cola y QR ficticio). |

#### Ejecutar Kōhi

```bash
cd Tema_6/Proyecto_1
npm install
npm start            # http://localhost:3000  (define JWT_SECRET fuera de desarrollo)
```

---

## 8. Hooks y automatización basada en eventos

Automatizar reglas que deben cumplirse **siempre** mediante hooks del ciclo de vida de Claude Code. Se practica sobre **PayFlow**, una API de pagos en FastAPI protegida y auditada con hooks de los cuatro tipos.

### Temas abordados

- **Eventos del ciclo de vida**: `PreToolUse`, `PostToolUse` y `Stop`, y qué filtra el `matcher` en cada uno.
- **Hooks `command`**: auditoría asíncrona (`async: true`) de cada comando en `.claude/logs/audit.jsonl` y un *security gate* en Python que bloquea comandos peligrosos y acceso a archivos sensibles (fail-closed).
- **Hooks `prompt`**: un LLM revisa cada edición (type hints, docstrings, SQL parametrizado, secretos hardcodeados).
- **Hooks `agent`**: verificador de calidad en `Stop` que inspecciona el proyecto con Glob/Grep antes de dejar terminar.
- **Hooks `http`**: notificar a un webhook al completar la tarea, con `allowedEnvVars` para el secreto.
- **Compatibilidad multiplataforma**: hooks para Bash y PowerShell en Windows.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`prompt_proyecto_tema.txt`](Tema_7/prompt_proyecto_tema.txt) | Prompt completo para construir PayFlow (estructura, endpoints, frontend, tests y restricciones). |
| [`Proyecto_1/payflow-api/`](Tema_7/Proyecto_1/payflow-api/) | **PayFlow**: API REST de pagos en FastAPI + aiosqlite + Pydantic v2 (merchants, pagos con `X-API-Key`, transiciones de estado) con dashboard HTML vanilla en `/dashboard` y tests con pytest + httpx. |
| [`.claude/settings.json`](Tema_7/Proyecto_1/payflow-api/.claude/settings.json) | Registro de los hooks `command`, `prompt`, `agent` y `http`. |
| [`.claude/hooks/security_gate.py`](Tema_7/Proyecto_1/payflow-api/.claude/hooks/security_gate.py) | Hook `PreToolUse` que bloquea borrados destructivos, git destructivo, elevación de privilegios y archivos sensibles. |
| [`webhook_server.py`](Tema_7/Proyecto_1/payflow-api/webhook_server.py) | Servidor local que recibe el hook `http` de `Stop`. |
| [`Lecturas/Seccion 8/`](Lecturas/Seccion%208/) | Lecturas de eventos, matchers y la guía de cero a experto (ver [📘 Lecturas](#-lecturas)). |

#### Ejecutar PayFlow

```bash
cd Tema_7/Proyecto_1/payflow-api
python -m venv .venv
.venv\Scripts\activate          # Windows  ·  source .venv/bin/activate en Linux/macOS
pip install -e ".[dev]"
python -m pytest tests/ -v
python -m uvicorn app.main:app --reload   # http://localhost:8000/dashboard
```

---

## 9. Subagentes

Delegar trabajo en agentes especializados con su propio contexto, herramientas y modelo. Se practica sobre **HealthTrack**, una API de seguimiento de salud con roles admin/doctor/paciente.

### Temas abordados

- **Exploración en paralelo**: tres subagentes investigan a la vez autenticación, modelo de datos y estado de los tests, y el hilo principal consolida los resultados.
- **Subagentes de proyecto** en `.claude/agents/`: frontmatter (`name`, `description`, `tools`, `model`, `memory`, `color`) y system prompt.
- **Mínimo privilegio**: agentes de solo lectura frente a agentes con escritura, y modelo `haiku` o `sonnet` según la tarea.
- **Memoria persistente** (`memory: project`): el `security-reviewer` guarda hallazgos, falsos positivos y patrones del repo en `.claude/agent-memory/`.

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`prompt_exploracion_subagentes.txt`](Tema_8/Proyecto_1/prompt_exploracion_subagentes.txt) | Prompt para lanzar tres investigaciones en paralelo con subagentes. |
| [`prompt_subagente_security_reviewer.txt`](Tema_8/Proyecto_1/prompt_subagente_security_reviewer.txt) | Prompt para crear el agente `security-reviewer` (JWT/RBAC, PII, SQL injection, OWASP). |
| [`Proyecto_1/healthtrack-api/`](Tema_8/Proyecto_1/healthtrack-api/) | **HealthTrack**: API en Express + TypeScript + better-sqlite3 con JWT + bcrypt (pacientes, citas, métricas de salud y notificaciones), dashboard con Tailwind + Chart.js y tests con Vitest. |
| [`.claude/agents/`](Tema_8/Proyecto_1/healthtrack-api/.claude/agents/) | Subagentes `security-reviewer`, `test-engineer`, `api-documenter` y `db-analyst`. |
| [`.claude/agent-memory/security-reviewer/`](Tema_8/Proyecto_1/healthtrack-api/.claude/agent-memory/security-reviewer/) | Memoria persistente del revisor de seguridad. |
| [`Lecturas/Seccion 9/`](Lecturas/Seccion%209/) | Guía de subagentes de cero a experto (ver [📘 Lecturas](#-lecturas)). |

#### Ejecutar HealthTrack

```bash
cd Tema_8/Proyecto_1/healthtrack-api
npm install
npm run db:seed
npm run dev          # http://localhost:3000
npm test
```

---

## 10. Skills y plugins

Empaquetar conocimiento reutilizable en **skills** que Claude carga cuando las necesita (o que se invocan con `/`), y agrupar skills, subagentes, hooks y servidores MCP en **plugins** distribuibles. Se practica sobre **Artemis II Mission Tracker**, un simulador 3D de la misión Artemis II.

### Temas abordados

- **Skills vs subagentes vs memoria vs hooks**: cuándo usar cada pieza.
- **Skills de proyecto** en `.claude/skills/<nombre>/SKILL.md`: frontmatter y cuerpo con instrucciones.
- **Invocación manual** con `disable-model-invocation: true` y `argument-hint` (`/add-event`, `/capture-view`).
- **Permisos acotados** con `allowed-tools` (por ejemplo `Bash(npm test *)`).
- **Activación condicional por ruta** con `paths`: `scene-conventions` solo se carga al editar la escena 3D.
- **Plugins**: manifiesto en `.claude-plugin/plugin.json`, namespacing, marketplaces y `enabledPlugins` en `.claude/settings.json` (el proyecto habilita `code-review@anthropic-plugin-directory`).

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`prompt_simulador_Artemis.txt`](Tema_9/Proyecto_1/prompt_simulador_Artemis.txt) | Prompt completo del simulador: stack, escena 3D, HUD, timeline, panel de eventos, cámaras, tripulación y datos reales de la misión. |
| [`Proyecto_1/simulador_artemis/`](Tema_9/Proyecto_1/simulador_artemis/) | **Artemis II Mission Tracker**: API en Express + TypeScript (trayectoria, eventos, telemetría y tripulación), escena 3D con Three.js, gráficos con Chart.js y tests con Vitest. |
| [`.claude/skills/`](Tema_9/Proyecto_1/simulador_artemis/.claude/skills/) | Skills `add-event` (añadir eventos a la timeline), `capture-view` (generar una vista de cámara en un momento de la misión) y `scene-conventions` (convenciones de la escena Three.js). |
| [`.claude/settings.json`](Tema_9/Proyecto_1/simulador_artemis/.claude/settings.json) | Habilita el plugin `code-review` para el proyecto. |
| [`Lecturas/Seccion 10/`](Lecturas/Seccion%2010/) | Lecturas de skills, plugins y la comparación entre piezas (ver [📘 Lecturas](#-lecturas)). |

#### Ejecutar Artemis II Mission Tracker

```bash
cd Tema_9/Proyecto_1/simulador_artemis
npm install
npm run dev          # http://localhost:3000
npm test
```

---

## 11. Seguridad en el desarrollo con IA

Por qué el código generado por IA suele funcionar pero no ser seguro, y cómo proteger cada pieza de Claude Code (prompts, MCP, skills, plugins, hooks, subagentes, permisos y secretos) frente a prompt injection, cadena de suministro y fuga de datos. La teoría está en [`Lecturas/Seccion 11/`](Lecturas/Seccion%2011/).

### Temas abordados

- **Patrones peligrosos del código generado por IA**: la IA optimiza el *happy path* y omite auth, autorización, validación, manejo de errores, CORS y gestión de secretos.
- **Prompt injection directa e indirecta**: por qué no tiene solución definitiva y cómo limitar su impacto con defensa en capas.
- **Seguridad en MCP**: tool poisoning, rug pull, tool shadowing, confused deputy y la trifecta letal.
- **Skills, plugins y subagentes**: revisar lo que se instala, mínimo privilegio en `allowed-tools` / `tools` y aislamiento de contenido no confiable.
- **Hooks como garantía**: bloquear comandos, archivos sensibles y secretos de forma determinista.
- **Permisos, sandbox y secretos**: `deny` siempre gana, sandbox a nivel de SO, managed settings y uso seguro en CI/CD.
- **Dependencias y privacidad**: paquetes alucinados por la IA (slopsquatting), lockfiles y SBOM; minimización, anonimización y cumplimiento (Ley 1581, GDPR).
- **Memoria y navegador**: envenenamiento persistente de `CLAUDE.md` y auto memory; agentes con navegador en perfiles aislados.
- **Revisión y OWASP**: `/security-review`, STRIDE, SAST, y OWASP Top 10 web/API aplicado a Express y ASP.NET Core.
- **CI/CD y aplicaciones propias**: Claude en pipelines sin exponer secretos, y seguridad al construir sobre la API de Claude (tool use, RAG, multi-tenant, costes).

### Contenido

| Archivo / carpeta | Descripción |
|---|---|
| [`Lecturas/Seccion 11/`](Lecturas/Seccion%2011/) | Quince lecturas de ciberseguridad aplicada a Claude Code (ver [📘 Lecturas](#-lecturas)). |

---

## 🛠️ Requisitos generales

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
- Python 3.12 o superior (`Tema_1`, `Tema_5`, `Tema_7`)
- Node.js 22 o superior (`Tema_2`, `Tema_3`, `Tema_6`, `Tema_8`, `Tema_9`)
- Git
- Para la sección 7: token de GitHub para el MCP de GitHub y `mcp-server-sqlite` (Python) para el MCP de SQLite

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
├── Lecturas/                        # Material teórico por sección
│   ├── Escribir instrucciones efectivas en CLAUDE.md
│   ├── Seccion 5/                   # Memoria: auto memory, reglas modulares, glob
│   ├── Seccion 6/                   # Permisos, hooks, sandboxing y MCP (+ checklist de seguridad)
│   ├── Seccion 8/                   # Hooks: eventos, matchers y guía de cero a experto
│   ├── Seccion 9/                   # Subagentes: de cero a experto
│   ├── Seccion 10/                  # Skills, plugins y comparación entre piezas
│   └── Seccion 11/                  # Ciberseguridad: código IA, prompts, MCP, skills, hooks, subagentes, permisos, dependencias, privacidad, memoria, navegador, OWASP, CI/CD, API
├── Tema_1/                          # Sección 2 · Introducción a Claude
│   ├── proyecto_1_prompt.txt
│   ├── proyecto_final_prompts.txt
│   ├── Proyecto_1/                  # Calculadora con Streamlit
│   └── Proyecto_2/                  # To-Do API (FastAPI + SQLite + Streamlit)
├── Tema_2/                          # Sección 3 · Landing con React + Vite
│   ├── proyecto_final_prompt.txt
│   └── Proyecto_1/                  # Automatiza360
├── Tema_3/                          # Secciones 4 y 5 · Prompting profesional y memoria
│   ├── Patrones de prompt para claude code.md.txt
│   ├── prompts_dividir_tareas_complejas_pasos_verificables.txt
│   ├── prompts_encadenamiento_y_restriccion_progresiva.txt
│   ├── prompt_interfaz_grafica_snap.txt
│   └── Proyecto_1/                  # Snap: acortador de URLs
│       ├── CLAUDE.md                # Memoria del proyecto
│       ├── src/                     # API (Express + TypeScript + SQLite)
│       └── web/                     # Interfaz web (React + Vite)
├── Tema_5/                          # Sección 6 · Permisos y seguridad
│   ├── prompt_construir_pixelForge.txt
│   └── Proyecto_1/                  # PixelForge (Python + Pillow)
│       ├── .claude/settings.json    # Reglas allow/deny + hook
│       └── scripts/protect-originals.sh
├── Tema_6/                          # Sección 7 · Servidores MCP
│   ├── prompt_mcp_github.txt
│   ├── prompts_kohi.txt
│   └── Proyecto_1/                  # Kōhi (Express + SQLite + HTML vanilla)
├── Tema_7/                          # Sección 8 · Hooks
│   ├── prompt_proyecto_tema.txt
│   └── Proyecto_1/payflow-api/      # PayFlow (FastAPI + aiosqlite)
│       ├── .claude/settings.json    # Hooks command, prompt, agent y http
│       └── .claude/hooks/security_gate.py
├── Tema_8/                          # Sección 9 · Subagentes
│   └── Proyecto_1/
│       ├── prompt_exploracion_subagentes.txt
│       ├── prompt_subagente_security_reviewer.txt
│       └── healthtrack-api/         # HealthTrack (Express + TypeScript + SQLite)
│           ├── .claude/agents/      # security-reviewer, test-engineer, api-documenter, db-analyst
│           └── .claude/agent-memory/
└── Tema_9/                          # Sección 10 · Skills y plugins
    └── Proyecto_1/
        ├── prompt_simulador_Artemis.txt
        └── simulador_artemis/       # Artemis II Mission Tracker (Express + TypeScript + Three.js)
            ├── .claude/skills/      # add-event, capture-view, scene-conventions
            └── .claude/settings.json # enabledPlugins: code-review
```
