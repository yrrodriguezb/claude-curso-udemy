import { describe, it, expect } from 'vitest';
import { isValidPhone, validateCreatePatient, validateUpdatePatient } from '../src/patients/patients.validation';

const PHONE_ERROR = 'emergency_phone must be a valid international phone number (e.g. +34 612 345 678)';

const baseCreate = { user_id: 1, date_of_birth: '1985-06-15', gender: 'male', blood_type: 'A+' };

const SEED_PHONES = [
  '+34 612 345 678',
  '+34 623 456 789',
  '+34 634 567 890',
  '+34 645 678 901',
  '+34 656 789 012',
  '+34 667 890 123',
  '+34 678 901 234',
  '+34 689 012 345',
];

describe('isValidPhone', () => {
  it.each([
    ['+34 612 345 678', 'spaces'],
    ['+34612345678', 'no separators'],
    ['+1-202-555-0143', 'hyphens'],
    ['+447911123456', 'UK mobile'],
    ['+12345678', 'lower bound 8 digits'],
    ['+123456789012345', 'upper bound 15 digits'],
  ])('should return true when phone is %s (%s)', (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });

  it.each([
    ['612345678', 'missing +'],
    ['+34 612 ABC 678', 'letters'],
    ['+0 612 345 678', 'country code starts with 0'],
    ['+1234567', '7 digits'],
    ['+1234567890123456', '16 digits'],
    ['', 'empty string'],
    ['+34 (612) 345 678', 'parentheses'],
    ['++34612345678', 'double plus'],
  ])('should return false when phone is "%s" (%s)', (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });

  it.each(SEED_PHONES)('should return true when phone is seed value %s', (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });
});

describe('validateCreatePatient - emergency_phone', () => {
  it('should return null when body is valid and emergency_phone is absent', () => {
    expect(validateCreatePatient({ ...baseCreate })).toBeNull();
  });

  it('should return null when emergency_phone is null', () => {
    expect(validateCreatePatient({ ...baseCreate, emergency_phone: null })).toBeNull();
  });

  it('should return null when emergency_phone is undefined', () => {
    expect(validateCreatePatient({ ...baseCreate, emergency_phone: undefined })).toBeNull();
  });

  it('should return null when emergency_phone is a valid international number', () => {
    expect(validateCreatePatient({ ...baseCreate, emergency_phone: '+34 612 345 678' })).toBeNull();
  });

  it.each(SEED_PHONES)('should accept seed phone %s', (phone) => {
    expect(validateCreatePatient({ ...baseCreate, emergency_phone: phone })).toBeNull();
  });

  it.each([
    ['612345678'],
    ['+34 612 ABC 678'],
    ['+1234567'],
    ['+1234567890123456'],
    [''],
  ])('should return error when emergency_phone is invalid string "%s"', (phone) => {
    expect(validateCreatePatient({ ...baseCreate, emergency_phone: phone })).toBe(PHONE_ERROR);
  });

  it.each([
    [34612345678],
    [true],
    [{}],
    [['+34612345678']],
  ])('should return error when emergency_phone is non-string %j', (phone) => {
    expect(validateCreatePatient({ ...baseCreate, emergency_phone: phone })).toBe(PHONE_ERROR);
  });
});

describe('validateUpdatePatient - emergency_phone', () => {
  it('should return null when body is empty', () => {
    expect(validateUpdatePatient({})).toBeNull();
  });

  it('should return null when emergency_phone is null', () => {
    expect(validateUpdatePatient({ emergency_phone: null })).toBeNull();
  });

  it('should return null when emergency_phone is valid', () => {
    expect(validateUpdatePatient({ emergency_phone: '+1-202-555-0143' })).toBeNull();
  });

  it.each(SEED_PHONES)('should accept seed phone %s', (phone) => {
    expect(validateUpdatePatient({ emergency_phone: phone })).toBeNull();
  });

  it.each([
    ['612345678'],
    ['+0 612 345 678'],
    ['+34 (612) 345 678'],
    ['++34612345678'],
    [''],
  ])('should return error when emergency_phone is invalid string "%s"', (phone) => {
    expect(validateUpdatePatient({ emergency_phone: phone })).toBe(PHONE_ERROR);
  });

  it('should return error when emergency_phone is a number', () => {
    expect(validateUpdatePatient({ emergency_phone: 34612345678 })).toBe(PHONE_ERROR);
  });
});
