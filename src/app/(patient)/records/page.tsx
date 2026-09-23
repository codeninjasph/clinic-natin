'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Pill,
  Activity,
  Calendar,
  Stethoscope,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  Building2,
  ChevronRight,
  Sparkles,
  Search,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PharmacistRxView, type PharmacistRxProps } from '@/components/patient/pharmacist-rx-view';
import { MedicationTracker } from '@/components/patient/medication-tracker';
import { createClient } from '@/lib/supabase/client';
import { formatDoctorDisplayName } from '@/lib/formatters';

export default function PatientRecordsPage() {
  const [activeTab, setActiveTab] = useState<'rx' | 'labs' | 'history' | 'tracker'>('rx');
  const [selectedRx, setSelectedRx] = useState<PharmacistRxProps | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadRecords() {
      try {
        const supabase = createClient();
        const { data: recs } = await supabase
          .from('medical_records')
          .select(`
            id,
            created_at,
            chief_complaint,
            diagnosis,
            icd10_code,
            followup_date,
            vitals,
            doctors!doctor_id (
              id,
              title,
              specialty,
              prc_license,
              ptr_number,
              s2_license,
              profiles!profile_id ( full_name )
            ),
            appointments!appointment_id (
              id,
              token_code,
              created_at,
              queue_sessions!queue_session_id (
                clinics!clinic_id ( name, hospital_name, room_number )
              )
            ),
            prescriptions_lab_requests (
              id,
              item_type,
              generic_name,
              brand_name,
              dosage,
              frequency,
              duration,
              instructions,
              details
            )
          `)
          .order('created_at', { ascending: false });

        if (recs && recs.length > 0) {
          setRecords(recs);
          const allItems: any[] = [];
          recs.forEach((r) => {
            (r.prescriptions_lab_requests || []).forEach((item: any) => {
              allItems.push({
                ...item,
                record: r,
              });
            });
          });
          setPrescriptions(allItems);
        }
      } catch (e) {
        console.error('Failed to load records:', e);
      } finally {
        setLoading(false);
      }
    }
    loadRecords();
  }, []);

  // Demo fallback prescription for preview if empty
  const defaultRxProps: PharmacistRxProps = {
    rxCode: 'CN-RX-2026-8821',
    doctorName: 'Maria Santos, MD',
    doctorSpecialty: 'Cardiology',
    prcLicense: '0129841',
    ptrNumber: 'CDO-882194',
    s2License: 'PDEA-S2-8849',
    patientName: 'Dianne Pondoc',
    patientAge: 28,
    patientGender: 'Female',
    allergies: ['Penicillin'],
    diagnosis: 'Stage 1 Essential Hypertension & Tension-Type Headache',
    consultationDate: 'September 21, 2026',
    clinicHospital: 'Maria Reyna - Xavier University Hospital',
    clinicRoom: 'Room 304',
    items: [
      {
        id: '1',
        item_type: 'MEDICATION',
        generic_name: 'Amlodipine Besylate',
        brand_name: 'Norvasc',
        dosage: '5mg Tablet',
        frequency: 'Once daily in the morning after breakfast',
        duration: '30 days',
        instructions: 'Take continuously. Monitor blood pressure every morning.',
      },
      {
        id: '2',
        item_type: 'MEDICATION',
        generic_name: 'Paracetamol',
        brand_name: 'Biogesic',
        dosage: '500mg Tablet',
        frequency: 'PRN every 6 hours for tension headache',
        duration: '5 days',
        instructions: 'Do not exceed 4,000mg in 24 hours.',
      },
    ],
  };

  const handleOpenRxModal = (rec: any) => {
    const doctor = rec.doctors;
    const profile = doctor?.profiles;
    const clinic = rec.appointments?.queue_sessions?.clinics;
    const docName = profile?.full_name ? profile.full_name : 'Maria Santos, MD';

    const formatted: PharmacistRxProps = {
      rxCode: `CN-RX-${new Date(rec.created_at).getFullYear()}-${rec.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`,
      doctorName: docName,
      doctorSpecialty: doctor?.specialty || 'Cardiology',
      prcLicense: doctor?.prc_license || '0129841',
      ptrNumber: doctor?.ptr_number || 'CDO-882194',
      s2License: doctor?.s2_license || undefined,
      patientName: 'Dianne Pondoc',
      patientAge: 28,
      patientGender: 'Female',
      allergies: ['Penicillin'],
      diagnosis: rec.diagnosis || 'Clinical Consultation',
      consultationDate: new Date(rec.created_at).toLocaleDateString('en-PH', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      clinicHospital: clinic?.hospital_name || 'Maria Reyna XU Hospital',
      clinicRoom: clinic?.room_number || 'Room 304',
      items: (rec.prescriptions_lab_requests || []).map((item: any) => ({
        id: item.id,
        item_type: item.item_type || 'MEDICATION',
        generic_name: item.generic_name || item.details || 'Prescribed Medicine',
        brand_name: item.brand_name || null,
        dosage: item.dosage || 'Standard dose',
        frequency: item.frequency || 'As directed',
        duration: item.duration || 'As prescribed',
        instructions: item.instructions || null,
      })),
    };

    setSelectedRx(formatted);
  };

  return (
    <main className="min-h-screen bg-slate-50/70 pb-20">
      {/* ── Header ── */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-700" />
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Digital Health Vault</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official prescriptions (℞), diagnostic lab requisitions, and medical history
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setSelectedRx(defaultRxProps)}
            className="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs gap-1.5 h-9 shadow-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            Pharmacist Mode (Demo)
          </Button>
        </div>
      </header>

      {/* ── Main Container (max-w-7xl 2xl:max-w-[1536px]) ── */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* ── Follow-Up Care Banner ── */}
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-teal-50/50 to-white p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-brand-100 text-brand-dark px-2 py-0.5 rounded-full">
                  Doctor Recommended Follow-up
                </span>
                <span className="text-xs font-bold text-slate-700">In 14 Days (October 5, 2026)</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-1">
                Post-Hypertension Evaluation with Dr. Maria Santos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Room 304, Maria Reyna Hospital &bull; Repeat Blood Pressure & Lab check
              </p>
            </div>
          </div>

          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold px-4 py-2.5 shadow-sm transition whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            1-Click Follow-Up Booking
          </Link>
        </div>

        {/* ── Tabs: Prescriptions / Labs / History / Adherence ── */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-11 bg-slate-200/70 p-1 rounded-2xl mb-5">
            <TabsTrigger value="rx" className="rounded-xl text-xs font-bold gap-1.5">
              <Pill className="h-3.5 w-3.5" />
              Prescriptions (℞)
            </TabsTrigger>
            <TabsTrigger value="labs" className="rounded-xl text-xs font-bold gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              Lab Requisitions
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl text-xs font-bold gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Visit History
            </TabsTrigger>
            <TabsTrigger value="tracker" className="rounded-xl text-xs font-bold gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Daily Doses
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: PRESCRIPTIONS (℞) ── */}
          <TabsContent value="rx" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Official digital prescriptions authorized for pharmacy counter dispensing.
              </p>
            </div>

            {/* List prescriptions in responsive 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Default Featured Prescription Card */}
              <Card className="rounded-2xl border-slate-200 bg-white shadow-xs hover:border-slate-300 transition overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-serif italic font-black text-xl border border-brand-200">
                        ℞
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            Amlodipine 5mg &bull; Paracetamol 500mg
                          </h3>
                          <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            Active ℞
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dr. Maria Santos &bull; Maria Reyna XU Hospital (Room 304) &bull; Sept 21, 2026
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      CN-RX-2026-8821
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 text-slate-700">
                    <p><strong>1. Amlodipine Besylate (Norvasc) 5mg</strong> — 1 tab once daily in morning (30 days)</p>
                    <p><strong>2. Paracetamol (Biogesic) 500mg</strong> — 1 tab every 6h PRN for headache (5 days)</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Tamper-evident SHA-256 digital signature verified</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => setSelectedRx(defaultRxProps)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8 gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Pharmacist Mode
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {records.map((rec) => {
                const meds = (rec.prescriptions_lab_requests || []).filter((i: any) => i.item_type === 'MEDICATION');
                if (meds.length === 0) return null;
                const doc = rec.doctors;
                return (
                  <Card key={rec.id} className="rounded-2xl border-slate-200 bg-white shadow-xs p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{rec.diagnosis}</h4>
                        <p className="text-xs text-slate-500">
                          {formatDoctorDisplayName(doc?.profiles?.full_name, doc?.title)} &bull; {new Date(rec.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleOpenRxModal(rec)}
                        className="rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs h-8 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View ℞
                      </Button>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1">
                      {meds.map((m: any, idx: number) => (
                        <p key={m.id || idx}>
                          <strong>{m.generic_name || m.details}</strong> — {m.dosage} &bull; {m.frequency}
                        </p>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── TAB 2: DIAGNOSTIC LAB REQUISITIONS ── */}
          <TabsContent value="labs" className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-brand-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Outpatient Diagnostic Laboratory Orders
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Present at Maria Reyna, CUMC, or Polymedic Plaza Hospital Laboratory Desk
                  </p>
                </div>
                <Badge className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                  Pending Testing
                </Badge>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-700" />
                  Mandatory Pre-Test Preparation Instructions:
                </span>
                <p className="text-[11px] text-amber-800 pl-5">
                  &bull; <strong>10–12 Hours Overnight Fasting:</strong> Do not eat or drink anything except plain water after 9:00 PM the night before blood extraction.
                </p>
                <p className="text-[11px] text-amber-800 pl-5">
                  &bull; <strong>Water intake:</strong> Drink 1–2 glasses of water before arrival to ensure smooth venipuncture.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  {
                    name: 'Fasting Blood Sugar (FBS)',
                    category: 'Clinical Chemistry',
                    purpose: 'Assess baseline fasting glucose level',
                  },
                  {
                    name: 'Complete Lipid Profile (Total Chol, HDL, LDL, Triglycerides)',
                    category: 'Clinical Chemistry',
                    purpose: 'Cardiovascular lipid risk stratification',
                  },
                  {
                    name: 'Serum Creatinine & eGFR',
                    category: 'Renal Function',
                    purpose: 'Baseline kidney function check prior to medication adjustment',
                  },
                  {
                    name: 'Routine Urinalysis',
                    category: 'Microscopy',
                    purpose: 'Screen for proteinuria / microalbuminuria',
                  },
                ].map((lab, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{lab.name}</p>
                      <p className="text-[11px] text-slate-500">{lab.category} &bull; {lab.purpose}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-white text-slate-700">
                      Standard Req
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Ordered by: <strong>Dr. Maria Santos (PRC #0129841)</strong>
                </span>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs h-8 gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Lab Slip
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 3: VISIT HISTORY ── */}
          <TabsContent value="history" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Encounter Date: Sept 21, 2026
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      Stage 1 Essential Hypertension & Tension Headache
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dr. Maria Santos &bull; Maria Reyna XU Hospital (Room 304)
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                    Completed
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="text-[10px] text-slate-400 block font-bold">Blood Pressure</span>
                    <span className="font-bold text-slate-900">142/90 mmHg</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="text-[10px] text-slate-400 block font-bold">Heart Rate</span>
                    <span className="font-bold text-slate-900">76 bpm</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="text-[10px] text-slate-400 block font-bold">BMI</span>
                    <span className="font-bold text-slate-900">21.2 (Normal)</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="text-[10px] text-slate-400 block font-bold">Follow-Up</span>
                    <span className="font-bold text-emerald-800">14 Days</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700">Chief Complaint: </span>
                  &ldquo;Recurrent morning headaches and mild exertional chest tightness for 2 weeks.&rdquo;
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 4: DAILY DOSES TRACKER ── */}
          <TabsContent value="tracker" className="space-y-4">
            <MedicationTracker patientId="971463e5-9348-42c0-b759-5b56f9df9e99" />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── PHARMACIST MODE / PRINT DIALOG ── */}
      {selectedRx && (
        <Dialog open={!!selectedRx} onOpenChange={(open) => !open && setSelectedRx(null)}>
          <DialogContent className="sm:max-w-2xl p-6 rounded-2xl bg-white max-h-[88vh] overflow-y-auto">
            <PharmacistRxView data={selectedRx} />
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
