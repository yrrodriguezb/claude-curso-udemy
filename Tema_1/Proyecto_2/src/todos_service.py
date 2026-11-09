"""Servicio y repositorio para las operaciones de tareas."""

import sqlite3
from typing import Any

from src.models import TodoCreate, TodoStatus, TodoUpdate

TodoRecord = dict[str, Any]


class TodoServiceError(Exception):
    """Error de dominio que puede convertirse en una respuesta HTTP."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class TodoNotFoundError(TodoServiceError):
    """La tarea solicitada no existe."""

    def __init__(self, todo_id: int):
        super().__init__(404, f"Tarea con id {todo_id} no encontrada")


class InvalidTodoUpdateError(TodoServiceError):
    """La actualización no contiene datos válidos."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code, detail)


class TodosRepository:
    """Encapsula las consultas SQL para la entidad Todo."""

    _UPDATE_FIELDS = frozenset({"title", "description", "status"})

    def __init__(self, db: sqlite3.Connection):
        self._db = db

    def list(self, status_filter: TodoStatus | None = None) -> list[TodoRecord]:
        if status_filter is None:
            rows = self._db.execute("SELECT * FROM todos ORDER BY id").fetchall()
        else:
            rows = self._db.execute(
                "SELECT * FROM todos WHERE status = ? ORDER BY id",
                (status_filter.value,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_by_id(self, todo_id: int) -> TodoRecord | None:
        row = self._db.execute(
            "SELECT * FROM todos WHERE id = ?", (todo_id,)
        ).fetchone()
        return dict(row) if row is not None else None

    def create(self, payload: TodoCreate) -> TodoRecord:
        with self._db:
            cursor = self._db.execute(
                "INSERT INTO todos (title, description) VALUES (?, ?)",
                (payload.title, payload.description),
            )
        todo = self.get_by_id(cursor.lastrowid)
        if todo is None:
            raise RuntimeError("No se pudo recuperar la tarea recién creada")
        return todo

    def update(self, todo_id: int, changes: dict[str, Any]) -> TodoRecord | None:
        unexpected_fields = changes.keys() - self._UPDATE_FIELDS
        if unexpected_fields:
            raise ValueError(f"Campos de actualización no permitidos: {unexpected_fields}")

        set_clause = ", ".join(f"{field} = ?" for field in changes)
        with self._db:
            self._db.execute(
                f"UPDATE todos SET {set_clause}, updated_at = datetime('now') "
                "WHERE id = ?",
                (*changes.values(), todo_id),
            )
        return self.get_by_id(todo_id)

    def delete(self, todo_id: int) -> bool:
        with self._db:
            cursor = self._db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
        return cursor.rowcount > 0


class TodosService:
    """Aplica las operaciones de negocio de tareas usando un repositorio."""

    def __init__(self, repository: TodosRepository):
        self._repository = repository

    def list_todos(self, status_filter: TodoStatus | None = None) -> list[TodoRecord]:
        return self._repository.list(status_filter)

    def get_todo(self, todo_id: int) -> TodoRecord:
        todo = self._repository.get_by_id(todo_id)
        if todo is None:
            raise TodoNotFoundError(todo_id)
        return todo

    def create_todo(self, payload: TodoCreate) -> TodoRecord:
        return self._repository.create(payload)

    def update_todo(self, todo_id: int, payload: TodoUpdate) -> TodoRecord:
        self.get_todo(todo_id)
        changes = payload.model_dump(exclude_unset=True)
        if not changes:
            raise InvalidTodoUpdateError(
                400, "Debe enviar al menos un campo a actualizar"
            )
        if "title" in changes and changes["title"] is None:
            raise InvalidTodoUpdateError(422, "El título no puede ser nulo")
        if "status" in changes:
            if changes["status"] is None:
                raise InvalidTodoUpdateError(422, "El status no puede ser nulo")
            changes["status"] = changes["status"].value

        todo = self._repository.update(todo_id, changes)
        if todo is None:
            raise TodoNotFoundError(todo_id)
        return todo

    def delete_todo(self, todo_id: int) -> None:
        if not self._repository.delete(todo_id):
            raise TodoNotFoundError(todo_id)
