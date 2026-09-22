import crypto from 'crypto';

const OTP_SALT = process.env.OTP_SECRET_SALT || 'clinic-natin-sms-otp-ph-2026';

/**
 * Normalizes Philippine mobile numbers into standard E.164 (+63) and local (09) formats.
 */
export function normalizePhilippinePhone(rawPhone: string): {
  e164: string; // +639171234567
  local: string; // 09171234567
  isValid: boolean;
} {
  const digitsOnly = rawPhone.replace(/\D/g, '');

  let e164 = '';
  let local = '';

  if (digitsOnly.startsWith('639') && digitsOnly.length === 12) {
    e164 = `+${digitsOnly}`;
    local = `0${digitsOnly.substring(2)}`;
  } else if (digitsOnly.startsWith('09') && digitsOnly.length === 11) {
    e164 = `+63${digitsOnly.substring(1)}`;
    local = digitsOnly;
  } else if (digitsOnly.startsWith('9') && digitsOnly.length === 10) {
    e164 = `+63${digitsOnly}`;
    local = `0${digitsOnly}`;
  }

  const isValid = /^(\+639\d{9})$/.test(e164);

  return { e164, local, isValid };
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateNumericOtp(): string {
  // Generates integer between 100000 and 999999 inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP code using SHA-256 and secret salt.
 */
export function hashOtp(code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${code.trim()}::${OTP_SALT}`)
    .digest('hex');
}

/**
 * Validates an OTP against the stored hash.
 */
export function verifyOtpHash(code: string, storedHash: string): boolean {
  const incomingHash = hashOtp(code);
  return crypto.timingSafeEqual(
    Buffer.from(incomingHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}
