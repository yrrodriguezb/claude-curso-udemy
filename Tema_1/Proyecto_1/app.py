"""Interfaz web con Streamlit para la calculadora de src/calculator.py."""

import streamlit as st

from src.calculator import add, divide, multiply, subtract

st.set_page_config(page_title="Calculadora", page_icon="🧮", layout="centered")

st.title("🧮 Calculadora")
st.write("Introduce dos números y elige una operación.")

col_a, col_b = st.columns(2)
with col_a:
    a = st.number_input("Primer número", value=0.0, format="%g")
with col_b:
    b = st.number_input("Segundo número", value=0.0, format="%g")

OPERACIONES = {
    "sumar": ("➕ Sumar", add, "+"),
    "restar": ("➖ Restar", subtract, "−"),
    "multiplicar": ("✖️ Multiplicar", multiply, "×"),
    "dividir": ("➗ Dividir", divide, "÷"),
}

botones = st.columns(len(OPERACIONES))
for col, (clave, (etiqueta, _, _)) in zip(botones, OPERACIONES.items()):
    if col.button(etiqueta, key=clave, use_container_width=True):
        st.session_state["operacion"] = clave

clave = st.session_state.get("operacion")
if clave:
    _, funcion, simbolo = OPERACIONES[clave]
    st.divider()
    try:
        resultado = funcion(a, b)
    except ValueError:
        st.error("⚠️ No se puede dividir por cero. Cambia el segundo número por un valor distinto de 0.")
    else:
        st.caption(f"{a:g} {simbolo} {b:g}")
        st.markdown(
            f"<p style='font-size:4rem; font-weight:700; margin:0;'>{resultado:g}</p>",
            unsafe_allow_html=True,
        )
