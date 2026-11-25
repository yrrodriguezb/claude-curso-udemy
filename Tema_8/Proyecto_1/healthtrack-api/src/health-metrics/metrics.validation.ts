import type { MetricType } from './metrics.types';

const VALID_UNITS: Record<MetricType, string> = {
  blood_pressure: 'mmHg',
  glucose: 'mg/dL',
  weight: 'kg',
  heart_rate: 'bpm',
  temperature: '°C',
  oxygen_saturation: '%',
};

export function validateCreateMetric(body: Record<string, unknown>): string | null {
  if (body.patient_id === undefined || body.patient_id === null) return 'patient_id is required';
  if (!Number.isInteger(body.patient_id) || (body.patient_id as number) <= 0) {
    return 'patient_id must be a positive integer';
  }
  if (!body.metric_type) return 'metric_type is required';
  if (body.value === undefined || body.value === null) return 'value is required';
  if (!body.unit) return 'unit is required';
  if (!body.recorded_at) return 'recorded_at is required';

  const validTypes = Object.keys(VALID_UNITS);
  if (!validTypes.includes(body.metric_type as string)) {
    return `metric_type must be one of: ${validTypes.join(', ')}`;
  }

  if (typeof body.value !== 'number' || !Number.isFinite(body.value)) return 'value must be a number';
  if (body.value < 0) return 'value must be positive';
  if (body.secondary_value !== undefined && body.secondary_value !== null) {
    if (typeof body.secondary_value !== 'number' || !Number.isFinite(body.secondary_value) || body.secondary_value < 0) {
      return 'secondary_value must be a positive number';
    }
  }

  // DEBT: No se valida que secondary_value exista cuando metric_type es blood_pressure.
  // Un registro de presión arterial sin diastólica (secondary_value) no tiene sentido
  // médicamente pero la API lo acepta sin error.

  const dtRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  if (typeof body.recorded_at !== 'string' || !dtRegex.test(body.recorded_at)) {
    return 'recorded_at must be ISO 8601 format';
  }

  return null;
}
