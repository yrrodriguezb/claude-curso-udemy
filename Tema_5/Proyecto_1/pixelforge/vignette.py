from PIL import Image


def _vignette_mask(size: tuple[int, int], strength: float) -> Image.Image:
    """Máscara L: 255 en el centro (imagen intacta) y más oscura hacia los bordes."""
    # radial_gradient: 256x256, 0 en el centro y 255 a radio 128 (bordes laterales).
    gradient = Image.radial_gradient("L").resize(size, Image.Resampling.BICUBIC)
    # Caída cuadrática para un centro amplio y bordes suaves.
    lut = [round(255 * (1 - strength * (d / 255) ** 2)) for d in range(256)]
    return gradient.point(lut)


def apply_vignette(img: Image.Image, strength: float = 0.6) -> Image.Image:
    """Oscurece los bordes. `strength` en [0, 1]: 0 = sin efecto, 1 = bordes negros."""
    if not 0 <= strength <= 1:
        raise ValueError("strength debe estar entre 0 y 1")
    img = img.convert("RGB")
    black = Image.new("RGB", img.size, (0, 0, 0))
    return Image.composite(img, black, _vignette_mask(img.size, strength))
