# Lectura: Auto memory en Claude Code

> De cero a avanzado: cómo Claude Code recuerda cosas **por sí mismo** entre sesiones, dónde lo guarda, cómo controlarlo y cuándo conviene (o no) confiar en ello.

---

## Índice

1. [Qué es la auto memory](#1-qué-es-la-auto-memory)
2. [Auto memory vs CLAUDE.md](#2-auto-memory-vs-claudemd)
3. [Dónde se guarda](#3-dónde-se-guarda)
4. [Cómo funciona el ciclo de vida](#4-cómo-funciona-el-ciclo-de-vida)
5. [Anatomía de una memoria](#5-anatomía-de-una-memoria)
6. [Los cuatro tipos de memoria](#6-los-cuatro-tipos-de-memoria)
7. [El índice `MEMORY.md`](#7-el-índice-memorymd)
8. [Uso diario: pedir, consultar, corregir y olvidar](#8-uso-diario-pedir-consultar-corregir-y-olvidar)
9. [Activar y desactivar](#9-activar-y-desactivar)
10. [Avanzado: qué merece ser memoria y qué no](#10-avanzado-qué-merece-ser-memoria-y-qué-no)
11. [Avanzado: enlaces, mantenimiento y obsolescencia](#11-avanzado-enlaces-mantenimiento-y-obsolescencia)
12. [Avanzado: privacidad y seguridad](#12-avanzado-privacidad-y-seguridad)
13. [Ejemplo completo: una semana de trabajo](#13-ejemplo-completo-una-semana-de-trabajo)
14. [Errores comunes](#14-errores-comunes)
15. [Resumen / chuleta](#15-resumen--chuleta)

---

## 1. Qué es la auto memory

Cada sesión de Claude Code empieza **sin recuerdos** de las anteriores. Lo único que sobrevive es lo que está escrito en disco: tu código, tus `CLAUDE.md`, tus reglas… y la **auto memory**.

La **auto memory** es un sistema de notas que **Claude escribe y mantiene por su cuenta** mientras trabaja contigo. Cuando aprende algo útil que no está en el código —una preferencia tuya, una corrección que le hiciste, el contexto de un proyecto— lo guarda en un archivo para recordarlo en futuras sesiones.

```text
Sesión 1 (lunes)
  Tú:     "No uses .then(), siempre async/await."
  Claude: ✍️ guarda una memoria de tipo feedback

Sesión 2 (miércoles, contexto nuevo)
  Claude: 📖 carga el índice de memorias al iniciar
  Claude: escribe código con async/await sin que se lo recuerdes
```

> 🔑 **Idea clave:** `CLAUDE.md` es lo que **tú** le dices a Claude. La auto memory es lo que **Claude** anota para sí mismo.

---

## 2. Auto memory vs CLAUDE.md

Ambos son memoria persistente en archivos Markdown, pero cumplen roles distintos:

| | `CLAUDE.md` / `.claude/rules/` | Auto memory |
|---|---|---|
| ¿Quién lo escribe? | Tú (o Claude cuando se lo pides) | Claude, por iniciativa propia o a petición |
| ¿Dónde vive? | Dentro del repo (versionado) o en `~/.claude/` | En `~/.claude/projects/<proyecto>/memory/` |
| ¿Se comparte con el equipo? | Sí, si está en el repo | No, es personal y local a tu máquina |
| ¿Qué contiene? | Instrucciones, convenciones, comandos | Aprendizajes: preferencias, correcciones, contexto |
| ¿Cómo se carga? | Completo al iniciar (o por `paths`) | Índice al iniciar; detalle bajo demanda |
| ¿Control? | Total y explícito | Lo gestiona Claude; tú puedes revisar y editar |

Regla práctica:

- **Si el equipo entero debe saberlo** → `CLAUDE.md` o `.claude/rules/`.
- **Si es tuyo, contextual o aprendido sobre la marcha** → auto memory.

---

## 3. Dónde se guarda

Cada proyecto tiene su propia carpeta de memoria, dentro de tu directorio de usuario (no dentro del repo):

```text
~/.claude/
└── projects/
    └── <ruta-del-proyecto-codificada>/
        └── memory/
            ├── MEMORY.md                      ← índice (se carga al iniciar)
            ├── preferencia-async-await.md     ← una memoria = un archivo
            ├── convencion-commits.md
            └── proyecto-migracion-net8.md
```

La ruta del proyecto se "codifica" reemplazando separadores por guiones. Por ejemplo, en Windows:

```text
Proyecto:  C:\Users\<usuario>\Documents\Repos\Cursos\IA\Claude
Memoria:   C:\Users\<usuario>\.claude\projects\C--Users-<usuario>-Documents-Repos-Cursos-IA-Claude\memory\
```

Consecuencias importantes:

- ✅ **No ensucia el repo**: no aparece en `git status` ni llega a tus compañeros.
- ✅ **Está aislada por proyecto**: lo que Claude aprende en el proyecto A no se mezcla con el B.
- ⚠️ **No viaja contigo**: si clonas el repo en otra máquina u otra ruta, empiezas con memoria vacía.
- ⚠️ **Cambiar la ruta del proyecto** (mover o renombrar la carpeta) crea una carpeta de memoria nueva.

---

## 4. Cómo funciona el ciclo de vida

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. INICIO DE SESIÓN                                          │
│    Claude Code carga MEMORY.md (el índice) en el contexto.   │
│    Solo el índice: una línea por memoria.                    │
├──────────────────────────────────────────────────────────────┤
│ 2. DURANTE EL TRABAJO — RECORDAR                             │
│    Si una entrada del índice parece relevante para la tarea, │
│    Claude abre ese archivo concreto y lo lee.                │
├──────────────────────────────────────────────────────────────┤
│ 3. DURANTE EL TRABAJO — APRENDER                             │
│    Cuando detecta algo que vale la pena recordar:            │
│      a) busca si ya existe una memoria sobre eso             │
│      b) si existe → la actualiza; si no → crea un archivo    │
│      c) añade/ajusta la línea correspondiente en MEMORY.md   │
├──────────────────────────────────────────────────────────────┤
│ 4. SESIONES SIGUIENTES                                       │
│    El índice actualizado vuelve a cargarse → ciclo continuo. │
└──────────────────────────────────────────────────────────────┘
```

¿Por qué índice + archivos y no un único archivo gigante? Por **contexto**: el índice es barato (unas pocas líneas), y el detalle solo se paga cuando hace falta. Es el mismo principio de las reglas con `paths`: cargar lo mínimo siempre y lo específico bajo demanda.

> ⚠️ El índice tiene un límite práctico de tamaño (lo que pase de cierto número de líneas puede no cargarse). Por eso cada entrada debe ser **una sola línea corta**.

---

## 5. Anatomía de una memoria

Cada memoria es **un archivo** que contiene **un solo hecho**, con un frontmatter YAML:

```markdown
---
name: preferencia-async-await
description: El usuario exige async/await y prohíbe .then() en Node y C#
metadata:
  type: feedback
---

Usar siempre async/await; nunca encadenar .then().

**Why:** el usuario lo corrigió explícitamente en una revisión; considera que
.then() dificulta la lectura y el manejo de errores.

**How to apply:** en cualquier código asíncrono nuevo o modificado, en Node y
en C# (async Task, nunca .Result ni .Wait()). Relacionado: [[estilo-codigo-personal]].
```

| Campo | Para qué sirve |
|---|---|
| `name` | Identificador corto en kebab-case. Se usa para enlazar memorias entre sí. |
| `description` | Resumen de una línea. Es lo que Claude usa para **decidir si es relevante** sin abrir el archivo. |
| `metadata.type` | Uno de: `user`, `feedback`, `project`, `reference`. |
| Cuerpo | El hecho en sí. En `feedback` y `project`, seguido de **Why:** y **How to apply:**. |
| `[[otro-name]]` | Enlace a otra memoria relacionada. |

> 💡 **Por qué el "Why"**: una regla sin motivo solo se aplica literalmente. Con el motivo, Claude puede **generalizar** a casos parecidos y también **detectar cuándo ya no aplica**.

---

## 6. Los cuatro tipos de memoria

### `user` — quién eres

Tu rol, experiencia, preferencias generales de trabajo.

```markdown
---
name: perfil-usuario
description: Desarrollador backend Node/C#, prefiere respuestas concisas en español
metadata:
  type: user
---

Desarrollador con experiencia en Node.js 22 y .NET 6 con SQL Server.
Está aprendiendo Claude Code en un curso; valora ejemplos prácticos sobre teoría.
```

### `feedback` — cómo quieres que trabaje

Correcciones y también **aciertos confirmados** ("sí, así está perfecto").

```markdown
---
name: no-reescribir-archivos-completos
description: Mostrar solo el diff relevante, nunca el archivo entero
metadata:
  type: feedback
---

Al proponer cambios, mostrar únicamente el diff relevante.

**Why:** el usuario lo pidió tras recibir un archivo de 400 líneas para un cambio de 3.
**How to apply:** en todas las respuestas que incluyan cambios de código.
```

### `project` — contexto que no está en el código

Objetivos, plazos, decisiones en curso, restricciones. **Fechas siempre absolutas.**

```markdown
---
name: migracion-net8
description: Migración del módulo de facturación a .NET 8 con entrega el 2026-12-15
metadata:
  type: project
---

El módulo de facturación se migra de .NET 6 a .NET 8. Fecha límite: 2026-12-15.
Mientras tanto, no introducir dependencias que no soporten ambas versiones.

**Why:** el cliente aprobó la migración en el HD-4521; producción sigue en .NET 6 hasta el corte.
**How to apply:** al añadir paquetes NuGet o usar APIs nuevas en facturación.
```

> ⚠️ Nunca "el próximo viernes" o "en dos semanas": dentro de un mes esa frase es ambigua. Claude convierte las fechas relativas en absolutas al guardar.

### `reference` — dónde está la información externa

Punteros a dashboards, tickets, wikis, URLs.

```markdown
---
name: tablero-helpdesk
description: Los tickets HD del proyecto se gestionan en el tablero de Help Desk interno
metadata:
  type: reference
---

Tablero de tickets: https://helpdesk.ejemplo.com/proyecto/facturacion
Los números HD-XXXX de los commits corresponden a tickets de este tablero.
```

### Resumen de tipos

| Tipo | Pregunta que responde | Ejemplo |
|---|---|---|
| `user` | ¿Quién es? | "Experto en C#, nuevo en React" |
| `feedback` | ¿Cómo quiere que trabaje? | "Nada de `.then()`" |
| `project` | ¿Qué está pasando que no se ve en el código? | "Code freeze desde el 2026-12-01" |
| `reference` | ¿Dónde está X? | "Métricas en el dashboard de Grafana Y" |

---

## 7. El índice `MEMORY.md`

Es el único archivo que se carga automáticamente en cada sesión. **No contiene memorias**, solo punteros:

```markdown
- [Perfil del usuario](perfil-usuario.md) — dev Node/C#, respuestas concisas en español
- [Async/await obligatorio](preferencia-async-await.md) — nunca .then(), tampoco .Result en C#
- [Solo diffs](no-reescribir-archivos-completos.md) — no mostrar archivos completos
- [Migración .NET 8](migracion-net8.md) — facturación, entrega 2026-12-15
- [Tablero Help Desk](tablero-helpdesk.md) — dónde viven los tickets HD-XXXX
```

Reglas del índice:

- **Una línea por memoria**, formato `- [Título](archivo.md) — gancho`.
- **Sin frontmatter** y sin contenido real: el detalle va en el archivo.
- El "gancho" debe permitir decidir relevancia **sin abrir el archivo**.

---

## 8. Uso diario: pedir, consultar, corregir y olvidar

No necesitas comandos especiales; basta con hablarle a Claude.

### Pedir que recuerde algo

```text
Tú:  Recuerda que en este proyecto los tests de integración necesitan
     que Docker esté corriendo antes de npm test.
```

Claude creará (o actualizará) una memoria y su línea en el índice.

### Consultar lo que recuerda

```text
Tú:  ¿Qué tienes guardado en memoria sobre este proyecto?
```

O usa el comando **`/memory`**, que muestra los archivos de memoria (CLAUDE.md y auto memory) y permite abrirlos en tu editor.

### Corregir una memoria

```text
Tú:  Lo de Docker ya no aplica, ahora usamos testcontainers y se levanta solo.
```

Claude debería **actualizar o borrar** la memoria existente en vez de crear una nueva contradictoria.

### Olvidar

```text
Tú:  Olvida todo lo relacionado con la migración a .NET 8, se canceló.
```

Y siempre puedes editar o borrar los archivos a mano: son Markdown plano.

---

## 9. Activar y desactivar

La auto memory se puede controlar a varios niveles:

| Forma | Alcance |
|---|---|
| Comando `/memory` → opción de auto memory | Interruptor desde la propia sesión |
| Setting en `settings.json` (`autoMemoryEnabled: false`) | Por usuario o por proyecto |
| Variable de entorno `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | Por terminal / CI |

Ejemplo, desactivarla solo en un proyecto (`.claude/settings.json`):

```json
{
  "autoMemoryEnabled": false
}
```

¿Cuándo desactivarla?

- Repos con datos sensibles donde no quieres nada persistido fuera del repo.
- Pipelines de CI o ejecuciones automatizadas (`claude -p`), donde no hay "usuario" que recordar.
- Demos o pruebas donde quieres un comportamiento reproducible desde cero.

> ⚠️ Los nombres exactos de settings y variables pueden cambiar entre versiones. Verifica con `/memory`, `/config` o la documentación oficial de tu versión.

---

## 10. Avanzado: qué merece ser memoria y qué no

El criterio de fondo: **¿esto es útil en una sesión futura y NO se puede deducir del repo?**

| ✅ Sí es memoria | ❌ No es memoria | Por qué no |
|---|---|---|
| "Prefiere diffs, no archivos completos" | "El proyecto usa Express" | Se ve en `package.json` |
| "La API de pagos de staging falla los lunes por mantenimiento" | "La función `calcTotal` está en `billing.ts`" | Se encuentra con una búsqueda |
| "Code freeze del 2026-12-01 al 2026-12-10" | "Ayer arreglamos el bug del login" | Está en el historial de git |
| "Los commits llevan prefijo HD-XXXX" | Instrucciones que ya están en `CLAUDE.md` | Duplicado = riesgo de contradicción |
| "El cliente X siempre pide confirmar antes de tocar BD" | Detalles solo útiles en la conversación actual | No sirven después |

### Si te piden "recuerda esto" y no cumple el criterio

Lo correcto no es guardar a ciegas, sino buscar **lo no obvio**:

```text
Tú:      Recuerda que arreglamos el bug del token expirado.
Claude:  Eso ya queda en el historial de git. ¿Hubo algo no obvio que
         convenga recordar? Por ejemplo, ¿la causa (reloj del servidor
         desfasado) podría repetirse en otros módulos?
Tú:      Sí, el servidor de staging tiene el reloj desfasado ~2 min.
Claude:  ✍️ Guardo eso como memoria de tipo project.
```

### Memoria vs CLAUDE.md: cuándo "promover"

Si una memoria personal resulta útil para **todo el equipo**, muévela a `CLAUDE.md` o a `.claude/rules/` y borra la memoria. Señales:

- Se la tuviste que explicar también a un compañero.
- Es una convención del proyecto, no una preferencia tuya.
- Un compañero sin esa memoria cometería el mismo error.

---

## 11. Avanzado: enlaces, mantenimiento y obsolescencia

### Enlaces entre memorias

Con `[[name]]` se conectan memorias relacionadas:

```markdown
Usar siempre la convención de commits del equipo. Ver [[convencion-commits]]
y, para ajustes sobre commits previos, [[sufijo-ajuste]].
```

Un enlace a una memoria que aún no existe **no es un error**: marca algo que valdría la pena escribir más adelante.

### Una memoria, un hecho

```text
❌  preferencias.md  → 30 preferencias mezcladas
✅  preferencia-async-await.md
✅  no-reescribir-archivos-completos.md
✅  idioma-espanol.md
```

Así se pueden actualizar, enlazar y borrar de forma independiente.

### Obsolescencia

Una memoria refleja lo que era cierto **cuando se escribió**. Si una memoria dice "la función `validateToken` está en `auth/utils.ts`" y el archivo se renombró, la memoria miente.

Buenas prácticas:

- Claude debe **verificar** que un archivo, función o flag mencionado en una memoria sigue existiendo antes de recomendarlo.
- Las memorias que resultan falsas se **borran**, no se acumulan.
- Revisa el índice de vez en cuando (`/memory`) y poda lo que ya no aplica.

### Las memorias son contexto, no órdenes

Lo que Claude recuerda es **información de fondo**. Si tu petición actual contradice una memoria, **gana tu petición actual** (y Claude debería ofrecer actualizar la memoria).

---

## 12. Avanzado: privacidad y seguridad

- La auto memory vive **solo en tu máquina**, en texto plano. Cualquiera con acceso a tu usuario puede leerla.
- **No guardes secretos**: contraseñas, tokens, cadenas de conexión. Si Claude ve uno, no debería memorizarlo; si lo hace, bórralo.
- Datos de clientes o información sensible: evítalos o refiérete a ellos de forma genérica ("el cliente del HD-4521").
- Si compartes tu carpeta `~/.claude` (backups, sincronización), recuerda que la memoria va incluida.
- Contenido de terceros (logs, correos, transcripciones) que entra en una conversación **no** debería convertirse en memoria salvo que tú lo pidas.

---

## 13. Ejemplo completo: una semana de trabajo

**Lunes** — primera sesión en un proyecto nuevo. Memoria vacía.

```text
Tú:      Agrega un endpoint para listar facturas.
Claude:  (escribe el endpoint usando .then())
Tú:      No, nunca .then(). Siempre async/await.
Claude:  Corregido. ✍️ Guardo esta preferencia.
```

Resultado en disco:

```text
memory/
├── MEMORY.md
│     - [Async/await obligatorio](preferencia-async-await.md) — nunca .then()
└── preferencia-async-await.md   (type: feedback)
```

**Martes** — nueva sesión.

```text
Tú:      Recuerda que hasta el 2026-12-10 hay code freeze en producción;
         solo se aceptan hotfixes con ticket HD.
Claude:  ✍️ Guardado como memoria de proyecto.
```

**Miércoles** — nueva sesión, contexto limpio.

```text
Tú:      Refactoriza el servicio de facturas para usar el nuevo ORM.
Claude:  📖 (lee el índice → ve "code freeze" → abre la memoria)
         Ojo: según lo que me indicaste, hay code freeze hasta el
         2026-12-10. ¿Este refactor va como hotfix con ticket HD o
         lo dejamos en una rama para después del freeze?
```

**Viernes** — el contexto cambia.

```text
Tú:      El freeze se levantó antes, ya podemos desplegar normal.
Claude:  ✍️ Elimino la memoria del code freeze y actualizo el índice.
```

Índice final:

```markdown
- [Async/await obligatorio](preferencia-async-await.md) — nunca .then()
```

Ese es el ciclo sano: **aprender → aplicar → actualizar → olvidar lo obsoleto**.

---

## 14. Errores comunes

| Error | Consecuencia | Solución |
|---|---|---|
| Esperar que la memoria se comparta con el equipo | Tus compañeros no tienen ese contexto | Lo compartido va en `CLAUDE.md` / `rules/` |
| Guardar lo que ya está en el código o en git | Ruido y memorias que quedan desactualizadas | Guardar solo lo no deducible |
| Duplicar instrucciones de `CLAUDE.md` en memoria | Contradicciones cuando una cambia | Un dato, un lugar |
| Fechas relativas ("el próximo sprint") | Ambiguas al releerlas | Fechas absolutas: `2026-12-10` |
| Memorias gigantes con muchos temas | Difíciles de actualizar y de recuperar | Un hecho por archivo |
| Nunca revisar la memoria | Claude actúa con información vieja | Revisión periódica con `/memory` |
| Guardar secretos o datos de clientes | Riesgo de seguridad en texto plano | Nunca; bórralos si aparecen |
| Mover la carpeta del proyecto | Memoria "perdida" (queda en la ruta antigua) | Copiar la carpeta `memory/` a la nueva ruta codificada |

---

## 15. Resumen / chuleta

```text
¿Dónde guardo este conocimiento?

¿Lo necesita todo el equipo?
 ├─ Sí → CLAUDE.md  o  .claude/rules/
 └─ No → ¿Se puede deducir del código o de git?
          ├─ Sí → No lo guardes
          └─ No → ¿Sirve en sesiones futuras?
                   ├─ No → No lo guardes (es de esta conversación)
                   └─ Sí → AUTO MEMORY
                            ├─ ¿Quién eres?            → user
                            ├─ ¿Cómo quieres que trabaje? → feedback
                            ├─ ¿Qué pasa en el proyecto?  → project
                            └─ ¿Dónde está algo externo?  → reference
```

**Plantilla de memoria:**

```markdown
---
name: <slug-en-kebab-case>
description: <una línea para decidir relevancia>
metadata:
  type: user | feedback | project | reference
---

<El hecho, concreto.>

**Why:** <motivo>
**How to apply:** <cuándo y dónde aplicarlo>. Relacionado: [[otra-memoria]].
```

**Las 7 ideas que debes llevarte:**

1. La auto memory la escribe **Claude**; `CLAUDE.md` lo escribes **tú**.
2. Vive en `~/.claude/projects/<proyecto>/memory/`: personal, local y fuera del repo.
3. Al iniciar solo se carga el **índice** `MEMORY.md`; el detalle se lee bajo demanda.
4. **Un archivo = un hecho**, con `name`, `description` y `type`.
5. Cuatro tipos: `user`, `feedback`, `project`, `reference`.
6. Solo se guarda lo **útil en el futuro** y **no deducible** del repo.
7. Las memorias envejecen: se verifican, se actualizan y se borran.
