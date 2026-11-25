export type AlertSeverity = 'warning' | 'critical';

/**
 * Tipo de métrica que originó la alerta. La presión arterial se desdobla en
 * sistólica (health_metrics.value) y diastólica (health_metrics.secondary_value)
 * porque cada componente se evalúa con sus propios rangos.
 */
export type AlertMetricType =
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'glucose'
  | 'heart_rate'
  | 'temperature'
  | 'oxygen_saturation';

export interface Alert {
  id: number;
  patient_id: number;
  metric_id: number | null;
  metric_type: AlertMetricType;
  value: number;
  severity: AlertSeverity;
  created_at: string;
  acknowledged: 0 | 1;
  acknowledged_by: number | null;
  acknowledged_at: string | null;
}

export interface AlertCandidate {
  metric_type: AlertMetricType;
  value: number;
  severity: AlertSeverity;
}

export interface AlertFilters {
  acknowledged?: boolean;
  severity?: AlertSeverity;
}
