# API de Métricas de Salud y Notificaciones

> **Estado previo a la implementación del sistema de alertas (2026-11-24)**
>
> Este documento describe el comportamiento ACTUAL del código, como referencia antes de los cambios. Incluye hallazgos que son defectos o diferencias respecto a lo esperado; se señalan explícitamente.

Fuentes: `src/health-metrics/` (routes, service, validation, types), `src/notifications/` (routes, service, types), `src/index.ts`, `src/auth/auth.middleware.ts`, `src/middleware/audit-logger.ts`, `src/middleware/rate-limiter.ts`, `src/database/migrations.ts`.

## Montaje y middlewares

En `src/index.ts`:

```
app.use(express.json());
app.use(rateLimiter);      // global, por IP
app.use(auditLogger);      // global, solo mutaciones exitosas
app.use('/api/health-metrics', metricsRoutes);
app.use('/api/notifications', notificationsRoutes);
```

Todos los endpoints de este documento usan solo `authenticate` (JWT `Authorization: Bearer <token>`). **Ninguno usa `authorize(...roles)`.**

Errores comunes a todos los endpoints:

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 401 | `{ "error": "No token provided" }` | Falta cabecera `Authorization: Bearer ...` |
| 401 | `{ "error": "Invalid or expired token" }` | Token inválido o expirado |
| 429 | `{ "error": "Too many requests. Please try again later." }` | Rate limit por IP superado (cabeceras `X-RateLimit-Limit/Remaining/Reset`) |

## Tipos de datos

`MetricType`: `blood_pressure`, `glucose`, `weight`, `heart_rate`, `temperature`, `oxygen_saturation`.

Unidades de referencia (`VALID_UNITS`, solo informativas; ver nota de validación): mmHg, mg/dL, kg, bpm, °C, %.

`HealthMetric`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | number | |
| `patient_id` | number | PII indirecta: vincula dato de salud con un paciente |
| `metric_type` | MetricType | |
| `value` | number | Dato de salud (PHI). En presión arterial es la sistólica |
| `secondary_value` | number \| null | Dato de salud (PHI). Diastólica en presión arterial |
| `unit` | string | |
| `recorded_at` | string | ISO 8601 |
| `recorded_by` | number \| null | ID del usuario que registró (viene del JWT) |
| `notes` | string \| null | Texto libre; puede contener PHI/PII |
| `created_at` | string | `datetime('now')` de SQLite (UTC) |
| `recorded_by_name` | string (opcional) | PII (nombre del usuario que registró) |

## Campos PII / PHI

- PHI: `value`, `secondary_value`, `notes`, y la relación `patient_id` + métrica.
- PII: `recorded_by_name`, `patient_name` (notificaciones), `notes` si contiene datos personales.

## Auditoría (audit logging)

`auditLogger` envuelve `res.json` y registra en la tabla `audit_log` solo si el método es POST/PUT/PATCH/DELETE y `res.statusCode < 400` al momento de responder con `res.json`. Guarda `user_id`, `action` (método), `resource` (primer segmento de `req.path`), `resource_id` (segundo segmento si es numérico), `details` = `{ path, body }` en JSON e `ip_address`.

Consecuencias para este módulo:
- Los **GET no se auditan** (lectura de datos de salud sin registro).
- `POST /api/health-metrics` se audita, incluyendo el **cuerpo completo** (valores de salud y `notes` quedan en `audit_log.details` en texto plano).
- `PATCH /api/notifications/:id/read` se audita.
- Nota: `req.path` dentro del middleware global es la ruta completa (ej. `/api/health-metrics`), por lo que `resource` queda como `api` y `resource_id` como `health-metrics` parseado (NaN, se guarda `null`). Es decir, el campo `resource` no distingue el recurso real. Observación derivada de leer el código; no se ejecutó.
- Los errores de auditoría se ignoran silenciosamente.

---

## Endpoints de métricas (`/api/health-metrics`)

### 1. GET /api/health-metrics/:patientId

Lista las métricas de un paciente, ordenadas por `recorded_at` descendente.

