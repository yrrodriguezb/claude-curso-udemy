"""Panel de control Streamlit para la API de tareas (FastAPI).

Uso:
    uvicorn src.main:app --port 8000
    streamlit run app_ui.py --server.port 8501

La URL de la API se puede cambiar con la variable de entorno TODO_API_URL.
"""

import html
import os

import requests
import streamlit as st

# Configuración del cliente: permite apuntar la interfaz a otra instancia de la API.
API_URL = os.getenv("TODO_API_URL", "http://localhost:8000").rstrip("/") + "/api/todos"
# Límite de espera para evitar que una petición deje la interfaz bloqueada.
TIMEOUT = 5

# Estilos visuales asociados a los estados que devuelve la API.
STATUS_STYLE = {
    "done": {"color": "#1e8e3e", "bg": "rgba(30, 142, 62, 0.12)", "label": "Completada"},
    "pending": {"color": "#e8710a", "bg": "rgba(232, 113, 10, 0.12)", "label": "Pendiente"},
}


# --- Cliente de la API -------------------------------------------------------------

def _error_detail(resp: requests.Response) -> str:
    """Obtiene el detalle de error del JSON de la API o devuelve el código HTTP."""
    try:
        return resp.json()["error"]["detail"]
    except (ValueError, KeyError, TypeError):
        return f"HTTP {resp.status_code}"


def api_call(method: str, path: str = "", **kwargs) -> requests.Response | None:
    """Ejecuta una petición a la API y muestra el error en la UI si falla."""
    try:
        resp = requests.request(method, f"{API_URL}{path}", timeout=TIMEOUT, **kwargs)
    except requests.RequestException as exc:
        st.error(f"No se pudo conectar con la API en {API_URL}: {exc}")
        return None
    if not resp.ok:
        st.error(f"Error de la API: {_error_detail(resp)}")
        return None
    return resp


def fetch_todos() -> list[dict] | None:
    """Solicita todas las tareas; devuelve None si la petición falla."""
    resp = api_call("GET")
    return resp.json() if resp is not None else None


def flash(message: str) -> None:
    """Guarda en la sesión un aviso para mostrarlo después del rerun de Streamlit."""
    st.session_state["flash"] = message


def mark_done(todo_id: int) -> None:
    """Actualiza el estado de una tarea y prepara un aviso si la API responde bien."""
    if api_call("PATCH", f"/{todo_id}", json={"status": "done"}) is not None:
        flash(f"Tarea #{todo_id} marcada como completada")


def delete_todo(todo_id: int) -> None:
    """Elimina una tarea y prepara un aviso si la API confirma la operación."""
    if api_call("DELETE", f"/{todo_id}") is not None:
        flash(f"Tarea #{todo_id} eliminada")


# --- Interfaz ------------------------------------------------------------------------

st.set_page_config(page_title="Panel de tareas", page_icon="✅", layout="wide")
st.title("✅ Panel de control de tareas")
st.caption(f"Conectado a `{API_URL}`")

# Los avisos se conservan entre reruns mediante el estado de sesión.
if msg := st.session_state.pop("flash", None):
    st.toast(msg)

# Si no se puede consultar la API, informa al usuario y no renderiza datos incompletos.
todos = fetch_todos()
if todos is None:
    st.info("Arranca la API con: `uvicorn src.main:app --port 8000`")
    st.stop()

# Contadores generales calculados a partir de la lista recibida.
total = len(todos)
pending = sum(t["status"] == "pending" for t in todos)
done = total - pending
c1, c2, c3 = st.columns(3)
c1.metric("📋 Total", total)
c2.metric("🟠 Pendientes", pending)
c3.metric("🟢 Completadas", done)

st.divider()

# Formulario para crear una tarea; la API realiza la validación definitiva.
with st.form("new_todo", clear_on_submit=True):
    st.subheader("➕ Nueva tarea")
    title = st.text_input("Título", max_chars=200)
    description = st.text_area("Descripción (opcional)", max_chars=2000)
    if st.form_submit_button("Crear tarea", type="primary"):
        if not title.strip():
            st.warning("El título es obligatorio.")
        else:
            payload = {"title": title.strip(), "description": description.strip() or None}
            resp = api_call("POST", json=payload)
            if resp is not None:
                flash(f"Tarea #{resp.json()['id']} creada")
                st.rerun()

st.divider()

# Selector y aplicación del filtro sobre las tareas ya cargadas.
st.subheader("📝 Tareas")
filtro = st.radio(
    "Filtrar", ["Todas", "Pendientes", "Completadas"], horizontal=True, label_visibility="collapsed"
)
visibles = {
    "Todas": todos,
    "Pendientes": [t for t in todos if t["status"] == "pending"],
    "Completadas": [t for t in todos if t["status"] == "done"],
}[filtro]

if not visibles:
    st.info("No hay tareas para mostrar.")
else:
    # Las proporciones se comparten entre el encabezado y cada fila de la tabla.
    widths = [0.6, 3, 4, 1.4, 1.4, 1.2]
    header = st.columns(widths, vertical_alignment="center")
    for col, name in zip(header, ["ID", "Título", "Descripción", "Estado", "", ""]):
        col.markdown(f"**{name}**")

    for todo in visibles:
        # Cada tarea se muestra en una fila con estilo y acciones propias.
        style = STATUS_STYLE.get(todo["status"], STATUS_STYLE["pending"])
        is_done = todo["status"] == "done"
        with st.container(border=True):
            cols = st.columns(widths, vertical_alignment="center")
            cols[0].markdown(f"`#{todo['id']}`")
            # Escapa el contenido de usuario antes de insertarlo en el HTML de formato.
            title_html = html.escape(todo["title"])
            if is_done:
                title_html = f"<s>{title_html}</s>"
            cols[1].markdown(
                f"<span style='color:{style['color']};font-weight:600'>{title_html}</span>",
                unsafe_allow_html=True,
            )
            cols[2].markdown(html.escape(todo["description"] or "—"))
            cols[3].markdown(
                f"<span style='background:{style['bg']};color:{style['color']};"
                f"border:1px solid {style['color']};border-radius:999px;"
                f"padding:2px 10px;font-size:0.85em;font-weight:600'>"
                f"{style['label']}</span>",
                unsafe_allow_html=True,
            )
            cols[4].button(
                "✔ Completar",
                key=f"done_{todo['id']}",
                disabled=is_done,
                on_click=mark_done,
                args=(todo["id"],),
                width="stretch",
            )
            cols[5].button(
                "🗑 Eliminar",
                key=f"del_{todo['id']}",
                on_click=delete_todo,
                args=(todo["id"],),
                width="stretch",
            )
