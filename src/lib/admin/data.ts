// Clinic Natin — Admin Platform Shared Types & Seed Data
// Compliant with RA 10173, PRC Regulatory Standards, and CDO Healthcare Network

export interface CDOClinic {
  id: string;
  name: string;
  hospital: string;
  building: string;
  floor: string;
  room: string;
  contactNumber: string;
  operatingHours: string;
  activeDoctor: string;
  doctorSpecialty: string;
  servingNumber: number;
  patientsWaiting: number;
  averageConsultationMin: number;
  waitTimeVarianceMin: number;
  status: 'OPTIMAL' | 'MODERATE' | 'BOTTLENECK' | 'PAUSED';
  isOverridden?: boolean;
  overrideReason?: string;
  kiosksActive: number;
}

export interface DoctorCredential {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  subspecialty?: string;
  prcLicense: string;
  prcExpiry: string;
  ptrNumber: string;
  s2License: string;
  boardCertification: string;
  hospitalAffiliation: string;
  roomAssignment: string;
  consultationFee: number;
  status: 'VERIFIED' | 'PENDING' | 'RE_UPLOAD_REQUESTED' | 'REVOKED';
  subscriptionTier: 'free' | 'pro';
  proExpiresAt: string;
  publicBadges: string[];
  submittedAt: string;
  verifiedAt?: string;
  documents: {
    prcCardUrl: string;
    ptrReceiptUrl: string;
    s2CertificateUrl: string;
    boardCertUrl: string;
  };
}

export interface KioskTerminal {
  id: string;
  hospital: string;
  room: string;
  deviceName: string;
  pairingCode: string;
  codeExpiresInMinutes: number;
  status: 'PAIRED_ONLINE' | 'STANDBY' | 'EXPIRED';
  lastHeartbeat: string;
  checkinsToday: number;
}

