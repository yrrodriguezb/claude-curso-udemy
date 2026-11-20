# Lectura: Patrones Glob en Claude Code

En la clase anterior vimos que, dentro de los ficheros de rules, podemos indicar a qué archivos aplica cada regla usando **patrones glob**. Aquel vistazo fue superficial: dijimos que `*.ts` significa "todos los TypeScript" y poco más. Este artículo está dedicado a entender los globs a fondo: qué son, qué caracteres los componen, cómo se combinan y cómo leerlos sin dudas.

La idea es que al terminar sepas escribir patrones que digan **exactamente** lo que quieres, sin quedarte corto ni pasarte.

---

## Índice

1. [Qué es un patrón glob](#qué-es-un-patrón-glob)
2. [El asterisco simple: `*`](#el-asterisco-simple-)
3. [El asterisco doble: `**`](#el-asterisco-doble-)
4. [El signo de interrogación: `?`](#el-signo-de-interrogación-)
5. [Clases de caracteres: `[...]`](#clases-de-caracteres-)
6. [Alternativas: `{...}`](#alternativas-)
7. [Negación de patrón: `!patrón`](#negación-de-patrón-patrón)
8. [Combinaciones útiles: ejemplos comentados](#combinaciones-útiles-ejemplos-comentados)
9. [Errores habituales y cómo evitarlos](#errores-habituales-y-cómo-evitarlos)
10. [Referencia rápida](#referencia-rápida)
11. [Cómo aplicarlo a tus rules](#cómo-aplicarlo-a-tus-rules)

---

## Qué es un patrón glob

Un **glob** es una forma compacta de describir un conjunto de rutas de fichero mediante comodines. En lugar de enumerar uno por uno los archivos que te interesan, escribes una plantilla con símbolos especiales, y el sistema se encarga de expandirla a la lista concreta.

El nombre viene de un programa antiguo de Unix llamado `glob` (de *global*), pensado precisamente para esa tarea: expandir comodines en la línea de comandos. Hoy los encontramos en decenas de sitios: la shell, `.gitignore`, configuración de linters, herramientas de build y (lo que nos ocupa) los ficheros **rules** de Claude Code.

> 🔑 **La clave mental:** un glob **se compara contra una ruta**. No es código que se ejecuta ni una expresión regular: es una plantilla que **o encaja** con una ruta, **o no encaja**.

```text
Patrón:  src/**/*.ts

Ruta A:  src/utils/format.ts         ✅ encaja
Ruta B:  src/index.ts                ✅ encaja
Ruta C:  lib/utils/format.ts         ❌ NO encaja (no empieza por src/)
Ruta D:  src/components/Button.tsx   ❌ NO encaja (extensión .tsx, no .ts)
```

Con esto en la cabeza, veamos los caracteres especiales uno a uno.

---

## El asterisco simple: `*`

El `*` coincide con **cualquier cadena de caracteres dentro de un mismo tramo de ruta**. El matiz importante es ese "dentro de un mismo tramo": un `*` solitario **no atraviesa** separadores de directorio (`/`).

```text
Patrón:  *.md

✅ README.md
✅ notas.md
❌ docs/guia.md     ← está en un subdirectorio
```

```text
Patrón:  src/*.ts

✅ src/index.ts
✅ src/utils.ts
❌ src/utils/helpers.ts   ← hay otro nivel de por medio
❌ index.ts               ← no está dentro de src/
```

Puedes usarlo en cualquier posición, y tantas veces como quieras dentro del mismo tramo:

| Patrón | Coincide con |
|---|---|
| `*.test.ts` | Cualquier `.test.ts`: `login.test.ts`, `utils.test.ts` |
| `test-*.js` | `test-auth.js`, `test-api.js` |
| `components/*Form.*` | `components/LoginForm.tsx`, `components/SignupForm.jsx` |

> ⚠️ El `*` también puede casar con la **cadena vacía**, aunque esto varía según la implementación. En la mayoría de sistemas modernos, `file-*.txt` coincide con `file-.txt`, y `*.js` **no** coincide con un fichero llamado solo `.js` (porque los archivos que empiezan por punto suelen tratarse como ocultos y requieren que el patrón empiece explícitamente por `.`).

---

## El asterisco doble: `**`

El `**` —también llamado **globstar**— coincide con cualquier cadena, **incluyendo separadores de directorio**. Es decir, atraviesa cuantos niveles haga falta.

```text
Patrón:  **/*.ts

✅ index.ts
✅ src/utils.ts
✅ src/components/forms/Login.ts
✅ a/b/c/d/e/f/archivo.ts
```

La diferencia con `*` es fundamental y se nota sobre todo cuando el patrón lleva subdirectorios:

| Patrón | Significado |
|---|---|
| `src/*.ts` | Solo archivos `.ts` **directamente** dentro de `src` |
| `src/**/*.ts` | Archivos `.ts` en `src` **y en cualquier subdirectorio suyo** |

### Tres usos típicos del doble asterisco

**1. Al principio**, para decir "en cualquier lugar del proyecto":

```text
**/node_modules   → cualquier carpeta node_modules, esté donde esté
**/*.log          → todos los logs, dé igual su ubicación
```

**2. En medio**, para saltar una cantidad desconocida de niveles:

```text
src/**/*.test.ts  → tests en src, a cualquier profundidad
packages/**/dist  → la carpeta dist de cualquier paquete
```

**3. Al final**, para decir "todo lo que hay a partir de aquí":

```text
docs/**           → absolutamente todo dentro de docs, a cualquier profundidad
src/legacy/**     → todo el contenido del directorio legacy
```

> ⚠️ **Detalle importante:** `**` debe aparecer como **tramo completo entre barras** para comportarse como globstar. Escribir `src**/foo` no funciona como esperarías; lo correcto es `src/**/foo`.

---

## El signo de interrogación: `?`

El `?` coincide con **exactamente un carácter** cualquiera (excepto el separador `/`). Es mucho más restrictivo que `*` y se usa cuando sabes la longitud exacta de lo que quieres hacer coincidir.

```text
Patrón:  test?.js

✅ test1.js
✅ testA.js
❌ test.js     ← falta el carácter
❌ test10.js   ← son dos caracteres
```

```text
Patrón:  v?.?.?.md

✅ v1.2.3.md
✅ v9.0.1.md
❌ v1.10.0.md  ← "10" son dos caracteres
```

En la práctica se usa poco, pero es útil cuando tienes archivos con un formato de nombre muy estricto, como versiones cortas o identificadores de longitud fija.

---

## Clases de caracteres: `[...]`

Los corchetes permiten especificar un **conjunto de caracteres aceptables para una sola posición**. Coincide exactamente con **uno** de los caracteres listados.

```text
Patrón:  [abc]rchivo.txt

✅ archivo.txt
✅ brchivo.txt
✅ crchivo.txt
❌ drchivo.txt
```

Puedes usar **rangos** con guion:

| Clase | Coincide con |
|---|---|
| `[0-9]` | Cualquier dígito |
| `[a-z]` | Cualquier minúscula |
| `[A-Z]` | Cualquier mayúscula |
| `[a-zA-Z]` | Cualquier letra |
| `[0-9a-f]` | Cualquier dígito hexadecimal |

Ejemplos realistas:

```text
log-[0-9].txt        → log-0.txt hasta log-9.txt
v[0-9].[0-9].ts      → v1.0.ts, v2.3.ts, v9.9.ts...
test-[a-z].spec.js   → test-a.spec.js, test-b.spec.js...
[A-Z]*.md            → ficheros .md que empiezan por mayúscula
```

### Negación dentro de los corchetes

Si el primer carácter dentro de los corchetes es `!` (o `^`, según la implementación), el significado se invierte: coincide con cualquier carácter que **NO** esté en el conjunto.

```text
[!0-9]*.txt   → .txt cuyo nombre NO empieza por un dígito
[!_]*.js      → .js cuyo nombre NO empieza por guion bajo
```

> ⚠️ **Cuidado:** la negación dentro de corchetes afecta **solo a esa posición**, no al patrón entero. Para negar un patrón completo se usa otra sintaxis distinta, que veremos más abajo.

---

## Alternativas: `{...}`

Las llaves permiten listar **varias alternativas separadas por comas**, y el patrón encaja si la ruta coincide con cualquiera de ellas. Es como un **OR**.

```text
Patrón:  *.{js,ts}

✅ app.js
✅ app.ts
❌ app.jsx
```

Esto es especialmente útil para agrupar extensiones o nombres relacionados:

```text
*.{jpg,jpeg,png,gif,webp}        → cualquier formato de imagen común
{Dockerfile,docker-compose.yml}  → ficheros de Docker
src/**/*.{test,spec}.ts          → tests escritos con cualquiera de las dos convenciones
```

Las alternativas pueden contener **tramos de ruta completos**:

```text
{src,lib,packages}/**/*.ts  → TS en cualquiera de los tres directorios
```

Y pueden **anidarse/combinarse**, aunque si empiezas a hacer eso probablemente tu patrón ya sea demasiado complejo y convenga partirlo en varios:

```text
src/**/*.{test,spec}.{js,ts,jsx,tsx}
```

Algunas implementaciones aceptan también **rangos numéricos** con dos puntos:

```text
log-{1..5}.txt   → log-1.txt, log-2.txt, log-3.txt, log-4.txt, log-5.txt
```

> ⚠️ Esto no está disponible en todos los sistemas, así que conviene no depender de ello si quieres portabilidad.

---

## Negación de patrón: `!patrón`

Muchos sistemas que usan globs para seleccionar ficheros permiten también **excluir** mediante patrones negados que empiezan por `!`. La idea es: primero incluyes un conjunto amplio, y luego recortas lo que no quieres.

```text
**/*.ts              → incluye todos los TS
!**/*.test.ts        → excepto los tests
!**/node_modules/**  → y nunca nada de node_modules
```

Esta sintaxis es la misma que usa `.gitignore` y se aplica en la mayoría de contextos donde los globs forman una **lista ordenada**. La regla general: cada patrón se evalúa **en orden**, y los patrones negados **restan** del conjunto acumulado hasta ese momento.

> 💡 La **negación de patrón** (`!` al principio) es un concepto distinto de la **negación dentro de corchetes** (`[!abc]`): la primera excluye rutas completas, la segunda solo afecta a una posición de carácter.

---

## Combinaciones útiles: ejemplos comentados

Con estos pocos caracteres —`*`, `**`, `?`, `[]`, `{}`, `!`— se puede expresar prácticamente cualquier selección razonable de ficheros. Lo que al principio cuesta es combinarlos. Veamos una batería de ejemplos comentados:

**Todos los ficheros de código TypeScript del proyecto, sin los tests:**

```text
**/*.ts
!**/*.test.ts
!**/*.spec.ts
```

**Solo los componentes React del directorio `src`:**

```text
src/**/*.{jsx,tsx}
```

**Ficheros de configuración en la raíz del proyecto:**

```text
*.{json,yaml,yml,toml}
```

**Todos los README, estén donde estén:**

```text
**/README.md
**/README          ← sin extensión, por si acaso
```

**Migraciones de base de datos numeradas** (coincide con `0001_init.sql`, `0042_add_users.sql`, etc.):

```text
db/migrations/[0-9][0-9][0-9][0-9]_*.sql
```

**Scripts de shell en `bin/`, cualquier profundidad:**

```text
bin/**/*.{sh,bash,zsh}
```

**Cualquier fichero dentro de un directorio `__tests__`:**

```text
**/__tests__/**
```

**Ficheros Markdown, pero solo los de documentación (sin borradores):**

```text
docs/**/*.md
!docs/**/DRAFT-*.md
```

**Archivos de estilo, cualquier preprocesador:**

```text
**/*.{css,scss,sass,less,styl}
```

**Todo el código fuente menos lo generado:**

```text
src/**
!src/**/generated/**
!src/**/*.generated.*
```

---

## Errores habituales y cómo evitarlos

Hay cuatro tropiezos que vienen una y otra vez cuando uno empieza con globs. Merece la pena tenerlos presentes.

### 1. Confundir `*` con `**`

El error clásico: escribir `src/*.ts` esperando que cubra todo `src` y quedarse sorprendido de que los ficheros en subdirectorios no entran.

> 🧠 **Regla mental:** un asterisco no cruza barras, dos sí. En cuanto veas que tu patrón "no recoge lo de dentro de las carpetas", cambia el `*` por `**/*`.

### 2. Olvidar que `**` necesita estar aislado por barras

Escribir `src**` o `**foo` no funciona como globstar en la mayoría de implementaciones. El globstar quiere vivir solo entre separadores: `src/**/foo`, no `src**/foo`.

### 3. Pensar que los globs son regex

No lo son. En un glob, el punto `.` es un **punto literal**, no "cualquier carácter". `app.js` en un glob significa exactamente `app.js`. Y no existen cuantificadores tipo `+` o `{3,5}`: si quieres algo así, necesitas combinar `?` y `*` de otra manera, o aceptar que los globs no están diseñados para esto.

### 4. No pensar en los ficheros ocultos

Los archivos que empiezan por punto (`.env`, `.gitignore`, `.config/`) suelen estar fuera de lo que captura un patrón genérico. Un `*.json` no tiene por qué capturar `.babelrc.json` en muchas implementaciones. Si los quieres incluir, sé explícito: `.*` o `**/.*`.

---

## Referencia rápida

Un resumen para tener a mano mientras escribes patrones:

| Símbolo | Significado | Ejemplo |
|---|---|---|
| `*` | Cualquier cadena dentro de un tramo de ruta, sin cruzar barras | `*.ts` → `index.ts`, `utils.ts` |
| `**` | Cualquier cadena, atravesando directorios | `src/**/*.ts` → `src/a/b/c.ts` |
| `?` | Exactamente un carácter cualquiera | `v?.md` → `v1.md`, `vA.md` (no `v10.md`) |
| `[abc]` | Uno de los caracteres listados | `[abc].js` → `a.js`, `b.js`, `c.js` |
| `[a-z]` | Un carácter dentro del rango | `[0-9].txt` → `0.txt` … `9.txt` |
| `[!abc]` | Un carácter que **NO** está en el conjunto | `[!_]*.js` → excluye los que empiezan por `_` |
| `{a,b}` | Alternativas, funciona como un OR | `*.{js,ts}` → `app.js`, `app.ts` |
| `!patrón` | Excluye rutas que encajen con el patrón | `!**/*.test.ts` → deja fuera los tests |

---

## Cómo aplicarlo a tus rules

Vuelve a los ficheros de rules que vimos en la clase anterior y piensa en qué ámbito quieres que actúe cada uno. El glob no es un adorno: **es lo que determina si tu regla se activará** con el fichero que el usuario tenga abierto o no.

```markdown
---
paths:
  - "src/**/*.{test,spec}.ts"
---

# Reglas de tests
- ...
```

Un buen ejercicio es, para cada regla que escribas, hacerte **tres preguntas**:

1. ¿Qué ficheros **exactos** deberían dispararla?
2. ¿Qué ficheros **parecidos** deberían quedar fuera?
3. ¿Hay algún subdirectorio "trampa" (`node_modules`, `dist`, `build`, `.next`) que convenga excluir explícitamente?

Escribir el glob después de responder estas tres preguntas te sale casi solo.

> ✅ Si dudas entre dos patrones, casi siempre el bueno es **el más específico que sigue cubriendo los casos que te importan**. Un glob demasiado amplio activará la regla donde no toca y generará ruido; uno demasiado estrecho dejará sin cubrir casos legítimos. Afina hasta que encaje.
