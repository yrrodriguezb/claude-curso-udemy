import type { MetricType } from '../health-metrics/metrics.types';
import type { AlertCandidate, AlertMetricType } from './alerts.types';

/**
 * Umbrales por componente (tabla de rangos de CLAUDE.md).
 *
 * Clasificación sin huecos entre rangos:
 *   - normal:   normalMin <= v <= normalMax
 *   - critical: v < criticalBelow  ó  v > criticalAbove
 *   - warning:  cualquier otro valor (cercano al límite)
 * Así un valor decimal como 100.5 de glucosa o 36.0 °C no queda sin clasificar.
 */
interface Thresholds {
  normalMin: number;
  normalMax: number;
  criticalBelow: number;
  criticalAbove: number;
}

export const ALERT_THRESHOLDS: Record<AlertMetricType, Thresholds> = {
  blood_pressure_systolic: { normalMin: 90, normalMax: 120, criticalBelow: 80, criticalAbove: 140 },
  blood_pressure_diastolic: { normalMin: 60, normalMax: 80, criticalBelow: 50, criticalAbove: 90 },
  glucose: { normalMin: 70, normalMax: 100, criticalBelow: 54, criticalAbove: 125 },
  heart_rate: { normalMin: 60, normalMax: 100, criticalBelow: 50, criticalAbove: 120 },
  temperature: { normalMin: 36.1, normalMax: 37.2, criticalBelow: 35.5, criticalAbove: 38.0 },
  oxygen_saturation: { normalMin: 95, normalMax: 100, criticalBelow: 90, criticalAbove: Infinity },
};

export function classifyValue(
  metricType: AlertMetricType,
  value: number
): 'normal' | 'warning' | 'critical' {
  const t = ALERT_THRESHOLDS[metricType];
  if (value >= t.normalMin && value <= t.normalMax) return 'normal';
  if (value < t.criticalBelow || value > t.criticalAbove) return 'critical';
  return 'warning';
}

/**
 * Devuelve las alertas que debe generar una lectura. Función pura (sin DB)
 * para poder reutilizarla en el servicio, el seed y los tests.
 * El peso nunca genera alertas.
 */
export function evaluateMetric(
  metricType: MetricType,
  value: number,
  secondaryValue?: number | null
): AlertCandidate[] {
  const components: { type: AlertMetricType; value: number }[] = [];

  switch (metricType) {
    case 'blood_pressure':
      components.push({ type: 'blood_pressure_systolic', value });
      if (secondaryValue !== undefined && secondaryValue !== null) {
        components.push({ type: 'blood_pressure_diastolic', value: secondaryValue });
      }
      break;
    case 'glucose':
    case 'heart_rate':
    case 'temperature':
    case 'oxygen_saturation':
      components.push({ type: metricType, value });
      break;
    case 'weight':
    default:
      return [];
  }

  const candidates: AlertCandidate[] = [];
  for (const c of components) {
    const status = classifyValue(c.type, c.value);
    if (status !== 'normal') {
      candidates.push({ metric_type: c.type, value: c.value, severity: status });
    }
  }
  return candidates;
}
