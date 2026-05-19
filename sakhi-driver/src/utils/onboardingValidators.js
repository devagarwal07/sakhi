/**
 * onboardingValidators.js
 *
 * All regex patterns and validation helpers for Sakhi Driver onboarding.
 * App operates exclusively in Bengaluru, Karnataka — all DL and vehicle
 * registrations must be KA-state issued.
 */

// ─── Karnataka Driving Licence ──────────────────────────────────────────────
//
// Format: KA-DD-YYYYXXXXXXX
//   KA   — Karnataka state code (mandatory)
//   DD   — RTO district code  (01–99)
//   YYYY — year of issue      (4 digits)
//   XXXX — serial number      (4–7 digits)
//
// Examples: KA0520110012345 / KA-05-2011-0012345
//
// We strip hyphens/spaces before testing so the driver can type
// "KA 05 2011 0012345" or "KA-05-2011-0012345" and it still passes.
//
export const DL_REGEX = /^KA\d{2}(19|20)\d{2}\d{4,7}$/;

export function validateDLNumber(raw = '') {
  const clean = raw.toUpperCase().replace(/[\s\-]/g, '');
  if (!clean) return { ok: false, error: 'DL number is required' };
  if (!clean.startsWith('KA')) return { ok: false, error: 'Only Karnataka (KA) licences are accepted' };
  if (clean.length < 13) return { ok: false, error: 'DL number is too short' };
  if (clean.length > 16) return { ok: false, error: 'DL number is too long' };
  if (!DL_REGEX.test(clean)) return { ok: false, error: 'Invalid Karnataka DL format (e.g. KA0520110012345)' };
  return { ok: true, clean };
}

// ─── Karnataka Vehicle Registration ─────────────────────────────────────────
//
// Format: KA DD AB 1234
//   KA   — Karnataka state code
//   DD   — district code (2 digits, 01–99)
//   AB   — 1–3 letter series
//   1234 — 4-digit number (0001–9999)
//
// We accept with or without spaces/hyphens.
//
export const REG_REGEX = /^KA\d{2}[A-Z]{1,3}\d{4}$/;

export function validateRegistrationNumber(raw = '') {
  const clean = raw.toUpperCase().replace(/[\s\-]/g, '');
  if (!clean) return { ok: false, error: 'Registration number is required' };
  if (!clean.startsWith('KA')) return { ok: false, error: 'Only Karnataka (KA) registered vehicles are accepted' };
  if (!REG_REGEX.test(clean)) return { ok: false, error: 'Invalid format — use KA 05 AB 1234' };
  return { ok: true, clean };
}

// ─── Driver Name ─────────────────────────────────────────────────────────────
//
// Full name: 2–60 characters, letters + spaces (& dots for initials like "M.")
// Must have at least two parts (first + last).
//
export const NAME_REGEX = /^[A-Za-z][A-Za-z\.\s]{1,58}[A-Za-z]$/;

export function validateDriverName(raw = '') {
  const name = raw.trim();
  if (!name) return { ok: false, error: 'Full name is required' };
  if (name.length < 3) return { ok: false, error: 'Name must be at least 3 characters' };
  if (name.length > 60) return { ok: false, error: 'Name must be under 60 characters' };
  if (!/^[A-Za-z\.\s]+$/.test(name)) return { ok: false, error: 'Name must contain only letters and spaces' };
  if (name.split(/\s+/).filter(Boolean).length < 2) return { ok: false, error: 'Please enter your full name (first and last)' };
  return { ok: true, clean: name };
}

// ─── Vehicle Model ────────────────────────────────────────────────────────────
//
// 2–40 characters, alphanumeric + common punctuation (space, dash, dot)
//
export const MODEL_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s\-\.]{0,38}[A-Za-z0-9]$/;

export function validateModelName(raw = '') {
  const model = raw.trim();
  if (!model) return { ok: false, error: 'Vehicle model is required' };
  if (model.length < 2) return { ok: false, error: 'Model name is too short' };
  if (model.length > 40) return { ok: false, error: 'Model name is too long' };
  return { ok: true, clean: model };
}

// ─── Phone Number (Indian) ────────────────────────────────────────────────────
//
// 10-digit Indian mobile: starts with 6–9
//
export const PHONE_REGEX = /^[6-9]\d{9}$/;

export function validatePhone(raw = '') {
  const clean = raw.replace(/[\s\-\+]/g, '');
  if (!clean) return { ok: false, error: 'Phone number is required' };
  if (!/^\d+$/.test(clean)) return { ok: false, error: 'Phone number must contain only digits' };
  if (clean.length !== 10) return { ok: false, error: 'Phone number must be exactly 10 digits' };
  if (!PHONE_REGEX.test(clean)) return { ok: false, error: 'Enter a valid Indian mobile number' };
  return { ok: true, clean };
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
export function validateOtp(raw = '', length = 6) {
  const clean = raw.replace(/\s/g, '');
  if (clean.length !== length) return { ok: false, error: `OTP must be ${length} digits` };
  if (!/^\d+$/.test(clean)) return { ok: false, error: 'OTP must contain only digits' };
  return { ok: true, clean };
}

// ─── Aadhaar (informational only — not uploaded) ──────────────────────────────
// 12-digit number, cannot start with 0 or 1
export const AADHAAR_REGEX = /^[2-9]\d{11}$/;

export function validateAadhaar(raw = '') {
  const clean = raw.replace(/\s/g, '');
  if (!clean) return { ok: false, error: 'Aadhaar number is required' };
  if (clean.length !== 12) return { ok: false, error: 'Aadhaar must be exactly 12 digits' };
  if (!AADHAAR_REGEX.test(clean)) return { ok: false, error: 'Invalid Aadhaar number' };
  return { ok: true, clean };
}

// ─── Convenience: run all KYC validations at once ────────────────────────────
export function validateKycForm({ driverName, dlNumber, regNumber, modelName }) {
  const errors = {};

  const name = validateDriverName(driverName);
  if (!name.ok) errors.driverName = name.error;

  const dl = validateDLNumber(dlNumber);
  if (!dl.ok) errors.dlNumber = dl.error;

  const reg = validateRegistrationNumber(regNumber);
  if (!reg.ok) errors.regNumber = reg.error;

  const model = validateModelName(modelName);
  if (!model.ok) errors.modelName = model.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    // Cleaned (normalised) values — use these when submitting
    clean: {
      driverName: name.clean ?? driverName,
      dlNumber:   dl.clean   ?? dlNumber,
      regNumber:  reg.clean  ?? regNumber,
      modelName:  model.clean ?? modelName,
    },
  };
}
