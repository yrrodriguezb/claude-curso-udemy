# To-Do API

API REST para gestionar una lista de tareas (to-do list), construida con **FastAPI** y **SQLite** (usando el módulo estándar `sqlite3`, sin ORM). Incluye un panel de control visual hecho con **Streamlit** (`app_ui.py`).

## Tecnologías

| Componente      | Herramienta                          |
|-----------------|--------------------------------------|
| Lenguaje        | Python 3.12+ (probado con 3.14)      |
| Framework web   | FastAPI                              |
| Servidor ASGI   | uvicorn                              |
| Base de datos   | SQLite (`sqlite3` de la librería estándar) |
| Validación      | Pydantic v2                          |
| Tests           | pytest + httpx (`TestClient` de FastAPI) |
| Interfaz web    | Streamlit + requests                 |

## Estructura del proyecto

```
Proyecto_2/
├── src/
│   ├── __init__.py
│   ├── main.py          # App FastAPI, manejo de errores y endpoints
│   ├── database.py      # Conexión a SQLite y creación de tablas
│   ├── todos_service.py # Servicio de tareas y repositorio SQLite
│   └── models.py        # Modelos Pydantic (entrada y salida)
├── tests/
│   ├── __init__.py
│   ├── test_todos.py    # Tests de todos los endpoints
│   └── test_app_ui.py   # Tests de la interfaz Streamlit
├── app_ui.py            # Panel de control Streamlit (cliente de la API)
├── .venv/               # Entorno virtual (no se versiona)
├── .gitignore
├── pytest.ini           # Configuración de pytest
├── requirements.txt     # Dependencias del proyecto
├── todos.db             # Base de datos SQLite (se crea al arrancar)
└── README.md
```

### Descripción de cada módulo

- **`src/main.py`**
  - Crea la aplicación FastAPI y, al arrancar (`lifespan`), inicializa la base de datos.
  - Define los manejadores de errores centralizados: todas las `HTTPException` y los errores de `sqlite3` se devuelven con el mismo formato JSON.
  - Contiene los 5 endpoints de la API, que delegan las operaciones de tareas al servicio.
- **`src/database.py`**
  - `get_connection()`: abre una conexión SQLite que devuelve las filas como diccionarios (`sqlite3.Row`).
  - `init_db()`: crea la tabla `todos` si no existe.
  - `get_db()`: dependencia de FastAPI que abre una conexión por petición y la cierra al terminar.
- **`src/todos_service.py`**
  - `TodosRepository`: encapsula las consultas SQL para listar, consultar, crear, actualizar y eliminar tareas.
  - `TodosService`: coordina las operaciones y las reglas de negocio, usando el repositorio para acceder a los datos.
- **`src/models.py`**
  - `TodoStatus`: estados posibles de una tarea (`pending`, `done`).
  - `TodoCreate`: cuerpo para crear una tarea.
  - `TodoUpdate`: cuerpo para actualizar una tarea (todos los campos opcionales).
  - `Todo`: modelo de respuesta.
