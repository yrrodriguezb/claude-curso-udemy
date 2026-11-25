import { describe, it, expect } from 'vitest';
import { evaluateMetric, classifyValue, ALERT_THRESHOLDS } from '../src/alerts/alerts.rules';
import type { AlertMetricType } from '../src/alerts/alerts.types';

type Status = 'normal' | 'warning' | 'critical';

const boundaries: [AlertMetricType, number, Status][] = [
  // glucosa
  ['glucose', 70, 'normal'], ['glucose', 100, 'normal'],
  ['glucose', 69.9, 'warning'], ['glucose', 100.1, 'warning'],
  ['glucose', 54, 'warning'], ['glucose', 125, 'warning'],
  ['glucose', 53.9, 'critical'], ['glucose', 125.1, 'critical'],
  // sistolica
  ['blood_pressure_systolic', 90, 'normal'], ['blood_pressure_systolic', 120, 'normal'],
  ['blood_pressure_systolic', 89.9, 'warning'], ['blood_pressure_systolic', 120.1, 'warning'],
  ['blood_pressure_systolic', 80, 'warning'], ['blood_pressure_systolic', 140, 'warning'],
  ['blood_pressure_systolic', 79.9, 'critical'], ['blood_pressure_systolic', 140.1, 'critical'],
  // diastolica
  ['blood_pressure_diastolic', 60, 'normal'], ['blood_pressure_diastolic', 80, 'normal'],
  ['blood_pressure_diastolic', 59.9, 'warning'], ['blood_pressure_diastolic', 80.1, 'warning'],
  ['blood_pressure_diastolic', 50, 'warning'], ['blood_pressure_diastolic', 90, 'warning'],
  ['blood_pressure_diastolic', 49.9, 'critical'], ['blood_pressure_diastolic', 90.1, 'critical'],
  // ritmo cardiaco
  ['heart_rate', 60, 'normal'], ['heart_rate', 100, 'normal'],
  ['heart_rate', 59, 'warning'], ['heart_rate', 101, 'warning'],
  ['heart_rate', 50, 'warning'], ['heart_rate', 120, 'warning'],
  ['heart_rate', 49, 'critical'], ['heart_rate', 121, 'critical'],
  // temperatura
  ['temperature', 36.1, 'normal'], ['temperature', 37.2, 'normal'],
  ['temperature', 36.0, 'warning'], ['temperature', 37.3, 'warning'],
  ['temperature', 35.5, 'warning'], ['temperature', 38.0, 'warning'],
  ['temperature', 35.4, 'critical'], ['temperature', 38.1, 'critical'],
  // SpO2
  ['oxygen_saturation', 95, 'normal'], ['oxygen_saturation', 100, 'normal'],
  ['oxygen_saturation', 94.9, 'warning'], ['oxygen_saturation', 90, 'warning'],
  ['oxygen_saturation', 89.9, 'critical'], ['oxygen_saturation', 0, 'critical'],
];

describe('classifyValue', () => {
  it.each(boundaries)('should classify %s=%s as %s when at/around its limit', (type, value, expected) => {
    expect(classifyValue(type, value)).toBe(expected);
  });

  it('should have thresholds for every alertable component when inspecting ALERT_THRESHOLDS', () => {
    expect(Object.keys(ALERT_THRESHOLDS).sort()).toEqual(
      ['blood_pressure_diastolic', 'blood_pressure_systolic', 'glucose', 'heart_rate', 'oxygen_saturation', 'temperature']
    );
  });
});

describe('evaluateMetric', () => {
  it('should return no candidates when glucose is normal', () => {
    expect(evaluateMetric('glucose', 85)).toEqual([]);
  });

  it('should return a critical candidate when glucose is 130', () => {
    expect(evaluateMetric('glucose', 130)).toEqual([{ metric_type: 'glucose', value: 130, severity: 'critical' }]);
  });

  it('should return a warning candidate when glucose is 110', () => {
    expect(evaluateMetric('glucose', 110)).toEqual([{ metric_type: 'glucose', value: 110, severity: 'warning' }]);
  });

  it('should return two critical candidates when pressure is 150/95', () => {
    expect(evaluateMetric('blood_pressure', 150, 95)).toEqual([
      { metric_type: 'blood_pressure_systolic', value: 150, severity: 'critical' },
      { metric_type: 'blood_pressure_diastolic', value: 95, severity: 'critical' },
    ]);
  });

  it('should return only systolic warning when pressure is 130/70', () => {
    expect(evaluateMetric('blood_pressure', 130, 70)).toEqual([
      { metric_type: 'blood_pressure_systolic', value: 130, severity: 'warning' },
    ]);
  });

  it('should return only diastolic alert when only diastolic is abnormal', () => {
    expect(evaluateMetric('blood_pressure', 110, 95)).toEqual([
      { metric_type: 'blood_pressure_diastolic', value: 95, severity: 'critical' },
    ]);
  });

  it.each([undefined, null])('should evaluate only systolic when secondary value is %s', (sec) => {
    expect(evaluateMetric('blood_pressure', 150, sec)).toEqual([
      { metric_type: 'blood_pressure_systolic', value: 150, severity: 'critical' },
    ]);
  });

  it('should evaluate diastolic when secondary value is 0', () => {
    expect(evaluateMetric('blood_pressure', 110, 0)).toEqual([
      { metric_type: 'blood_pressure_diastolic', value: 0, severity: 'critical' },
    ]);
  });

  it.each([0, 120, 500, -1])('should never alert when metric is weight with value %s', (v) => {
    expect(evaluateMetric('weight', v)).toEqual([]);
  });

  it.each([
    ['glucose', 85], ['heart_rate', 72], ['temperature', 36.6], ['oxygen_saturation', 98],
  ] as const)('should return no candidates when %s is normal (%s)', (type, v) => {
    expect(evaluateMetric(type, v)).toEqual([]);
  });

  it('should return no candidates when pressure is 110/70', () => {
    expect(evaluateMetric('blood_pressure', 110, 70)).toEqual([]);
  });

  it('should return empty array when metric type is unknown', () => {
    expect(evaluateMetric('unknown' as never, 999)).toEqual([]);
  });
});
