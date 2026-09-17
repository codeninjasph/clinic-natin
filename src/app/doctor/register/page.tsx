'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  ShieldCheck,
  Building2,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  FileCheck2,
  Hospital,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SPECIALTIES = [
  'Internal Medicine',
  'Pediatrics',
  'Family Medicine / General Practice',
  'Obstetrics & Gynecology',
  'General Surgery',
  'Adult Cardiology',
  'Pulmonology',
  'Orthopedic Surgery',
  'Dermatology',
  'ENT / Otorhinolaryngology',
  'Ophthalmology',
  'Psychiatry',
  'Neurology',
];

const HOSPITALS = [
  'Maria Reyna - Xavier University Hospital',
  'Cagayan de Oro Polymedic Medical Plaza',
  'Capitol University Medical Center (CUMC)',
  'Northern Mindanao Medical Center (NMMC)',
  'St. Elizabeth Hospital',
  'Cagayan de Oro Medical Center',
  'Private Outpatient Clinic',
];

const HMO_OPTIONS = ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth Konsulta', 'Pacific Cross', 'Cocolife'];

export default function DoctorRegisterPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [title, setTitle] = React.useState('Dr.');
  const [specialty, setSpecialty] = React.useState('Internal Medicine');
  const [subspecialty, setSubspecialty] = React.useState('');
  const [prcLicense, setPrcLicense] = React.useState('');
  const [prcExpiry, setPrcExpiry] = React.useState('');
  const [ptrNumber, setPtrNumber] = React.useState('');
  const [s2License, setS2License] = React.useState('');
  const [boardCertification, setBoardCertification] = React.useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = React.useState(HOSPITALS[0]);
  const [roomAssignment, setRoomAssignment] = React.useState('Room 304');
  const [consultationFee, setConsultationFee] = React.useState('600');
  const [selectedHmos, setSelectedHmos] = React.useState<string[]>([
    'Maxicare',
    'Intellicare',
    'PhilHealth Konsulta',
  ]);
  const [agreeTerms, setAgreeTerms] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successData, setSuccessData] = React.useState<any | null>(null);

  const toggleHmo = (hmo: string) => {
    setSelectedHmos((prev) =>
      prev.includes(hmo) ? prev.filter((item) => item !== hmo) : [...prev, hmo]
    );
  };

  // 1-Click Demo Physician auto-fill for testing
  const handleQuickDemoFill = () => {
    setTitle('Dr.');
    setFullName('Dr. Ramon Bautista, MD, FPCP');
    setEmail('dr.ramon.bautista@clinicnatin.ph');
    setPassword('DoctorPass2026!');
    setPhone('0917 555 7890');
    setSpecialty('Internal Medicine');
    setSubspecialty('Pulmonology');
    setPrcLicense('0149821');
    setPrcExpiry('2028-06-30');
    setPtrNumber('PTR-CDO-2026-99120');
    setS2License('PDEA-S2-2026-0812');
    setBoardCertification('Fellow, Philippine College of Physicians (FPCP)');
    setHospitalAffiliation('Maria Reyna - Xavier University Hospital');
    setRoomAssignment('Room 412');
    setConsultationFee('700');
    setSelectedHmos(['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth Konsulta']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setErrorMessage('Please accept the Data Privacy Act (RA 10173) and PRC ethical attestation.');
      return;
    }
    if (!fullName || !email || !prcLicense || !specialty) {
      setErrorMessage('Please fill in all required fields (Full Name, Email, Specialty, PRC License).');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/doctor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          fullName,
          email,
          password: password || 'ClinicNatin2026!',
          phone,
          specialty,
          subspecialty,
          prcLicense,
          prcExpiry,
          ptrNumber,
          s2License,
          boardCertification,
          hospitalAffiliation,
          roomAssignment,
          consultationFee: Number(consultationFee) || 600,
          hmoAccreditations: selectedHmos,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit physician registration');
      }

      setSuccessData(data.doctor);

      // Auto-set cookie for seamless transition
      document.cookie = `clinic_natin_role=DOCTOR; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('clinic_natin_demo_role', 'DOCTOR');
      localStorage.setItem(
        'clinic_natin_demo_user',
        JSON.stringify({
          role: 'DOCTOR',
          name: fullName,
          email,
          phone,
        })
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/50 via-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-md shadow-brand-700/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Clinic <span className="text-brand-700">Natin</span>
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="brand" className="text-xs px-2.5 py-0.5">
              Doctor Network
            </Badge>
            <Badge variant="outline" className="text-xs text-slate-600 bg-white">
              PRC &amp; RA 10173 Verified
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Physician Practice Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Connect your outpatient practice, automate clinic queues, and issue FDA-compliant digital prescriptions.
          </p>
        </div>

        {/* Demo Auto-Fill Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">Quick Testing Demo</p>
              <p className="text-[11px] text-slate-500">
                Populate physician credentials with 1 tap for rapid verification flow review.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleQuickDemoFill}
            className="text-xs border-amber-300 text-amber-900 bg-amber-50/50 hover:bg-amber-100 shrink-0"
          >
            Auto-fill Test Physician
          </Button>
        </div>

        {/* Success Modal / State */}
        {successData ? (
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-md">
            <CardHeader className="text-center pb-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-600/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Application Submitted Successfully!
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Your medical practice application has been submitted to Clinic Natin Operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-700">
              <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-slate-500">Physician Name:</span>
                  <strong className="text-slate-900">{fullName}</strong>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-slate-500">PRC License Number:</span>
                  <strong className="text-slate-900">{prcLicense}</strong>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-slate-500">Specialty &amp; Clinic:</span>
                  <strong className="text-slate-900">{specialty} · {roomAssignment}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Verification Status:</span>
                  <Badge variant="warning" className="text-[11px] font-bold">
                    <Clock className="h-3 w-3 mr-1" />
                    PENDING ADMIN REVIEW
                  </Badge>
                </div>
              </div>

              <Alert variant="brand" className="text-xs bg-brand-50 border-brand-200">
                <ShieldCheck className="h-4 w-4 text-brand-700" />
                <AlertTitle className="font-bold text-brand-900">Administrative Gatekeeping Active</AlertTitle>
                <AlertDescription className="text-brand-800 text-[11px] mt-0.5">
                  In compliance with PRC regulations and FDA Circular No. 2020-007, an administrator must verify your PRC license against the official registry. You may explore your practice dashboard now; clinical features will unlock upon approval.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                asChild
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow"
              >
                <Link href="/doctor/dashboard">
                  Proceed to Doctor Suite
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit}>
            <Card className="border-slate-200 bg-white shadow-sm space-y-6 p-6">

              {errorMessage && (
                <Alert variant="destructive" className="py-2.5 text-xs">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Section 1: Account & Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Lock className="h-4 w-4 text-brand-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    1. Account &amp; Login Credentials
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Professional Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@hospital.ph"
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Portal Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Mobile Number (for SMS queue alerts)
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0917 123 4567"
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Professional Medical Credentials */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Award className="h-4 w-4 text-brand-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    2. PRC &amp; Legal Licensing Details
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Title
                    </label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:ring-1 focus:ring-brand-700"
                    >
                      <option value="Dr.">Dr.</option>
                      <option value="Prof. Dr.">Prof. Dr.</option>
                      <option value="Dr. (Dra.)">Dra.</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Full Legal Name (as printed on PRC ID) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Maria Theresa Santos, MD, FPCP"
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      PRC License Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      value={prcLicense}
                      onChange={(e) => setPrcLicense(e.target.value)}
                      placeholder="e.g. 0123456"
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      PRC Expiration Date
                    </label>
                    <Input
                      type="date"
                      value={prcExpiry}
                      onChange={(e) => setPrcExpiry(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      PTR Number (Annual Tax Receipt)
                    </label>
                    <Input
                      value={ptrNumber}
                      onChange={(e) => setPtrNumber(e.target.value)}
                      placeholder="PTR-CDO-2026-..."
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      PDEA S2 License (for regulated Rx)
                    </label>
                    <Input
                      value={s2License}
                      onChange={(e) => setS2License(e.target.value)}
                      placeholder="PDEA-S2-2026-..."
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Board Certification / Specialty Society
                    </label>
                    <Input
                      value={boardCertification}
                      onChange={(e) => setBoardCertification(e.target.value)}
                      placeholder="e.g. Diplomate, Philippine Pediatric Society (DPPS)"
                      className="text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Clinical Practice & Hospital Affiliation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Hospital className="h-4 w-4 text-brand-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    3. Practice Specialty &amp; Hospital Room
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Primary Specialty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:ring-1 focus:ring-brand-700"
                    >
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Subspecialty / Clinical Focus
                    </label>
                    <Input
                      value={subspecialty}
                      onChange={(e) => setSubspecialty(e.target.value)}
                      placeholder="e.g. Adult Cardiology / Interventional"
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Primary Hospital Affiliation
                    </label>
                    <select
                      value={hospitalAffiliation}
                      onChange={(e) => setHospitalAffiliation(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:ring-1 focus:ring-brand-700"
                    >
                      {HOSPITALS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Clinic Room Number
                    </label>
                    <Input
                      value={roomAssignment}
                      onChange={(e) => setRoomAssignment(e.target.value)}
                      placeholder="e.g. Room 304, Medical Arts Bldg"
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Default Consultation Fee (₱)
                    </label>
                    <Input
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      placeholder="600"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* HMO Accreditations */}
                <div className="pt-2">
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">
                    Accepted HMO &amp; Health Insurance Plans:
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {HMO_OPTIONS.map((hmo) => {
                      const isSelected = selectedHmos.includes(hmo);
                      return (
                        <button
                          key={hmo}
                          type="button"
                          onClick={() => toggleHmo(hmo)}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                            isSelected
                              ? 'bg-brand-50 border-brand-300 text-brand-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {hmo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legal Attestation */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-brand-700 focus:ring-brand-700"
                  />
                  <span className="text-slate-600 leading-relaxed text-[11px]">
                    I hereby attest that I am a duly licensed physician registered with the Philippine Professional Regulation Commission (PRC). I agree to abide by the <strong>Philippine Medical Act of 1959</strong>, <strong>FDA Circular No. 2020-007</strong> for Electronic Prescribing, and the <strong>Data Privacy Act of 2012 (RA 10173)</strong>. I understand that administrative credential verification is required before clinical prescription generation is activated.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs h-10 shadow"
              >
                {loading ? 'Submitting Physician Application...' : 'Register Physician Practice'}
              </Button>

              <div className="text-center text-xs text-slate-500 pt-1">
                Already registered?{' '}
                <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                  Sign in to Doctor Suite
                </Link>
              </div>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
