import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, createTestPatient } from './setup';
import { getDb } from '../src/database/connection';
import { createMetric } from '../src/health-metrics/metrics.service';
import {
  canAccessPatient, createAlertsForMetric, getAlertsByPatient, acknowledgeAlert,
} from '../src/alerts/alerts.service';
import type { TokenPayload } from '../src/auth/auth.types';
import type { MetricType } from '../src/health-metrics/metrics.types';

let adminId: number, doctorId: number, otherDoctorId: number;
let patientUserId: number, otherPatientUserId: number;
let patientId: number, otherPatientId: number;

const tok = (userId: number, role: TokenPayload['role']): TokenPayload =>
  ({ userId, role, email: `${role}${userId}@t.com`, name: role });

const record = (pid: number, type: MetricType, value: number, secondary?: number) =>
  createMetric({
    patient_id: pid, metric_type: type, value, secondary_value: secondary,
    unit: 'x', recorded_at: '2026-01-01T10:00:00Z',
  }, doctorId);

const countOf = (table: string) =>
  (getDb().prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number }).c;

beforeEach(() => {
  adminId = createTestUser({ email: 'a@t.com', password: 'x', role: 'admin', name: 'A' });
  doctorId = createTestUser({ email: 'd@t.com', password: 'x', role: 'doctor', name: 'D' });
  otherDoctorId = createTestUser({ email: 'd2@t.com', password: 'x', role: 'doctor', name: 'D2' });
  patientUserId = createTestUser({ email: 'p@t.com', password: 'x', role: 'patient', name: 'P' });
  otherPatientUserId = createTestUser({ email: 'p2@t.com', password: 'x', role: 'patient', name: 'P2' });
  patientId = createTestPatient({ userId: patientUserId, doctorId });
  otherPatientId = createTestPatient({ userId: otherPatientUserId, doctorId: otherDoctorId });
});

describe('alert creation via createMetric', () => {
  it('should create 1 critical alert when glucose is 130', () => {
    const m = record(patientId, 'glucose', 130);
    const alerts = getAlertsByPatient(patientId);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      severity: 'critical', metric_type: 'glucose', value: 130,
      metric_id: m.id, patient_id: patientId, acknowledged: 0, acknowledged_by: null, acknowledged_at: null,
    });
  });

  it('should create 2 critical alerts when pressure is 150/95', () => {
    const m = record(patientId, 'blood_pressure', 150, 95);
    const alerts = getAlertsByPatient(patientId);
    expect(alerts).toHaveLength(2);
    const byType = Object.fromEntries(alerts.map((a) => [a.metric_type, a]));
    expect(byType.blood_pressure_systolic).toMatchObject({ value: 150, severity: 'critical', metric_id: m.id, patient_id: patientId });
    expect(byType.blood_pressure_diastolic).toMatchObject({ value: 95, severity: 'critical', metric_id: m.id, patient_id: patientId });
  });

  it('should create only a systolic warning when pressure is 130/70', () => {
    record(patientId, 'blood_pressure', 130, 70);
    const alerts = getAlertsByPatient(patientId);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ metric_type: 'blood_pressure_systolic', severity: 'warning', value: 130 });
  });

  it('should only evaluate systolic when pressure has no secondary value', () => {
    record(patientId, 'blood_pressure', 150);
    expect(getAlertsByPatient(patientId)).toHaveLength(1);
  });

  it.each([
    ['glucose', 85, undefined], ['blood_pressure', 110, 70], ['weight', 120, undefined],
    ['heart_rate', 72, undefined], ['temperature', 36.6, undefined], ['oxygen_saturation', 98, undefined],
  ] as const)('should create no alerts when %s is normal (%s)', (type, v, sec) => {
    record(patientId, type, v, sec);
    expect(countOf('alerts')).toBe(0);
  });

  it('should create no alerts when weight is extreme', () => {
    record(patientId, 'weight', 400);
    expect(countOf('alerts')).toBe(0);
  });

  it('should keep alerts scoped to the patient when several patients record metrics', () => {
    record(patientId, 'glucose', 130);
    record(otherPatientId, 'heart_rate', 130);
    expect(getAlertsByPatient(patientId)).toHaveLength(1);
    expect(getAlertsByPatient(otherPatientId)[0].metric_type).toBe('heart_rate');
  });

  it('should return [] and insert nothing when createAlertsForMetric gets a normal reading', () => {
    expect(createAlertsForMetric({ id: 1, patient_id: patientId, metric_type: 'glucose', value: 90 })).toEqual([]);
    expect(countOf('alerts')).toBe(0);
  });
});

