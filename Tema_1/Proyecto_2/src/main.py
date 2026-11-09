"""App FastAPI y endpoints de la API de tareas."""

import sqlite3
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse

from src.database import get_db, init_db
from src.models import Todo, TodoCreate, TodoStatus, TodoUpdate
from src.todos_service import TodoServiceError, TodosRepository, TodosService


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="To-Do API", version="1.0.0", lifespan=lifespan)


def get_todos_service(db: sqlite3.Connection = Depends(get_db)) -> TodosService:
    """Construye el servicio con el repositorio de la conexión de esta petición."""
    return TodosService(TodosRepository(db))


# --- Manejo centralizado de errores -------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"status_code": exc.status_code, "detail": exc.detail}},
    )


@app.exception_handler(sqlite3.Error)
async def sqlite_exception_handler(_: Request, exc: sqlite3.Error) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"status_code": 500, "detail": "Error de base de datos"}},
    )


@app.exception_handler(TodoServiceError)
async def todo_service_exception_handler(
    _: Request, exc: TodoServiceError
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"status_code": exc.status_code, "detail": exc.detail}},
    )


# --- Endpoints ------------------------------------------------------------------

@app.get("/api/todos", response_model=list[Todo])
def list_todos(
    # alias "status" para el query param, sin chocar con el módulo fastapi.status
    status_filter: TodoStatus | None = Query(default=None, alias="status"),
    service: TodosService = Depends(get_todos_service),
):
    return service.list_todos(status_filter)


@app.get("/api/todos/{todo_id}", response_model=Todo)
def get_todo(todo_id: int, service: TodosService = Depends(get_todos_service)):
    return service.get_todo(todo_id)


@app.post("/api/todos", response_model=Todo, status_code=status.HTTP_201_CREATED)
def create_todo(
    payload: TodoCreate, service: TodosService = Depends(get_todos_service)
):
    return service.create_todo(payload)


@app.patch("/api/todos/{todo_id}", response_model=Todo)
def update_todo(
    todo_id: int,
    payload: TodoUpdate,
    service: TodosService = Depends(get_todos_service),
):
    return service.update_todo(todo_id, payload)


@app.delete("/api/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, service: TodosService = Depends(get_todos_service)):
    service.delete_todo(todo_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
