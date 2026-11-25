import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createTestUser, createTestPatient } from './setup';
import { loginUser } from '../src/auth/auth.service';
import { getDb } from '../src/database/connection';
import { auditLogger, parseAuditTarget } from '../src/middleware/audit-logger';
import metricsRoutes from '../src/health-metrics/metrics.routes';
import alertsRoutes from '../src/alerts/alerts.routes';
import { getAlertsByPatient } from '../src/alerts/alerts.service';

// Regresiones de la revisión de seguridad del sistema de alertas

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(auditLogger);
  app.use('/api/health-metrics', metricsRoutes);
  app.use('/api/alerts', alertsRoutes);
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function call(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as any };
}

const login = (email: string) => loginUser({ email, password: 'pw' }).token;
const glucose = (patient_id: unknown, value: unknown = 30) => ({
  patient_id, metric_type: 'glucose', value, unit: 'mg/dL', recorded_at: '2026-11-24T10:00',
});

let doctorId: number, patientId: number, otherPatientId: number;
let doctor: string, patient: string, otherDoctor: string;

beforeEach(() => {
  doctorId = createTestUser({ email: 'doc@t.com', password: 'pw', role: 'doctor', name: 'Doc' });
  createTestUser({ email: 'doc2@t.com', password: 'pw', role: 'doctor', name: 'Doc2' });
  const pUser = createTestUser({ email: 'p@t.com', password: 'pw', role: 'patient', name: 'P' });
  const oUser = createTestUser({ email: 'o@t.com', password: 'pw', role: 'patient', name: 'O' });
  patientId = createTestPatient({ userId: pUser, doctorId });
  otherPatientId = createTestPatient({ userId: oUser, doctorId });
  doctor = login('doc@t.com');
  otherDoctor = login('doc2@t.com');
  patient = login('p@t.com');
});

describe('POST /api/health-metrics — control de acceso (ALTA-1)', () => {
  it('un paciente no puede registrar métricas ni generar alertas en otro paciente', async () => {
    const res = await call('POST', '/api/health-metrics', patient, glucose(otherPatientId));
    expect(res.status).toBe(404);
    expect(getAlertsByPatient(otherPatientId)).toHaveLength(0);
  });

  it('un doctor no asignado recibe 404', async () => {
    const res = await call('POST', '/api/health-metrics', otherDoctor, glucose(patientId));
    expect(res.status).toBe(404);
    expect(getAlertsByPatient(patientId)).toHaveLength(0);
  });

  it('paciente inexistente → 404 sin filtrar el error de FK', async () => {
    const res = await call('POST', '/api/health-metrics', doctor, glucose(9999));
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/FOREIGN KEY/i);
  });

  it('el paciente propio y el doctor asignado sí generan alertas', async () => {
    expect((await call('POST', '/api/health-metrics', patient, glucose(patientId))).status).toBe(201);
    expect((await call('POST', '/api/health-metrics', doctor, glucose(patientId, 130))).status).toBe(201);
    expect(getAlertsByPatient(patientId)).toHaveLength(2);
  });
});

describe('POST /api/health-metrics — validación de tipos (MEDIA-3)', () => {
  const bp = (secondary_value: unknown) =>
    ({ ...glucose(patientId, 130), metric_type: 'blood_pressure', unit: 'mmHg', secondary_value });

  it.each([
    ['patient_id string', () => glucose(String(patientId))],
    ['value string', () => glucose(patientId, '130')],
    ['value Infinity como string', () => glucose(patientId, 'Infinity')],
    ['secondary_value string', () => bp('abc')],
    ['secondary_value objeto', () => bp({})],
  ])('%s → 400 y sin alertas', async (_label, makeBody) => {
    const res = await call('POST', '/api/health-metrics', doctor, makeBody());
    expect(res.status).toBe(400);
    expect(getAlertsByPatient(patientId)).toHaveLength(0);
  });
});

describe('Audit logging (MEDIA-1 / MEDIA-2)', () => {
  const auditRows = () =>
    getDb().prepare('SELECT action, resource, resource_id, details FROM audit_log ORDER BY id').all() as {
      action: string; resource: string; resource_id: number | null; details: string;
    }[];

  it('parseAuditTarget usa la URL completa', () => {
    expect(parseAuditTarget('/api/alerts/5/acknowledge')).toEqual({ path: '/api/alerts/5/acknowledge', resource: 'alerts', resourceId: 5 });
    expect(parseAuditTarget('/api/health-metrics/?x=1')).toEqual({ path: '/api/health-metrics/', resource: 'health-metrics', resourceId: null });
  });

  it('el acknowledge queda registrado con resource=alerts y el id de la alerta', async () => {
    await call('POST', '/api/health-metrics', doctor, glucose(patientId));
    const [alert] = getAlertsByPatient(patientId);
    getDb().prepare('DELETE FROM audit_log').run();

    expect((await call('PATCH', `/api/alerts/${alert.id}/acknowledge`, doctor)).status).toBe(200);
    expect(auditRows()).toEqual([
      expect.objectContaining({ action: 'PATCH', resource: 'alerts', resource_id: alert.id }),
    ]);
  });

  it('las lecturas de alertas (y los intentos denegados) quedan auditadas sin body', async () => {
    await call('GET', `/api/alerts/${patientId}`, doctor);
    await call('GET', `/api/alerts/${patientId}`, otherDoctor); // 404
    const rows = auditRows();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => [r.action, r.resource, r.resource_id])).toEqual([
      ['GET', 'alerts', patientId],
      ['GET', 'alerts', patientId],
    ]);
    expect(JSON.parse(rows[1].details)).toEqual({ path: `/api/alerts/${patientId}`, status: 404 });
  });

  it('no guarda contraseñas en claro', async () => {
    const app = express();
    app.use(express.json());
    app.use(auditLogger);
    app.post('/api/auth/login', (_req, res) => { res.json({ ok: true }); });
    const srv = await new Promise<Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
    const port = (srv.address() as AddressInfo).port;
    await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'Secret123!' }),
    });
    await new Promise<void>((resolve) => srv.close(() => resolve()));

    const details = auditRows().map((r) => r.details).join('\n');
    expect(details).not.toContain('Secret123!');
    expect(details).toContain('[REDACTED]');
  });
});