export interface FinOpsTransaction {
  id: string;
  tokenCode: string;
  patientName: string;
  doctorName: string;
  hospital: string;
  amount: number;
  channel: 'GCASH' | 'MAYA' | 'QRPH' | 'CARD' | 'BILLEASE';
  gatewayRef: string;
  status: 'SUCCESS' | 'PENDING' | 'REFUNDED' | 'FAILED';
  createdAt: string;
  cashierReconciled: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: 'ADMIN' | 'DOCTOR' | 'SECRETARY' | 'PATIENT' | 'SYSTEM';
  action: 'VIEWED_MEDICAL_RECORD' | 'PRINTED_DIGITAL_RX' | 'CHANGED_PRIORITY_CATEGORY' | 'PASSWORD_RESET' | 'ADMIN_IMPERSONATION' | 'OVERRIDE_TRIGGERED' | 'VERIFIED_DOCTOR' | 'FEATURE_FLAG_TOGGLED';
  resourceTable: string;
  recordId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface SMSLogEntry {
  id: string;
  recipientPhone: string;
  recipientName: string;
  type: 'BOOKING_CONFIRMATION' | 'ADVANCE_WARNING_2_AHEAD' | 'NOW_SERVING' | 'EMERGENCY_BROADCAST';
  messageBody: string;
  gatewayStatus: 'DELIVERED' | 'SENT' | 'FAILED';
  latencyMs: number;
  dispatchedAt: string;
}

export interface ICD10Item {
  code: string;
  description: string;
  category: string;
  isCommonCDO: boolean;
}

export interface PNDFItem {
  id: string;
  genericName: string;
  brandNames: string[];
  dosage: string;
  form: string;
  therapeuticClass: string;
}

export interface HMOProvider {
  id: string;
  name: string;
  accreditationStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  requiresPriorAuth: boolean;
  contactDesk: string;
}

export interface FeatureFlags {
  enable_online_payment_deposit: boolean;
  enable_teleconsultation_beta: boolean;
  enable_walkin_kiosk_mode: boolean;
  maintenance_mode: boolean;
  senior_discount_percentage: number;
  pwd_discount_percentage: number;
  auto_buffer_lane_mins: number;
}

// CDO Seed Data
export const INITIAL_CDO_CLINICS: CDOClinic[] = [
  {
    id: 'clinic-mr-304',
    name: 'Pediatrics & Adolescent Care',
    hospital: 'Maria Reyna XU Hospital',
    building: 'Medical Arts Building',
    floor: '3rd Floor',
    room: 'Room 304',
    contactNumber: '+63 (88) 857-4000 loc. 304',
    operatingHours: 'MWF 8:30 AM – 1:30 PM',
    activeDoctor: 'Dr. Maria Santos, MD',
    doctorSpecialty: 'Pediatrics / General Medicine',
    servingNumber: 8,
    patientsWaiting: 14,
    averageConsultationMin: 18,
    waitTimeVarianceMin: 4,
    status: 'OPTIMAL',
    kiosksActive: 1,
  },
  {
    id: 'clinic-cumc-402',
    name: 'Heart Rhythm & Vascular Clinic',
    hospital: 'Capitol University Medical Center (CUMC)',
    building: 'Doctors Clinics Complex',
    floor: '4th Floor',
    room: 'Suite 402',
    contactNumber: '+63 (88) 856-4422 loc. 402',
    operatingHours: 'Mon–Sat 9:00 AM – 3:00 PM',
    activeDoctor: 'Dr. Juan Carlos Reyes, MD',
    doctorSpecialty: 'Adult Cardiology',
    servingNumber: 15,
    patientsWaiting: 28,
    averageConsultationMin: 26,
    waitTimeVarianceMin: 12,
    status: 'BOTTLENECK',
    kiosksActive: 1,
  },
  {
    id: 'clinic-poly-210',
    name: 'Women & Maternal Health Center',
    hospital: 'Polymedic Medical Plaza',
    building: 'Plaza Tower B',
    floor: '2nd Floor',
    room: 'Room 210',
    contactNumber: '+63 (88) 858-5858 loc. 210',
    operatingHours: 'TThS 1:00 PM – 5:30 PM',
    activeDoctor: 'Dr. Fatima Al-Hassan, MD',
    doctorSpecialty: 'Obstetrics & Gynecology',
    servingNumber: 5,
    patientsWaiting: 9,
    averageConsultationMin: 15,
    waitTimeVarianceMin: 3,
    status: 'OPTIMAL',
    kiosksActive: 1,
  },
  {
    id: 'clinic-nmmc-opd1',
    name: 'Internal Medicine Outpatient Clinic',
    hospital: 'Northern Mindanao Medical Center (NMMC)',
    building: 'Outpatient Dept Building',
    floor: 'Ground Floor',
    room: 'OPD Room 1',
    contactNumber: '+63 (88) 72-6362',
    operatingHours: 'Mon–Fri 8:00 AM – 4:00 PM',
    activeDoctor: 'Dr. Kenneth O. Tan, MD',
    doctorSpecialty: 'Internal Medicine',
    servingNumber: 22,
    patientsWaiting: 35,
    averageConsultationMin: 21,
    waitTimeVarianceMin: 15,
    status: 'MODERATE',
    kiosksActive: 2,
  },
];

export const INITIAL_DOCTORS: DoctorCredential[] = [
  {
    id: 'doc-santos',
    name: 'Dr. Maria Santos, MD',
    email: 'maria.santos@maria-reyna.ph',
    phone: '+63 917 842 1092',
    specialty: 'Pediatrics',
    subspecialty: 'Pediatric Pulmonology',
    prcLicense: '0128492',
    prcExpiry: '2028-11-24',
    ptrNumber: 'PTR-CDO-2026-8892104',
    s2License: 'PDEA-S2-99214-R10',
    boardCertification: 'Philippine Pediatric Society (Diplomate)',
    hospitalAffiliation: 'Maria Reyna XU Hospital',
    roomAssignment: 'MAB Room 304',
    consultationFee: 700,
    status: 'VERIFIED',
    subscriptionTier: 'pro',
    proExpiresAt: '2027-01-01',
    publicBadges: ['Verified Specialist', 'PRC-Validated', 'PDEA-S2 Certified'],
    submittedAt: '2026-08-15',
    verifiedAt: '2026-08-16',
    documents: {
      prcCardUrl: '/docs/prc-santos.pdf',
      ptrReceiptUrl: '/docs/ptr-santos.pdf',
      s2CertificateUrl: '/docs/s2-santos.pdf',
      boardCertUrl: '/docs/pps-cert.pdf',
    },
  },
  {
    id: 'doc-reyes',
    name: 'Dr. Juan Carlos Reyes, MD',
    email: 'jc.reyes@cumc.ph',
    phone: '+63 918 203 9941',
    specialty: 'Cardiology',
    subspecialty: 'Interventional Cardiology',
    prcLicense: '0144921',
    prcExpiry: '2027-04-12',
    ptrNumber: 'PTR-CDO-2026-9011245',
    s2License: 'PDEA-S2-81142-R10',
    boardCertification: 'Philippine College of Physicians (Fellow)',
    hospitalAffiliation: 'Capitol University Medical Center',
    roomAssignment: 'Clinic Suite 402',
    consultationFee: 1000,
    status: 'PENDING',
    subscriptionTier: 'pro',
    proExpiresAt: '2026-12-31',
    publicBadges: ['PRC-Pending Review'],
    submittedAt: '2026-09-06',
    documents: {
      prcCardUrl: '/docs/prc-reyes.pdf',
      ptrReceiptUrl: '/docs/ptr-reyes.pdf',
      s2CertificateUrl: '/docs/s2-reyes.pdf',
      boardCertUrl: '/docs/pcp-cert.pdf',
    },
  },
  {
    id: 'doc-alhassan',
    name: 'Dr. Fatima Al-Hassan, MD',
    email: 'fatima.alhassan@polymedic.ph',
    phone: '+63 920 551 2289',
    specialty: 'Obstetrics & Gynecology',
    subspecialty: 'Maternal & Fetal Medicine',
    prcLicense: '0137781',
    prcExpiry: '2028-09-30',
    ptrNumber: 'PTR-CDO-2026-7721903',
    s2License: 'PDEA-S2-44120-R10',
    boardCertification: 'Philippine Obstetrical & Gynecological Society (POGS)',
    hospitalAffiliation: 'Polymedic Medical Plaza',
    roomAssignment: 'Room 210',
    consultationFee: 850,
    status: 'VERIFIED',
    subscriptionTier: 'pro',
    proExpiresAt: '2026-11-30',
    publicBadges: ['Verified Specialist', 'PRC-Validated'],
    submittedAt: '2026-07-20',
    verifiedAt: '2026-07-22',
    documents: {
      prcCardUrl: '/docs/prc-alhassan.pdf',
      ptrReceiptUrl: '/docs/ptr-alhassan.pdf',
      s2CertificateUrl: '/docs/s2-alhassan.pdf',
      boardCertUrl: '/docs/pogs-cert.pdf',
    },
  },
  {
    id: 'doc-tan',
    name: 'Dr. Kenneth O. Tan, MD',
    email: 'k.tan@nmmc.doh.gov.ph',
    phone: '+63 995 332 7710',
    specialty: 'Internal Medicine',
    subspecialty: 'Nephrology',
    prcLicense: '0159820',
    prcExpiry: '2026-10-15',
    ptrNumber: 'PTR-CDO-2026-6612984',
    s2License: 'PDEA-S2-33290-R10',
    boardCertification: 'Philippine Society of Nephrology',
    hospitalAffiliation: 'Northern Mindanao Medical Center',
    roomAssignment: 'OPD Room 1',
    consultationFee: 600,
    status: 'RE_UPLOAD_REQUESTED',
    subscriptionTier: 'free',
    proExpiresAt: '2026-09-01',
    publicBadges: ['PRC-Renewal Required'],
    submittedAt: '2026-08-28',
    documents: {
      prcCardUrl: '/docs/prc-tan-blurry.pdf',
      ptrReceiptUrl: '/docs/ptr-tan.pdf',
      s2CertificateUrl: '/docs/s2-tan.pdf',
      boardCertUrl: '/docs/psn-cert.pdf',
    },
  },
];

export const INITIAL_KIOSKS: KioskTerminal[] = [
  {
    id: 'kiosk-mr-01',
    hospital: 'Maria Reyna XU Hospital',
    room: 'MAB Reception Lobby',
    deviceName: 'iPad Air 5 (MAB Reception A)',
    pairingCode: '492810',
    codeExpiresInMinutes: 45,
    status: 'PAIRED_ONLINE',
    lastHeartbeat: '1 min ago',
    checkinsToday: 42,
  },
  {
    id: 'kiosk-cumc-01',
    hospital: 'Capitol University Medical Center',
    room: 'Doctors Complex 4F Kiosk',
    deviceName: 'Samsung Galaxy Tab S9 (4F Hallway)',
    pairingCode: '618933',
    codeExpiresInMinutes: 20,
    status: 'PAIRED_ONLINE',
    lastHeartbeat: '2 mins ago',
    checkinsToday: 68,
  },
  {
    id: 'kiosk-poly-01',
    hospital: 'Polymedic Medical Plaza',
    room: 'Plaza 2F Triage Desk',
    deviceName: 'iPad 10th Gen (Triage Self-Service)',
    pairingCode: '772904',
    codeExpiresInMinutes: 60,
    status: 'PAIRED_ONLINE',
    lastHeartbeat: 'Just now',
    checkinsToday: 29,
  },
];

export const INITIAL_FINOPS_TRANSACTIONS: FinOpsTransaction[] = [
  {
    id: 'tx-001',
    tokenCode: 'CN-ON001',
    patientName: 'Elena V. Bautista',
    doctorName: 'Dr. Maria Santos, MD',
    hospital: 'Maria Reyna XU Hospital',
    amount: 50.0,
    channel: 'GCASH',
    gatewayRef: 'pm_pi_99182a47cd981',
    status: 'SUCCESS',
    createdAt: '2026-09-08 08:14',
    cashierReconciled: true,
  },
  {
    id: 'tx-002',
    tokenCode: 'CN-ON003',
    patientName: 'Manuel L. Quezon',
    doctorName: 'Dr. Juan Carlos Reyes, MD',
    hospital: 'Capitol University Medical Center',
    amount: 50.0,
    channel: 'MAYA',
    gatewayRef: 'pm_pi_77218b33fe120',
    status: 'SUCCESS',
    createdAt: '2026-09-08 08:32',
    cashierReconciled: true,
  },
  {
    id: 'tx-003',
    tokenCode: 'CN-ON005',
    patientName: 'Gregoria de Jesus',
    doctorName: 'Dr. Fatima Al-Hassan, MD',
    hospital: 'Polymedic Medical Plaza',
    amount: 50.0,
    channel: 'QRPH',
    gatewayRef: 'pm_pi_44901c12ab349',
    status: 'SUCCESS',
    createdAt: '2026-09-08 08:49',
    cashierReconciled: false,
  },
  {
    id: 'tx-004',
    tokenCode: 'CN-ON007',
    patientName: 'Apolinario Mabini',
    doctorName: 'Dr. Kenneth O. Tan, MD',
    hospital: 'Northern Mindanao Medical Center',
    amount: 50.0,
    channel: 'BILLEASE',
    gatewayRef: 'pm_pi_11892d99aa771',
    status: 'PENDING',
    createdAt: '2026-09-08 09:02',
    cashierReconciled: false,
  },
  {
    id: 'tx-005',
    tokenCode: 'CN-ON009',
    patientName: 'Emilio Aguinaldo',
    doctorName: 'Dr. Maria Santos, MD',
    hospital: 'Maria Reyna XU Hospital',
    amount: 50.0,
    channel: 'GCASH',
    gatewayRef: 'pm_pi_22091f88dd192',
    status: 'REFUNDED',
    createdAt: '2026-09-07 14:10',
    cashierReconciled: true,
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    actorId: 'doc-santos',
    actorName: 'Dr. Maria Santos, MD',
    actorRole: 'DOCTOR',
    action: 'VIEWED_MEDICAL_RECORD',
    resourceTable: 'medical_records',
    recordId: 'med-rec-7718',
    details: 'Viewed longitudinal pediatric immunization record for Patient Andres B.',
    ipAddress: '120.28.184.21 (Maria Reyna LAN)',
    timestamp: '2026-09-08 08:44:12',
  },
  {
    id: 'audit-002',
    actorId: 'doc-santos',
    actorName: 'Dr. Maria Santos, MD',
    actorRole: 'DOCTOR',
    action: 'PRINTED_DIGITAL_RX',
    resourceTable: 'prescriptions',
    recordId: 'rx-22019',
    details: 'Generated and digitally signed e-Prescription (Amoxicillin 250mg/5mL)',
    ipAddress: '120.28.184.21 (Maria Reyna LAN)',
    timestamp: '2026-09-08 08:52:05',
  },
  {
    id: 'audit-003',
    actorId: 'sec-bautista',
    actorName: 'Elena Bautista (Secretary)',
    actorRole: 'SECRETARY',
    action: 'CHANGED_PRIORITY_CATEGORY',
    resourceTable: 'appointments',
    recordId: 'apt-9921',
    details: 'Validated OSCA Senior Citizen ID (#CDO-99120) for Patient Corazon A. (Applied 20% discount & priority lane)',
    ipAddress: '120.28.184.22 (Reception Desk)',
    timestamp: '2026-09-08 08:58:30',
  },
  {
    id: 'audit-004',
    actorId: 'admin-super',
    actorName: 'Atty. Rafael Ramos (Admin)',
    actorRole: 'ADMIN',
    action: 'ADMIN_IMPERSONATION',
    resourceTable: 'sessions',
    recordId: 'imp-ses-441',
    details: 'Authorized support impersonation for Dr. Juan Carlos Reyes (Ticket #SUP-1082: investigate queue bottleneck notification)',
    ipAddress: '124.106.129.5 (Admin Ops Headquarters)',
    timestamp: '2026-09-08 09:05:18',
  },
  {
    id: 'audit-005',
    actorId: 'admin-super',
    actorName: 'Atty. Rafael Ramos (Admin)',
    actorRole: 'ADMIN',
    action: 'VERIFIED_DOCTOR',
    resourceTable: 'doctors',
    recordId: 'doc-santos',
    details: 'Verified PRC license (#0128492) and PDEA S2 clearance for Dr. Maria Santos',
    ipAddress: '124.106.129.5 (Admin Ops Headquarters)',
    timestamp: '2026-09-07 16:30:00',
  },
];

export const INITIAL_SMS_LOGS: SMSLogEntry[] = [
  {
    id: 'sms-001',
    recipientPhone: '+63 917 555 1234',
    recipientName: 'Elena V. Bautista',
    type: 'BOOKING_CONFIRMATION',
    messageBody: 'Clinic Natin: Confirmed! Your token is CN-ON001 for Dr. Santos at Maria Reyna MAB 304. Expected 8:30 AM.',
    gatewayStatus: 'DELIVERED',
    latencyMs: 1420,
    dispatchedAt: '2026-09-08 08:14:22',
  },
  {
    id: 'sms-002',
    recipientPhone: '+63 918 444 9876',
    recipientName: 'Manuel L. Quezon',
    type: 'ADVANCE_WARNING_2_AHEAD',
    messageBody: 'Clinic Natin: 2 patients ahead for Token CN-ON003. Please proceed to CUMC Suite 402 waiting area.',
    gatewayStatus: 'DELIVERED',
    latencyMs: 1650,
    dispatchedAt: '2026-09-08 08:35:10',
  },
  {
    id: 'sms-003',
    recipientPhone: '+63 920 333 4567',
    recipientName: 'Gregoria de Jesus',
    type: 'NOW_SERVING',
    messageBody: 'Clinic Natin: NOW SERVING Token CN-ON005. Please enter Room 210 with Dr. Fatima Al-Hassan.',
    gatewayStatus: 'DELIVERED',
    latencyMs: 1210,
    dispatchedAt: '2026-09-08 08:50:04',
  },
];

export const INITIAL_ICD10: ICD10Item[] = [
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory', isCommonCDO: true },
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular', isCommonCDO: true },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine', isCommonCDO: true },
  { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified', category: 'Gastrointestinal', isCommonCDO: true },
  { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory', isCommonCDO: true },
  { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal', isCommonCDO: false },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'Genitourinary', isCommonCDO: true },
  { code: 'B34.9', description: 'Viral infection, unspecified (Dengue / Chikungunya triage)', category: 'Infectious', isCommonCDO: true },
];

export const INITIAL_PNDF: PNDFItem[] = [
  {
    id: 'pndf-001',
    genericName: 'Paracetamol',
    brandNames: ['Biogesic', 'Tempra', 'Calpol'],
    dosage: '500mg tab / 250mg/5mL syrup',
    form: 'Tablet / Suspension',
    therapeuticClass: 'Analgesic & Antipyretic',
  },
  {
    id: 'pndf-002',
    genericName: 'Amlodipine Besylate',
    brandNames: ['Norvasc', 'Amvaz', 'Amlife'],
    dosage: '5mg, 10mg',
    form: 'Tablet',
    therapeuticClass: 'Antihypertensive (Calcium Channel Blocker)',
  },
  {
    id: 'pndf-003',
    genericName: 'Amoxicillin + Clavulanic Acid',
    brandNames: ['Augmentin', 'Natravox', 'Co-Amoxiclav'],
    dosage: '625mg tab / 312.5mg/5mL susp',
    form: 'Tablet / Suspension',
    therapeuticClass: 'Antibiotic (Beta-lactamase inhibitor)',
  },
  {
    id: 'pndf-004',
    genericName: 'Metformin Hydrochloride',
    brandNames: ['Glucophage', 'Humamet', 'Diaformin'],
    dosage: '500mg, 850mg',
    form: 'Film-coated tablet',
    therapeuticClass: 'Oral Hypoglycemic (Biguanide)',
  },
  {
    id: 'pndf-005',
    genericName: 'Cetirizine Hydrochloride',
    brandNames: ['Zyrtec', 'Alnix', 'Virlix'],
    dosage: '10mg tab / 5mg/5mL drops',
    form: 'Tablet / Syrup',
    therapeuticClass: 'Antihistamine (2nd generation)',
  },
];

export const INITIAL_HMOS: HMOProvider[] = [
  { id: 'hmo-maxicare', name: 'Maxicare Healthcare Corporation', accreditationStatus: 'ACTIVE', requiresPriorAuth: true, contactDesk: '(02) 8582-1900' },
  { id: 'hmo-intellicare', name: 'Intellicare (Asalus Corporation)', accreditationStatus: 'ACTIVE', requiresPriorAuth: true, contactDesk: '(02) 8789-4000' },
  { id: 'hmo-medicard', name: 'MediCard Philippines', accreditationStatus: 'ACTIVE', requiresPriorAuth: true, contactDesk: '(02) 8884-9999' },
  { id: 'hmo-philhealth', name: 'PhilHealth Konsulta (Yakap Bayan)', accreditationStatus: 'ACTIVE', requiresPriorAuth: false, contactDesk: '(088) 857-4180 CDO' },
  { id: 'hmo-caritas', name: 'Caritas Health Shield', accreditationStatus: 'ACTIVE', requiresPriorAuth: true, contactDesk: '(02) 8635-7100' },
  { id: 'hmo-etiqa', name: 'Etiqa Life and General (CDO Branch)', accreditationStatus: 'ACTIVE', requiresPriorAuth: true, contactDesk: '(088) 856-1120' },
];

export const INITIAL_FEATURE_FLAGS: FeatureFlags = {
  enable_online_payment_deposit: true,
  enable_teleconsultation_beta: false,
  enable_walkin_kiosk_mode: true,
  maintenance_mode: false,
  senior_discount_percentage: 20,
  pwd_discount_percentage: 20,
  auto_buffer_lane_mins: 45,
};
