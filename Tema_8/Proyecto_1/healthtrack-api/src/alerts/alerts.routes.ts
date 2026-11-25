import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { canAccessPatient, getAlertsByPatient, acknowledgeAlert } from './alerts.service';
import type { AlertFilters, AlertSeverity } from './alerts.types';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/alerts/:patientId
 * admin: cualquiera · doctor: pacientes asignados · patient: solo el propio.
 * Query opcional: acknowledged=true|false, severity=warning|critical
 */
router.get('/:patientId', authenticate, (req: Request, res: Response) => {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    res.status(400).json({ error: 'Invalid patientId' });
    return;
  }

  const filters: AlertFilters = {};
  const { acknowledged, severity } = req.query;
  if (acknowledged !== undefined) {
    if (acknowledged !== 'true' && acknowledged !== 'false') {
      res.status(400).json({ error: 'acknowledged must be true or false' });
      return;
    }
    filters.acknowledged = acknowledged === 'true';
  }
  if (severity !== undefined) {
    if (severity !== 'warning' && severity !== 'critical') {
      res.status(400).json({ error: 'severity must be warning or critical' });
      return;
    }
    filters.severity = severity as AlertSeverity;
  }

  try {
    // 404 tanto si no existe como si no hay acceso: evita enumerar pacientes
    if (!canAccessPatient(req.user!, patientId)) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    const alerts = getAlertsByPatient(patientId, filters);
    res.json({ data: alerts, count: alerts.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * PATCH /api/alerts/:id/acknowledge
 * Solo personal clínico: admin o el doctor asignado al paciente.
 */
router.patch('/:id/acknowledge', authenticate, authorize('admin', 'doctor'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid alert id' });
    return;
  }

  try {
    const alert = acknowledgeAlert(id, req.user!);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ data: alert });
  } catch {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

export default router;
