from __future__ import annotations

import shutil
from html import escape
from pathlib import Path
from string import Template
from typing import TYPE_CHECKING
from urllib.parse import quote

from .config import STATIC_DIR, TEMPLATES_DIR

if TYPE_CHECKING:
    from .pipeline import ProcessedImage

_ITEM = Template(
    '      <figure class="card">\n'
    '        <a href="$src" target="_blank" rel="noopener">\n'
    '          <img src="$src" alt="$alt" width="$tw" height="$th" loading="lazy">\n'
    "        </a>\n"
    '        <figcaption>$caption <span class="meta">$width×$height px</span></figcaption>\n'
    "      </figure>"
)


def render_gallery(items: list[ProcessedImage], title: str = "PixelForge Gallery") -> str:
    figures = "\n".join(
        _ITEM.substitute(
            src=escape(quote(item.relative_path), quote=True),
            alt=escape(item.source_name, quote=True),
            caption=escape(item.source_name),
            width=item.original_size[0],
            height=item.original_size[1],
            tw=item.thumb_size[0],
            th=item.thumb_size[1],
        )
        for item in items
    )
    empty = "" if items else '<p class="empty">No se encontraron imágenes en input/.</p>'
    template = Template((TEMPLATES_DIR / "gallery.html").read_text(encoding="utf-8"))
    return template.substitute(title=escape(title), count=len(items), items=figures, empty=empty)


def build_gallery(items: list[ProcessedImage], output_dir: Path) -> Path:
    """Escribe output/index.html y copia la hoja de estilos."""
    output_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(STATIC_DIR / "gallery.css", output_dir / "gallery.css")
    index = output_dir / "index.html"
    index.write_text(render_gallery(items), encoding="utf-8")
    return index
