from PIL import Image


def make_thumbnail(img: Image.Image, size: tuple[int, int] = (300, 300)) -> Image.Image:
    """Reduce la imagen para que quepa en `size` manteniendo la proporción (sin recorte).

    Las imágenes más pequeñas que `size` no se amplían.
    """
    thumb = img.copy()
    thumb.thumbnail(size, Image.Resampling.LANCZOS)
    return thumb
