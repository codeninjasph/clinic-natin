'use client';

import { useState, useEffect } from 'react';
import {
  Settings2,
  FileCheck,
  Shield,
  Save,
  RefreshCw,
  Award,
  DollarSign,
  Building2,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDoctor } from '../doctor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const POPULAR_HMOS = [
  'Maxicare',
  'Intellicare',
  'Medicard',
  'PhilCare',
  'Caritas Health Shield',
  'Cocolife',
  'Insular Health Care',
  'Pacific Cross',
  'Avega',
  'PhilHealth (Konsulta)',
];

export default function DoctorSettingsPage() {
  const supabase = createClient();
  const { doctor, refreshDoctorData } = useDoctor();

  const [saving, setSaving] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'destructive' | 'brand';
    title: string;
    message: string;
  } | null>(null);

  // Form State
  const [fullName, setFullName] = useState(doctor?.name || 'Dr. Maria Santos');
  const [specialty, setSpecialty] = useState(doctor?.specialty || 'Internal Medicine');
  const [subspecialty, setSubspecialty] = useState(doctor?.subspecialty || 'Adult Cardiology');
  const [prcLicense, setPrcLicense] = useState(doctor?.prcLicense || '');
  const [ptrNumber, setPtrNumber] = useState(doctor?.ptrNumber || '');
  const [s2License, setS2License] = useState(doctor?.s2License || '');
  const [consultationFee, setConsultationFee] = useState<number>(doctor?.consultationFeeDefault || 600);
  const [hmos, setHmos] = useState<string[]>(doctor?.hmoAccreditations || ['Maxicare', 'Intellicare', 'PhilHealth']);
  const [hospitalAffiliation, setHospitalAffiliation] = useState(doctor?.hospitalAffiliation || 'Maria Reyna XU Hospital');
  const [roomAssignment, setRoomAssignment] = useState(doctor?.roomAssignment || 'Room 304');

  // Sync state when doctor context loads
  useEffect(() => {
    if (doctor) {
      setFullName(doctor.name);
      setSpecialty(doctor.specialty);
      setSubspecialty(doctor.subspecialty || '');
      setPrcLicense(doctor.prcLicense || '');
      setPtrNumber(doctor.ptrNumber || '');
      setS2License(doctor.s2License || '');
      setConsultationFee(doctor.consultationFeeDefault || 600);
      setHmos(doctor.hmoAccreditations || []);
      setHospitalAffiliation(doctor.hospitalAffiliation || '');
      setRoomAssignment(doctor.roomAssignment || '');
    }
  }, [doctor]);

  // Toggle HMO selection
  const handleToggleHMO = (hmo: string) => {
    setHmos((prev) =>
      prev.includes(hmo) ? prev.filter((item) => item !== hmo) : [...prev, hmo]
    );
  };

  // ── Save Credentials to Supabase ──────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor?.id) return;
    setSaving(true);
    try {
      // 1. Update doctors table
      const { error: dErr } = await supabase
        .from('doctors')
        .update({
          specialty,
          subspecialty: subspecialty || null,
          prc_license: prcLicense,
          ptr_number: ptrNumber || null,
          s2_license: s2License || null,
          consultation_fee_default: consultationFee,
          hmo_accreditations: hmos,
        })
        .eq('id', doctor.id);

      if (dErr) throw dErr;

      // 2. Update profiles table if full name changed
      if (doctor.profileId) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', doctor.profileId);
      }

      setToastNotice({
        type: 'success',
        title: 'Credentials Saved',
        message: 'Your professional credentials and Rx pad header have been updated.',
      });
      await refreshDoctorData();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Could not save credentials.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast */}
      {toastNotice && (
        <Alert variant={toastNotice.type === 'destructive' ? 'destructive' : toastNotice.type === 'brand' ? 'brand' : 'success'}>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-brand-600" />
            Credentials &amp; Practice Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PRC License, PTR, S2 PDEA Number, Consultation Fee, and FDA-Compliant Rx Pad Header
          </p>
        </div>

        <Badge variant="brand" className="text-xs py-1 px-3 self-start sm:self-auto">
          {doctor?.subscriptionTier === 'pro' ? '👑 Clinic Natin Pro Tier' : 'Standard Tier'}
        </Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-7 space-y-6">
            {/* Professional Licensing Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-brand-600" />
                  Philippine Medical Credentials
                </CardTitle>
                <CardDescription>
                  Printed on all digital prescriptions (FDA Circular No. 2020-007 compliant)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Legal Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Dr. Maria Santos, MD, FPCP, FPCC"
                    className="text-xs font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Primary Specialty</label>
                    <Input
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g., Internal Medicine"
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subspecialty (Optional)</label>
                    <Input
                      value={subspecialty}
                      onChange={(e) => setSubspecialty(e.target.value)}
                      placeholder="e.g., Adult Cardiology"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PRC License No.</label>
                    <Input
                      value={prcLicense}
                      onChange={(e) => setPrcLicense(e.target.value)}
                      placeholder="e.g., 0108742"
                      className="text-xs font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">PTR Number</label>
                    <Input
                      value={ptrNumber}
                      onChange={(e) => setPtrNumber(e.target.value)}
                      placeholder="e.g., 8892145A"
                      className="text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">S2 License (PDEA)</label>
                    <Input
                      value={s2License}
                      onChange={(e) => setS2License(e.target.value)}
                      placeholder="e.g., S2-984210"
                      className="text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Practice & Consultation Fees */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Professional Consultation Fee (PF)
                </CardTitle>
                <CardDescription>
                  Base out-of-pocket rate for self-pay patients before senior/PWD discounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="max-w-xs">
                  <label className="block font-bold text-slate-700 mb-1">Default Consultation Fee (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₱</span>
                    <Input
                      type="number"
                      min={100}
                      max={5000}
                      step={50}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="pl-7 text-sm font-black text-slate-900"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Senior &amp; PWD consultations automatically apply the 20% statutory discount (₱{consultationFee * 0.8}).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* HMO Accreditations Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  HMO &amp; Insurance Accreditations
                </CardTitle>
                <CardDescription>
                  Select the health maintenance organizations you currently accept
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {POPULAR_HMOS.map((hmo) => {
                    const isSelected = hmos.includes(hmo);
                    return (
                      <button
                        key={hmo}
                        type="button"
                        onClick={() => handleToggleHMO(hmo)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-brand-50 border-2 border-brand-500 text-brand-900 shadow-xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-brand-600" />}
                        {hmo}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Rx Header Preview */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-brand-200 bg-slate-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-600" />
                  Official Rx Pad Header Preview
                </CardTitle>
                <CardDescription>
                  Live preview of how your credentials appear on printed &amp; PDF prescriptions
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm space-y-4">
                  {/* Doctor Header */}
                  <div className="text-center pb-3 border-b-2 border-slate-800">
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                      {fullName || 'Dr. Maria Santos, MD'}
                    </h2>
                    <p className="text-xs font-bold text-slate-700">
                      {specialty} {subspecialty ? `· ${subspecialty}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {hospitalAffiliation || 'Maria Reyna XU Hospital'} · {roomAssignment || 'Room 304'}
                    </p>
                    <div className="flex justify-center gap-4 text-[10px] font-mono text-slate-600 mt-2">
                      <span>PRC No: <strong>{prcLicense || '0108742'}</strong></span>
                      <span>PTR No: <strong>{ptrNumber || '8892145A'}</strong></span>
                      {s2License && <span>S2: <strong>{s2License}</strong></span>}
                    </div>
                  </div>

                  {/* Sample Rx body */}
                  <div className="py-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-dashed pb-1">
                      <span>Patient: Juan Dela Cruz (42y / M)</span>
                      <span>Date: {new Date().toLocaleDateString()}</span>
                    </div>

                    <div className="font-serif text-2xl font-black text-brand-800">℞</div>

                    <div className="pl-4 font-mono text-xs text-slate-800 space-y-1">
                      <p className="font-bold">Amoxicillin + Clavulanic Acid 625mg tab</p>
                      <p className="text-[11px] text-slate-500">Sig: 1 tab BID with meals for 7 days #14</p>
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
                    Generated via Clinic Natin EMR · Compliant with Philippine FDA Circular 2020-007
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" variant="brand" size="lg" disabled={saving} className="w-full">
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save All Credentials &amp; Settings
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
