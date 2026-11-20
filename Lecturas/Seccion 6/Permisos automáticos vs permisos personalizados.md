# ⚖️ Permisos automáticos vs permisos personalizados

> Claude Code decide si una acción se **permite**, se **pregunta** o se **deniega** combinando dos fuentes:
>
> - **Permisos automáticos** → lo que Claude Code decide **por sí mismo**: el modo activo, el clasificador del modo `auto`, las protecciones fijas y las reglas que se guardan solas al aprobar un diálogo.
> - **Permisos personalizados** → lo que **tú declaras** explícitamente (reglas, flags, hooks, sandbox).
>
> Este documento **no repite** la sintaxis ni la configuración: eso está en [Modos de permisos de Claude Code](./Modos%20de%20permisos%20de%20Claude%20Code.md) y [Permisos personalizados con Claude Code](./Permisos%20personalizados%20con%20Claude%20Code.md). Aquí se trata **cómo se relacionan ambos enfoques y cuándo usar cada uno**.

---

## 📑 Tabla de contenido

1. [La diferencia en 30 segundos](#-1-la-diferencia-en-30-segundos)
2. [Lo que Claude Code decide por sí mismo](#-2-lo-que-claude-code-decide-por-sí-mismo)
3. [Cómo se combinan: el flujo de decisión](#-3-cómo-se-combinan-el-flujo-de-decisión)
4. [Comparativa detallada](#-4-comparativa-detallada)
5. [Modo `auto` frente a reglas explícitas](#-5-modo-auto-frente-a-reglas-explícitas)
6. [De automático a personalizado: endurecer reglas aprendidas](#-6-de-automático-a-personalizado-endurecer-reglas-aprendidas)
7. [Defensa en profundidad](#-7-defensa-en-profundidad)
8. [Errores comunes](#-8-errores-comunes)
9. [Chuleta y checklist](#-9-chuleta-y-checklist)

---

## 🟢 1. La diferencia en 30 segundos

| | 🤖 Automáticos | ✍️ Personalizados |
|---|---|---|
| **Quién decide** | Claude Code (modo, clasificador, protecciones) | Tú, tu equipo o tu organización |
| **Configuración** | Ninguna o mínima | `settings.json`, flags, hooks |
| **Previsibilidad** | Media: depende del modo y del contexto | Alta: misma entrada → misma decisión |
| **Se comparte con el equipo** | No | Sí (`.claude/settings.json`) |
| **Ideal para** | Empezar, uso personal, exploración | Equipos, proyectos sensibles, CI/CD |
| **Riesgo principal** | Fatiga de aprobaciones o exceso de confianza | Reglas mal escritas o demasiado amplias |

**Analogía:** los automáticos son el **cinturón de seguridad de fábrica**; los personalizados son **las normas de tu empresa sobre quién conduce, por dónde y a qué velocidad**.

---

## 🟢 2. Lo que Claude Code decide por sí mismo

### 2.1 El modo como "respuesta por defecto"

El modo activo solo decide lo que **no está cubierto por ninguna regla**. Es el relleno del hueco que dejan tus reglas (detalle de cada modo en el documento de modos).

### 2.2 El clasificador del modo `auto`

Un modelo en segundo plano evalúa cada acción y **bloquea o escala** las que parecen destructivas o sospechosas: borrados masivos, `git push --force`, exfiltración de datos, acciones fuera del alcance de la tarea o instrucciones que vienen de contenido externo (*prompt injection*).

> [!NOTE]
> Es **probabilístico**: reduce el riesgo, no lo elimina. Lo que bloquea aparece en `/permissions` → denegaciones recientes.

### 2.3 Protecciones fijas

- Escribir en `.git/` o en la configuración de `.claude/` siempre requiere confirmación: Claude no puede **auto-concederse** permisos.
- La primera vez que abres un proyecto, Claude Code pide confirmar que **confías en el directorio**.

### 2.4 Reglas "aprendidas" desde los diálogos

Al elegir **"Sí, y no volver a preguntar"**, Claude Code **escribe una regla personalizada por ti**: es el punto donde lo automático se convierte en personalizado.

| Herramienta | Qué se guarda | Duración |
|-------------|---------------|----------|
| `Bash` | Una regla por comando (o por subcomando, máx. 5) | Permanente, en `.claude/settings.local.json` |
| `Edit` / `Write` | Permiso de edición | Hasta el fin de la sesión |
| `WebFetch` | `WebFetch(domain:...)` | Según el diálogo |

> [!WARNING]
> Son cómodas pero **se acumulan sin revisión** y pueden quedar más amplias de lo que pensabas (ej.: `Bash(npm *)` cuando solo querías `npm test`).

---

## 🟡 3. Cómo se combinan: el flujo de decisión

```
              Claude quiere usar una herramienta
                            │
                            ▼
              ┌──────────────────────────┐
  PERSONAL.   │ Hooks PreToolUse          │──► deny ⇒ ⛔
              │ Reglas deny → ask → allow │──► primera coincidencia decide
              └──────────────────────────┘
                            │ ninguna coincide
                            ▼
              ┌──────────────────────────┐
  AUTOMÁT.    │ Protecciones fijas        │
              │ Modo activo               │──► permitir / preguntar / denegar
              │ (+ clasificador en auto)  │
              └──────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
  SO          │ Sandbox (si está activo)  │──► limita lo que el proceso
              └──────────────────────────┘     puede tocar realmente
```

**Reglas de oro:**

1. **Lo personalizado se evalúa primero**; lo automático solo decide en el hueco.
2. Un `deny` personalizado gana incluso en `auto` o `bypassPermissions`.
3. Un `allow` personalizado evita el diálogo del modo, pero **no** salta las protecciones fijas.
4. El sandbox está **por debajo de todo**: aunque algo se permita, el SO puede impedirlo.

---

## 🟡 4. Comparativa detallada

| Criterio | 🤖 Automáticos | ✍️ Personalizados |
|----------|----------------|-------------------|
| Esfuerzo inicial | Cero | Medio (diseñar reglas) |
| Mantenimiento | Ninguno, pero las reglas aprendidas crecen solas | Revisar y podar periódicamente |
| Determinismo | Bajo en `auto`, alto en el resto | Alto |
| Granularidad | Por tipo de herramienta | Por comando, ruta, dominio, servidor MCP |
| Entiende la intención de la tarea | ✅ (clasificador) | ❌ (salvo hooks) |
| Resistencia a prompt injection | Media | Alta en `deny`; baja con `allow` amplios |
| Auditoría | Difícil (decisiones dinámicas) | Fácil (está en git) |
| Consistencia en el equipo | Cada uno su experiencia | Misma política para todos |
| CI/CD | ❌ No hay humano para responder | ✅ Lista cerrada |

### Cuándo gana cada uno

| Situación | Mejor opción |
|-----------|--------------|
| Primer día con Claude Code | Automático (`default`) |
| Explorar un repo nuevo | Automático (`plan`) |
| Refactor largo personal | Automático (`auto`) + `deny` personalizados |
| Proyecto de equipo | Personalizado y versionado |
| Datos sensibles / producción | Personalizado estricto + sandbox |
| Pipeline CI/CD | Personalizado (`dontAsk` + lista cerrada) |
| Cumplimiento normativo | Personalizado gestionado por la organización |
| Contenedor desechable | Automático máximo (`bypassPermissions`) + `deny` para secretos montados |

---

## 🟠 5. Modo `auto` frente a reglas explícitas

La comparación más relevante en la práctica: **¿dejo que el clasificador decida o escribo reglas?**

| | Modo `auto` | Reglas explícitas |
|---|---|---|
| Cómo decide | Modelo que razona sobre acción y contexto | Coincidencia de patrones |
| Detecta "esto no tiene sentido para la tarea" | ✅ | ❌ |
| Garantía | ❌ Probabilística | ✅ Determinista (dentro de su alcance) |
| Coste | Latencia/tokens extra por acción | Ninguno |
| Falsos positivos (bloquea algo legítimo) | Posibles | Solo si la regla está mal |
| Falsos negativos (permite algo peligroso) | Posibles | Si el `allow` es amplio o eludible |

**Recomendación:** no elijas, **combina**. El clasificador cubre lo **imprevisto**; las reglas `deny` cubren lo que **nunca** debe pasar.

```json
{
  "permissions": {
    "defaultMode": "auto",
    "deny": ["Read(**/.env)", "Bash(git push --force *)", "Bash(dotnet ef database drop *)"],
    "ask":  ["Bash(git push *)"]
  }
}
```

---

## 🟠 6. De automático a personalizado: endurecer reglas aprendidas

Flujo para pasar de "lo que fui aprobando" a una política limpia:

1. **Trabaja unos días** aprobando con "no volver a preguntar".
2. **Revisa** lo acumulado en `/permissions` o en `.claude/settings.local.json`.
3. **Clasifica** cada regla:

   | Regla aprendida | Acción |
   |-----------------|--------|
   | `Bash(npm test)` | Generalizar con cuidado → `Bash(npm test *)` |
   | `Bash(npm *)` | Demasiado amplia → `allow` concretos + `ask` para `npm install *` / `npm publish *` |
   | `Bash(cat .env)` | ⚠️ Eliminar y añadir `deny` |
   | `Bash(git push origin main)` | Pasar a `ask` |

4. **Promueve** lo útil para todos a `.claude/settings.json`; deja lo personal en `settings.local.json`.
5. **Añade `deny`** para secretos y acciones irreversibles.
6. **Repite** periódicamente.

> [!TIP]
> El skill `/fewer-permission-prompts` analiza tus sesiones y propone una lista `allow` con los comandos de solo lectura más frecuentes: una forma guiada de convertir lo automático en personalizado.

---

## 🔴 7. Defensa en profundidad

Ninguna capa basta sola. Un experto las apila y sabe de qué tipo es cada una:

| Capa | Tipo | Protege contra | Límite |
|------|------|----------------|--------|
| 1. Modo | 🤖 Automático | Acciones no revisadas | Fatiga de aprobaciones |
| 2. Clasificador `auto` | 🤖 Automático | Acciones fuera de contexto, injection | Probabilístico |
| 3. Reglas `deny` / `ask` | ✍️ Personalizado | Lo que nunca / siempre debe confirmarse | Patrones eludibles en Bash |
| 4. Hooks `PreToolUse` | ✍️ Personalizado | Lógica compleja (rama, SQL, horario) | Tu código puede tener huecos |
| 5. Sandbox | ✍️ Personalizado | Acceso real a archivos y red | Configuración adicional |
| 6. Entorno (contenedor, credenciales mínimas) | Infraestructura | Daño máximo posible | Coste operativo |
| 7. Git + revisión humana | Proceso | Lo que pasa todas las capas | Requiere disciplina |

**Principios:**

- **Determinista para lo crítico:** lo que nunca debe pasar va en `deny` + sandbox, no en el clasificador.
- **Probabilístico para lo imprevisto:** el modo `auto` atrapa lo que no anticipaste.
- **Mínimo privilegio:** empieza cerrado, abre según necesidad.
- **Reversibilidad:** trabaja siempre con git.

---

## ⚠️ 8. Errores comunes

| Error | Consecuencia | Corrección |
|-------|--------------|------------|
| Confiar solo en el modo `auto` para secretos | El clasificador puede fallar | `deny` explícito + sandbox |
| Aprobar todo con "no volver a preguntar" | Reglas amplias acumuladas | Auditar `/permissions` periódicamente |
| Poner `"allow": ["Bash"]` para "quitar molestias" | Desactiva toda supervisión de shell | `allow` concretos por comando |
| Subir `settings.local.json` a git | Se comparten reglas personales aprendidas | Mantenerlo en `.gitignore` |
| Pensar que `allow` salta las protecciones fijas | Diálogos "inesperados" en `.git/` o `.claude/` | Es comportamiento intencionado |

---

## ⚡ 9. Chuleta y checklist

| Quiero… | Vía automática | Vía personalizada |
|---------|----------------|-------------------|
| Menos interrupciones | `acceptEdits` / `auto` | `allow` para comandos frecuentes |
| Más control | `default` / `plan` | `ask` para acciones sensibles |
| Bloquear algo siempre | — | `deny` |
| Ejecutar sin humano | — | `dontAsk` + lista cerrada |
| Ver qué se bloqueó | `/permissions` (denegaciones recientes) | `/permissions` (origen de reglas) |

- [ ] Sé qué decide Claude Code por sí mismo y qué decido yo.
- [ ] Entiendo que mis reglas se evalúan **antes** que el modo.
- [ ] Uso el modo `auto` como red de seguridad, no como única barrera.
- [ ] Reviso y promuevo las reglas aprendidas a una política limpia.
- [ ] Protejo lo crítico con capas deterministas (`deny`, hooks, sandbox).

---

> 📚 **Referencia oficial:** [Permisos (IAM)](https://docs.anthropic.com/en/docs/claude-code/iam) · [Settings](https://docs.anthropic.com/en/docs/claude-code/settings)