describe('transaction', () => {
  it('should leave no orphan alerts or metrics when patient_id does not exist', () => {
    expect(() => record(9999, 'glucose', 300)).toThrow();
    expect(countOf('alerts')).toBe(0);
    expect(countOf('health_metrics')).toBe(0);
  });

  it('should keep earlier alerts when a later createMetric fails', () => {
    record(patientId, 'glucose', 130);
    expect(() => record(9999, 'glucose', 300)).toThrow();
    expect(countOf('alerts')).toBe(1);
  });

  it('should roll back the metric when alert insertion fails', () => {
    // NaN se guarda como NULL en SQLite: viola NOT NULL de alerts.value tras insertar la metrica
    expect(() => record(patientId, 'glucose', NaN)).toThrow();
    expect(countOf('alerts')).toBe(0);
    expect(countOf('health_metrics')).toBe(0);
  });
});

describe('canAccessPatient', () => {
  it('should allow admin for any existing patient', () => {
    expect(canAccessPatient(tok(adminId, 'admin'), patientId)).toBe(true);
    expect(canAccessPatient(tok(adminId, 'admin'), otherPatientId)).toBe(true);
  });
  it('should allow doctor only for assigned patients', () => {
    expect(canAccessPatient(tok(doctorId, 'doctor'), patientId)).toBe(true);
    expect(canAccessPatient(tok(doctorId, 'doctor'), otherPatientId)).toBe(false);
  });
  it('should allow patient only for own record', () => {
    expect(canAccessPatient(tok(patientUserId, 'patient'), patientId)).toBe(true);
    expect(canAccessPatient(tok(patientUserId, 'patient'), otherPatientId)).toBe(false);
  });
  it('should deny everyone when patient does not exist', () => {
    expect(canAccessPatient(tok(adminId, 'admin'), 9999)).toBe(false);
  });
  it('should deny when role is unknown', () => {
    expect(canAccessPatient(tok(adminId, 'hacker' as never), patientId)).toBe(false);
  });
});

describe('getAlertsByPatient filters', () => {
  beforeEach(() => {
    record(patientId, 'glucose', 130); // critical
    record(patientId, 'glucose', 110); // warning
    record(patientId, 'heart_rate', 110); // warning
  });

  it('should return all alerts when no filters', () => {
    expect(getAlertsByPatient(patientId)).toHaveLength(3);
  });
  it('should return empty array when patient has no alerts', () => {
    expect(getAlertsByPatient(otherPatientId)).toEqual([]);
  });
  it('should filter by severity', () => {
    expect(getAlertsByPatient(patientId, { severity: 'critical' })).toHaveLength(1);
    expect(getAlertsByPatient(patientId, { severity: 'warning' })).toHaveLength(2);
  });
  it('should filter by acknowledged', () => {
    const first = getAlertsByPatient(patientId)[0];
    acknowledgeAlert(first.id, tok(adminId, 'admin'));
    expect(getAlertsByPatient(patientId, { acknowledged: true })).toHaveLength(1);
    expect(getAlertsByPatient(patientId, { acknowledged: false })).toHaveLength(2);
  });
  it('should combine filters', () => {
    const crit = getAlertsByPatient(patientId, { severity: 'critical' })[0];
    acknowledgeAlert(crit.id, tok(adminId, 'admin'));
    expect(getAlertsByPatient(patientId, { severity: 'critical', acknowledged: false })).toHaveLength(0);
    expect(getAlertsByPatient(patientId, { severity: 'critical', acknowledged: true })).toHaveLength(1);
  });
  it('should order by newest first (id desc on ties)', () => {
    const ids = getAlertsByPatient(patientId).map((a) => a.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });
});

describe('acknowledgeAlert', () => {
  let alertId: number;
  beforeEach(() => {
    record(patientId, 'glucose', 130);
    alertId = getAlertsByPatient(patientId)[0].id;
  });

  it('should set acknowledged, acknowledged_by and acknowledged_at when admin acknowledges', () => {
    const a = acknowledgeAlert(alertId, tok(adminId, 'admin'))!;
    expect(a.acknowledged).toBe(1);
    expect(a.acknowledged_by).toBe(adminId);
    expect(a.acknowledged_at).toBeTruthy();
  });
  it('should allow the assigned doctor to acknowledge', () => {
    expect(acknowledgeAlert(alertId, tok(doctorId, 'doctor'))!.acknowledged_by).toBe(doctorId);
  });
  it('should be idempotent and keep original acknowledged_by and acknowledged_at', () => {
    const first = acknowledgeAlert(alertId, tok(doctorId, 'doctor'))!;
    const second = acknowledgeAlert(alertId, tok(adminId, 'admin'))!;
    expect(second.acknowledged_by).toBe(doctorId);
    expect(second.acknowledged_at).toBe(first.acknowledged_at);
    expect(second.acknowledged).toBe(1);
  });
  it('should return null when alert does not exist', () => {
    expect(acknowledgeAlert(9999, tok(adminId, 'admin'))).toBeNull();
  });
  it('should return null and leave alert untouched when doctor is not assigned', () => {
    expect(acknowledgeAlert(alertId, tok(otherDoctorId, 'doctor'))).toBeNull();
    expect(getAlertsByPatient(patientId)[0].acknowledged).toBe(0);
  });
});
