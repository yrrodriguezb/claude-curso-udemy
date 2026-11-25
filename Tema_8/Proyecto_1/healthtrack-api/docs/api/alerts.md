# API de Alertas de Salud

Base URL: `http://localhost:3000/api/alerts`

Todos los endpoints requieren la cabecera `Authorization: Bearer <token>` (token obtenido en `POST /api/auth/login`).

## Índice

- [Descripción](#descripción)
- [Convenciones](#convenciones)
- [Modelo Alert](#modelo-alert)
- [Umbrales y clasificación](#umbrales-y-clasificación)
- [GET /api/alerts/:patientId](#get-apialertspatientid)
- [PATCH /api/alerts/:id/acknowledge](#patch-apialertsidacknowledge)
- [Datos personales (PII) y auditoría](#datos-personales-pii-y-auditoría)
- [Limitaciones conocidas](#limitaciones-conocidas)

## Descripción

Las alertas se generan **automáticamente** al registrar una métrica con `POST /api/health-metrics` cuando algún valor queda fuera del rango normal. No existe endpoint para crearlas manualmente.

- La métrica y sus alertas se insertan en la **misma transacción** (`db.transaction` en `createMetric`): si falla la creación de una alerta, la métrica tampoco se guarda.
- Una métrica puede generar 0, 1 o 2 alertas. La presión arterial se evalúa por componente: `value` (sistólica) y `secondary_value` (diastólica) generan alertas **separadas**.
- El peso (`weight`) nunca genera alertas.
- Las alertas **coexisten** con el módulo `notifications` (que no cambió). Las notificaciones se siguen creando con su propia lógica (`checkMetricStatus`, que solo evalúa la sistólica) y se insertan **después** de la transacción, por lo que no forman parte de ella.
- Una alerta puede ser "reconocida" (acknowledged) por personal clínico mediante `PATCH /api/alerts/:id/acknowledge`.

## Convenciones

| Tipo de respuesta | Formato |
|-------------------|---------|
| Recurso único | `{ "data": { ... } }` |
| Colección | `{ "data": [ ... ], "count": 2 }` |
| Error | `{ "error": "descripción" }` |

Errores comunes (middleware `authenticate` / `authorize`):

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 401 | `{ "error": "No token provided" }` | Falta la cabecera `Authorization` |
| 401 | `{ "error": "Invalid or expired token" }` | Token inválido o expirado |
| 403 | `{ "error": "Insufficient permissions" }` | Rol no permitido (solo en el PATCH) |
| 429 | `{ "error": "Too many requests. Please try again later." }` | Rate limit por IP superado |

Los ejemplos usan `$TOKEN` con el JWT del usuario correspondiente.

## Modelo Alert

Tabla `alerts` (devuelta tal cual, `SELECT *`).

| Campo | Tipo | PII/PHI | Descripción |
|-------|------|---------|-------------|
| `id` | integer | No | Identificador de la alerta |
| `patient_id` | integer | Indirecto | Paciente (tabla `patients`, no `users`) al que pertenece la alerta |
| `metric_id` | integer \| null | Indirecto | Métrica (`health_metrics.id`) que originó la alerta |
| `metric_type` | string | PHI | `blood_pressure_systolic`, `blood_pressure_diastolic`, `glucose`, `heart_rate`, `temperature`, `oxygen_saturation`. La presión se desdobla en sistólica (`health_metrics.value`) y diastólica (`secondary_value`) |
| `value` | number | PHI | Valor medido del componente que disparó la alerta |
| `severity` | `"warning"` \| `"critical"` | PHI | Gravedad (nunca `normal`: no se crean alertas para valores normales) |
| `created_at` | string | No | Fecha de creación (`datetime('now')` de SQLite, UTC, `YYYY-MM-DD HH:MM:SS`) |
| `acknowledged` | `0` \| `1` | No | `1` si ya fue reconocida. Es un entero, no un booleano |
| `acknowledged_by` | integer \| null | Indirecto | Id del usuario (`users.id`) que la reconoció |
| `acknowledged_at` | string \| null | No | Fecha del reconocimiento (UTC) |

## Umbrales y clasificación

Fuente: `ALERT_THRESHOLDS` en `src/alerts/alerts.rules.ts`.

| `metric_type` | Unidad | Normal (inclusive) | Critical si `v <` | Critical si `v >` |
|---------------|--------|--------------------|-------------------|-------------------|
| `blood_pressure_systolic` | mmHg | 90 a 120 | 80 | 140 |
| `blood_pressure_diastolic` | mmHg | 60 a 80 | 50 | 90 |
| `glucose` | mg/dL | 70 a 100 | 54 | 125 |
| `heart_rate` | bpm | 60 a 100 | 50 | 120 |
| `temperature` | °C | 36.1 a 37.2 | 35.5 | 38.0 |
| `oxygen_saturation` | % | 95 a 100 | 90 | sin límite superior |
| `weight` | kg | no genera alertas | | |

Regla de clasificación (sin huecos entre rangos):

1. `normal` si `normalMin <= v <= normalMax` (no genera alerta).
2. `critical` si `v < criticalBelow` o `v > criticalAbove`.
3. `warning` en cualquier otro caso.

Ejemplos de valores límite:

| Métrica | Valor | Resultado |
|---------|-------|-----------|
| glucose | 100 | normal (sin alerta) |
| glucose | 100.5 | warning |
| glucose | 125 | warning |
| glucose | 125.1 | critical |
| glucose | 70 | normal |
| glucose | 69.9 | warning |
| glucose | 54 | warning |
| glucose | 53.9 | critical |
| temperature | 36.1 | normal |
| temperature | 36.0 | warning |
| temperature | 38.0 | warning |
| temperature | 38.1 | critical |
| temperature | 35.5 | warning |
| temperature | 35.4 | critical |
| blood_pressure_systolic | 140 | warning |
| blood_pressure_systolic | 140.1 | critical |
| blood_pressure_diastolic | 90 | warning |
| blood_pressure_diastolic | 91 | critical |
| oxygen_saturation | 90 | warning |
| oxygen_saturation | 89.9 | critical |
| oxygen_saturation | 101 | warning (no existe umbral crítico superior; valor no fisiológico que la API no rechaza) |

Rangos de entrada aceptados al registrar la métrica (`POST /api/health-metrics`): solo se exige `value` y `secondary_value` numéricos, finitos y `>= 0`. No hay máximos por métrica, de modo que valores no fisiológicos (p. ej. glucosa 5000) se aceptan y generan una alerta `critical`.

---

## GET /api/alerts/:patientId

Lista las alertas de un paciente.

**Autenticación**: `admin`, `doctor`, `patient` (cualquier usuario autenticado; el acceso se controla por paciente).

| Rol | Acceso |
|-----|--------|
| `admin` | Cualquier paciente |
| `doctor` | Solo pacientes con `assigned_doctor_id` igual a su id de usuario |
| `patient` | Solo su propio registro (`patients.user_id` igual a su id de usuario) |

Si el paciente **no existe o el usuario no tiene acceso**, se responde **404 `Patient not found`** en ambos casos. Es deliberado: evita que un usuario enumere qué ids de pacientes existen (un 403 revelaría que el id es válido).

**Parámetros de ruta**

| Nombre | Tipo | Validación |
|--------|------|------------|
| `patientId` | integer | Entero positivo; si no, 400 |

**Parámetros de query** (opcionales)

| Nombre | Valores válidos | Validación |
|--------|-----------------|------------|
| `acknowledged` | `true`, `false` | Cualquier otro valor: 400 |
| `severity` | `warning`, `critical` | Cualquier otro valor: 400 |

Los filtros se pueden combinar. La validación de parámetros (400) se hace **antes** del control de acceso.

**Ordenación**: `created_at` descendente y, en empate, `id` descendente (las más recientes primero). Sin paginación ni límite.

**Respuesta 200**

```json
{
  "data": [
    {
      "id": 12,
      "patient_id": 1,
      "metric_id": 43,
      "metric_type": "blood_pressure_diastolic",
      "value": 95,
      "severity": "critical",
      "created_at": "2026-11-24 08:01:12",
      "acknowledged": 0,
      "acknowledged_by": null,
      "acknowledged_at": null
    },
    {
      "id": 11,
      "patient_id": 1,
      "metric_id": 43,
      "metric_type": "blood_pressure_systolic",
      "value": 132,
      "severity": "warning",
      "created_at": "2026-11-24 08:01:12",
      "acknowledged": 1,
      "acknowledged_by": 2,
      "acknowledged_at": "2026-11-24 09:30:00"
    }
  ],
  "count": 2
}
```

Sin alertas: `{ "data": [], "count": 0 }`.

**Errores**

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 400 | `{ "error": "Invalid patientId" }` | `patientId` no es un entero positivo |
| 400 | `{ "error": "acknowledged must be true or false" }` | Valor inválido de `acknowledged` |
| 400 | `{ "error": "severity must be warning or critical" }` | Valor inválido de `severity` |
| 401 | `{ "error": "No token provided" }` | Sin token |
| 404 | `{ "error": "Patient not found" }` | Paciente inexistente o sin acceso |
| 500 | `{ "error": "Failed to fetch alerts" }` | Error interno |

**curl**

```bash
curl "http://localhost:3000/api/alerts/1?acknowledged=false&severity=critical" \
  -H "Authorization: Bearer $TOKEN"
```

---

## PATCH /api/alerts/:id/acknowledge

Marca una alerta como reconocida (vista por personal clínico).

**Autenticación**: `admin` o `doctor` (middleware `authorize('admin', 'doctor')`).

| Rol | Resultado |
|-----|-----------|
| `admin` | Puede reconocer cualquier alerta |
| `doctor` | Solo alertas de pacientes asignados a él. Alerta de otro paciente o inexistente: 404 `Alert not found` |
| `patient` | 403 `Insufficient permissions` |

El 404 es el mismo para "no existe" y "sin acceso" para no revelar la existencia de la alerta.

**Parámetros de ruta**

| Nombre | Tipo | Validación |
|--------|------|------------|
| `id` | integer | Entero positivo (id de la alerta); si no, 400 |

**Cuerpo**: no se utiliza.

**Idempotencia**: si la alerta ya estaba reconocida, la operación responde 200 con la alerta sin cambios y **conserva** el `acknowledged_by` y `acknowledged_at` originales (el `UPDATE` solo se ejecuta con `acknowledged = 0`). Un segundo reconocimiento, por otro usuario o más tarde, no los sobrescribe.

**Respuesta 200**

```json
{
  "data": {
    "id": 12,
    "patient_id": 1,
    "metric_id": 43,
    "metric_type": "blood_pressure_diastolic",
    "value": 95,
    "severity": "critical",
    "created_at": "2026-11-24 08:01:12",
    "acknowledged": 1,
    "acknowledged_by": 2,
    "acknowledged_at": "2026-11-24 09:30:00"
  }
}
```

**Errores**

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 400 | `{ "error": "Invalid alert id" }` | `id` no es un entero positivo |
| 401 | `{ "error": "No token provided" }` | Sin token |
| 403 | `{ "error": "Insufficient permissions" }` | Rol `patient` |
| 404 | `{ "error": "Alert not found" }` | Alerta inexistente, o doctor no asignado al paciente |
| 500 | `{ "error": "Failed to acknowledge alert" }` | Error interno |

**curl**

```bash
curl -X PATCH http://localhost:3000/api/alerts/12/acknowledge \
  -H "Authorization: Bearer $TOKEN"
```

---

## Datos personales (PII) y auditoría

Campos sensibles: `value`, `metric_type` y `severity` son datos de salud (PHI); `patient_id`, `metric_id`, `acknowledged_by` son identificadores indirectos que vinculan datos de salud con personas. El módulo no devuelve nombres ni emails.

Auditoría (middleware `audit-logger`, tabla `audit_log`):

- **Mutaciones**: `PATCH /api/alerts/:id/acknowledge` con código < 400 se registra con `action = PATCH`, `resource = alerts`, `resource_id` = id de la alerta, `details = { path, body }`. Se registra también cada reconocimiento repetido (idempotente). Los 4xx/5xx no se registran.
- **Lecturas auditadas**: los `GET` bajo `/api/alerts/` y `/api/health-metrics/` se registran cuando responden con código < 400 **o 404** (los intentos denegados quedan registrados). `resource` es `alerts` o `health-metrics` y `resource_id` es el `patientId` de la URL. `details = { path, status }`, **sin body**.
- No se registran GET con 400 (parámetros inválidos), 401 ni 500.
- `path` excluye la query string. El `resource`/`resource_id` se obtienen de `originalUrl`, por lo que son correctos aunque el router esté montado bajo `/api`.
- Redacción: en `details.body` los campos `password`, `password_hash` y `token` se guardan como `[REDACTED]`. Cualquier otro campo del cuerpo (por ejemplo `notes` en `POST /api/health-metrics`) se guarda en texto plano.
- `user_id` e `ip_address` se guardan en cada registro. Los errores al escribir la auditoría se ignoran en silencio y no interrumpen la respuesta.

## Limitaciones conocidas

- **Sin deduplicación**: registrar varias veces la misma lectura anormal crea una alerta nueva cada vez.
- **Sin límite por usuario**: el rate limiting es solo por IP; un usuario autenticado puede generar muchas alertas desde una misma IP hasta el límite global.
- **`acknowledged_by` visible al paciente**: el paciente que consulta sus alertas ve el id del usuario clínico que las reconoció.
- **Rol leído del JWT**: el rol y el id se toman del token (vigencia de 24 h); un cambio de rol o de asignación de doctor no se refleja en el rol hasta que el token expira. La asignación del doctor al paciente sí se consulta en BD en cada petición.
- Las alertas no se actualizan ni se eliminan si la métrica origen cambia; no hay endpoints para ello.
- Las notificaciones (módulo `notifications`) y las alertas son independientes: una presión con diastólica anormal y sistólica normal genera alerta pero no notificación.
- No hay paginación en `GET /api/alerts/:patientId`.
