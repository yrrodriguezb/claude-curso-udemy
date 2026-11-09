import pytest
from fastapi.testclient import TestClient

from src import database
from src.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Cliente con una base de datos SQLite aislada por test."""
    monkeypatch.setattr(database, "DB_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as c:  # dispara el lifespan -> init_db()
        yield c


def _create(client, title="Comprar leche", description=None):
    resp = client.post("/api/todos", json={"title": title, "description": description})
    assert resp.status_code == 201
    return resp.json()


# --- POST /api/todos ------------------------------------------------------------

def test_create_todo(client):
    resp = client.post("/api/todos", json={"title": "Estudiar", "description": "FastAPI"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["id"] > 0
    assert data["title"] == "Estudiar"
    assert data["description"] == "FastAPI"
    assert data["status"] == "pending"


def test_create_todo_without_description(client):
    data = _create(client, title="Solo título")
    assert data["description"] is None


def test_create_todo_invalid_body(client):
    assert client.post("/api/todos", json={"title": ""}).status_code == 422
    assert client.post("/api/todos", json={}).status_code == 422


# --- GET /api/todos -------------------------------------------------------------

def test_list_todos(client):
    _create(client, "A")
    _create(client, "B")
    resp = client.get("/api/todos")
    assert resp.status_code == 200
    assert [t["title"] for t in resp.json()] == ["A", "B"]


def test_list_todos_filter_by_status(client):
    a = _create(client, "A")
    _create(client, "B")
    client.patch(f"/api/todos/{a['id']}", json={"status": "done"})

    done = client.get("/api/todos", params={"status": "done"}).json()
    pending = client.get("/api/todos", params={"status": "pending"}).json()
    assert [t["title"] for t in done] == ["A"]
    assert [t["title"] for t in pending] == ["B"]


def test_list_todos_invalid_status(client):
    assert client.get("/api/todos", params={"status": "foo"}).status_code == 422


# --- GET /api/todos/{id} --------------------------------------------------------

def test_get_todo(client):
    created = _create(client, "Detalle")
    resp = client.get(f"/api/todos/{created['id']}")
    assert resp.status_code == 200
    assert resp.json() == created


def test_get_todo_not_found(client):
    resp = client.get("/api/todos/999")
    assert resp.status_code == 404
    assert resp.json()["error"]["status_code"] == 404


# --- PATCH /api/todos/{id} ------------------------------------------------------

def test_update_todo(client):
    created = _create(client, "Viejo", "desc")
    resp = client.patch(
        f"/api/todos/{created['id']}",
        json={"title": "Nuevo", "status": "done"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Nuevo"
    assert data["status"] == "done"
    assert data["description"] == "desc"  # campo no enviado se conserva


def test_update_todo_clear_description(client):
    created = _create(client, "T", "desc")
    resp = client.patch(f"/api/todos/{created['id']}", json={"description": None})
    assert resp.status_code == 200
    assert resp.json()["description"] is None


def test_update_todo_errors(client):
    created = _create(client)
    assert client.patch("/api/todos/999", json={"title": "x"}).status_code == 404
    assert client.patch("/api/todos/999", json={}).status_code == 404
    assert client.patch(f"/api/todos/{created['id']}", json={}).status_code == 400
    assert client.patch(f"/api/todos/{created['id']}", json={"status": "x"}).status_code == 422
    assert client.patch(f"/api/todos/{created['id']}", json={"title": None}).status_code == 422


# --- DELETE /api/todos/{id} -----------------------------------------------------

def test_delete_todo(client):
    created = _create(client)
    resp = client.delete(f"/api/todos/{created['id']}")
    assert resp.status_code == 204
    assert client.get(f"/api/todos/{created['id']}").status_code == 404


def test_delete_todo_not_found(client):
    assert client.delete("/api/todos/999").status_code == 404
