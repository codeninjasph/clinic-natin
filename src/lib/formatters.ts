/**
 * 🩺 Doctor Name Normalizer & Formatter
 * Guarantees that doctor names are never redundantly prefixed (e.g. "Dr. Dr. Fatima...")
 */
export function formatDoctorDisplayName(rawName?: string | null, title: string = 'Dr.'): string {
  if (!rawName) return `${title} Specialist`;
  const trimmed = rawName.trim();
  // Strip any existing "Dr." or "Doctor" prefix
  const cleaned = trimmed.replace(/^(dr\.\s*|dr\s+|doctor\s+)/i, '').trim();
  const prefix = title.endsWith('.') ? title : `${title}.`;
  return `${prefix} ${cleaned}`;
}
