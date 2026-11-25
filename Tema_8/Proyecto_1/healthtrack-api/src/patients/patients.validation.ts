/**
 * Checks whether a value is a valid international phone number (E.164).
 * Accepts a leading '+', digits, spaces and hyphens; after stripping spaces
 * and hyphens it must match /^\+[1-9]\d{7,14}$/.
 * @param value - Phone number string to validate.
 * @returns true if the phone number is valid.
 */
export function isValidPhone(value: string): boolean {
  if (!/^\+[\d -]+$/.test(value)) return false;
  return /^\+[1-9]\d{7,14}$/.test(value.replace(/[ -]/g, ''));
}

export function validateCreatePatient(body: Record<string, unknown>): string | null {
  if (!body.user_id) return 'user_id is required';
  if (!body.date_of_birth) return 'date_of_birth is required';

  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (typeof body.date_of_birth !== 'string' || !dobRegex.test(body.date_of_birth)) {
    return 'date_of_birth must be in YYYY-MM-DD format';
  }

  const validGenders = ['male', 'female', 'other'];
  if (body.gender && !validGenders.includes(body.gender as string)) {
    return 'gender must be male, female or other';
  }

  const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (body.blood_type && !validBloodTypes.includes(body.blood_type as string)) {
    return 'invalid blood_type';
  }

  if (body.emergency_phone !== undefined && body.emergency_phone !== null) {
    if (typeof body.emergency_phone !== 'string' || !isValidPhone(body.emergency_phone)) {
      return 'emergency_phone must be a valid international phone number (e.g. +34 612 345 678)';
    }
  }

  return null;
}

export function validateUpdatePatient(body: Record<string, unknown>): string | null {
  if (body.date_of_birth) {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof body.date_of_birth !== 'string' || !dobRegex.test(body.date_of_birth)) {
      return 'date_of_birth must be in YYYY-MM-DD format';
    }
  }

  const validGenders = ['male', 'female', 'other'];
  if (body.gender && !validGenders.includes(body.gender as string)) {
    return 'gender must be male, female or other';
  }

  const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (body.blood_type && !validBloodTypes.includes(body.blood_type as string)) {
    return 'invalid blood_type';
  }

  if (body.emergency_phone !== undefined && body.emergency_phone !== null) {
    if (typeof body.emergency_phone !== 'string' || !isValidPhone(body.emergency_phone)) {
      return 'emergency_phone must be a valid international phone number (e.g. +34 612 345 678)';
    }
  }

  return null;
}