- **Autenticación**: cualquier usuario autenticado (`admin`, `doctor`, `patient`).
- **Reglas de acceso por rol**: **no hay ninguna**. El código no comprueba que el paciente pertenezca al doctor ni al usuario. Cualquier usuario autenticado puede leer las métricas de cualquier `patientId` (a diferencia de lo que indica CLAUDE.md para el control de acceso por rol). Defecto de control de acceso (IDOR).
- **Parámetros de ruta**: `patientId` (integer; `parseInt`, si es NaN responde 400). Es el ID de la tabla `patients`, no de `users`.
- **Query** (todos opcionales, sin validación de formato):
  - `type` (string): filtra por `metric_type` exacto. Un valor desconocido devuelve lista vacía, no error.
  - `dateFrom` (string): `recorded_at >= dateFrom` (comparación de texto).
  - `dateTo` (string): `recorded_at <= dateTo` (comparación de texto).
- **Éxito 200**: `{ data: HealthMetric[], count: number }`
- **Errores**:
  - 400 `{ "error": "Invalid patientId" }`
  - 500 `{ "error": "Failed to fetch metrics" }`
- Un `patientId` inexistente devuelve 200 con `data: []`.

Ejemplo:

```bash
curl "http://localhost:3000/api/health-metrics/1?type=glucose&dateFrom=2026-11-01T00:00" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": [
    {
      "id": 42,
      "patient_id": 1,
      "metric_type": "glucose",
      "value": 145,
      "secondary_value": null,
      "unit": "mg/dL",
      "recorded_at": "2026-11-20T08:00:00Z",
      "recorded_by": 4,
      "notes": null,
      "created_at": "2026-11-20 08:01:12",
      "recorded_by_name": "Sarah Okonkwo"
    }
  ],
  "count": 1
}
```

### 2. GET /api/health-metrics/:patientId/summary

Devuelve un resumen por tipo de métrica (solo los tipos con al menos un registro).

- **Autenticación**: cualquier usuario autenticado.
- **Reglas de acceso por rol**: ninguna (mismo problema que el endpoint 1).
- **Parámetros de ruta**: `patientId` (integer).
- **Cálculo** (por tipo): `latest_*` = registro más reciente por `recorded_at`; `avg_value` redondeado a 1 decimal; `min_value`, `max_value`, `count`; `trend`: con 6 o más registros compara el promedio de los 3 más recientes contra los 3 anteriores; `rising`/`falling` si la diferencia absoluta supera el 3% del promedio anterior, si no `stable` (con menos de 6 registros siempre `stable`); `status` = `checkMetricStatus(tipo, latest_value)`. Solo se evalúa `value`, nunca `secondary_value`.
- **Éxito 200**: `{ data: MetricSummary[] }` (sin `count`). Si no hay datos, `data: []`.
- **Errores**: 400 `{ "error": "Invalid patientId" }`; 500 `{ "error": "Failed to fetch summary" }`.

```bash
curl http://localhost:3000/api/health-metrics/1/summary -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": [
    {
      "metric_type": "blood_pressure",
      "latest_value": 138,
      "latest_secondary_value": 88,
      "latest_recorded_at": "2026-11-20T08:00:00Z",
      "avg_value": 131.4,
      "min_value": 120,
      "max_value": 142,
      "count": 8,
      "trend": "rising",
      "status": "warning"
    }
  ]
}
```

### 3. POST /api/health-metrics

Registra una métrica y, si está fuera de rango, genera una notificación automática.

- **Autenticación**: cualquier usuario autenticado. No hay comprobación de rol ni de relación con el paciente: un paciente puede registrar métricas para otro paciente, y un doctor para pacientes no asignados. `recorded_by` se toma de `req.user.userId`.
- **Body** (JSON):

