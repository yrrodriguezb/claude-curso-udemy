import { getDb } from '../database/connection';
import type { TokenPayload } from '../auth/auth.types';
import type { MetricType } from '../health-metrics/metrics.types';
import type { Alert, AlertFilters } from './alerts.types';
import { evaluateMetric } from './alerts.rules';
import { canAccessPatient } from '../auth/access';

export { canAccessPatient };

/**
 * Crea las alertas correspondientes a una métrica recién registrada.
 * Debe llamarse dentro de la misma transacción que el INSERT de la métrica.
 */
export function createAlertsForMetric(metric: {
  id: number;
  patient_id: number;
  metric_type: MetricType;
  value: number;
  secondary_value?: number | null;
}): Alert[] {
  const db = getDb();
  const candidates = evaluateMetric(metric.metric_type, metric.value, metric.secondary_value);
  if (candidates.length === 0) return [];

  const insert = db.prepare(`
    INSERT INTO alerts (patient_id, metric_id, metric_type, value, severity)
    VALUES (?, ?, ?, ?, ?)
  `);
  const select = db.prepare('SELECT * FROM alerts WHERE id = ?');

  return candidates.map((c) => {
    const result = insert.run(metric.patient_id, metric.id, c.metric_type, c.value, c.severity);
    return select.get(result.lastInsertRowid) as Alert;
  });
}

/** Devuelve las alertas de un paciente. El control de acceso se hace en la ruta. */
export function getAlertsByPatient(patientId: number, filters: AlertFilters = {}): Alert[] {
  const db = getDb();
  let query = 'SELECT * FROM alerts WHERE patient_id = ?';
  const params: unknown[] = [patientId];

  if (filters.acknowledged !== undefined) {
    query += ' AND acknowledged = ?';
    params.push(filters.acknowledged ? 1 : 0);
  }
  if (filters.severity) {
    query += ' AND severity = ?';
    params.push(filters.severity);
  }
  query += ' ORDER BY created_at DESC, id DESC';

  return db.prepare(query).all(...params) as Alert[];
}

/**
 * Marca una alerta como vista. Devuelve null si no existe o el usuario no tiene
 * acceso al paciente (mismo resultado en ambos casos para no filtrar existencia).
 * Idempotente: si ya estaba reconocida conserva quién y cuándo la reconoció.
 */
export function acknowledgeAlert(alertId: number, user: TokenPayload): Alert | null {
  const db = getDb();
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId) as Alert | undefined;
  if (!alert) return null;
  if (!canAccessPatient(user, alert.patient_id)) return null;

  if (!alert.acknowledged) {
    db.prepare(`
      UPDATE alerts
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
      WHERE id = ? AND acknowledged = 0
    `).run(user.userId, alertId);
  }

  return db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId) as Alert;
}
