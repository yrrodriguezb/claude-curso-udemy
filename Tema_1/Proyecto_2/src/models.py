"""Modelos Pydantic para validación de entrada y salida."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TodoStatus(str, Enum):
    pending = "pending"
    done = "done"


class TodoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class TodoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    status: TodoStatus | None = None


class Todo(BaseModel):
    id: int
    title: str
    description: str | None
    status: TodoStatus
    created_at: str
    updated_at: str
