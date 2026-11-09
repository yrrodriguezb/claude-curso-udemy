"""Tests de la interfaz Streamlit (app_ui.py).

La UI se ejecuta con `streamlit.testing.v1.AppTest`. Las llamadas que hace con
`requests` se redirigen a la API FastAPI real mediante `TestClient`, usando una
base de datos SQLite temporal, así que no hace falta arrancar ningún servidor.
"""

from pathlib import Path

import pytest
import requests
from fastapi.testclient import TestClient
from streamlit.testing.v1 import AppTest

from src import database
from src.main import app

APP_FILE = str(Path(__file__).resolve().parent.parent / "app_ui.py")
SUBMIT_KEY = "FormSubmitter:new_todo-Crear tarea"


@pytest.fixture
def api(tmp_path, monkeypatch):
    """API real en memoria; `requests.request` pasa por el TestClient."""
    monkeypatch.setattr(database, "DB_PATH", str(tmp_path / "test.db"))
    with TestClient(app) as client:

        def fake_request(method, url, timeout=None, **kwargs):
            r = client.request(method, url, **kwargs)
            resp = requests.Response()
            resp.status_code = r.status_code
            resp._content = r.content
            resp.headers.update(r.headers)
            resp.url = url
            return resp

        monkeypatch.setattr(requests, "request", fake_request)
        yield client


def _run_ui() -> AppTest:
    at = AppTest.from_file(APP_FILE, default_timeout=15).run()
    assert not at.exception
    return at


def _metrics(at: AppTest) -> list[int]:
    """Valores de los contadores: [total, pendientes, completadas]."""
    return [int(m.value) for m in at.metric]


def _create(api, title, description=None, status=None) -> dict:
    todo = api.post("/api/todos", json={"title": title, "description": description}).json()
    if status:
        todo = api.patch(f"/api/todos/{todo['id']}", json={"status": status}).json()
    return todo


def _markdown(at: AppTest) -> str:
    return "\n".join(m.value for m in at.markdown)


# --- Listado y contadores ----------------------------------------------------------

def test_empty_list(api):
    at = _run_ui()
    assert _metrics(at) == [0, 0, 0]
    assert any("No hay tareas" in i.value for i in at.info)


def test_counters(api):
    _create(api, "A")
    _create(api, "B")
    _create(api, "C", status="done")
    at = _run_ui()
    assert _metrics(at) == [3, 2, 1]


def test_tasks_shown_with_status_colors(api):
    _create(api, "Pendiente", "desc pendiente")
    _create(api, "Hecha", status="done")
    md = _markdown(at := _run_ui())
    assert "desc pendiente" in md
    assert "#e8710a" in md and "Pendiente" in md  # naranja para pending
    assert "#1e8e3e" in md and "<s>Hecha</s>" in md  # verde y tachado para done
    assert at.button(key="done_2").disabled
    assert not at.button(key="done_1").disabled


def test_title_html_is_escaped(api):
    _create(api, "<b>negrita</b>")
    md = _markdown(_run_ui())
    assert "&lt;b&gt;negrita&lt;/b&gt;" in md
    assert "<b>negrita</b>" not in md


def test_filter(api):
    _create(api, "Pendiente")
    _create(api, "Hecha", status="done")
    at = _run_ui()

    at.radio[0].set_value("Pendientes").run()
    keys = {b.key for b in at.button}
    assert "done_1" in keys and "done_2" not in keys

    at.radio[0].set_value("Completadas").run()
    keys = {b.key for b in at.button}
    assert "done_2" in keys and "done_1" not in keys


# --- Crear tarea -----------------------------------------------------------------------

def test_create_task(api):
    at = _run_ui()
    at.text_input[0].input("  Nueva tarea  ")
    at.text_area[0].input("Con descripción")
    at.button(key=SUBMIT_KEY).click().run()

    assert not at.exception
    assert _metrics(at) == [1, 1, 0]
    [todo] = api.get("/api/todos").json()
    assert todo["title"] == "Nueva tarea"  # se recortan los espacios
    assert todo["description"] == "Con descripción"


def test_create_task_without_description_sends_null(api):
    at = _run_ui()
    at.text_input[0].input("Sin descripción")
    at.button(key=SUBMIT_KEY).click().run()
    [todo] = api.get("/api/todos").json()
    assert todo["description"] is None


def test_create_task_requires_title(api):
    at = _run_ui()
    at.text_input[0].input("   ")
    at.button(key=SUBMIT_KEY).click().run()

    assert any("obligatorio" in w.value for w in at.warning)
    assert api.get("/api/todos").json() == []


# --- Completar y eliminar ----------------------------------------------------------------

def test_mark_done(api):
    _create(api, "Tarea")
    at = _run_ui()
    at.button(key="done_1").click().run()

    assert not at.exception
    assert api.get("/api/todos/1").json()["status"] == "done"
    assert _metrics(at) == [1, 0, 1]
    assert at.button(key="done_1").disabled


def test_delete(api):
    _create(api, "Se queda")
    _create(api, "Se va")
    at = _run_ui()
    at.button(key="del_2").click().run()

    assert not at.exception
    assert [t["title"] for t in api.get("/api/todos").json()] == ["Se queda"]
    assert _metrics(at) == [1, 1, 0]


def test_api_error_is_shown(api):
    _create(api, "Tarea")
    at = _run_ui()
    api.delete("/api/todos/1")  # otro cliente la borra mientras la UI está abierta
    at.button(key="del_1").click().run()

    assert not at.exception
    assert any("no encontrada" in e.value for e in at.error)


# --- API caída -------------------------------------------------------------------------------

def test_api_unavailable(monkeypatch):
    def fail(*args, **kwargs):
        raise requests.ConnectionError("conexión rechazada")

    monkeypatch.setattr(requests, "request", fail)
    at = _run_ui()

    assert any("No se pudo conectar" in e.value for e in at.error)
    assert any("uvicorn" in i.value for i in at.info)
    assert len(at.metric) == 0  # st.stop() corta el resto de la página
