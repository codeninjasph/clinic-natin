/**
 * 🩺 Clinic Natin — Context-Aware Medical Symptom & Chief Complaint Mapper
 * Translates colloquial patient terms (English, Tagalog, and Bisaya/Cebuano spoken in Northern Mindanao)
 * directly into medical specialties and relevant clinical tags.
 */

export interface SymptomMatch {
  label: string;
  specialty: string;
  category: string;
  description: string;
  keywords: string[];
}

export const POPULAR_SYMPTOM_TAGS: SymptomMatch[] = [
  {
    label: 'Chest Pain / Heart Palpitations',
    specialty: 'Cardiology',
    category: 'Cardiovascular',
    description: 'Chest pressure, racing heartbeat, or suspected hypertension',
    keywords: ['chest pain', 'palpitation', 'heart', 'high blood', 'bp', 'sakit dughan', 'dughan', 'pitik', 'cardio'],
  },
  {
    label: 'Stomach Pain / Acid Reflux / GERD',
    specialty: 'Gastroenterology',
    category: 'Digestive',
    description: 'Acid reflux, burning sensation, diarrhea, or recurrent gastric discomfort',
    keywords: ['stomach', 'acid', 'gerd', 'reflux', 'ulcer', 'tiyan', 'sakit tiyan', 'kalibanga', 'gastric'],
  },
  {
    label: 'Persistent Cough / Asthma / Shortness of Breath',
    specialty: 'Pulmonology',
    category: 'Respiratory',
    description: 'Chronic cough, wheezing, asthma flare-ups, or difficulty breathing',
    keywords: ['cough', 'asthma', 'breath', 'lungs', 'ubo', 'sip-on', 'hubak', 'lisod ginhawa', 'pulmo'],
  },
  {
    label: 'Skin Rashes / Allergies / Acne',
    specialty: 'Dermatology',
    category: 'Integumentary',
    description: 'Unexplained rashes, eczema, severe acne, or itchy lesions',
    keywords: ['skin', 'rash', 'acne', 'itch', 'katol', 'nuka', 'allergy', 'derma', 'panit'],
  },
  {
    label: 'Pediatric Care / Child Fever / Vaccines',
    specialty: 'Pediatrics',
    category: 'Children',
    description: 'Infant care, childhood fever, growth checks, and routine immunizations',
    keywords: ['child', 'baby', 'kid', 'pediatric', 'pedia', 'bata', 'hilanat sa bata', 'bakuna', 'immunization'],
  },
  {
    label: 'Pregnancy / Prenatal Check / OB-GYN',
    specialty: 'Obstetrics & Gynecology',
    category: 'Maternal',
    description: 'Prenatal ultrasound, irregular cycle, maternal care, or obstetric checkup',
    keywords: ['pregnancy', 'pregnant', 'ob', 'gyn', 'buntis', 'matris', 'mens', 'ultrasound', 'prenatal'],
  },
  {
    label: 'Headache / Migraine / Dizziness',
    specialty: 'Neurology',
    category: 'Neurological',
    description: 'Severe tension headaches, migraines, vertigo, or sudden dizzy spells',
    keywords: ['headache', 'migraine', 'dizzy', 'vertigo', 'labad sa ulo', 'lipong', 'neuro'],
  },
  {
    label: 'Joint Pain / Arthritis / Bone Injury',
    specialty: 'Orthopedics',
    category: 'Musculoskeletal',
    description: 'Knee arthritis, sprains, post-fracture pain, or limited mobility',
    keywords: ['joint', 'knee', 'bone', 'arthritis', 'rayuma', 'tuhod', 'bali', 'ortho', 'muscles'],
  },
  {
    label: 'General Adult Wellness / Executive Checkup',
    specialty: 'Internal Medicine',
    category: 'General',
    description: 'Comprehensive adult health screening, diabetes, and maintenance prescriptions',
    keywords: ['general', 'wellness', 'checkup', 'internal medicine', 'diabetes', 'maintenance', 'konsulta'],
  },
];

/**
 * Searches the query against symptom keywords and returns matching specialties
 */
export function matchSymptomsToSpecialties(query: string): string[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();

  const matched = new Set<string>();

  for (const item of POPULAR_SYMPTOM_TAGS) {
    if (
      item.specialty.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => q.includes(k) || k.includes(q))
    ) {
      matched.add(item.specialty);
    }
  }

  return Array.from(matched);
}
