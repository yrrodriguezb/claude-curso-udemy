import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createTestUser, createTestPatient } from './setup';
import { loginUser } from '../src/auth/auth.service';
import { createMetric } from '../src/health-metrics/metrics.service';
import { getAlertsByPatient } from '../src/alerts/alerts.service';
import alertsRoutes from '../src/alerts/alerts.routes';

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/alerts', alertsRoutes);
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function call(method: string, path: string, token?: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: (await res.json()) as any };
}

const login = (email: string) => loginUser({ email, password: 'pw' }).token;

let adminId: number, doctorId: number, otherDoctorId: number;
let patientId: number, otherPatientId: number;
let admin: string, doctor: string, otherDoctor: string, patient: string, otherPatient: string;
let ids: { systolic: number; diastolic: number; glucoseWarn: number };

beforeEach(() => {
  adminId = createTestUser({ email: 'a@t.com', password: 'pw', role: 'admin', name: 'A' });
  doctorId = createTestUser({ email: 'd@t.com', password: 'pw', role: 'doctor', name: 'D' });
  otherDoctorId = createTestUser({ email: 'd2@t.com', password: 'pw', role: 'doctor', name: 'D2' });
  const pu = createTestUser({ email: 'p@t.com', password: 'pw', role: 'patient', name: 'P' });
  const pu2 = createTestUser({ email: 'p2@t.com', password: 'pw', role: 'patient', name: 'P2' });
  patientId = createTestPatient({ userId: pu, doctorId });
  otherPatientId = createTestPatient({ userId: pu2, doctorId: otherDoctorId });
  admin = login('a@t.com'); doctor = login('d@t.com'); otherDoctor = login('d2@t.com');
  patient = login('p@t.com'); otherPatient = login('p2@t.com');

  const mk = (pid: number, type: any, value: number, sec?: number) =>
    createMetric({ patient_id: pid, metric_type: type, value, secondary_value: sec, unit: 'x', recorded_at: '2026-01-01T10:00:00Z' }, doctorId);
  mk(patientId, 'blood_pressure', 150, 95);
  mk(patientId, 'glucose', 110);
  mk(otherPatientId, 'glucose', 130);
  const list = getAlertsByPatient(patientId);
  ids = {
    systolic: list.find((a) => a.metric_type === 'blood_pressure_systolic')!.id,
    diastolic: list.find((a) => a.metric_type === 'blood_pressure_diastolic')!.id,
    glucoseWarn: list.find((a) => a.metric_type === 'glucose')!.id,
  };
});

describe('GET /api/alerts/:patientId', () => {
  it('should return 401 when no token is sent', async () => {
    expect((await call('GET', `/api/alerts/${patientId}`)).status).toBe(401);
  });
  it('should return 401 when token is invalid', async () => {
    expect((await call('GET', `/api/alerts/${patientId}`, 'garbage')).status).toBe(401);
  });
  it('should return { data, count } when admin requests any patient', async () => {
    const r = await call('GET', `/api/alerts/${patientId}`, admin);
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(3);
    expect(r.body.data).toHaveLength(3);
    expect((await call('GET', `/api/alerts/${otherPatientId}`, admin)).body.count).toBe(1);
  });
  it('should return alerts when doctor requests an assigned patient', async () => {
    expect((await call('GET', `/api/alerts/${patientId}`, doctor)).status).toBe(200);
  });
  it('should return 404 when doctor requests a non-assigned patient', async () => {
    const r = await call('GET', `/api/alerts/${otherPatientId}`, doctor);
    expect(r.status).toBe(404);
    expect(r.body).toHaveProperty('error');
  });
  it('should return own alerts when patient requests own record', async () => {
    expect((await call('GET', `/api/alerts/${patientId}`, patient)).body.count).toBe(3);
  });
  it('should return 404 when patient requests another patient', async () => {
    expect((await call('GET', `/api/alerts/${otherPatientId}`, patient)).status).toBe(404);
  });
  it('should return 404 when patient does not exist', async () => {
    expect((await call('GET', '/api/alerts/9999', admin)).status).toBe(404);
  });
  it.each(['abc', '0', '-1', '1.5'])('should return 400 when patientId is %s', async (id) => {
    expect((await call('GET', `/api/alerts/${id}`, admin)).status).toBe(400);
  });
  it('should filter by severity', async () => {
    expect((await call('GET', `/api/alerts/${patientId}?severity=critical`, admin)).body.count).toBe(2);
    expect((await call('GET', `/api/alerts/${patientId}?severity=warning`, admin)).body.count).toBe(1);
  });
  it('should filter by acknowledged', async () => {
    await call('PATCH', `/api/alerts/${ids.systolic}/acknowledge`, doctor);
    expect((await call('GET', `/api/alerts/${patientId}?acknowledged=true`, admin)).body.count).toBe(1);
    expect((await call('GET', `/api/alerts/${patientId}?acknowledged=false`, admin)).body.count).toBe(2);
  });
  it.each(['acknowledged=yes', 'acknowledged=1', 'acknowledged=', 'severity=info', 'severity=', 'severity=CRITICAL'])(
    'should return 400 when query is %s', async (q) => {
      expect((await call('GET', `/api/alerts/${patientId}?${q}`, admin)).status).toBe(400);
    });
});

describe('PATCH /api/alerts/:id/acknowledge', () => {
  const path = (id: number | string) => `/api/alerts/${id}/acknowledge`;

  it('should return 401 when no token is sent', async () => {
    expect((await call('PATCH', path(ids.systolic))).status).toBe(401);
  });
  it('should return 403 when a patient tries to acknowledge own alert', async () => {
    expect((await call('PATCH', path(ids.systolic), patient)).status).toBe(403);
    expect(getAlertsByPatient(patientId).every((a) => a.acknowledged === 0)).toBe(true);
  });
  it('should return 200 and set fields when assigned doctor acknowledges', async () => {
    const r = await call('PATCH', path(ids.systolic), doctor);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ id: ids.systolic, acknowledged: 1, acknowledged_by: doctorId });
    expect(r.body.data.acknowledged_at).toBeTruthy();
  });
  it('should return 200 when admin acknowledges', async () => {
    const r = await call('PATCH', path(ids.diastolic), admin);
    expect(r.body.data.acknowledged_by).toBe(adminId);
  });
  it('should return 404 and leave alert unacknowledged when doctor is not assigned', async () => {
    const r = await call('PATCH', path(ids.systolic), otherDoctor);
    expect(r.status).toBe(404);
    expect(getAlertsByPatient(patientId).find((a) => a.id === ids.systolic)!.acknowledged).toBe(0);
  });
  it('should return 404 when alert does not exist', async () => {
    expect((await call('PATCH', path(9999), admin)).status).toBe(404);
  });
  it('should be idempotent and keep original acknowledged_by', async () => {
    const first = await call('PATCH', path(ids.systolic), doctor);
    const second = await call('PATCH', path(ids.systolic), admin);
    expect(second.status).toBe(200);
    expect(second.body.data.acknowledged_by).toBe(doctorId);
    expect(second.body.data.acknowledged_at).toBe(first.body.data.acknowledged_at);
  });
  it.each(['abc', '0', '-3', '1.5'])('should return 400 when id is %s', async (id) => {
    expect((await call('PATCH', path(id), admin)).status).toBe(400);
  });
  it('should return 403 before 400 when patient sends invalid id', async () => {
    expect((await call('PATCH', path('abc'), otherPatient)).status).toBe(403);
  });
});
