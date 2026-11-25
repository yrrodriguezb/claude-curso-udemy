import { getDb } from '../database/connection';
import type { TokenPayload } from './auth.types';

interface PatientAccessRow {
  id: number;
  user_id: number;
  assigned_doctor_id: number | null;
}

/**
 * Comprueba si el usuario puede acceder a los datos clínicos del paciente.
 * admin: todos · doctor: solo pacientes asignados · patient: solo su propio registro.
 * Devuelve false si el paciente no existe (las rutas responden 404 en ambos casos).
 */
export function canAccessPatient(user: TokenPayload, patientId: number): boolean {
  const db = getDb();
  const patient = db
    .prepare('SELECT id, user_id, assigned_doctor_id FROM patients WHERE id = ?')
    .get(patientId) as PatientAccessRow | undefined;
  if (!patient) return false;

  if (user.role === 'admin') return true;
  if (user.role === 'doctor') return patient.assigned_doctor_id === user.userId;
  if (user.role === 'patient') return patient.user_id === user.userId;
  return false;
}
