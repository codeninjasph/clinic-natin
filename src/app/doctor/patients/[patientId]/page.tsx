'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  Shield,
  AlertTriangle,
  Pill,
  Activity,
  Heart,
  Thermometer,
  Weight,
  FileText,
  Printer,
  Stethoscope,
  Clock,
  MapPin,
  CheckCircle2,
  History,
  FlaskConical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PatientProfile {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  allergies: string[];
  comorbidities: string[];
  maintenance_meds: string[];
  priority_category: string;
  hmo_provider: string | null;
  philhealth_number: string | null;
  created_at: string;
}

interface EncounterItem {
  id: string;
  created_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  icd10_code: string | null;
  vitals: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature_c?: number;
    weight_kg?: number;
    oxygen_saturation?: number;
  } | null;
  private_notes: string | null;
  followup_date: string | null;
  clinic_name?: string;
  room_number?: string;
  prescriptions: Array<{
    id: string;
    item_type: string;
    generic_name: string;
    brand_name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    details?: string | null;
    instructions?: string | null;
  }>;
}

export default function DoctorPatientChartPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.patientId;
  const supabase = createClient();

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEncounterId, setExpandedEncounterId] = useState<string | null>(null);

  const fetchPatientDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Patient Profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (pErr) throw pErr;
      if (!profile) {
        setLoading(false);
        return;
      }

      setPatient({
        id: profile.id,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        email: profile.email,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        blood_type: profile.blood_type,
        allergies: profile.allergies || [],
        comorbidities: profile.comorbidities || [],
        maintenance_meds: profile.maintenance_meds || [],
        priority_category: profile.priority_category || 'NONE',
        hmo_provider: profile.hmo_provider,
        philhealth_number: profile.philhealth_number,
        created_at: profile.created_at,
      });

      // 2. Fetch Medical Records / Encounters
      const { data: records, error: rErr } = await supabase
        .from('medical_records')
        .select(`
          id,
          created_at,
          chief_complaint,
          diagnosis,
          icd10_code,
          vitals,
          private_notes,
          followup_date,
          appointments:appointment_id(
            queue_sessions:queue_session_id(
              clinics:clinic_id(name, room_number)
            )
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (rErr) throw rErr;

      const fullList: EncounterItem[] = [];
      if (records) {
        for (const rec of records) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const apptInfo = (rec as any).appointments?.queue_sessions?.clinics;
          const { data: rxItems } = await supabase
            .from('prescriptions_lab_requests')
            .select('*')
            .eq('medical_record_id', rec.id);

          fullList.push({
            id: rec.id,
            created_at: rec.created_at,
            chief_complaint: rec.chief_complaint,
            diagnosis: rec.diagnosis,
            icd10_code: rec.icd10_code,
            vitals: rec.vitals,
            private_notes: rec.private_notes,
            followup_date: rec.followup_date,
            clinic_name: apptInfo?.name || 'Clinic Natin CDO',
            room_number: apptInfo?.room_number || 'Room 304',
            prescriptions: rxItems || [],
          });
        }
      }

      setEncounters(fullList);
      if (fullList.length > 0) {
        setExpandedEncounterId(fullList[0].id);
      }
    } catch (err) {
      console.error('Error fetching patient chart data:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, supabase]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  // Helper: calculate age
  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
        <Activity className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading longitudinal clinical chart...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Patient Record Not Found</h2>
        <p className="text-sm text-slate-500">
          The requested patient ID could not be located in the Clinic Natin medical registry.
        </p>
        <Link href="/doctor/patients">
          <Button variant="outline" className="mt-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient Directory
          </Button>
        </Link>
      </div>
    );
  }

  const age = calculateAge(patient.date_of_birth);

  // Cumulative Rx list across all encounters
  const allPrescriptions = encounters.flatMap((e) =>
    e.prescriptions.map((rx) => ({
      ...rx,
      encounterDate: e.created_at,
      diagnosis: e.diagnosis,
    }))
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation & Actions Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient Registry
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Print Chart Summary
          </Button>

          <Link href={`/doctor/rx?patientId=${patient.id}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs font-semibold text-brand-700 border-brand-200 hover:bg-brand-50">
              <Pill className="h-3.5 w-3.5 mr-1.5 text-brand-600" />
              Issue Digital Rx
            </Button>
          </Link>

          <Link href="/doctor/dashboard">
            <Button variant="brand" size="sm" className="text-xs font-semibold">
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              Open Consultation Cockpit
            </Button>
          </Link>
        </div>
      </div>

      {/* Patient Master Demographics Card */}
      <Card className="border-brand-200/80 shadow-sm bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-950 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-inner">
                {patient.full_name.charAt(0)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    {patient.full_name}
                  </h1>
                  {patient.priority_category !== 'NONE' && (
                    <Badge variant="warning" className="text-xs px-2.5 py-0.5 font-bold uppercase">
                      {patient.priority_category}
                    </Badge>
                  )}
                  {patient.blood_type && (
                    <span className="bg-red-500/30 border border-red-400/40 text-red-100 text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                      Type {patient.blood_type}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-100/80">
                  <span>
                    {age !== null ? `${age} years old` : 'Age unrecorded'}
                    {patient.gender ? ` · ${patient.gender}` : ''}
                  </span>
                  {patient.date_of_birth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      DOB: {new Date(patient.date_of_birth).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {patient.phone_number && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3" />
                      {patient.phone_number}
                    </span>
                  )}
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {patient.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 border-white/10 pt-3 md:pt-0 text-right shrink-0">
              <div>
                <span className="text-[11px] text-brand-200 uppercase tracking-wider block font-semibold">
                  Total Clinic Visits
                </span>
                <span className="text-2xl font-black text-white">
                  {encounters.length}
                </span>
              </div>
              <span className="text-[11px] text-brand-200 font-mono">
                PID: {patient.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* PhilHealth & HMO Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-slate-500 font-medium">PhilHealth:</span>
              <span className="font-mono font-bold text-slate-800">
                {patient.philhealth_number || 'Not Linked / Direct Pay'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-slate-500 font-medium">HMO Coverage:</span>
              <span className="font-bold text-slate-800">
                {patient.hmo_provider || 'Private / Out of Pocket'}
              </span>
            </div>
          </div>
          <span className="text-slate-400 text-[11px]">
            Registered since {new Date(patient.created_at).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Clinical Flags Bar: Allergies, Comorbidities, Maintenance */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Allergies */}
          <div
            className={`p-3.5 rounded-xl border ${
              patient.allergies.length > 0
                ? 'bg-red-50/80 border-red-200 text-red-900'
                : 'bg-slate-50 border-slate-200/60 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle
                className={`h-4 w-4 ${
                  patient.allergies.length > 0 ? 'text-red-600' : 'text-slate-400'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider">
                Documented Drug Allergies
              </span>
            </div>
            {patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {patient.allergies.map((allergy) => (
                  <span
                    key={allergy}
                    className="bg-red-200/80 text-red-900 text-xs font-bold px-2 py-0.5 rounded-md"
                  >
                    ⚠️ {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No drug allergies reported (NKDA)</p>
            )}
          </div>

          {/* Comorbidities */}
          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200/60 text-slate-700">
            <div className="flex items-center gap-2 mb-1.5">
              <Activity className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Chronic Conditions / Comorbidities
              </span>
            </div>
            {patient.comorbidities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {patient.comorbidities.map((c) => (
                  <span
                    key={c}
                    className="bg-brand-50 text-brand-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-brand-100"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No active chronic conditions noted</p>
            )}
          </div>

          {/* Maintenance Meds */}
          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200/60 text-slate-700">
            <div className="flex items-center gap-2 mb-1.5">
              <Pill className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Maintenance Regimen
              </span>
            </div>
            {patient.maintenance_meds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {patient.maintenance_meds.map((med) => (
                  <span
                    key={med}
                    className="bg-blue-50 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-blue-100"
                  >
                    {med}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No maintenance medications reported</p>
            )}
          </div>
        </div>
      </Card>

      {/* Main Longitudinal Tabs */}
      <Tabs defaultValue="encounters" className="w-full space-y-4">
        <TabsList className="grid grid-cols-3 w-full sm:w-[480px]">
          <TabsTrigger value="encounters" className="text-xs font-bold">
            Encounters &amp; SOAP ({encounters.length})
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-xs font-bold">
            Longitudinal Vitals
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="text-xs font-bold">
            Rx &amp; Lab Ledger ({allPrescriptions.length})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Encounters & SOAP Records ───────────────────────────────── */}
        <TabsContent value="encounters" className="space-y-4">
          {encounters.length === 0 ? (
            <Card className="py-12 text-center text-slate-400">
              <History className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-sm">No recorded clinical encounters</p>
              <p className="text-xs text-slate-500 mt-1">
                Start a consultation session or enter a SOAP note from the Doctor Cockpit.
              </p>
            </Card>
          ) : (
            encounters.map((enc, index) => {
              const isExpanded = expandedEncounterId === enc.id;
              const v = enc.vitals;

              return (
                <Card
                  key={enc.id}
                  className={`border transition-all ${
                    isExpanded ? 'border-brand-300 shadow-md ring-1 ring-brand-100' : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <CardHeader
                    onClick={() =>
                      setExpandedEncounterId(isExpanded ? null : enc.id)
                    }
                    className="cursor-pointer py-4 px-6 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                          #{encounters.length - index}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-slate-900">
                              {enc.diagnosis || 'Clinical Encounter'}
                            </CardTitle>
                            {enc.icd10_code && (
                              <Badge variant="outline" className="font-mono text-[10px] text-brand-700 bg-brand-50/50">
                                {enc.icd10_code}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(enc.created_at).toLocaleDateString('en-PH', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              {enc.clinic_name} ({enc.room_number})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {v?.blood_pressure && (
                          <span className="hidden sm:inline-block font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            BP {v.blood_pressure}
                          </span>
                        )}
                        {enc.prescriptions.length > 0 && (
                          <span className="text-xs font-semibold text-brand-700 flex items-center gap-1">
                            <Pill className="h-3 w-3" />
                            {enc.prescriptions.length} ℞
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">
                      {/* Vitals Summary Strip */}
                      {v && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                          <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold">BLOOD PRESSURE</span>
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {v.blood_pressure || '—'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold">HEART RATE</span>
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {v.heart_rate ? `${v.heart_rate} bpm` : '—'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold">TEMPERATURE</span>
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {v.temperature_c ? `${v.temperature_c} °C` : '—'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold">WEIGHT</span>
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {v.weight_kg ? `${v.weight_kg} kg` : '—'}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                            <span className="text-[10px] text-slate-400 block font-semibold">O2 SATURATION</span>
                            <span className="font-mono font-bold text-xs text-slate-800">
                              {v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Chief Complaint */}
                      {enc.chief_complaint && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                            Chief Complaint
                          </span>
                          <p className="text-sm font-medium text-slate-800 mt-0.5">
                            {enc.chief_complaint}
                          </p>
                        </div>
                      )}

                      {/* Clinical Notes (SOAP Breakdown) */}
                      {enc.private_notes && (
                        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                            Physician Clinical Notes
                          </span>
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                            {enc.private_notes}
                          </pre>
                        </div>
                      )}

                      {/* Prescriptions & Lab Requests Attached to Encounter */}
                      {enc.prescriptions.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Pill className="h-3.5 w-3.5 text-brand-600" />
                            Prescribed Orders &amp; Diagnostics ({enc.prescriptions.length})
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {enc.prescriptions.map((rx) => (
                              <div
                                key={rx.id}
                                className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">
                                    {rx.generic_name}
                                    {rx.brand_name && ` (${rx.brand_name})`}
                                  </span>
                                  <Badge
                                    variant={rx.item_type === 'MEDICATION' ? 'default' : 'outline'}
                                    className="text-[9px] px-1.5 py-0"
                                  >
                                    {rx.item_type}
                                  </Badge>
                                </div>
                                <p className="font-mono text-brand-700">
                                  {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ')}
                                </p>
                                {rx.instructions && (
                                  <p className="text-slate-500 italic text-[11px]">
                                    Sig: {rx.instructions}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Note */}
                      {enc.followup_date && (
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200/70">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Recommended Follow-up Date:{' '}
                            <strong>
                              {new Date(enc.followup_date).toLocaleDateString('en-PH', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </strong>
                          </span>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── TAB 2: Longitudinal Vitals Trends ──────────────────────────────── */}
        <TabsContent value="vitals">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Longitudinal Vitals Ledger</CardTitle>
              <CardDescription className="text-xs">
                Historical physical parameters captured across all clinical visits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {encounters.filter((e) => e.vitals).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No recorded vitals entries found for this patient.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">BP (mmHg)</th>
                        <th className="py-2.5 px-3">HR (bpm)</th>
                        <th className="py-2.5 px-3">Temp (°C)</th>
                        <th className="py-2.5 px-3">Weight (kg)</th>
                        <th className="py-2.5 px-3">SpO2 (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {encounters
                        .filter((e) => e.vitals)
                        .map((enc) => {
                          const v = enc.vitals;
                          return (
                            <tr key={enc.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {new Date(enc.created_at).toLocaleDateString('en-PH', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {enc.clinic_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {v?.blood_pressure || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {v?.heart_rate || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {v?.temperature_c ? `${v.temperature_c}°` : '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {v?.weight_kg || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-mono">
                                {v?.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Cumulative Prescriptions & Lab Ledger ────────────────────── */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Cumulative Pharmacological Ledger</CardTitle>
                <CardDescription className="text-xs">
                  All digital prescriptions and diagnostic requisitions issued to this patient.
                </CardDescription>
              </div>
              <Link href={`/doctor/rx?patientId=${patient.id}`} target="_blank">
                <Button variant="brand" size="sm" className="text-xs font-semibold">
                  <Pill className="h-3.5 w-3.5 mr-1.5" />
                  New Order Slip
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {allPrescriptions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No medications or diagnostic tests issued yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Generic &amp; Brand</th>
                        <th className="py-2.5 px-3">Dosage &amp; Frequency</th>
                        <th className="py-2.5 px-3">Duration / Qty</th>
                        <th className="py-2.5 px-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allPrescriptions.map((rx) => (
                        <tr key={rx.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {new Date(rx.encounterDate).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={rx.item_type === 'MEDICATION' ? 'default' : 'outline'}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {rx.item_type}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {rx.generic_name}
                            {rx.brand_name && (
                              <span className="font-normal text-slate-500"> ({rx.brand_name})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-brand-700">
                            {[rx.dosage, rx.frequency].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {[rx.duration, rx.details].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                            {rx.instructions || 'As directed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
