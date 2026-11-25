# API de Pacientes

Base URL: `http://localhost:3000/api/patients`

Todos los endpoints requieren la cabecera `Authorization: Bearer <token>` (token obtenido en `POST /api/auth/login`). Las peticiones con cuerpo deben enviar `Content-Type: application/json`.

## Índice

- [Convenciones](#convenciones)
- [Modelo Patient](#modelo-patient)
- [Regla de emergency_phone](#regla-de-emergency_phone)
- [GET /api/patients](#get-apipatients)
- [GET /api/patients/:id](#get-apipatientsid)
- [POST /api/patients](#post-apipatients)
- [PUT /api/patients/:id](#put-apipatientsid)
- [DELETE /api/patients/:id](#delete-apipatientsid)
- [Datos personales (PII) y auditoría](#datos-personales-pii-y-auditoría)
- [Limitaciones conocidas](#limitaciones-conocidas)

## Convenciones

| Tipo de respuesta | Formato |
|-------------------|---------|
| Recurso único | `{ "data": { ... } }` |
| Colección | `{ "data": [ ... ], "count": 3 }` |
| Mensaje de operación | `{ "message": "Patient deleted" }` |
| Error | `{ "error": "descripción" }` |

Errores comunes a todos los endpoints (middleware `authenticate` / `authorize`):

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 401 | `{ "error": "No token provided" }` | Falta la cabecera `Authorization` |
| 401 | `{ "error": "Invalid or expired token" }` | Token inválido o expirado |
| 403 | `{ "error": "Insufficient permissions" }` | El rol no está permitido en el endpoint |
| 429 | (rate limiter) | Demasiadas peticiones desde la misma IP |

Los ejemplos usan la variable `$TOKEN` con el JWT del usuario correspondiente.

## Modelo Patient

| Campo | Tipo | PII | Descripción |
|-------|------|-----|-------------|
| `id` | integer | No | Identificador del paciente |
| `user_id` | integer | Indirecto | Usuario asociado (tabla `users`) |
| `name` | string | Sí | Nombre del usuario (join) |
| `email` | string | Sí | Email del usuario (join) |
| `date_of_birth` | string `YYYY-MM-DD` | Sí | Fecha de nacimiento |
| `gender` | `"male"` \| `"female"` \| `"other"` \| null | Sí (salud) | Género |
| `blood_type` | `"A+"`, `"A-"`, `"B+"`, `"B-"`, `"AB+"`, `"AB-"`, `"O+"`, `"O-"` \| null | Sí (salud) | Grupo sanguíneo |
| `allergies` | string \| null | Sí (salud) | Array JSON **serializado como string** (ej. `"[\"Penicilina\"]"`) |
| `emergency_contact` | string \| null | Sí | Nombre del contacto de emergencia |
| `emergency_phone` | string \| null | Sí | Teléfono del contacto de emergencia |
| `assigned_doctor_id` | integer \| null | No | Id del usuario doctor asignado |
| `doctor_name` | string \| null | Sí | Nombre del doctor asignado (join) |
| `created_at` | string | No | Fecha de creación |

## Regla de emergency_phone

- Opcional.
- Acepta `null`. En `PUT`, enviar `null` **borra** el valor almacenado.
- Formato internacional: debe empezar por `+` y contener solo dígitos, espacios y guiones.
- Sin contar separadores (espacios y guiones) debe cumplir E.164: código de país que no empieza por `0` y entre 8 y 15 dígitos en total.
- El valor se almacena tal cual se envía (no se normaliza): `"+34 612 345 678"` y `"+34612345678"` se guardan y devuelven de forma distinta.
- Cadena vacía (`""`) es inválida.

| Valor | Válido | Motivo |
|-------|--------|--------|
| `"+34 612 345 678"` | Sí | |
| `"+34612345678"` | Sí | |
| `"+1-202-555-0143"` | Sí | |
| `"612345678"` | No | Sin prefijo `+` |
| `"+34 (612) 345 678"` | No | Paréntesis no permitidos |
| `""` | No | Cadena vacía |

Error de validación (400):

```json
{ "error": "emergency_phone must be a valid international phone number (e.g. +34 612 345 678)" }
```

---

## GET /api/patients

Lista los pacientes visibles para el usuario autenticado.

**Autenticación**: `admin`, `doctor`, `patient`. Alcance por rol:

| Rol | Resultado |
|-----|-----------|
| `admin` | Todos los pacientes |
| `doctor` | Solo pacientes con `assigned_doctor_id` igual a su id de usuario |
| `patient` | Solo su propio registro |

**Parámetros**: ninguno.

**Respuesta 200**

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "name": "Carlos Ruiz",
      "email": "carlos.ruiz@email.com",
      "date_of_birth": "1978-03-14",
      "gender": "male",
      "blood_type": "O+",
      "allergies": "[\"Penicilina\"]",
      "emergency_contact": "Marta Ruiz",
      "emergency_phone": "+34 612 345 678",
      "assigned_doctor_id": 2,
      "doctor_name": "Elena Martinez",
      "created_at": "2026-01-10 09:00:00"
    }
  ],
  "count": 1
}
```

**Errores**

| Código | Cuerpo |
|--------|--------|
| 401 | `{ "error": "No token provided" }` |
| 500 | `{ "error": "Failed to fetch patients" }` |

**curl**

```bash
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN"
```

---

## GET /api/patients/:id

Obtiene un paciente por id.

**Autenticación**: `admin`, `doctor`, `patient`.
- `patient`: solo puede ver su propio registro; si pide otro recibe 404.
- `admin` y `doctor`: ven cualquier paciente (ver [Limitaciones conocidas](#limitaciones-conocidas)).

**Parámetros de ruta**

| Nombre | Tipo | Validación |
|--------|------|------------|
| `id` | integer | Debe ser numérico; si no, 400 |

**Respuesta 200**

```json
{
  "data": {
    "id": 1,
    "user_id": 5,
    "name": "Carlos Ruiz",
    "email": "carlos.ruiz@email.com",
    "date_of_birth": "1978-03-14",
    "gender": "male",
    "blood_type": "O+",
    "allergies": "[\"Penicilina\"]",
    "emergency_contact": "Marta Ruiz",
    "emergency_phone": "+34 612 345 678",
    "assigned_doctor_id": 2,
    "doctor_name": "Elena Martinez",
    "created_at": "2026-01-10 09:00:00"
  }
}
```

**Errores**

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 400 | `{ "error": "Invalid patient id" }` | `id` no numérico |
| 401 | `{ "error": "No token provided" }` | Sin token |
| 404 | `{ "error": "Patient not found" }` | No existe, o el paciente pide un registro ajeno |
| 500 | `{ "error": "Failed to fetch patient" }` | Error interno |

**curl**

```bash
curl http://localhost:3000/api/patients/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## POST /api/patients

Crea el registro de paciente para un usuario existente.

**Autenticación**: `admin`, `doctor`. Un `patient` recibe 403.

**Cuerpo (JSON)**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `user_id` | integer | Sí | Truthy; id del usuario asociado |
| `date_of_birth` | string | Sí | Formato `YYYY-MM-DD` (solo se valida el patrón, no que la fecha exista) |
| `gender` | string | No | `male`, `female` o `other` |
| `blood_type` | string | No | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `allergies` | string[] | No | Se guarda como JSON serializado |
| `emergency_contact` | string | No | Sin validación de formato |
| `emergency_phone` | string \| null | No | Ver [regla de emergency_phone](#regla-de-emergency_phone) |
| `assigned_doctor_id` | integer | No | Id de usuario doctor; no se verifica que exista ni que sea doctor |

**Ejemplo de request**

```json
{
  "user_id": 12,
  "date_of_birth": "1990-07-21",
  "gender": "female",
  "blood_type": "A-",
  "allergies": ["Polen", "Latex"],
  "emergency_contact": "Luis Perez",
  "emergency_phone": "+1-202-555-0143",
  "assigned_doctor_id": 2
}
```

**Respuesta 201**

```json
{
  "data": {
    "id": 9,
    "user_id": 12,
    "name": "Paula Perez",
    "email": "paula.perez@email.com",
    "date_of_birth": "1990-07-21",
    "gender": "female",
    "blood_type": "A-",
    "allergies": "[\"Polen\",\"Latex\"]",
    "emergency_contact": "Luis Perez",
    "emergency_phone": "+1-202-555-0143",
    "assigned_doctor_id": 2,
    "doctor_name": "Elena Martinez",
    "created_at": "2026-11-24 10:15:00"
  }
}
```

**Errores**

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 400 | `{ "error": "user_id is required" }` | Falta `user_id` |
| 400 | `{ "error": "date_of_birth is required" }` | Falta `date_of_birth` |
| 400 | `{ "error": "date_of_birth must be in YYYY-MM-DD format" }` | Formato de fecha inválido |
| 400 | `{ "error": "gender must be male, female or other" }` | Género inválido |
| 400 | `{ "error": "invalid blood_type" }` | Grupo sanguíneo inválido |
| 400 | `{ "error": "emergency_phone must be a valid international phone number (e.g. +34 612 345 678)" }` | Teléfono inválido |
| 401 | `{ "error": "No token provided" }` | Sin token |
| 403 | `{ "error": "Insufficient permissions" }` | Rol `patient` |
| 500 | `{ "error": "<mensaje del error>" }` | Fallo de BD (ej. `user_id` inexistente por FK, o paciente duplicado); se devuelve el mensaje de la excepción |

**curl**

```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":12,"date_of_birth":"1990-07-21","gender":"female","blood_type":"A-","allergies":["Polen","Latex"],"emergency_contact":"Luis Perez","emergency_phone":"+1-202-555-0143","assigned_doctor_id":2}'
```

---

## PUT /api/patients/:id

Actualización parcial: solo se modifican los campos presentes en el cuerpo.

**Autenticación**: `admin`, `doctor`. Un `patient` recibe 403. Un doctor puede actualizar cualquier paciente, no solo los asignados.

**Parámetros de ruta**: `id` (integer, numérico).

**Cuerpo (JSON)**: todos los campos opcionales; `user_id` no se puede modificar.

| Campo | Tipo | Validación |
|-------|------|------------|
| `date_of_birth` | string | `YYYY-MM-DD` |
| `gender` | string | `male`, `female`, `other` |
| `blood_type` | string | Uno de los 8 grupos válidos |
| `allergies` | string[] | Reemplaza la lista completa |
| `emergency_contact` | string | Sin validación de formato |
| `emergency_phone` | string \| null | Ver [regla de emergency_phone](#regla-de-emergency_phone); `null` borra el valor |
| `assigned_doctor_id` | integer | Sin verificación de existencia |

Un cuerpo vacío no modifica nada y devuelve el paciente actual.

**Ejemplo de request** (solo se actualiza el teléfono)

```json
{ "emergency_phone": "+34 612 345 678" }
```

Para borrar el teléfono: `{ "emergency_phone": null }`.

**Respuesta 200**

```json
{
  "data": {
    "id": 9,
    "user_id": 12,
    "name": "Paula Perez",
    "email": "paula.perez@email.com",
    "date_of_birth": "1990-07-21",
    "gender": "female",
    "blood_type": "A-",
    "allergies": "[\"Polen\",\"Latex\"]",
    "emergency_contact": "Luis Perez",
    "emergency_phone": "+34 612 345 678",
    "assigned_doctor_id": 2,
    "doctor_name": "Elena Martinez",
    "created_at": "2026-11-24 10:15:00"
  }
}
```

**Errores**

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 400 | `{ "error": "Invalid patient id" }` | `id` no numérico |
| 400 | `{ "error": "date_of_birth must be in YYYY-MM-DD format" }` | Fecha inválida |
| 400 | `{ "error": "gender must be male, female or other" }` | Género inválido |
| 400 | `{ "error": "invalid blood_type" }` | Grupo sanguíneo inválido |
| 400 | `{ "error": "emergency_phone must be a valid international phone number (e.g. +34 612 345 678)" }` | Teléfono inválido |
| 401 | `{ "error": "No token provided" }` | Sin token |
| 403 | `{ "error": "Insufficient permissions" }` | Rol `patient` |
| 404 | `{ "error": "Patient not found" }` | No existe |
| 500 | `{ "error": "Failed to update patient" }` | Error interno |

**curl**

```bash
curl -X PUT http://localhost:3000/api/patients/9 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emergency_phone":"+34 612 345 678"}'
```

---

## DELETE /api/patients/:id

Elimina un paciente. Es un borrado físico (hard delete) e irreversible.

**Autenticación**: solo `admin`. `doctor` y `patient` reciben 403.

**Parámetros de ruta**: `id` (integer, numérico).

**Respuesta 200**

```json
{ "message": "Patient deleted" }
```

**Errores**

| Código | Cuerpo | Causa |
|--------|--------|-------|
| 400 | `{ "error": "Invalid patient id" }` | `id` no numérico |
| 401 | `{ "error": "No token provided" }` | Sin token |
| 403 | `{ "error": "Insufficient permissions" }` | Rol distinto de `admin` |
| 404 | `{ "error": "Patient not found" }` | No existe |
| 500 | `{ "error": "Failed to delete patient" }` | Error interno (ej. restricciones de integridad por citas o métricas asociadas) |

**curl**

```bash
curl -X DELETE http://localhost:3000/api/patients/9 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Datos personales (PII) y auditoría

Campos PII/datos de salud en este módulo: `name`, `email`, `date_of_birth`, `gender`, `blood_type`, `allergies`, `emergency_contact`, `emergency_phone`, `doctor_name`. Trátelos conforme a la normativa de protección de datos aplicable (HIPAA/RGPD).

Rangos de métricas de salud (presión, glucosa, etc.): no aplican a este módulo; se documentan en el módulo de health-metrics.

Auditoría (middleware `audit-logger`):
- Se registra en la tabla `audit_log` toda mutación exitosa (`POST`, `PUT`, `PATCH`, `DELETE` con código < 400); las lecturas (`GET`) no se auditan.
- Cada registro guarda `user_id`, método, recurso, `resource_id`, `details` (JSON con `path` y el `body` completo de la petición), IP y fecha.
- Consecuencia: el cuerpo enviado, incluido `emergency_phone` y otros PII, queda almacenado en texto plano en `audit_log.details`.
- Los errores de auditoría se ignoran en silencio y no interrumpen la respuesta.
- Según el código actual, el middleware está montado a nivel de aplicación, por lo que `req.path` incluye el prefijo `/api`; el campo `resource` puede quedar como `api` y `resource_id` como `null`. Verifique el contenido real de `audit_log` antes de depender de estos campos.

## Limitaciones conocidas

Comportamientos actuales del código (marcados `FIXME`/`DEBT` en el fuente), documentados para evitar sorpresas:

- `GET /api/patients/:id`: un `doctor` puede ver cualquier paciente, no solo los asignados (FIXME de seguridad). El listado `GET /api/patients` sí filtra por doctor asignado.
- `PUT` y `POST` no restringen al doctor a sus pacientes asignados.
- `DELETE` es un hard delete; la intención documentada es soft delete (DEBT).
- `allergies` se devuelve como string JSON serializado, no como array.
- Validación de `date_of_birth`: solo formato, no se comprueba que sea una fecha real ni que no sea futura.
