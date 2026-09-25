'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Users,
  CheckCircle2,
  Play,
  Pause,
  RefreshCw,
  BellRing,
  Activity,
  UserCheck,
  AlertTriangle,
  Search,
  X,
  ChevronRight,
  History,
  Crown,
  Lock,
  Paperclip,
  Loader2,
  Pill,
  RotateCcw,
  FlaskConical,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BufferModal } from '@/components/secretary/buffer-modal';

import { useDoctor } from '../doctor-context';

// ──────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ──────────────────────────────────────────────────────────────────────────────
interface QueueSession {
  id: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  session_date: string;
  announcement_notice: string | null;
}

interface Appointment {
  id: string;
  queue_number: number;
  token_code: string;
  status: string;
  priority_category: string;
  priority_notes?: string | null;
  display_name: string;
  booking_channel?: 'ONLINE' | 'WALK_IN';
  patient_id?: string | null;
  patient_profile?: {
    full_name?: string;
    allergies?: string[];
    date_of_birth?: string;
    gender?: string;
    phone_number?: string;
  } | null;
  buffered_at?: string | null;
  grace_period_deadline?: string | null;
  created_at: string;
}

interface Vitals {
  blood_pressure: string;
  heart_rate: number | null;
  temperature_c: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  oxygen_saturation: number | null;
}

interface PatientEMR {
  vitals: Vitals | null;
  allergies: string[];
  recordId: string | null;
}

interface ICD10Result {
  code: string;
  label: string;
  whoUrl?: string;
  philHealthVerified?: boolean;
}

interface SOAPState {
  chiefComplaint: string;
  hpi: string;
  pe: {
    heent: string;
    neck: string;
    chest: string;
    heart: string;
    abdomen: string;
    extremities: string;
    neuro: string;
  };
  diagnoses: ICD10Result[];
  plan: string;
  nonPharmPlan: string;
  followupRecommended: boolean;
  followupDate: string;
}

type VitalFlag = 'normal' | 'warning' | 'critical' | undefined;

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const QUICK_COMPLAINT_TAGS = [
  'Fever',
  'Cough',
  'Headache',
  'Dizziness',
  'Chest Pain',
  'Follow-up Visit',
  'Annual Checkup',
  'Abdominal Pain',
  'Body Pain',
  'Vomiting',
  'Shortness of Breath',
];

const PE_FIELDS: { key: keyof SOAPState['pe']; label: string; placeholder: string }[] = [
  { key: 'heent', label: 'HEENT', placeholder: 'e.g., Anicteric sclerae, pink palpebral conjunctivae' },
  { key: 'neck', label: 'Neck', placeholder: 'e.g., No lymphadenopathy, no thyromegaly' },
  { key: 'chest', label: 'Chest / Lungs', placeholder: 'e.g., Clear breath sounds, no adventitious sounds' },
  { key: 'heart', label: 'Heart', placeholder: 'e.g., Regular rate and rhythm, no murmur' },
  { key: 'abdomen', label: 'Abdomen', placeholder: 'e.g., Soft, non-tender, no organomegaly' },
  { key: 'extremities', label: 'Extremities', placeholder: 'e.g., No edema, full pulses' },
  { key: 'neuro', label: 'Neurological', placeholder: 'e.g., GCS 15, no focal deficits' },
];

const DEFAULT_SOAP: SOAPState = {
  chiefComplaint: '',
  hpi: '',
  pe: { heent: '', neck: '', chest: '', heart: '', abdomen: '', extremities: '', neuro: '' },
  diagnoses: [],
  plan: '',
  nonPharmPlan: '',
  followupRecommended: false,
  followupDate: '',
};

// IsMockId — for demo data that won't exist in Supabase
const isMockId = (id: string) =>
  id.startsWith('mock-') || ['1', '2', '3', '4', '5'].includes(id);

// ──────────────────────────────────────────────────────────────────────────────
// Vital analysis helpers
// ──────────────────────────────────────────────────────────────────────────────
function analyzeVitals(v: Vitals): Record<string, VitalFlag> {
  const flags: Record<string, VitalFlag> = {};

  // Blood pressure
  if (v.blood_pressure) {
    const [sys, dia] = v.blood_pressure.split('/').map(Number);
    if (!isNaN(sys) && !isNaN(dia)) {
      if (sys >= 160 || dia >= 100) flags.bp = 'critical';
      else if (sys >= 130 || dia >= 85) flags.bp = 'warning';
      else flags.bp = 'normal';
    }
  }

  // Heart rate
  if (v.heart_rate !== null) {
    if (v.heart_rate > 100 || v.heart_rate < 50) flags.hr = 'critical';
    else if (v.heart_rate > 90 || v.heart_rate < 60) flags.hr = 'warning';
    else flags.hr = 'normal';
  }

  // Temperature (°C)
  if (v.temperature_c !== null) {
    if (v.temperature_c >= 38.5) flags.temp = 'critical';
    else if (v.temperature_c >= 37.5 || v.temperature_c < 36.0) flags.temp = 'warning';
    else flags.temp = 'normal';
  }

  // SpO2
  if (v.oxygen_saturation !== null) {
    if (v.oxygen_saturation < 90) flags.spo2 = 'critical';
    else if (v.oxygen_saturation < 95) flags.spo2 = 'warning';
    else flags.spo2 = 'normal';
  }

  // BMI
  if (v.bmi !== null) {
    if (v.bmi >= 30) flags.bmi = 'critical';
    else if (v.bmi >= 25 || v.bmi < 18.5) flags.bmi = 'warning';
    else flags.bmi = 'normal';
  }

  return flags;
}