| Campo | Tipo | Requerido | Validación real |
|-------|------|-----------|-----------------|
| `patient_id` | number | Sí | Solo truthy (0 se rechaza). No se valida tipo ni existencia |
| `metric_type` | string | Sí | Debe ser uno de `MetricType` |
| `value` | number | Sí | No null/undefined; `Number(value)` no NaN; `>= 0` (0 es aceptado) |
| `secondary_value` | number | No | Sin validación (ni obligatorio para `blood_pressure`) |
| `unit` | string | Sí | Solo truthy; **no se compara con la unidad esperada** del tipo |
| `recorded_at` | string | Sí | Regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}` (ISO 8601 con hora) |
| `notes` | string | No | Sin validación |

- **Rangos válidos de entrada**: el código no impone máximos ni mínimos por métrica; solo `value >= 0`. Los rangos clínicos de la sección "Detección de anomalías" solo sirven para clasificar. Por ejemplo `glucose: 5000` se acepta y se marca critical.
- **Éxito 201**: `{ data: HealthMetric }` (incluye `recorded_by_name`).
- **Errores 400** (`{ "error": ... }`, primero que falle):
  `patient_id is required`, `metric_type is required`, `value is required`, `unit is required`, `recorded_at is required`, `metric_type must be one of: blood_pressure, glucose, weight, heart_rate, temperature, oxygen_saturation`, `value must be a number`, `value must be positive`, `recorded_at must be ISO 8601 format`.
- **Error 500**: `{ "error": <err.message> }`. Con `patient_id` inexistente falla la FK (`foreign_keys = ON`) y se devuelve el mensaje de SQLite (por ejemplo `FOREIGN KEY constraint failed`) con 500 en lugar de 404/400. Nota: si falla la creación de la notificación tras insertar la métrica, la métrica ya quedó guardada (no hay transacción) y se responde 500.
- **Auditoría**: sí, con body completo.

```bash
curl -X POST http://localhost:3000/api/health-metrics \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"patient_id":1,"metric_type":"glucose","value":145,"unit":"mg/dL","recorded_at":"2026-11-24T08:00:00Z","notes":"Post desayuno"}'
```

```json
{
  "data": {
    "id": 43, "patient_id": 1, "metric_type": "glucose", "value": 145,
    "secondary_value": null, "unit": "mg/dL", "recorded_at": "2026-11-24T08:00:00Z",
    "recorded_by": 4, "notes": "Post desayuno",
    "created_at": "2026-11-24 08:01:12", "recorded_by_name": "Sarah Okonkwo"
  }
}
```

Error de ejemplo (400): `{ "error": "value must be positive" }`.

---

## Detección de anomalías (`checkMetricStatus`)

Función `checkMetricStatus(metricType, value)` en `metrics.service.ts`. Devuelve `normal`, `warning` o `critical`. Se usa en `createMetric` (para notificar) y en `getPatientSummary` (campo `status`). Lógica: si `value` está dentro de [normalMin, normalMax] (inclusive) es `normal`; si no, es `critical` cuando supera el umbral crítico de ese tipo; en otro caso `warning`. `weight` no tiene rango: siempre `normal`.

| Métrica | Normal (inclusive) | Warning | Critical |
|---------|--------------------|---------|----------|
| blood_pressure (solo `value`, sistólica) | 90–120 | 80–89.x y 120.x–140 | > 140 o < 80 |
| glucose | 70–100 | 54–69.x y 100.x–125 | > 125 o < 54 |
| heart_rate | 60–100 | 50–59.x y 100.x–120 | > 120 o < 50 |
| temperature | 36.1–37.2 | 35.5–36.0x y 37.2x–38.0 | > 38.0 o < 35.5 |
| oxygen_saturation | 95–100 | 90–94.x y > 100 | < 90 |
| weight | — | — | — (siempre normal) |

(Los valores decimales entre enteros, como 120.5, también se clasifican por comparación continua.)

### Diferencias respecto a la tabla de CLAUDE.md

1. **Presión diastólica no se evalúa.** CLAUDE.md define rangos diastólicos (normal 60–80, critical >90 / <50), pero el código solo clasifica `value` como sistólica y nunca mira `secondary_value`. Una diastólica de 120 con sistólica de 110 se considera `normal`.
2. **Saturación O₂ > 100** se clasifica como `warning` (cae fuera del rango normal y no es < 90). CLAUDE.md no lo contempla. Valores > 100 no son fisiológicos y no se rechazan.
3. **Temperatura 36.0–36.1**: CLAUDE.md deja ese hueco entre "<36.0 warning" y "normal desde 36.1"; el código lo trata como `warning` (todo lo que sea < 36.1 y >= 35.5).
4. Los campos `warningMin/warningMax/criticalMin/criticalMax` de `METRIC_RANGES` están declarados pero **no se usan**; los umbrales críticos están codificados de forma fija en `if` por tipo. Un cambio en `METRIC_RANGES` no afectará la lógica crítica.
5. Resto de umbrales (sistólica, glucosa, ritmo cardíaco, temperatura y O₂ críticos) coinciden con CLAUDE.md.

---

## Notificaciones

### Generación automática al registrar una métrica

En `createMetric`, tras insertar la métrica, se calcula `checkMetricStatus(metric_type, value)`:

- `normal`: no se crea notificación.
- `warning`: se crea una notificación con `type: "metric_warning"`, `severity: "warning"`.
- `critical`: `type: "metric_critical"`, `severity: "critical"`.

Contenido:
- `title`: `"<metric_type con _ reemplazado por espacio> <crítico|advertencia>"`, por ejemplo `glucose crítico`, `blood pressure advertencia`, `oxygen saturation crítico`.
- `message`: `"Nivel de <metric label> fuera de rango normal"`.
- `patient_id`: el de la métrica; `related_metric_id`: id de la métrica insertada.

Limitaciones actuales:
- El mensaje y el título **no incluyen el valor medido ni la unidad** (DEBT en el código).
- Solo se dispara en la creación (POST). No hay deduplicación, ni acumulación por tendencia, ni notificación al doctor aparte: las notificaciones están ligadas al `patient_id` y los doctores las ven por el filtro `assigned_doctor_id`.
- Los tipos `appointment_reminder` y `general` existen en el tipo/CHECK de la tabla, pero este módulo no los genera.
- No hay transacción entre la inserción de la métrica y la de la notificación.
- Solo se evalúa la sistólica en presión arterial (ver diferencias arriba).

Objeto `Notification`: `id`, `patient_id`, `type` (`metric_warning|metric_critical|appointment_reminder|general`), `title`, `message`, `severity` (`info|warning|critical`), `read` (0 o 1), `related_metric_id`, `created_at`, `patient_name` (PII, solo en listados).

### Endpoints (`/api/notifications`)

Todos requieren solo `authenticate`; el filtrado por rol se hace en el servicio.

#### GET /api/notifications

Lista las notificaciones visibles para el usuario, ordenadas por `created_at` descendente, **máximo 100** (sin paginación).

- Acceso por rol: `admin` ve todas; `doctor` ve las de pacientes con `assigned_doctor_id = userId`; `patient` ve las de su propio registro (`patients.user_id = userId`).
- Éxito 200: `{ data: Notification[], count: number }`. Error 500: `{ "error": "Failed to fetch notifications" }`.

```bash
curl http://localhost:3000/api/notifications -H "Authorization: Bearer $TOKEN"
```

```json
{
  "data": [
    {
      "id": 7, "patient_id": 1, "type": "metric_critical",
      "title": "glucose crítico", "message": "Nivel de glucose fuera de rango normal",
      "severity": "critical", "read": 0, "related_metric_id": 43,
      "created_at": "2026-11-24 08:01:12", "patient_name": "Ana García"
    }
  ],
  "count": 1
}
```

#### GET /api/notifications/unread-count

Cantidad de notificaciones no leídas con el mismo criterio de rol (el admin cuenta todas, sin el límite de 100).

- Éxito 200: `{ "count": 3 }` (nota: formato `{ count }`, sin `data`). Error 500: `{ "error": "Failed to get unread count" }`.

```bash
curl http://localhost:3000/api/notifications/unread-count -H "Authorization: Bearer $TOKEN"
```

#### PATCH /api/notifications/:id/read

Marca una notificación como leída.

- Parámetro: `id` (integer; si es NaN 400).
- Acceso: `admin` cualquiera; `doctor` solo de pacientes asignados; `patient` solo las propias.
- Éxito 200: `{ "message": "Marked as read" }`.
- Errores: 400 `{ "error": "Invalid id" }`; 404 `{ "error": "Notification not found" }` (también cuando existe pero el usuario no tiene acceso, para no revelar su existencia); 500 `{ "error": "Failed to mark as read" }`.
- Auditoría: sí (PATCH exitoso).

```bash
curl -X PATCH http://localhost:3000/api/notifications/7/read -H "Authorization: Bearer $TOKEN"
```

```json
{ "message": "Marked as read" }
```

Nota: no existe endpoint HTTP para crear notificaciones; `createNotification` solo se invoca desde `createMetric`.

---

## Comentarios DEBT / FIXME relevantes

- `src/health-metrics/metrics.service.ts:82` — DEBT: N+1 en `getPatientSummary` (una query por tipo de métrica en lugar de `GROUP BY`).
- `src/health-metrics/metrics.service.ts:160` — DEBT: el mensaje de notificación no incluye el valor que disparó la alerta.
- `src/health-metrics/metrics.validation.ts:27` — DEBT: no se exige `secondary_value` para `blood_pressure`.
- `src/middleware/error-handler.ts:17` — FIXME: en desarrollo se envía el mensaje SQL completo al cliente (relevante para errores 500 no capturados en las rutas).
- `src/auth/auth.service.ts:55` — DEBT: `jwtSecret` debería venir de `process.env.JWT_SECRET` (afecta a la autenticación de todos los endpoints).

Defectos sin comentario en el código (hallados al documentar): falta de control de acceso por rol/paciente en los endpoints de métricas, `unit` no validada contra el tipo, diastólica no evaluada, `METRIC_RANGES` parcialmente sin uso, `patient_id` inexistente devuelve 500, GET de datos de salud no auditados.

---

## Cambios posteriores (sistema de alertas, 2026-11-24)

Las secciones anteriores describen el estado previo; este resumen recoge lo que cambió. Detalle de alertas en [alerts.md](alerts.md).

**POST /api/health-metrics**

- **Control de acceso por paciente**: ahora se exige acceso al paciente (`admin` cualquiera, `doctor` asignado, `patient` el propio). Si el paciente no existe o no hay acceso, responde `404 { "error": "Patient not found" }`. Sustituye al 500 por FK para `patient_id` inexistente y a la ausencia de control descrita arriba.
- **Validación estricta**:
  - `patient_id`: entero positivo (`patient_id must be a positive integer`); un string como `"1"` se rechaza.
  - `value`: número finito `>= 0` (`value must be a number` / `value must be positive`); no se aceptan strings. El valor 0 sigue siendo válido pese al mensaje.
  - `secondary_value` (opcional): número finito `>= 0` (`secondary_value must be a positive number`); no se aceptan strings.
  - El resto de campos (`metric_type`, `unit`, `recorded_at`) no cambia; `unit` sigue sin validarse contra el tipo y `secondary_value` sigue sin exigirse para `blood_pressure` (DEBT).
- **Errores 500 genéricos**: el cuerpo ahora es `{ "error": "Failed to create metric" }`, ya no el mensaje de la excepción.
- **Creación de alertas**: si algún valor está fuera de rango se crean alertas (presión: una por componente) en la misma transacción que la métrica. La notificación del módulo `notifications` se sigue creando aparte, tras la transacción.
- **Auditoría**: ver abajo.

**Auditoría**

- Los `GET /api/health-metrics/...` (y `GET /api/alerts/...`) ahora se registran en `audit_log` cuando responden con código < 400 o 404, con `details = { path, status }` y sin body.
- `resource` y `resource_id` se derivan de la URL original: `resource = health-metrics` y, en los GET, `resource_id` = `patientId`. Esto corrige la observación anterior de que `resource` quedaba como `api`.
- Se redactan `password`, `password_hash` y `token` en el body registrado; el resto (incluido `notes`) sigue en texto plano.

**Pendiente**: `GET /api/health-metrics/:patientId` y `GET /api/health-metrics/:patientId/summary` siguen **SIN control de acceso por paciente**: cualquier usuario autenticado puede leer las métricas de cualquier paciente (IDOR). Ahora, al menos, la lectura queda auditada.
