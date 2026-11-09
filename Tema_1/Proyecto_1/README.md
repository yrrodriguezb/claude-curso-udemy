# Proyecto 1 — Calculadora con Streamlit

Calculadora simple en Python con:

- un módulo de lógica (`src/calculator.py`) con las cuatro operaciones básicas,
- pruebas automáticas con **pytest** (`tests/test_calculator.py`),
- una interfaz web hecha con **Streamlit** (`app.py`).

---

## 📁 Estructura del proyecto

```
Proyecto_1/
├── app.py                    # Interfaz web Streamlit de la calculadora
├── requirements.txt          # Dependencias del proyecto
├── README.md                 # Este archivo
├── .gitignore                # Archivos y carpetas que Git no debe versionar
├── src/
│   └── calculator.py         # Lógica de la calculadora (add, subtract, multiply, divide)
├── tests/
│   └── test_calculator.py    # Pruebas unitarias con pytest
└── .venv/                    # Entorno virtual (se crea en la instalación, no se versiona)
```

### `src/calculator.py` — Lógica

Define cuatro funciones puras que reciben dos números (`float`) y devuelven el resultado:

| Función | Operación | Comportamiento especial |
|---|---|---|
| `add(a, b)` | `a + b` | — |
| `subtract(a, b)` | `a - b` | — |
| `multiply(a, b)` | `a * b` | — |
| `divide(a, b)` | `a / b` | Si `b == 0` lanza `ValueError("No se puede dividir por cero")` |

### `tests/test_calculator.py` — Pruebas

| Prueba | Qué verifica |
|---|---|
| `test_add` | Que `add(2, 3)` devuelve `5` |
| `test_divide_by_zero` | Que `divide(1, 0)` lanza `ValueError` (usando `pytest.raises`) |

> Pendiente: no hay pruebas para `subtract`, `multiply` ni para una división normal.

### `app.py` — Interfaz web

Interfaz Streamlit que reutiliza las funciones de `src/calculator.py`:

- **Dos campos numéricos**: "Primer número" y "Segundo número".
- **Cuatro botones**: ➕ Sumar, ➖ Restar, ✖️ Multiplicar, ➗ Dividir.
- **Resultado en grande**, con la operación realizada debajo (p. ej. `8 × 3`).
- **División por cero**: captura el `ValueError` y muestra un mensaje amigable en rojo.
- Recuerda la última operación pulsada (`st.session_state`): si cambias un número, el resultado se recalcula automáticamente.

### `requirements.txt` — Dependencias

| Paquete | Versión mínima | Para qué se usa |
|---|---|---|
| `pytest` | 7.0 | Ejecutar las pruebas |
| `streamlit` | 1.30 | Interfaz web |

---

## ✅ Requisitos previos

- **Python 3.9 o superior** (probado con Python 3.14.5).
- `pip` (viene incluido con Python).

Comprueba tu versión:

```bash
python --version
```

---

## 🚀 Instalación paso a paso

Todos los comandos se ejecutan **desde la carpeta raíz del proyecto** (`Proyecto_1/`).

### 1. Crear el entorno virtual

```bash
python -m venv .venv
```

### 2. Activar el entorno virtual

| Sistema / terminal | Comando |
|---|---|
| Windows — PowerShell | `.venv\Scripts\Activate.ps1` |
| Windows — CMD | `.venv\Scripts\activate.bat` |
| Windows — Git Bash | `source .venv/Scripts/activate` |
| Linux / macOS | `source .venv/bin/activate` |

Cuando está activo, el prompt muestra `(.venv)` al inicio.

### 3. Instalar las dependencias

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

---

## 🧪 Ejecutar las pruebas

Con el entorno virtual activo y desde la raíz del proyecto:

```bash
python -m pytest -v
```

Salida esperada:

```
tests/test_calculator.py::test_add PASSED                                [ 50%]
tests/test_calculator.py::test_divide_by_zero PASSED                     [100%]

============================== 2 passed ==============================
```

> ⚠️ **Usa `python -m pytest`, no `pytest` a secas.**
> El comando `pytest` solo falla con `ModuleNotFoundError: No module named 'src'`,
> porque no añade la raíz del proyecto al `sys.path`. `python -m pytest` sí lo hace.
> Ver [Solución de problemas](#-solución-de-problemas) para hacer que ambos funcionen.

---

## 🖥️ Ejecutar la aplicación web

Con el entorno virtual activo y desde la raíz del proyecto:

```bash
streamlit run app.py
```

Streamlit abrirá el navegador automáticamente. Si no lo hace, entra en:

**http://localhost:8501**

### Opciones útiles

| Necesidad | Comando |
|---|---|
| Solo accesible desde tu equipo (no desde la red local) | `streamlit run app.py --server.address localhost` |
| Usar otro puerto | `streamlit run app.py --server.port 8502` |
| No abrir el navegador automáticamente | `streamlit run app.py --server.headless true` |

### Cómo usarla

1. Escribe el primer número.
2. Escribe el segundo número.
3. Pulsa el botón de la operación.
4. El resultado aparece en grande debajo de los botones.

### Detener la aplicación

En la terminal donde se está ejecutando, pulsa **`Ctrl + C`**.

### Desactivar el entorno virtual

```bash
deactivate
```

---

## ⚡ Resumen rápido (Windows PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest -v
streamlit run app.py
```

## ⚡ Resumen rápido (Linux / macOS)

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest -v
streamlit run app.py
```

---

## 🛠️ Solución de problemas

### `ModuleNotFoundError: No module named 'src'` al ejecutar `pytest`

Ejecuta las pruebas con `python -m pytest` en lugar de `pytest`.
Si quieres que el comando `pytest` a secas también funcione, crea un archivo `pytest.ini` en la raíz con:

```ini
[pytest]
pythonpath = .
testpaths = tests
```

### PowerShell no permite activar el entorno virtual

Si aparece un error de *"la ejecución de scripts está deshabilitada en este sistema"*, ejecuta una vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

y vuelve a activar el entorno.

### `streamlit` no se reconoce como comando

El entorno virtual no está activo. Actívalo (paso 2) o ejecuta directamente:

```bash
python -m streamlit run app.py
```

### El puerto 8501 ya está en uso

Otra instancia de Streamlit sigue abierta. Ciérrala con `Ctrl + C` o usa otro puerto:

```bash
streamlit run app.py --server.port 8502
```
