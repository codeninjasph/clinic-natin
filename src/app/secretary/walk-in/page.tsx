'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  Stethoscope,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSecretary, type PriorityCategory } from '../secretary-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VitalSignsTriageModal } from '@/components/secretary/vital-signs-triage-modal';

export default function WalkInRegistrationPage() {
  const router = useRouter();
  const supabase = createClient();
  const { activeSession, appointments, doctor, clinic, refreshData } = useSecretary();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('FEMALE');
  const [priority, setPriority] = useState<PriorityCategory>('NONE');
  const [priorityIdNumber, setPriorityIdNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{
    token: string;
    queueNumber: number;
    appointmentId: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-open triage modal after registration if requested
  const [createdApptForTriage, setCreatedApptForTriage] = useState<any | null>(null);

  // Next Even Queue Slot
  const evenNumbers = appointments
    .filter((a) => a.queue_number % 2 === 0)
    .map((a) => a.queue_number);
  const nextEvenNumber = evenNumbers.length > 0 ? Math.max(...evenNumbers) + 2 : 2;
  const previewToken = `CN-WK${String(nextEvenNumber).padStart(3, '0')}`;

  const handleSubmit = async (openVitalsAfter = false) => {
    if (!fullName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }
    if (!activeSession) {
      setErrorMsg('No active queue session today. A doctor session must be active to register walk-ins.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create or find profile
      let patientId: string | null = null;
      if (phone.trim() || fullName.trim()) {
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .insert({
            full_name: fullName.trim(),
            phone_number: phone.trim() || null,
            date_of_birth: dateOfBirth || null,
            gender: gender,
            priority_category: priority,
            priority_id_number: priorityIdNumber.trim() || null,
            role: 'PATIENT',
          })
          .select('id')
          .single();

        if (!profErr && prof) {
          patientId = prof.id;
        }
      }

      // 2. Insert into appointments with next even number
      const { data: newAppt, error: apptErr } = await supabase
        .from('appointments')
        .insert({
          queue_session_id: activeSession.id,
          patient_id: patientId,
          walk_in_name: fullName.trim(),
          walk_in_phone: phone.trim() || null,
          booking_channel: 'WALK_IN',
          queue_number: nextEvenNumber,
          token_code: previewToken,
          status: 'WAITING',
          priority_category: priority,
          consultation_fee: doctor?.consultation_fee || 600,
          is_paid_to_clinic: false,
        })
        .select()
        .single();

      if (apptErr) throw apptErr;

      await refreshData();

      setSuccessNotice({
        token: previewToken,
        queueNumber: nextEvenNumber,
        appointmentId: newAppt.id,
      });

      if (openVitalsAfter) {
        setCreatedApptForTriage({
          id: newAppt.id,
          queue_number: nextEvenNumber,
          token_code: previewToken,
          display_name: fullName.trim(),
          booking_channel: 'WALK_IN',
          patient_id: patientId,
        });
      } else {
        // Reset form for next walkin
        setFullName('');
        setPhone('');
        setDateOfBirth('');
        setPriority('NONE');
        setPriorityIdNumber('');
      }
    } catch (err: unknown) {
      console.error('[WalkInPage] Registration failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Could not register walk-in patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <UserPlus className="h-6 w-6 text-brand-700" />
          Register Walk-In Patient
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Issue next sequential even ticket slot &amp; record patient information into the queue
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-emerald-900">
                  {successNotice.token}
                </span>
                <Badge className="bg-emerald-700 text-white text-[10px]">
                  Slot #{successNotice.queueNumber}
                </Badge>
              </div>
              <p className="text-xs font-bold text-emerald-900 mt-0.5">
                Patient successfully added to today&apos;s queue and marked as Waiting in Lounge!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSuccessNotice(null);
                setFullName('');
                setPhone('');
              }}
              className="text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex-1 sm:flex-initial"
            >
              Register Another Walk-In
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => router.push('/secretary/dashboard')}
              className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex-1 sm:flex-initial"
            >
              Go to Queue Logbook →
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Paper Form */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Patient Information Slip
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Please ask the patient for their basic details
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  Full Patient Name *
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Juan Carlos dela Cruz"
                  className="h-12 text-sm font-semibold border-slate-300 focus:border-brand-700"
                  autoFocus
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  Philippine Mobile Number (For Free SMS Alerts)
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09171234567"
                  className="h-12 text-sm font-semibold border-slate-300 focus:border-brand-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Patient receives SMS 2 turns ahead so they can wait comfortably in the lobby
                </span>
              </div>

              {/* DOB & Sex */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    Date of Birth (Optional)
                  </label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-11 text-xs border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Biological Sex
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('FEMALE')}
                      className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-all ${
                        gender === 'FEMALE'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('MALE')}
                      className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-all ${
                        gender === 'MALE'
                          ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Male
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority Category Large Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 block mb-2">
                  Statutory Priority Privileges (Philippine Laws)
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'NONE', label: 'Regular Patient', desc: 'Standard Queue' },
                    { id: 'SENIOR', label: 'Senior Citizen (60+)', desc: 'RA 9994 20% Off' },
                    { id: 'PWD', label: 'Person with Disability', desc: 'RA 7277 20% Off' },
                    { id: 'PREGNANT', label: 'Pregnant / Maternal', desc: 'Express Lane' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as PriorityCategory)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        priority === p.id
                          ? 'bg-brand-50 border-brand-500 text-brand-900 ring-2 ring-brand-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs font-extrabold block leading-tight">{p.label}</span>
                      <span className="text-[10px] text-slate-500">{p.desc}</span>
                    </button>
                  ))}
                </div>

                {(priority === 'SENIOR' || priority === 'PWD') && (
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {priority === 'SENIOR' ? 'OSCA Senior Citizen ID Number' : 'PWD ID Card Number'}
                    </label>
                    <Input
                      type="text"
                      value={priorityIdNumber}
                      onChange={(e) => setPriorityIdNumber(e.target.value)}
                      placeholder="e.g. OSCA-CDO-2024-9981"
                      className="h-10 text-xs border-slate-300"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Physical Ticket Preview & Primary Actions */}
        <div className="space-y-4">
          {/* Ticket Slip Card */}
          <Card className="border-2 border-dashed border-slate-300 bg-white shadow-xs overflow-hidden">
            <div className="bg-brand-800 text-white p-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest block text-brand-200">
                Queue Ticket Slip Preview
              </span>
              <p className="text-xs font-bold mt-0.5">
                {clinic?.hospital_name || 'Maria Reyna XU Hospital'}
              </p>
              <p className="text-[10px] text-brand-200">
                Room {clinic?.room_number || '304'} &bull; {doctor?.name || 'Dr. Maria Santos'}
              </p>
            </div>

            <CardContent className="p-5 text-center space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Token
                </span>
                <span className="font-mono text-3xl font-black text-brand-700 block my-1">
                  {previewToken}
                </span>
                <Badge variant="outline" className="text-xs font-bold text-slate-700 bg-slate-50">
                  Even Slot #{nextEvenNumber}
                </Badge>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lane:</span>
                  <span className="font-semibold">{priority === 'NONE' ? 'Walk-In Regular' : priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Physician Fee:</span>
                  <span className="font-semibold">₱{doctor?.consultation_fee?.toFixed(2) || '600.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Button
              variant="brand"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !fullName.trim()}
              className="w-full h-12 text-sm font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl shadow-xs gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Stethoscope className="h-4 w-4" />
              )}
              Add to Queue &amp; Record Vitals Now →
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !fullName.trim()}
              className="w-full h-11 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 rounded-xl gap-2"
            >
              <Ticket className="h-4 w-4 text-brand-700" />
              Issue Ticket Only (Vitals Later)
            </Button>
          </div>
        </div>
      </div>

      {/* Vitals Modal after registration */}
      {createdApptForTriage && (
        <VitalSignsTriageModal
          isOpen={!!createdApptForTriage}
          onClose={() => setCreatedApptForTriage(null)}
          appointment={createdApptForTriage}
          doctorId={doctor?.id}
          onSaveSuccess={() => {
            refreshData();
            router.push('/secretary/dashboard');
          }}
        />
      )}
    </div>
  );
}