- **`app_ui.py`**: interfaz Streamlit que consume la API vía `requests` (no accede a la base de datos directamente). Ver [Interfaz web (Streamlit)](#interfaz-web-streamlit).
- **`tests/test_todos.py`**: tests de integración. Cada test usa una base de datos temporal propia, así que no tocan `todos.db`.
- **`tests/test_app_ui.py`**: tests de la interfaz Streamlit con `AppTest`.

## Modelo de datos

Tabla `todos`:

| Columna       | Tipo    | Descripción                                   |
|---------------|---------|-----------------------------------------------|
| `id`          | INTEGER | Clave primaria autoincremental                |
| `title`       | TEXT    | Título (obligatorio, 1–200 caracteres)        |
| `description` | TEXT    | Descripción opcional (máx. 2000 caracteres)   |
| `status`      | TEXT    | `pending` (por defecto) o `done`              |
| `created_at`  | TEXT    | Fecha de creación (UTC)                       |
| `updated_at`  | TEXT    | Fecha de última modificación (UTC)            |

## Instalación

Requisitos previos: Python 3.12 o superior.

```powershell
# 1. Crear el entorno virtual
py -3.12 -m venv .venv          # o la versión de Python disponible, p. ej. py -3.14

# 2. Activarlo
.\.venv\Scripts\Activate.ps1    # Windows PowerShell
# source .venv/bin/activate     # Linux / macOS

# 3. Instalar dependencias
pip install -r requirements.txt
```

## Ejecución

Con el entorno virtual activado:

```powershell
uvicorn src.main:app --reload
```

- API: <http://127.0.0.1:8000/api/todos>
- Documentación interactiva (Swagger): <http://127.0.0.1:8000/docs>
- Documentación alternativa (ReDoc): <http://127.0.0.1:8000/redoc>

### Variables de entorno

| Variable        | Por defecto | Descripción                          |
|-----------------|-------------|--------------------------------------|
| `TODOS_DB_PATH` | `todos.db`  | Ruta del archivo de base de datos SQLite |

## Interfaz web (Streamlit)

`app_ui.py` es un panel de control visual para la API. Se comunica con ella por HTTP, así que **la API tiene que estar arrancada antes**.

### Arranque

Abre dos terminales con el entorno virtual activado:

```powershell
# Terminal 1: la API
uvicorn src.main:app --port 8000

# Terminal 2: la interfaz
streamlit run app_ui.py --server.port 8501
```

Después abre <http://localhost:8501> en el navegador.

> En Linux / macOS puedes arrancar la API en segundo plano en la misma terminal con `uvicorn src.main:app --port 8000 &`.

### Funcionalidades

- **Contadores** de tareas: total, pendientes y completadas.
- **Formulario** para crear una tarea (título obligatorio, descripción opcional).
- **Tabla de tareas** con colores por estado:
  - 🟢 verde para `done` (con el título tachado)
  - 🟠 naranja para `pending`
- **Filtro** para ver todas, solo pendientes o solo completadas.
- Botón **✔ Completar** en cada tarea (se desactiva si ya está completada).
- Botón **🗑 Eliminar** en cada tarea.

Si la API no está disponible o devuelve un error, el panel muestra el mensaje en pantalla en lugar de fallar.

### Variables de entorno de la UI

| Variable       | Por defecto             | Descripción                         |
|----------------|-------------------------|-------------------------------------|
| `TODO_API_URL` | `http://localhost:8000` | URL base de la API que usa el panel |

```powershell
$env:TODO_API_URL = "http://127.0.0.1:9000"   # ejemplo en PowerShell
streamlit run app_ui.py --server.port 8501
```

## Endpoints

| Método   | Ruta               | Descripción                                   | Respuesta OK |
|----------|--------------------|-----------------------------------------------|--------------|
| `GET`    | `/api/todos`       | Lista todas las tareas. Filtro opcional `?status=pending\|done` | 200 |
| `GET`    | `/api/todos/{id}`  | Detalle de una tarea                          | 200 |
| `POST`   | `/api/todos`       | Crea una tarea                                | 201 |
| `PATCH`  | `/api/todos/{id}`  | Actualiza título, descripción o status        | 200 |
| `DELETE` | `/api/todos/{id}`  | Elimina una tarea                             | 204 |

### Ejemplos con `curl`

```bash
# Crear una tarea
curl -X POST http://127.0.0.1:8000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Comprar leche", "description": "Deslactosada"}'

# Listar todas / filtrar por estado
curl http://127.0.0.1:8000/api/todos
curl "http://127.0.0.1:8000/api/todos?status=pending"

# Ver detalle
curl http://127.0.0.1:8000/api/todos/1

# Marcar como completada
curl -X PATCH http://127.0.0.1:8000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Eliminar
curl -X DELETE http://127.0.0.1:8000/api/todos/1
```

Ejemplo de respuesta:

```json
{
  "id": 1,
  "title": "Comprar leche",
  "description": "Deslactosada",
  "status": "pending",
  "created_at": "2026-11-09 15:30:00",
  "updated_at": "2026-11-09 15:30:00"
}
```

### Reglas de `PATCH`

- Solo se modifican los campos enviados; el resto se conserva.
- `"description": null` borra la descripción.
- Un cuerpo vacío (`{}`) devuelve **400**.
- `"title": null` o `"status": null` devuelven **422**.

## Manejo de errores

Todos los errores de la aplicación tienen el mismo formato:

```json
{
  "error": {
    "status_code": 404,
    "detail": "Tarea con id 99 no encontrada"
  }
}
```

| Código | Cuándo ocurre                                                   |
|--------|-----------------------------------------------------------------|
| 400    | `PATCH` sin ningún campo a actualizar                           |
| 404    | La tarea con ese `id` no existe                                 |
| 422    | Datos inválidos (título vacío, status desconocido, campos extra…) |
| 500    | Error interno de base de datos                                  |

> Los errores 422 que genera la validación automática de Pydantic usan el formato estándar de FastAPI (`{"detail": [...]}`).

## Tests

Con el entorno virtual activado:

```powershell
pytest -v
```

Los tests cubren los 5 endpoints, tanto los casos de éxito como los de error (400, 404 y 422). Cada test crea una base de datos SQLite temporal, por lo que se pueden ejecutar sin afectar a `todos.db`.

Los tests de la interfaz (`tests/test_app_ui.py`) ejecutan `app_ui.py` con `streamlit.testing.v1.AppTest` y redirigen las llamadas de `requests` a la API real a través de `TestClient`, así que **no hace falta arrancar ni la API ni Streamlit**. Cubren los contadores, los colores por estado, el filtro, la creación de tareas (incluida la validación del título), los botones de completar y eliminar, los errores que devuelve la API y el caso en que la API no está disponible.

```powershell
pytest tests/test_app_ui.py -v   # solo los tests de la UI
```
