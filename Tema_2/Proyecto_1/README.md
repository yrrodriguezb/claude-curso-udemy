# Automatiza360 · Landing page

Landing de conversión construida con **React 18 + Vite 5**. El objetivo es que el visitante reserve una llamada estratégica gratuita.

## Levantar en local

```bash
npm install
npm run dev      # http://localhost:5173 (se abre solo)
npm run build    # build de producción en dist/
npm run preview  # sirve el build
```

## Estructura

```
src/
├── main.jsx                 Punto de entrada
├── App.jsx                  Orden de las secciones
├── data/content.js          TODO el copy, métricas, FAQs y enlaces
├── styles/
│   ├── tokens.css           Colores, tipografía, espaciados, radios, sombras
│   └── global.css           Reset, .container, .section, .card, animación Reveal
└── components/
    ├── ui/                  Piezas reutilizables
    │   ├── Button           variant: primary | secondary | ghost · size: md | lg
    │   ├── SectionHeader    eyebrow + título + subtítulo (align: center | left)
    │   ├── Reveal           aparición suave al hacer scroll (prop delay)
    │   ├── Icon             iconos SVG inline (añade nuevos en PATHS)
    │   └── Logo
    └── sections/            Una sección = un .jsx + su .module.css
        Navbar · Hero · HeroVisual · Metrics · Problems · Benefits ·
        HowItWorks · UseCases · Testimonials · FAQ · FinalCTA · Footer
```

## Guía rápida de iteración visual

| Quiero cambiar…                         | Dónde                                                    |
|-----------------------------------------|----------------------------------------------------------|
| Textos, métricas, testimonios, FAQ      | `src/data/content.js`                                    |
| Enlace de reserva (Calendly, Cal.com…)  | `BOOKING_URL` en `src/data/content.js`                   |
| Paleta de colores / degradado de marca  | `--color-*` y `--gradient-*` en `src/styles/tokens.css`  |
| Tamaño del titular del hero             | `--fs-h1` en `tokens.css`                                |
| Espacio vertical entre secciones        | `--section-py` en `tokens.css`                           |
| Ancho máximo del contenido              | `--container-max` en `tokens.css`                        |
| Layout / responsive de una sección      | `src/components/sections/<Sección>.module.css`           |
| Panel animado del hero                  | `FLOW` y `BARS` en `HeroVisual.jsx`                      |
| Orden u ocultar secciones               | `src/App.jsx`                                            |

Vite recarga en caliente cada cambio de CSS o JSX sin perder el scroll, así que puedes ajustar con el navegador abierto al lado.

**Breakpoints usados:** 1080 · 1020 · 960 · 920 (menú móvil) · 860 · 820 · 600 · 520 px.

> Los testimonios y métricas son de ejemplo: sustitúyelos por datos reales antes de publicar.