function vitalCardClass(flag: VitalFlag) {
  if (flag === 'critical') return 'bg-red-50 border-red-200';
  if (flag === 'warning') return 'bg-amber-50 border-amber-200';
  return 'bg-white border-slate-100';
}
function vitalValueClass(flag: VitalFlag) {
  if (flag === 'critical') return 'text-red-700 font-black';
  if (flag === 'warning') return 'text-amber-700 font-black';
  return 'text-slate-800 font-black';
}
function bmiLabel(bmi: number | null): string {
  if (!bmi) return '—';
  if (bmi < 18.5) return `${bmi.toFixed(1)} Underweight`;
  if (bmi < 25) return `${bmi.toFixed(1)} Normal`;
  if (bmi < 30) return `${bmi.toFixed(1)} Overweight`;
  return `${bmi.toFixed(1)} Obese`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Priority badge helper
// ──────────────────────────────────────────────────────────────────────────────
function PriorityBadge({ category, notes }: { category: string; notes?: string | null }) {
  if (category === 'NONE') return null;
  const map: Record<string, string> = {
    SENIOR: 'bg-orange-100 text-orange-800 border-orange-200',
    PWD: 'bg-purple-100 text-purple-800 border-purple-200',
    PREGNANT: 'bg-pink-100 text-pink-800 border-pink-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${map[category] || 'bg-slate-100 text-slate-700'}`}
    >
      {category} (20% Off){notes ? ` • ${notes}` : ''}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page (Phase B Upgraded Cockpit)
// ──────────────────────────────────────────────────────────────────────────────
export default function DoctorDashboardPage() {
  const supabase = createClient();
  const { doctor, selectedRoom, refreshDoctorData, startSession, resumeSession } = useDoctor();

  // Queue state
  const [session, setSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);

  // EMR state
  const [patientEMR, setPatientEMR] = useState<PatientEMR | null>(null);
  const [emrLoading, setEmrLoading] = useState(false);

  // SOAP state
  const [soap, setSoap] = useState<SOAPState>(DEFAULT_SOAP);

  // ICD-10 search state
  const [icdQuery, setIcdQuery] = useState('');
  const [icdResults, setIcdResults] = useState<ICD10Result[]>([]);
  const [icdLoading, setIcdLoading] = useState(false);
  const [showIcdDropdown, setShowIcdDropdown] = useState(false);
  const icdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const icdContainerRef = useRef<HTMLDivElement>(null);

  // Broadcast state
  const [announcementText, setAnnouncementText] = useState('');
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);

  // Longitudinal history UI (Pro only)
  const [showLongitudinal, setShowLongitudinal] = useState(false);
  const [pastEncounters, setPastEncounters] = useState<
    Array<{
      id: string;
      date: string;
      room: string;
      dx: string;
      vitals: string;
      rx: string | null;
      attachment?: string;
    }>
  >([]);
  const subscriptionTier =
    typeof window !== 'undefined'
      ? (localStorage.getItem('doctor_subscription_tier') as 'free' | 'pro' | null) || 'pro'
      : 'pro';

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingRx, setIsGeneratingRx] = useState(false);
  const [isBufferModalOpen, setIsBufferModalOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [queueTab, setQueueTab] = useState<'active' | 'buffered'>('active');
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'destructive' | 'brand';
    title: string;
    message: string;
  } | null>(null);

  // ── Derived queue state ────────────────────────────────────────────────────
  const currentlyServing = appointments.find((a) => a.status === 'SERVING');
  const waitingPatients = appointments.filter(
    (a) => a.status === 'WAITING' || a.status === 'BOOKED'
  );
  const bufferedPatients = appointments.filter((a) => a.status === 'BUFFERED');
  const nextInLine = waitingPatients[0];

  // ── Fetch queue + appointments ─────────────────────────────────────────────
  const fetchDoctorQueue = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('queue_sessions')
        .select('*')
        .in('status', ['ACTIVE', 'PAUSED', 'PENDING'])
        .eq('session_date', todayStr)
        .order('last_updated_at', { ascending: false });

      if (selectedRoom?.clinicId) {
        query = query.eq('clinic_id', selectedRoom.clinicId);
      }
      if (doctor?.id) {
        query = query.eq('doctor_id', doctor.id);
      }

      const { data: sessionData } = await query.limit(1).maybeSingle();

      if (sessionData) {
        setSession(sessionData);

        const { data: apptsData } = await supabase
          .from('appointments')
          .select(
            'id, queue_number, token_code, status, priority_category, priority_notes, booking_channel, walk_in_name, patient_id, buffered_at, grace_period_deadline, created_at, profiles:patient_id (full_name, date_of_birth, gender, allergies, phone_number)'
          )
          .eq('queue_session_id', sessionData.id)
          .order('queue_number', { ascending: true });

        if (apptsData) {
          const formatted: Appointment[] = apptsData.map((a) => {
            const isOnline = a.booking_channel === 'ONLINE' || (!a.booking_channel && !a.walk_in_name);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = (a as any).profiles;
            const displayName =
              profile?.full_name ||
              a.walk_in_name ||
              (isOnline ? `Online Patient #${a.queue_number}` : `Walk-in Patient #${a.queue_number}`);

            return {
              id: a.id,
              queue_number: a.queue_number,
              token_code:
                a.token_code ||
                (isOnline
                  ? `CN-ON${String(a.queue_number).padStart(3, '0')}`
                  : `CN-WK${String(a.queue_number).padStart(3, '0')}`),
              status: a.status,
              priority_category: a.priority_category || 'NONE',
              priority_notes: a.priority_notes || null,
              display_name: displayName,
              booking_channel: (a.booking_channel as 'ONLINE' | 'WALK_IN') || (isOnline ? 'ONLINE' : 'WALK_IN'),
              patient_id: a.patient_id,
              patient_profile: profile || null,
              buffered_at: a.buffered_at,
              grace_period_deadline: a.grace_period_deadline,
              created_at: a.created_at,
            };
          });
          setAppointments(formatted);
        }
      } else {
        setSession(null);
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error loading doctor queue:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedRoom?.clinicId, doctor?.id]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    fetchDoctorQueue();
    const channel: RealtimeChannel = supabase
      .channel('doctor-dashboard-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_sessions' }, fetchDoctorQueue)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchDoctorQueue)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDoctorQueue, supabase]);

  // ── Launch New Session Handler ─────────────────────────────────────────────
  const handleStartSession = async () => {
    if (doctor && (!doctor.isVerified || doctor.verificationStatus === 'PENDING')) {
      setToastNotice({
        type: 'destructive',
        title: 'Verification In Progress',
        message: 'Your physician credentials (PRC license) are currently pending administrative review. Queue session operations will activate once verified by Clinic Natin Operations.',
      });
      return;
    }
    if (!selectedRoom?.clinicId || !doctor?.id) return;
    setIsStartingSession(true);
    try {
      const ok = await startSession(selectedRoom.clinicId);
      if (!ok) throw new Error('Failed to start session');
      setToastNotice({
        type: 'success',
        title: 'Session Started',
        message: `Queue session opened at ${selectedRoom.clinicName} (${selectedRoom.room}).`,
      });
      await fetchDoctorQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Launch Failed',
        message: err instanceof Error ? err.message : 'Unable to launch queue session.',
      });
    } finally {
      setIsStartingSession(false);
    }
  };

  // ── Fetch EMR when serving patient changes ─────────────────────────────────
  const fetchCurrentPatientEMR = useCallback(
    async (appointmentId: string, patientId: string | null) => {
      setEmrLoading(true);
      try {
        // Demo vitals for mock sessions (preserves a rich demo experience)
        if (isMockId(appointmentId)) {
          await new Promise((r) => setTimeout(r, 700)); // simulate network
          const isBoniface = appointmentId === '2';
          setPatientEMR({
            vitals: {
              blood_pressure: isBoniface ? '148/94' : '118/76',
              heart_rate: isBoniface ? 96 : 74,
              temperature_c: isBoniface ? 37.1 : 36.6,
              weight_kg: isBoniface ? 78 : 65,
              height_cm: isBoniface ? 170 : 160,
              bmi: isBoniface ? 27.0 : 25.4,
              oxygen_saturation: isBoniface ? 97 : 99,
            },
            // Andres Bonifacio has documented allergies — triggers the RED allergy banner
            allergies: isBoniface ? ['Penicillin', 'Sulfa drugs', 'NSAIDs'] : [],
            recordId: null,
          });
          return;
        }

        // Real Supabase fetch
        const { data: mr } = await supabase
          .from('medical_records')
          .select('id, vitals')
          .eq('appointment_id', appointmentId)
          .maybeSingle();

        let allergies: string[] = [];
        if (patientId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('allergies')
            .eq('id', patientId)
            .maybeSingle();
          allergies = profile?.allergies || [];

          // Query real longitudinal medical records for this patient
          const { data: pastRecords } = await supabase
            .from('medical_records')
            .select('id, created_at, diagnosis, vitals, private_notes, appointments:appointment_id(queue_sessions:queue_session_id(clinics:clinic_id(name, room_number)))')
            .eq('patient_id', patientId)
            .neq('appointment_id', appointmentId)
            .order('created_at', { ascending: false })
            .limit(5);

          if (pastRecords && pastRecords.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = pastRecords.map((r: any) => {
              const v = r.vitals;
              const vitalsText = v?.blood_pressure ? `BP ${v.blood_pressure}, HR ${v.heart_rate || '—'} bpm` : 'Baseline vitals recorded';
              const clinicInfo = r.appointments?.queue_sessions?.clinics;
              const clinicName = clinicInfo?.name || 'Clinic Natin CDO';
              const room = clinicInfo?.room_number || 'Suite 304';
              return {
                id: r.id,
                date: new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
                room: `${clinicName} (${room})`,
                dx: r.diagnosis || 'Clinical Encounter',
                vitals: vitalsText,
                rx: r.private_notes?.includes('[PHARMACOLOGICAL PLAN (Rx)]')
                  ? r.private_notes.split('[PHARMACOLOGICAL PLAN (Rx)]\n')[1]?.split('\n\n')[0]
                  : null,
              };
            });
            setPastEncounters(mapped);
          } else {
            setPastEncounters([]);
          }
        } else {
          setPastEncounters([]);
        }

        setPatientEMR({
          vitals: mr?.vitals || null,
          allergies,
          recordId: mr?.id || null,
        });
      } catch (e) {
        console.error('Error fetching patient EMR:', e);
        setPatientEMR({ vitals: null, allergies: [], recordId: null });
        setPastEncounters([]);
      } finally {
        setEmrLoading(false);
      }
    },
    [supabase]
  );

  const currentServingId = currentlyServing?.id;
  const currentServingPatientId = currentlyServing?.patient_id ?? null;

  useEffect(() => {
    if (currentServingId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCurrentPatientEMR(currentServingId, currentServingPatientId);
      setSoap(DEFAULT_SOAP);
      setIcdQuery('');
      setIcdResults([]);
      setShowIcdDropdown(false);
    } else {
      setPatientEMR(null);
      setPastEncounters([]);
    }
  }, [currentServingId, currentServingPatientId, fetchCurrentPatientEMR]);

  // ── Close ICD-10 dropdown on outside click ─────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        icdContainerRef.current &&
        !icdContainerRef.current.contains(e.target as Node)
      ) {
        setShowIcdDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── ICD-10 search (@lowlysre/icd-10-cm + WHO 2019 / NLM API fallback) ──────
  const handleIcdSearch = (query: string) => {
    setIcdQuery(query);
    if (icdTimerRef.current) clearTimeout(icdTimerRef.current);
    if (query.length < 2) {
      setIcdResults([]);
      setShowIcdDropdown(false);
      return;
    }
    setIcdLoading(true);
    setShowIcdDropdown(true);
    icdTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/doctor/icd10?q=${encodeURIComponent(query)}&limit=15`);
        if (!res.ok) throw new Error('Local search error');
        const data = await res.json();
        const results: ICD10Result[] = data.results || [];
        setIcdResults(results);
        setShowIcdDropdown(results.length > 0);
      } catch {
        // Fallback to NLM Clinical Tables
        try {
          const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}&maxList=10`;
          const res = await fetch(url);
          const data = await res.json();
          const results: ICD10Result[] = (data[3] || []).map(
            ([code, label]: [string, string]) => ({
              code,
              label,
              whoUrl: `https://icd.who.int/browse10/2019/en#/${code}`,
              philHealthVerified: true,
            })
          );
          setIcdResults(results);
          setShowIcdDropdown(results.length > 0);
        } catch {
          setIcdResults([]);
          setShowIcdDropdown(false);
        }
      } finally {
        setIcdLoading(false);
      }
    }, 200);
  };

  const handleSelectDiagnosis = (result: ICD10Result) => {
    if (!soap.diagnoses.find((d) => d.code === result.code)) {
      setSoap((prev) => ({ ...prev, diagnoses: [...prev.diagnoses, result] }));
    }
    setIcdQuery('');
    setIcdResults([]);
    setShowIcdDropdown(false);
  };

  const handleRemoveDiagnosis = (code: string) => {
    setSoap((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.filter((d) => d.code !== code),
    }));
  };

  // ── Queue: call next patient via API ───────────────────────────────────────
  const handleCallNext = useCallback(async () => {
    if (!session) return;
    if (!nextInLine && !currentlyServing) return;

    try {
      if (session.status === 'PENDING') {
        await startSession(selectedRoom?.clinicId);
      }
      const res = await fetch('/api/queue/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueSessionId: session.id,
          currentAppointmentId: currentlyServing?.id || null,
          nextAppointmentId: nextInLine?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance queue turn');

      if (data.advanceWarningSent) {
        setToastNotice({
          type: 'brand',
          title: 'Advance Warning Dispatched',
          message: `SMS warning sent to patient ${data.recipientToken} (2 ahead in line).`,
        });
      } else if (data.completedOnly) {
        setToastNotice({
          type: 'success',
          title: 'Consultation Concluded',
          message: 'Patient consultation completed. No more patients waiting in queue.',
        });
      }
      await fetchDoctorQueue();
    } catch (e) {
      console.error('Error calling next patient:', e);
      setToastNotice({
        type: 'destructive',
        title: 'Queue Advance Error',
        message: e instanceof Error ? e.message : 'Failed to advance queue turn',
      });
    }
  }, [nextInLine, session, currentlyServing, selectedRoom?.clinicId, startSession, fetchDoctorQueue]);

  // ── Save SOAP + call next ──────────────────────────────────────────────────
  const handleSaveAndCallNext = useCallback(async () => {
    if (!currentlyServing || !session || isSaving) return;
    setIsSaving(true);
    try {
      const soapRes = await fetch('/api/doctor/save-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: currentlyServing.id,
          patientId: currentlyServing.patient_id,
          chiefComplaint: soap.chiefComplaint,
          hpi: soap.hpi,
          physicalExam: soap.pe,
          diagnoses: soap.diagnoses,
          plan: soap.plan,
          nonPharmPlan: soap.nonPharmPlan,
          followupDate: soap.followupRecommended ? soap.followupDate : null,
          icd10Code: soap.diagnoses[0]?.code || null,
          icd10Label: soap.diagnoses[0]?.label || null,
        }),
      });
      const soapData = await soapRes.json().catch(() => ({}));
      if (!soapRes.ok) throw new Error(soapData.error || 'Save failed');
      setToastNotice({
        type: 'success',
        title: 'Consultation Saved',
        message: nextInLine
          ? `SOAP recorded for ${currentlyServing.display_name}. Calling next patient...`
          : `SOAP recorded for ${currentlyServing.display_name}. Concluding session...`,
      });
    } catch (err: unknown) {
      console.error('Save consultation error:', err);
      setToastNotice({
        type: 'destructive',
        title: 'Save Warning',
        message: err instanceof Error ? err.message : 'Could not save consultation completely.',
      });
    }
    await handleCallNext();
    setSoap(DEFAULT_SOAP);
    setIcdQuery('');
    setIcdResults([]);
    setIsSaving(false);
    setTimeout(() => setToastNotice(null), 6000);
  }, [currentlyServing, session, isSaving, soap, nextInLine, handleCallNext]);

  // ── Auto-generate digital prescription immediately from SOAP plan ───────────
  const handleAutoGenerateRx = async () => {
    if (!currentlyServing) return;
    if (!soap.plan.trim()) {
      setToastNotice({
        type: 'destructive',
        title: 'Plan is Empty',
        message: 'Please write medication instructions in the Pharmacological Plan (Rx) box first.',
      });
      return;
    }
    setIsGeneratingRx(true);
    try {
      const res = await fetch('/api/doctor/save-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: currentlyServing.id,
          patientId: currentlyServing.patient_id,
          chiefComplaint: soap.chiefComplaint,
          hpi: soap.hpi,
          physicalExam: soap.pe,
          diagnoses: soap.diagnoses,
          plan: soap.plan,
          nonPharmPlan: soap.nonPharmPlan,
          followupDate: soap.followupRecommended ? soap.followupDate : null,
          icd10Code: soap.diagnoses[0]?.code || null,
          icd10Label: soap.diagnoses[0]?.label || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-generate prescription');

      setToastNotice({
        type: 'success',
        title: 'Digital Prescription Generated',
        message: `Digital Rx automatically created and saved to EMR for ${currentlyServing.display_name}.`,
      });
      if (currentlyServing.id) {
        fetchCurrentPatientEMR(currentlyServing.id, currentlyServing.patient_id || null);
      }
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Prescription Error',
        message: err instanceof Error ? err.message : 'Could not create prescription.',
      });
    } finally {
      setIsGeneratingRx(false);
    }
  };

  // ── Queue: Buffer current patient (Labs / Diagnostic) ─────────────────────
  const handleConfirmBuffer = async (
    appointmentId: string,
    graceMinutes: number,
    reason: string
  ) => {
    if (!currentlyServing) return;
    setIsBuffering(true);
    try {
      const res = await fetch('/api/queue/buffer-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          reason,
          graceMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to buffer patient');
      setToastNotice({
        type: 'brand',
        title: 'Patient Buffered',
        message: `${currentlyServing.display_name} (${currentlyServing.token_code}) moved to Buffer Lane (${graceMinutes}m Grace Period).`,
      });
      setSoap(DEFAULT_SOAP);
      setIsBufferModalOpen(false);
      await fetchDoctorQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Buffer Failed',
        message: err instanceof Error ? err.message : 'Could not buffer patient.',
      });
    } finally {
      setIsBuffering(false);
    }
  };

  // ── Queue: Skip or No-show ────────────────────────────────────────────────
  const handleSkipCurrent = async (markNoShow = false) => {
    if (!currentlyServing) return;
    try {
      const res = await fetch('/api/queue/skip-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: currentlyServing.id,
          markNoShow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to skip patient');
      setToastNotice({
        type: markNoShow ? 'destructive' : 'brand',
        title: markNoShow ? 'Marked as No-Show' : 'Patient Skipped',
        message: `${currentlyServing.display_name} has been ${markNoShow ? 'forfeited' : 'skipped'}. Calling next patient...`,
      });
      setSoap(DEFAULT_SOAP);
      await handleCallNext();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Action Failed',
        message: err instanceof Error ? err.message : 'Could not skip patient.',
      });
    }
  };

  // ── Queue: Restore buffered patient ───────────────────────────────────────
  const handleRestoreBuffered = async (appointmentId: string) => {
    if (!session) return;
    try {
      const res = await fetch('/api/queue/restore-buffered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          queueSessionId: session.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore patient');
      setToastNotice({
        type: 'success',
        title: 'Patient Restored',
        message: data.message || 'Patient restored to active queue lineup.',
      });
      await fetchDoctorQueue();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Restore Failed',
        message: err instanceof Error ? err.message : 'Could not restore patient.',
      });
    }
  };

  // ── Keyboard shortcuts (Space or Ctrl + Enter) ─────────────────────────────
  const saveAndCallRef = useRef(handleSaveAndCallNext);
  useEffect(() => { saveAndCallRef.current = handleSaveAndCallNext; });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isTyping =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveAndCallRef.current();
      } else if (e.code === 'Space' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        saveAndCallRef.current();
      }
      if (e.key === 'Escape') setToastNotice(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Emergency delay broadcast ──────────────────────────────────────────────
  const handleSaveAnnouncement = async (minutes: number, customText?: string) => {
    if (!session) return;
    setIsBroadcastLoading(true);
    try {
      const res = await fetch('/api/queue/delay-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          delayMinutes: minutes,
          reason: customText || announcementText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');
      setSession((prev) =>
        prev ? { ...prev, announcement_notice: data.announcement } : prev
      );
      setToastNotice({
        type: 'success',
        title: 'Broadcast Dispatched',
        message: `Alerted ${data.smsSent ?? 0} patients via Semaphore SMS.`,
      });
      setAnnouncementText('');
      setTimeout(() => setToastNotice(null), 6000);
    } catch {
      setToastNotice({
        type: 'destructive',
        title: 'Broadcast Error',
        message: 'Could not dispatch delay notice to queued patients.',
      });
    } finally {
      setIsBroadcastLoading(false);
    }
  };

  // ── EMR derived values ─────────────────────────────────────────────────────
  const vitals = patientEMR?.vitals ?? null;
  const vitalFlags = vitals ? analyzeVitals(vitals) : {};
  const hasAllergies = (patientEMR?.allergies ?? []).length > 0;

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="flex items-center gap-2.5 text-brand-700 font-semibold text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Connecting to Clinic Natin Doctor Suite...
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Toast notification ──────────────────────────────────────────── */}
      {toastNotice && (
        <Alert
          variant={
            toastNotice.type === 'destructive'
              ? 'destructive'
              : toastNotice.type === 'brand'
                ? 'brand'
                : 'success'
          }
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <AlertTitle>{toastNotice.title}</AlertTitle>
              <AlertDescription>{toastNotice.message}</AlertDescription>
            </div>
            <button
              onClick={() => setToastNotice(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 ml-4 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      {/* ── Start Session Launcher Banner (if no active session today) ── */}
      {(!session || session.status === 'PENDING') && (
        <Card className="border-brand-200 bg-brand-50/50">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">No Active Queue Session for Today</h3>
                <p className="text-xs text-slate-500">
                  {selectedRoom
                    ? `Launch queue session for ${selectedRoom.clinicName} (${selectedRoom.room})${waitingPatients.length > 0 ? ` · ${waitingPatients.length} patient${waitingPatients.length > 1 ? 's' : ''} waiting` : ''}`
                    : 'Select a clinic room from the top bar to open today\'s queue session.'}
                </p>
              </div>
            </div>
            <Button
              variant="brand"
              onClick={handleStartSession}
              disabled={isStartingSession || !selectedRoom}
              className="shrink-0"
            >
              {isStartingSession ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Play className="h-4 w-4 fill-current mr-1.5" />
              )}
              Start Today&apos;s Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Paused Session Alert Banner (if queue paused on rounds) ── */}
      {session?.status === 'PAUSED' && (
        <Card className="border-amber-300 bg-amber-50/80 shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Pause className="h-5 w-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-sm">Clinic Queue is Currently Paused (On Hospital Rounds)</h3>
                  <Badge variant="warning" className="text-[10px]">PAUSED</Badge>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Queue operations are temporarily paused while attending to rounds. Click Resume Session when you return to your desk.
                </p>
              </div>
            </div>
            <Button
              variant="brand"
              onClick={async () => {
                await resumeSession();
                await fetchDoctorQueue();
              }}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5 fill-current mr-1.5" />
              Resume Session
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Stats Banner ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Now Serving */}
        <Card className="border-brand-100">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Now Serving
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-700">
                #{session?.status === 'ACTIVE' && session.current_serving_number ? session.current_serving_number : '—'}
              </span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Waiting */}
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Waiting in Line
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">
                {waitingPatients.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">patients</span>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Completed Today
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">
                {appointments.filter((a) => a.status === 'COMPLETED').length}
              </span>
              <span className="text-xs text-slate-500 font-medium">consultations</span>
            </div>
          </CardContent>
        </Card>

        {/* Next in line + Call Next */}
        <Card className="border-brand-200 bg-brand-50/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-700 mb-1">
                Next in Line
              </p>
              <p className="font-bold text-slate-900 text-sm truncate">
                {nextInLine?.display_name || 'None'}
              </p>
              <p className="text-xs text-brand-700 font-medium font-mono">
                {nextInLine?.token_code || '—'}
              </p>
            </div>
            <Button
              variant="brand"
              size="sm"
              onClick={handleSaveAndCallNext}
              disabled={waitingPatients.length === 0 || isSaving}
              className="shrink-0"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              Call Next
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Workspace Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Consultation Area ──────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Active Consultation Card */}
          <Card>
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Active Consultation</CardTitle>
                    <CardDescription>Patient currently inside the consultation room</CardDescription>
                  </div>
                </div>
                {currentlyServing && (
                  <Badge variant="success" className="text-xs font-bold">
                    #{currentlyServing.queue_number} · {currentlyServing.token_code}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              {currentlyServing ? (
                <>
                  {/* ─── Patient Header ─────────────────────────────────── */}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-black text-slate-900">
                          {currentlyServing.display_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {currentlyServing.booking_channel === 'ONLINE'
                            ? '🌐 Online Reservation'
                            : '🚶 Walk-in Registered at Desk'}{' '}
                          · PhilHealth / HMO Covered
                        </p>
                      </div>
                      <PriorityBadge category={currentlyServing.priority_category} notes={currentlyServing.priority_notes} />
                    </div>
                  </div>

                  {/* ─── Allergy Alert Banner (B1) ──────────────────────── */}
                  {emrLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Fetching patient triage data...
                    </div>
                  ) : hasAllergies ? (
                    <Alert variant="destructive" className="border-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="font-black text-sm">
                        ⚠️ DRUG ALLERGY WARNING — DO NOT PRESCRIBE
                      </AlertTitle>
                      <AlertDescription>
                        <span className="font-semibold">Documented allergies: </span>
                        {patientEMR!.allergies.join(', ')}
                        <br />
                        <span className="text-[11px] font-medium text-red-700">
                          Verify before issuing any prescription. Cross-check with current medications.
                        </span>
                      </AlertDescription>
                    </Alert>
                  ) : patientEMR ? (
                    <Alert variant="success">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle className="text-xs">No Known Drug Allergies (NKDA)</AlertTitle>
                      <AlertDescription className="text-[11px]">
                        Patient has no documented drug allergies on file. Proceed with normal
                        prescribing.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {/* ─── Live Triage Vitals Grid (B2) ───────────────────── */}
                  {vitals ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                        <Activity className="h-3 w-3" />
                        Triage Vitals — Recorded by Secretary
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {/* Blood Pressure */}
                        <div
                          className={`rounded-xl border p-3 text-center ${vitalCardClass(vitalFlags.bp)}`}
                        >
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            BP (mmHg)
                          </span>
                          <span className={`text-xs ${vitalValueClass(vitalFlags.bp)}`}>
                            {vitals.blood_pressure || '—'}
                          </span>
                          {vitalFlags.bp === 'critical' && (
                            <Badge variant="destructive" className="mt-1 text-[8px] px-1">
                              High
                            </Badge>
                          )}
                          {vitalFlags.bp === 'warning' && (
                            <Badge variant="warning" className="mt-1 text-[8px] px-1">
                              Elevated
                            </Badge>
                          )}
                        </div>

                        {/* Heart Rate */}
                        <div
                          className={`rounded-xl border p-3 text-center ${vitalCardClass(vitalFlags.hr)}`}
                        >
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Pulse
                          </span>
                          <span className={`text-xs ${vitalValueClass(vitalFlags.hr)}`}>
                            {vitals.heart_rate !== null ? `${vitals.heart_rate} bpm` : '—'}
                          </span>
                        </div>

                        {/* Temperature */}
                        <div
                          className={`rounded-xl border p-3 text-center ${vitalCardClass(vitalFlags.temp)}`}
                        >
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Temp
                          </span>
                          <span className={`text-xs ${vitalValueClass(vitalFlags.temp)}`}>
                            {vitals.temperature_c !== null
                              ? `${vitals.temperature_c.toFixed(1)} °C`
                              : '—'}
                          </span>
                          {vitalFlags.temp === 'critical' && (
                            <Badge variant="destructive" className="mt-1 text-[8px] px-1">
                              Fever
                            </Badge>
                          )}
                        </div>

                        {/* SpO2 */}
                        <div
                          className={`rounded-xl border p-3 text-center ${vitalCardClass(vitalFlags.spo2)}`}
                        >
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            SpO₂
                          </span>
                          <span className={`text-xs ${vitalValueClass(vitalFlags.spo2)}`}>
                            {vitals.oxygen_saturation !== null
                              ? `${vitals.oxygen_saturation}%`
                              : '—'}
                          </span>
                        </div>

                        {/* BMI */}
                        <div
                          className={`rounded-xl border p-3 text-center ${vitalCardClass(vitalFlags.bmi)}`}
                        >
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            BMI
                          </span>
                          <span className={`text-[10px] ${vitalValueClass(vitalFlags.bmi)}`}>
                            {bmiLabel(vitals.bmi)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : !emrLoading ? (
                    <Alert variant="warning">
                      <Activity className="h-4 w-4" />
                      <AlertTitle className="text-xs">Awaiting Triage Vitals</AlertTitle>
                      <AlertDescription className="text-[11px]">
                        The secretary has not yet recorded vitals for this patient. You may
                        proceed with the consultation or wait for triage data.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <Separator />

                  {/* ─── Structured SOAP Tabs (B3) ──────────────────────── */}
                  <Tabs defaultValue="subjective" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="subjective" className="text-[11px]">
                        S — Subjective
                      </TabsTrigger>
                      <TabsTrigger value="objective" className="text-[11px]">
                        O — Objective
                      </TabsTrigger>
                      <TabsTrigger value="assessment" className="text-[11px]">
                        A — Assessment
                      </TabsTrigger>
                      <TabsTrigger value="plan" className="text-[11px]">
                        P — Plan
                      </TabsTrigger>
                    </TabsList>

                    {/* ── S: Subjective ──────────────────────────────────── */}
                    <TabsContent value="subjective" className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Chief Complaint
                        </label>
                        <Input
                          value={soap.chiefComplaint}
                          onChange={(e) =>
                            setSoap((prev) => ({
                              ...prev,
                              chiefComplaint: e.target.value,
                            }))
                          }
                          placeholder="e.g., Fever for 3 days, cough, body aches"
                          className="text-sm"
                        />
                        {/* Quick-select complaint tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {QUICK_COMPLAINT_TAGS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setSoap((prev) => ({
                                  ...prev,
                                  chiefComplaint: prev.chiefComplaint
                                    ? `${prev.chiefComplaint}, ${tag}`
                                    : tag,
                                }))
                              }
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-800 transition-colors"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          History of Present Illness (HPI)
                        </label>
                        <Textarea
                          rows={4}
                          value={soap.hpi}
                          onChange={(e) =>
                            setSoap((prev) => ({ ...prev, hpi: e.target.value }))
                          }
                          placeholder="Describe the onset, duration, location, character, and associated symptoms..."
                        />
                      </div>
                    </TabsContent>

                    {/* ── O: Objective ───────────────────────────────────── */}
                    <TabsContent value="objective" className="space-y-3">
                      <p className="text-[11px] text-slate-500 font-medium">
                        Review triage vitals above ↑, then document Physical Examination findings
                        per organ system below.
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {PE_FIELDS.map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              {label}
                            </label>
                            <Input
                              value={soap.pe[key]}
                              onChange={(e) =>
                                setSoap((prev) => ({
                                  ...prev,
                                  pe: { ...prev.pe, [key]: e.target.value },
                                }))
                              }
                              placeholder={placeholder}
                              className="text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    {/* ── A: Assessment (ICD-10 Search) ──────────────────── */}
                    <TabsContent value="assessment" className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            ICD-10 Clinical Diagnosis
                            <span className="text-[10px] normal-case text-slate-400 font-normal">
                              (WHO 2019 / PhilHealth Standard • offline @lowlysre/icd-10-cm)
                            </span>
                          </label>
                          <a
                            href="https://icd.who.int/browse10/2019/en"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-900 transition-colors"
                            title="Open official WHO ICD-10 Browser (2019) in new tab"
                          >
                            <span>WHO ICD-10 Browser</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        {/* ICD-10 Search Input + Dropdown */}
                        <div ref={icdContainerRef} className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              value={icdQuery}
                              onChange={(e) => handleIcdSearch(e.target.value)}
                              onFocus={() => icdResults.length > 0 && setShowIcdDropdown(true)}
                              placeholder="Search 74,000+ ICD-10 diagnoses or codes (e.g., Hypertension, J06.9, Dengue)..."
                              className="pl-9 text-sm rounded-xl border-slate-300 focus:border-brand-700"
                            />
                            {icdLoading && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 animate-spin" />
                            )}
                          </div>

                          {showIcdDropdown && icdResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                              {icdResults.map((result) => (
                                <div
                                  key={result.code}
                                  onClick={() => handleSelectDiagnosis(result)}
                                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-brand-50/70 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-1.5 py-0.5 shrink-0">
                                      {result.code}
                                    </span>
                                    <span className="text-xs text-slate-800 font-medium truncate group-hover:text-brand-950">
                                      {result.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <a
                                      href={result.whoUrl || `https://icd.who.int/browse10/2019/en#/${result.code}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-400 hover:text-brand-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors flex items-center gap-0.5"
                                      title="Open official WHO guidance for this diagnosis"
                                    >
                                      <span>WHO</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {showIcdDropdown && !icdLoading && icdResults.length === 0 && icdQuery.length >= 2 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg px-4 py-3 text-xs text-slate-500 text-center">
                              No ICD-10 codes found for &quot;{icdQuery}&quot;. Try a different medical term or code.
                            </div>
                          )}
                        </div>

                        {/* Quick Philippine Outpatient Presets */}
                        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                            Common in PH:
                          </span>
                          {[
                            { code: 'J06.9', label: 'URTI' },
                            { code: 'I10', label: 'Hypertension' },
                            { code: 'E11.9', label: 'Type 2 Diabetes' },
                            { code: 'A09', label: 'Gastroenteritis' },
                            { code: 'J45.909', label: 'Asthma' },
                            { code: 'N39.0', label: 'UTI' },
                            { code: 'A97.9', label: 'Dengue' },
                            { code: 'K21.9', label: 'GERD' },
                            { code: 'M54.5', label: 'Low Back Pain' },
                          ].map((preset) => (
                            <button
                              key={preset.code}
                              type="button"
                              onClick={() =>
                                handleSelectDiagnosis({
                                  code: preset.code,
                                  label: `${preset.label}`,
                                  whoUrl: `https://icd.who.int/browse10/2019/en#/${preset.code}`,
                                  philHealthVerified: true,
                                })
                              }
                              className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-900 text-slate-600 font-semibold text-[11px] shrink-0 transition-colors"
                            >
                              + {preset.code} {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Selected diagnosis chips */}
                        {soap.diagnoses.length > 0 && (
                          <div className="mt-3.5 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Selected Diagnoses (Attached to Clinical Chart)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {soap.diagnoses.map((d) => (
                                <div
                                  key={d.code}
                                  className="flex items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-900 shadow-2xs"
                                >
                                  <span className="font-mono font-black text-brand-700">
                                    {d.code}
                                  </span>
                                  <span className="max-w-[180px] truncate">{d.label}</span>
                                  <a
                                    href={d.whoUrl || `https://icd.who.int/browse10/2019/en#/${d.code}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 hover:text-brand-900 transition-colors px-1 py-0.5 rounded text-[10px] font-mono hover:bg-brand-100 flex items-center gap-0.5"
                                    title="View WHO 2019 Clinical Guidelines & Exclusions"
                                  >
                                    <span>WHO</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDiagnosis(d.code)}
                                    className="text-slate-400 hover:text-red-600 transition-colors ml-0.5 p-0.5"
                                    title="Remove diagnosis"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clinical impression free text */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Clinical Impression &amp; Notes
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Additional clinical notes, differential diagnoses, or impressions not captured above..."
                          className="text-xs"
                        />
                      </div>
                    </TabsContent>

                    {/* ── P: Plan ────────────────────────────────────────── */}
                    <TabsContent value="plan" className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                            Pharmacological Plan (Rx)
                          </label>
                          {currentlyServing ? (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleAutoGenerateRx}
                                disabled={isGeneratingRx || !soap.plan.trim()}
                                className="h-7 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200"
                                title="Automatically parse medications in the Plan box and create digital prescriptions in EMR"
                              >
                                {isGeneratingRx ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Sparkles className="h-3 w-3 mr-1 text-brand-600" />
                                )}
                                Auto-Generate Rx
                              </Button>
                              <Link
                                href={`/doctor/rx?appointmentId=${currentlyServing.id}&patientId=${currentlyServing.patient_id || ''}&patient=${encodeURIComponent(currentlyServing.display_name)}&token=${encodeURIComponent(currentlyServing.token_code)}&plan=${encodeURIComponent(soap.plan || '')}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-md transition-colors shadow-xs"
                              >
                                <Pill className="h-3.5 w-3.5 text-brand-600" />
                                Open Digital Rx Pad ↗
                              </Link>
                            </div>
                          ) : (
                            <Link
                              href="/doctor/rx"
                              target="_blank"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <Pill className="h-3.5 w-3.5 text-slate-500" />
                              Digital Rx Pad ↗
                            </Link>
                          )}
                        </div>
                        <Textarea
                          rows={4}
                          value={soap.plan}
                          onChange={(e) =>
                            setSoap((prev) => ({ ...prev, plan: e.target.value }))
                          }
                          placeholder={`1. Amoxicillin 500mg cap #21 — 1 cap TID × 7 days\n2. Paracetamol 500mg tab #10 — 1 tab Q4h PRN fever\n3. Cetirizine 10mg tab #7 — 1 tab OD HS`}
                          className="font-mono text-xs"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mt-1">
                          <span>
                            💊 Integrated with Philippine Formulary &amp; S2 Yellow Pad separation.
                          </span>
                          {currentlyServing && (
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/doctor/rx?appointmentId=${currentlyServing.id}&patientId=${currentlyServing.patient_id || ''}&patient=${encodeURIComponent(currentlyServing.display_name)}&token=${encodeURIComponent(currentlyServing.token_code)}&plan=${encodeURIComponent(soap.plan || '')}`}
                                target="_blank"
                                className="text-brand-600 hover:underline font-semibold flex items-center gap-1"
                              >
                                <Pill className="h-3 w-3" />
                                Digital Rx Pad →
                              </Link>
                              <span className="text-slate-300">·</span>
                              <Link
                                href={`/doctor/rx?appointmentId=${currentlyServing.id}&patientId=${currentlyServing.patient_id || ''}&patient=${encodeURIComponent(currentlyServing.display_name)}&token=${encodeURIComponent(currentlyServing.token_code)}&plan=${encodeURIComponent(soap.plan || '')}`}
                                target="_blank"
                                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                              >
                                <FlaskConical className="h-3 w-3" />
                                Order Labs &amp; Imaging →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Non-Pharmacological / Dietary Advice
                        </label>
                        <Textarea
                          rows={2}
                          value={soap.nonPharmPlan}
                          onChange={(e) =>
                            setSoap((prev) => ({
                              ...prev,
                              nonPharmPlan: e.target.value,
                            }))
                          }
                          placeholder="e.g., Low-sodium DASH diet, 30 min brisk walking 5x/week, adequate hydration (8-10 glasses/day)..."
                          className="text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Follow-up Recommended
                          </label>
                          <Switch
                            checked={soap.followupRecommended}
                            onCheckedChange={(v) =>
                              setSoap((prev) => ({ ...prev, followupRecommended: v }))
                            }
                          />
                        </div>
                        {soap.followupRecommended && (
                          <div className="mt-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Follow-up Date
                            </label>
                            <Input
                              type="date"
                              value={soap.followupDate}
                              onChange={(e) =>
                                setSoap((prev) => ({
                                  ...prev,
                                  followupDate: e.target.value,
                                }))
                              }
                              className="text-sm w-full sm:w-48"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* ─── Save & Call Next Action ─────────────────────────── */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBufferModalOpen(true)}
                        disabled={isBuffering}
                        className="text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800 border-amber-200"
                        title="Move to Buffer Lane with configurable grace period for lab or imaging results"
                      >
                        <Activity className="h-3.5 w-3.5 mr-1" />
                        Buffer (Labs/X-ray)
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const skippedPatient = appointments.find((a) => a.status === 'SKIPPED' || a.status === 'BUFFERED');
                          if (skippedPatient) {
                            handleRestoreBuffered(skippedPatient.id);
                          } else {
                            setToastNotice({
                              type: 'brand',
                              title: 'Recall Patient',
                              message: 'No skipped or deferred patient in buffer lane to recall.',
                            });
                          }
                        }}
                        className="text-xs text-brand-700 hover:bg-brand-50"
                        title="Recall skipped or buffered patient back into active line"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Recall Patient
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSkipCurrent(false)}
                        className="text-xs text-slate-500 hover:text-red-700 hover:bg-red-50"
                        title="Skip patient if called and absent"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Skip Patient
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[11px] text-slate-400 font-mono hidden sm:block">
                        ⌨️ Space or Ctrl+Enter
                      </span>
                      <Button
                        variant="brand"
                        onClick={handleSaveAndCallNext}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        )}
                        {nextInLine ? 'Save Consultation & Call Next' : 'Save & Conclude Consultation'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* No active patient */
                <div className="py-14 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Stethoscope className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    No active patient in consultation
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Click &ldquo;Call Next&rdquo; from the stats bar to bring in the next patient in
                    line.
                  </p>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={handleCallNext}
                    disabled={waitingPatients.length === 0 || isSaving}
                    className="mt-4"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Call Next Patient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Longitudinal History (Pro only) ─────────────────────────── */}
          {currentlyServing && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-500" />
                    <CardTitle className="text-sm">Longitudinal Medical History</CardTitle>
                    {subscriptionTier !== 'pro' && (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <Lock className="h-2.5 w-2.5" />
                        Pro Only
                      </Badge>
                    )}
                  </div>
                  {subscriptionTier === 'pro' && (
                    <button
                      onClick={() => setShowLongitudinal((v) => !v)}
                      className="text-xs text-brand-700 font-semibold hover:underline"
                    >
                      {showLongitudinal ? 'Collapse ↑' : 'Expand ↓'}
                    </button>
                  )}
                </div>
              </CardHeader>

              {subscriptionTier === 'pro' && showLongitudinal ? (
                <CardContent className="pt-0 space-y-3">
                  <Alert variant="success" className="py-2">
                    <Crown className="h-4 w-4" />
                    <AlertTitle className="text-xs">Longitudinal EMR Enabled</AlertTitle>
                    <AlertDescription className="text-[11px]">
                      {pastEncounters.length > 0
                        ? `${pastEncounters.length} past encounter${pastEncounters.length > 1 ? 's' : ''} found across all clinic locations.`
                        : 'No prior clinical records found in the network. This is the patient’s initial visit.'}
                    </AlertDescription>
                  </Alert>

                  {pastEncounters.length > 0 ? (
                    pastEncounters.map((enc) => (
                      <div
                        key={enc.id || enc.date}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">
                            Encounter: {enc.date} ({enc.room})
                          </span>
                          <span className="text-slate-400 font-medium">Physician Record</span>
                        </div>
                        <p className="text-slate-600">Diagnosis: {enc.dx} · {enc.vitals}</p>
                        {enc.rx && (
                          <p className="font-mono text-brand-700 mt-0.5">℞ {enc.rx}</p>
                        )}
                        {enc.attachment && (
                          <div className="flex items-center gap-1.5 mt-1 text-blue-600 font-medium">
                            <Paperclip className="h-3 w-3" />
                            <span>{enc.attachment}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      First consultation for this patient record.
                    </div>
                  )}
                </CardContent>
              ) : subscriptionTier !== 'pro' ? (
                <CardContent className="pt-0">
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-5 text-center text-xs">
                    <Lock className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Upgrade to Clinic Natin Pro to view longitudinal EMR history across all
                      hospital rooms.
                    </p>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          )}

          {/* ── Emergency Delay Broadcast Card ──────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm">Emergency Delay Broadcast (Semaphore SMS)</CardTitle>
              </div>
              <CardDescription>
                Held up in surgery or hospital rounds? 1-tap dispatch alerts all waiting patients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '⏱️ +15m Rounds', minutes: 15, reason: 'Doctor is on urgent hospital rounds', variant: 'outline' as const },
                  { label: '🚨 +30m Surgery', minutes: 30, reason: 'Doctor is in emergency surgery', variant: 'warning' as const },
                  { label: '🚗 +45m Traffic', minutes: 45, reason: 'Doctor held in traffic across Marcos Bridge', variant: 'outline' as const },
                  { label: '⏰ +60m Emergency', minutes: 60, reason: 'Doctor handling a personal emergency', variant: 'outline' as const },
                ].map(({ label, minutes, reason }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveAnnouncement(minutes, reason)}
                    disabled={isBroadcastLoading}
                    className="text-xs font-semibold"
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Or type a custom announcement to waiting patients..."
                  className="flex-1 text-xs"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSaveAnnouncement(30, announcementText)}
                  disabled={isBroadcastLoading || !announcementText.trim()}
                  className="text-xs font-bold shrink-0"
                >
                  {isBroadcastLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Broadcast
                </Button>
              </div>

              {session?.announcement_notice && (
                <Alert variant="warning" className="py-2">
                  <BellRing className="h-4 w-4" />
                  <AlertTitle className="text-xs">Active Broadcast</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    {session.announcement_notice}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Real-time Waiting Queue ──────────────────────────── */}
        <div className="lg:col-span-5">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Today&apos;s Interleaved Queue</CardTitle>
                  <CardDescription>Alternating Online &amp; Walk-in Lineup</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDoctorQueue}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-brand-700 hover:bg-brand-50 rounded-xl"
                  title="Refresh Queue"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Sub-tabs for Active Queue vs Buffer Lane */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mt-3">
                <button
                  type="button"
                  onClick={() => setQueueTab('active')}
                  className={`flex-1 text-xs py-1 px-2 rounded-md font-semibold transition-all ${queueTab === 'active'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Active Lineup ({waitingPatients.length + (currentlyServing ? 1 : 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTab('buffered')}
                  className={`flex-1 text-xs py-1 px-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${queueTab === 'buffered'
                      ? 'bg-white text-amber-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Buffer Lane
                  {bufferedPatients.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {bufferedPatients.length}
                    </span>
                  )}
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {queueTab === 'buffered' ? (
                <div className="divide-y divide-slate-50 max-h-[560px] overflow-y-auto">
                  {bufferedPatients.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      <p className="font-semibold">Buffer Lane is clear</p>
                      <p className="mt-0.5">Patients sent to labs/imaging will appear here.</p>
                    </div>
                  ) : (
                    bufferedPatients.map((appt) => (
                      <div key={appt.id} className="py-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {appt.token_code}
                              </span>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {appt.display_name}
                              </p>
                            </div>
                            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                              <span>⏳ 45m Grace Period</span>
                              {appt.buffered_at && (
                                <span className="text-slate-400">
                                  · Buffered at {new Date(appt.buffered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreBuffered(appt.id)}
                            className="text-xs shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            Recall to Lineup
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[560px] overflow-y-auto">
                  {appointments.filter((a) => a.status !== 'BUFFERED').length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      <Users className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                      <p className="font-semibold">Queue is empty</p>
                      <p className="mt-0.5">Patients will appear here when registered.</p>
                    </div>
                  ) : (
                    appointments
                      .filter((a) => a.status !== 'BUFFERED')
                      .map((appt) => (
                        <div key={appt.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Queue number badge */}
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${appt.status === 'SERVING'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : appt.status === 'COMPLETED'
                                    ? 'bg-slate-100 text-slate-400'
                                    : 'bg-brand-50 text-brand-700'
                                }`}
                            >
                              #{appt.queue_number}
                            </div>

                            {/* Patient info */}
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold truncate ${appt.status === 'COMPLETED'
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-800'
                                  }`}
                              >
                                {appt.display_name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-400">
                                  {appt.token_code}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1 rounded ${appt.booking_channel === 'ONLINE'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-blue-50 text-blue-700'
                                    }`}
                                >
                                  {appt.booking_channel === 'ONLINE' ? 'Online' : 'Walk-in'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status + Priority */}
                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${appt.status === 'SERVING'
                                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                  : appt.status === 'COMPLETED'
                                    ? 'bg-slate-100 text-slate-400'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                            >
                              {appt.status}
                            </span>
                            {appt.priority_category !== 'NONE' && (
                              <p className="text-[9px] font-bold text-amber-600 mt-0.5">
                                {appt.priority_category}
                                {appt.priority_notes ? ` • ${appt.priority_notes}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Buffer Lane Configurable Grace Modal ── */}
      {isBufferModalOpen && currentlyServing && (
        <BufferModal
          isOpen={isBufferModalOpen}
          onClose={() => setIsBufferModalOpen(false)}
          appointment={{
            id: currentlyServing.id,
            token_code: currentlyServing.token_code,
            queue_number: currentlyServing.queue_number,
            display_name: currentlyServing.display_name,
          }}
          isLoading={isBuffering}
          onConfirm={handleConfirmBuffer}
        />
      )}
    </div>
  );
}
