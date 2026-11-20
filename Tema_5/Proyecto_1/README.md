# PixelForge

Pipeline de procesamiento de imágenes en Python con [Pillow](https://pillow.readthedocs.io/). Toma las fotos JPG/PNG de una carpeta, las convierte en miniaturas cuadradas con viñeta y marca de agua, y genera una galería web responsive para verlas.

```
input/foto.jpg ──► thumbnail ≤300x300 ──► viñeta ──► watermark ──► output/thumbnails/foto.jpg
                                                                └─► output/index.html (galería)
```

---

## Tabla de contenido

1. [Características](#características)
2. [Requisitos](#requisitos)
3. [Instalación (entorno virtual)](#instalación-entorno-virtual)
4. [Uso](#uso)
5. [Opciones de línea de comandos](#opciones-de-línea-de-comandos)
6. [Estructura del proyecto](#estructura-del-proyecto)
7. [Cómo funciona cada etapa](#cómo-funciona-cada-etapa)
8. [Galería web](#galería-web)
9. [Uso como librería](#uso-como-librería)
10. [Configuración avanzada](#configuración-avanzada)
11. [Tests](#tests)
12. [Manejo de errores y casos especiales](#manejo-de-errores-y-casos-especiales)
13. [Solución de problemas](#solución-de-problemas)

---

## Características

- Lee imágenes **JPG, JPEG y PNG** (extensión sin distinguir mayúsculas) de `input/`.
- Genera **thumbnails que caben en 300x300** manteniendo la proporción original, sin recortes ni deformación.
- Aplica un **filtro de viñeta** (bordes oscurecidos) de intensidad configurable.
- Añade un **watermark semitransparente** `© PixelForge` en la esquina inferior derecha.
- Produce una **galería HTML/CSS responsive** con modo oscuro automático.
- Respeta la **orientación EXIF** de las fotos de cámara/móvil.
- Omite archivos corruptos sin detener el proceso.
- Única dependencia en tiempo de ejecución: **Pillow**.

## Requisitos

| Herramienta | Versión            |
|-------------|--------------------|
| Python      | 3.10 o superior (probado con 3.14) |
| Pillow      | 10.1 o superior    |
| pytest      | 8.0 o superior (solo desarrollo) |

## Instalación (entorno virtual)

El proyecto usa un entorno virtual en `.venv/` (ignorado por git).

**Windows (PowerShell)**

```powershell
cd Tema_5\Proyecto_1
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

> Si PowerShell bloquea la activación: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
> Alternativa sin activar: usar directamente `.\.venv\Scripts\python`.

**macOS / Linux**

```bash
cd Tema_5/Proyecto_1
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

- `requirements.txt` → dependencias de ejecución (Pillow).
- `requirements-dev.txt` → incluye las anteriores + pytest.

Para salir del entorno: `deactivate`.

## Uso

1. Copia tus imágenes en `input/`.
2. Ejecuta:

   ```bash
   python main.py
   ```

3. Abre la galería:

   ```powershell
   start output\index.html      # Windows
   open output/index.html       # macOS
   xdg-open output/index.html   # Linux
   ```

Salida esperada en consola:

```
INFO Procesada KIA K4 Sedan 2027.jpg -> KIA K4 Sedan 2027.jpg
INFO Listo: 1 imágenes -> output\index.html
```

Resultado en disco:

```
output/
├── index.html          # galería
├── gallery.css         # estilos (copiados desde static/)
└── thumbnails/
    └── KIA K4 Sedan 2027.jpg
```

## Opciones de línea de comandos

```bash
python main.py [--input DIR] [--output DIR] [--strength 0-1] [--opacity 0-255]
```

| Opción       | Default  | Descripción                                              |
|--------------|----------|----------------------------------------------------------|
| `--input`    | `input`  | Carpeta de imágenes fuente                               |
| `--output`   | `output` | Carpeta de salida (se crea si no existe)                 |
| `--strength` | `0.6`    | Intensidad de la viñeta: `0` sin efecto, `1` bordes negros |
| `--opacity`  | `128`    | Opacidad del watermark: `0` invisible, `255` opaco       |

Ejemplos:

```bash
python main.py --strength 0.8 --opacity 180          # viñeta fuerte, marca más visible
python main.py --input C:\Fotos --output dist        # otras carpetas
python main.py --help                                # ayuda
```

Código de salida: `0` si todo fue bien, `1` si la carpeta de entrada no existe o un parámetro es inválido.

## Estructura del proyecto

```
Proyecto_1/
├── input/                  # imágenes fuente (contenido ignorado por git)
├── output/                 # resultado generado (ignorado por git)
├── pixelforge/
│   ├── __init__.py
│   ├── config.py           # Settings (dataclass) y rutas del proyecto
│   ├── loader.py           # búsqueda y apertura de imágenes
│   ├── thumbnail.py        # make_thumbnail()
│   ├── vignette.py         # apply_vignette()
│   ├── watermark.py        # add_watermark()
│   ├── gallery.py          # render_gallery() / build_gallery()
│   └── pipeline.py         # process_image() / run()
├── templates/gallery.html  # plantilla HTML (string.Template)
├── static/gallery.css      # estilos de la galería
├── tests/                  # pruebas con pytest
├── main.py                 # punto de entrada CLI
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

## Cómo funciona cada etapa

### 1. Carga (`loader.py`)
- `find_images(dir)` lista archivos `.jpg/.jpeg/.png` ordenados por nombre.
- `open_image(path)` corrige la rotación EXIF (`ImageOps.exif_transpose`) y convierte a RGB. Los PNG con transparencia se aplanan sobre **fondo blanco**.
- `iter_images(dir)` devuelve pares `(ruta, imagen)` y omite con un `WARNING` los archivos ilegibles.

### 2. Thumbnail (`thumbnail.py`)
`Image.thumbnail` con remuestreo LANCZOS sobre una copia: reduce la imagen hasta que su lado mayor mida 300 px, manteniendo la proporción. No recorta nada; por ejemplo, una foto 4:3 queda en 300x225 y una vertical en 133x300. Las imágenes más pequeñas que 300x300 no se amplían.

### 3. Viñeta (`vignette.py`)
- Se crea una máscara radial con `Image.radial_gradient("L")` ajustada al tamaño de la imagen.
- Cada nivel de distancia `d` se transforma con una curva cuadrática: `255 · (1 − strength · (d/255)²)`, lo que mantiene el centro intacto y oscurece suavemente hacia los bordes.
- `Image.composite(imagen, negro, máscara)` mezcla la imagen con negro según la máscara.

### 4. Watermark (`watermark.py`)
- Se dibuja el texto en una capa RGBA transparente y se combina con `Image.alpha_composite`.
- Fuente: intenta `arial.ttf` → `DejaVuSans.ttf` → `Helvetica.ttc` y, si ninguna existe, la fuente por defecto de Pillow.
- Tamaño de fuente ≈ lado mayor/14; margen = 4 % del lado menor; posición inferior derecha.
- Incluye una sombra negra sutil (la mitad de la opacidad) para que se lea sobre fondos claros.

### 5. Pipeline (`pipeline.py`)
`run(settings)` encadena las etapas, guarda cada resultado como JPEG (calidad 90, optimizado) en `output/thumbnails/` y al final llama a `build_gallery`. Devuelve una lista de `ProcessedImage` (nombre original, ruta de salida, ruta relativa y tamaño original).

## Galería web

- **Grid responsive**: `repeat(auto-fill, minmax(220px, 1fr))` → varias columnas en escritorio, una en móvil.
- **Modo oscuro** automático con `prefers-color-scheme`.
- Las imágenes se muestran completas, sin recorte; cada tarjeta toma la altura de su imagen.
- Imágenes con `loading="lazy"`, `alt` y sus dimensiones reales declaradas; clic para abrir el thumbnail completo.
- Cada tarjeta muestra el nombre del archivo y las dimensiones originales.
- Respeta `prefers-reduced-motion`.
- Nombres de archivo escapados en HTML y codificados en URL (soporta espacios y caracteres especiales).

Para personalizarla, edita `templates/gallery.html` (variables `$title`, `$count`, `$items`, `$empty`) o `static/gallery.css`.

## Uso como librería

```python
from pathlib import Path
from PIL import Image

from pixelforge.config import Settings
from pixelforge.pipeline import run, process_image
from pixelforge.vignette import apply_vignette

# Pipeline completo
results = run(Settings(input_dir=Path("input"), output_dir=Path("output")))

# Una sola imagen
with Image.open("foto.jpg") as img:
    process_image(img.convert("RGB"), Settings()).save("foto_pf.jpg")

# Solo una etapa
apply_vignette(Image.open("foto.jpg"), strength=0.4).save("vineta.jpg")
```

## Configuración avanzada

Todos los parámetros viven en la dataclass `Settings` (`pixelforge/config.py`):

| Campo               | Default          | Descripción                     |
|---------------------|------------------|---------------------------------|
| `input_dir`         | `input`          | Carpeta de entrada              |
| `output_dir`        | `output`         | Carpeta de salida               |
| `thumb_size`        | `(300, 300)`     | Tamaño máximo del thumbnail     |
| `vignette_strength` | `0.6`            | Intensidad de la viñeta (0–1)   |
| `watermark_text`    | `© PixelForge`   | Texto de la marca de agua       |
| `watermark_opacity` | `128`            | Opacidad (0–255)                |
| `jpeg_quality`      | `90`             | Calidad JPEG de salida          |

`thumb_size`, `watermark_text` y `jpeg_quality` se cambian desde código (no tienen opción en el CLI).

## Tests

```bash
pytest -q
```

| Archivo              | Qué verifica                                                        |
|----------------------|---------------------------------------------------------------------|
| `test_thumbnail.py`  | Mantiene la proporción (horizontal y vertical), no amplía imágenes pequeñas, no modifica la original |
| `test_vignette.py`   | Esquinas más oscuras que el centro, `strength=0` no cambia nada, validación |
| `test_watermark.py`  | Solo cambia el cuadrante inferior derecho, es semitransparente, validación |
| `test_pipeline.py`   | Flujo completo, archivos corruptos omitidos, nombres duplicados, carpeta vacía o inexistente |

Las imágenes de prueba se generan en memoria con `Image.new` dentro de carpetas temporales (`tmp_path`); no se necesitan archivos externos.

## Manejo de errores y casos especiales

| Situación                                   | Comportamiento                                   |
|---------------------------------------------|--------------------------------------------------|
| Archivo corrupto o no es imagen             | Se omite con `WARNING`, el resto continúa        |
| Archivos con otra extensión (`.txt`, `.gif`)| Se ignoran                                       |
| Mismo nombre base (`foto.jpg` y `foto.png`) | Se guardan como `foto.jpg` y `foto_1.jpg`        |
| PNG con transparencia                       | Se aplana sobre fondo blanco                     |
| Carpeta `input/` vacía                      | Galería con mensaje "No se encontraron imágenes" |
| Carpeta `input/` inexistente                | Error y código de salida 1                       |
| `--strength` fuera de 0–1 o `--opacity` fuera de 0–255 | Error y código de salida 1            |

## Solución de problemas

- **`ModuleNotFoundError: No module named 'PIL'`** → el entorno virtual no está activado o faltan dependencias: activa `.venv` y ejecuta `pip install -r requirements.txt`.
- **`ImageFont.load_default() got an unexpected keyword argument 'size'`** → Pillow < 10.1; actualiza con `pip install -U Pillow`.
- **El watermark se ve pixelado** → no se encontró ninguna fuente TrueType; instala Arial o DejaVu Sans.
- **La galería no muestra imágenes** → abre `output/index.html` desde la carpeta `output/` (las rutas son relativas) y no muevas el HTML sin su carpeta `thumbnails/`.
