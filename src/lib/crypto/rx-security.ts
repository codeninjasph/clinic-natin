import crypto from 'crypto';

/**
 * Generates a tamper-evident verification code and hash for a digital prescription.
 * Format: CN-RX-{YEAR}-{6-CHAR-HASH}
 * Example: CN-RX-2026-A8F92E
 */
export function generateRxVerificationHash(params: {
  prescriptionId?: string;
  doctorPrc: string;
  patientId: string;
  date: string;
  items: Array<{ genericName: string; dosage?: string }>;
}): { verificationCode: string; fullHash: string } {
  const secretSalt = process.env.RX_VERIFICATION_SECRET || 'clinic-natin-fda-2020-007-salt-cdo';
  const rawPayload = [
    params.prescriptionId || '',
    params.doctorPrc.trim(),
    params.patientId.trim(),
    params.date.trim(),
    params.items.map((i) => `${i.genericName}:${i.dosage || ''}`).sort().join('|'),
    secretSalt,
  ].join('::');

  const fullHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
  const shortCode = fullHash.substring(0, 6).toUpperCase();
  const year = new Date(params.date || Date.now()).getFullYear() || 2026;
  const verificationCode = `CN-RX-${year}-${shortCode}`;

  return { verificationCode, fullHash };
}
