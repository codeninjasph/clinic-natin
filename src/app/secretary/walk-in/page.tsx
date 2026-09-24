'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft,
  IdCard,
  UserCheck,
  AlertTriangle,
  Search,
  X,
  Sparkles,
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

  // Existing Account Detection (MPI Matching)
  const [matchedProfile, setMatchedProfile] = useState<{
    id: string;
    full_name: string;
    phone_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    priority_category: string;
    allergies?: string[];
  } | null>(null);
  const [hasLinkedExisting, setHasLinkedExisting] = useState(false);
  const [originalPhoneNumber, setOriginalPhoneNumber] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dismissedProfileId, setDismissedProfileId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<{
    token: string;
    queueNumber: number;
    patientName: string;
    appointmentId: string;
    smsSentTo?: string | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-open triage modal after registration if requested
  const [createdApptForTriage, setCreatedApptForTriage] = useState<any | null>(null);

  // Next Even Queue Slot for Walk-ins
  const evenNumbers = appointments
    .filter((a) => a.queue_number % 2 === 0)
    .map((a) => a.queue_number);
  const nextEvenNumber = evenNumbers.length > 0 ? Math.max(...evenNumbers) + 2 : 2;
  const previewToken = `CN-WK${String(nextEvenNumber).padStart(3, '0')}`;

  // ── Debounced Master Patient Index (MPI) Search ────────────────────────────
  useEffect(() => {
    if (hasLinkedExisting) return;

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2 && trimmedPhone.length < 4) {
      setSearchSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let q = supabase
          .from('profiles')
          .select('id, full_name, phone_number, date_of_birth, gender, priority_category, allergies')
          .eq('role', 'PATIENT')
          .order('full_name', { ascending: true })
          .limit(4);

        if (trimmedName.length >= 2 && trimmedPhone.length >= 4) {
          q = q.or(`full_name.ilike.%${trimmedName}%,phone_number.ilike.%${trimmedPhone}%`);
        } else if (trimmedName.length >= 2) {
          q = q.ilike('full_name', `%${trimmedName}%`);
        } else if (trimmedPhone.length >= 4) {
          q = q.ilike('phone_number', `%${trimmedPhone}%`);
        }

        const { data } = await q;
        if (data) {
          setSearchSuggestions(data.filter((p) => p.id !== dismissedProfileId));
        }
      } catch (err) {
        console.error('Failed to search existing patients:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [fullName, phone, hasLinkedExisting, dismissedProfileId, supabase]);

  const handleLinkProfile = (prof: any) => {
    setMatchedProfile(prof);
    setHasLinkedExisting(true);
    setSearchSuggestions([]);
    setFullName(prof.full_name);
    setPhone(prof.phone_number || '');
    setOriginalPhoneNumber(prof.phone_number || null);
    if (prof.date_of_birth) setDateOfBirth(prof.date_of_birth);
    if (prof.gender) setGender(prof.gender);
    if (prof.priority_category) setPriority(prof.priority_category as PriorityCategory);
  };

  const handleUnlinkProfile = () => {
    if (matchedProfile) {
      setDismissedProfileId(matchedProfile.id);
    }
    setMatchedProfile(null);
    setHasLinkedExisting(false);
    setOriginalPhoneNumber(null);
  };

  const handleSubmit = async (openVitalsAfter = false) => {
    if (!fullName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let targetSessionId = activeSession?.id;

      if (!targetSessionId) {
        const targetClinicId = clinic?.id;
        const targetDoctorId = doctor?.id;
        if (!targetClinicId || !targetDoctorId) {
          setErrorMsg('Clinic or Doctor details not resolved. Please wait a moment or refresh.');
          setIsSubmitting(false);
          return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay();

        const { data: existingSess } = await supabase
          .from('queue_sessions')
          .select('id')
          .eq('doctor_id', targetDoctorId)
          .eq('clinic_id', targetClinicId)
          .eq('session_date', todayStr)
          .maybeSingle();

        if (existingSess) {
          targetSessionId = existingSess.id;
        } else {
          const { data: sched } = await supabase
            .from('doctor_clinic_schedules')
            .select('id')
            .eq('doctor_id', targetDoctorId)
            .eq('clinic_id', targetClinicId)
            .limit(1)
            .maybeSingle();

          let schedId = sched?.id;
          if (!schedId) {
            const { data: newSched } = await supabase
              .from('doctor_clinic_schedules')
              .insert({
                doctor_id: targetDoctorId,
                clinic_id: targetClinicId,
                day_of_week: dayOfWeek,
                start_time: '08:00:00',
                end_time: '17:00:00',
                max_patients: 50,
                is_active: true,
              })
              .select('id')
              .single();
            schedId = newSched?.id;
          }

          const { data: createdSess, error: sessErr } = await supabase
            .from('queue_sessions')
            .insert({
              schedule_id: schedId,
              doctor_id: targetDoctorId,
              clinic_id: targetClinicId,
              session_date: todayStr,
              status: 'PENDING',
              current_serving_number: 0,
              accepting_walkins: true,
              accepting_online: true,
            })
            .select('id')
            .single();

          if (sessErr) throw sessErr;
          targetSessionId = createdSess.id;
        }
      }

      // ── 1. Create, Link, or Update Profile (Master Patient Index) ───────────
      let patientId: string | null = null;

      if (hasLinkedExisting && matchedProfile) {
        patientId = matchedProfile.id;
        // Update contact & demographics on existing profile
        await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            phone_number: phone.trim() || null,
            date_of_birth: dateOfBirth || null,
            gender: gender,
            priority_category: priority,
            priority_id_number: priorityIdNumber.trim() || null,
          })
          .eq('id', matchedProfile.id);
      } else {
        // Check if an existing profile matches this exact phone number or name
        let existingId: string | null = null;
        if (phone.trim()) {
          const { data: byPhone } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone_number', phone.trim())
            .maybeSingle();
          if (byPhone) existingId = byPhone.id;
        }

        if (existingId) {
          patientId = existingId;
          await supabase
            .from('profiles')
            .update({
              full_name: fullName.trim(),
              date_of_birth: dateOfBirth || null,
              gender: gender,
              priority_category: priority,
              priority_id_number: priorityIdNumber.trim() || null,
            })
            .eq('id', existingId);
        } else if (phone.trim() || fullName.trim()) {
          // Brand new patient profile
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
      }

      // ── 2. Insert into appointments ─────────────────────────────────────────
      const { data: newAppt, error: apptErr } = await supabase
        .from('appointments')
        .insert({
          queue_session_id: targetSessionId,
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
          skip_count: 0,
        })
        .select('*')
        .single();

      if (apptErr) throw apptErr;

      // Dispatch welcome & live queue tracker SMS to walk-in patient
      if (phone.trim()) {
        fetch('/api/secretary/send-walkin-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: newAppt.id,
            phoneNumber: phone.trim(),
            patientName: fullName.trim(),
            tokenCode: previewToken,
            queueNumber: nextEvenNumber,
            doctorName: doctor?.name,
            clinicName: clinic?.hospital_name,
          }),
        }).catch((e) => console.warn('[WalkInPage] SMS dispatch error:', e));
      }

      await refreshData();

      setSuccessNotice({
        token: previewToken,
        queueNumber: nextEvenNumber,
        patientName: fullName.trim(),
        appointmentId: newAppt.id,
        smsSentTo: phone.trim() || null,
      });

      if (openVitalsAfter) {
        setCreatedApptForTriage({
          ...newAppt,
          display_name: fullName.trim(),
        });
      } else {
        setFullName('');
        setPhone('');
        setDateOfBirth('');
        setPriority('NONE');
        setPriorityIdNumber('');
        setMatchedProfile(null);
        setHasLinkedExisting(false);
        setOriginalPhoneNumber(null);
        setSearchSuggestions([]);
      }
    } catch (err: unknown) {
      console.error('[WalkInPage] Registration failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Could not register walk-in patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* ── TOP NAV & BREADCRUMB ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/secretary/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Queue Logbook</span>
        </Link>
        <span className="text-[11px] font-bold text-slate-400">
          Walk-In Front Desk
        </span>
      </div>

      {/* ── ERROR ALERT ── */}
      {errorMsg && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs font-bold text-red-900 flex items-center gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span className="leading-snug">{errorMsg}</span>
        </div>
      )}

      {/* ── SUCCESS NOTICE BANNER ── */}
      {successNotice && (
        <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-emerald-950">
                  {successNotice.token}
                </span>
                <Badge className="bg-emerald-700 text-white text-xs font-bold px-2">
                  Slot #{successNotice.queueNumber}
                </Badge>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                Successfully registered <span className="text-emerald-800">{successNotice.patientName}</span> into the queue!
              </p>
              <p className="text-xs text-slate-500">
                Patient is now listed as Waiting in Lobby and ready for vitals triage.
              </p>
              {successNotice.smsSentTo && (
                <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-xs font-semibold text-emerald-900 w-fit">
                  <Phone className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>
                    Live queue tracker & Health Passport invite sent via SMS to <strong>{successNotice.smsSentTo}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-emerald-200/60">
            <Button
              variant="outline"
              onClick={() => {
                setSuccessNotice(null);
                setFullName('');
                setPhone('');
              }}
              className="w-full sm:w-auto h-11 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl"
            >
              + Register Another Walk-In
            </Button>
            <Button
              onClick={() => router.push('/secretary/dashboard')}
              className="w-full sm:w-auto h-11 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs"
            >
              Go to Queue Logbook →
            </Button>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN WIDESCREEN REGISTRATION LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
        {/* Left: Form Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border-slate-200 shadow-xs bg-white rounded-3xl overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 bg-slate-50/60">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand-700" />
                Walk-In Patient Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Record basic patient details to issue a sequential ticket slot and send SMS queue updates.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* 1. Full Name */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-brand-700" />
                    Full Patient Name *
                  </span>
                  {isSearching && (
                    <span className="text-[11px] text-brand-600 font-semibold flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking records...
                    </span>
                  )}
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (hasLinkedExisting) {
                      setHasLinkedExisting(false);
                      setMatchedProfile(null);
                      setOriginalPhoneNumber(null);
                    }
                  }}
                  placeholder="e.g. Juan Carlos dela Cruz"
                  className="h-12 text-sm sm:text-base font-semibold border-slate-300 focus:border-brand-700 rounded-2xl bg-white"
                  autoFocus
                />

                {/* ── Linked Existing Account Confirmation Banner ── */}
                {hasLinkedExisting && matchedProfile && (
                  <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-emerald-950">
                            Linked to Existing Patient Account
                          </span>
                          <Badge className="bg-emerald-700 text-white text-[9px] py-0 font-bold">
                            Passport Active
                          </Badge>
                          {matchedProfile.date_of_birth && (
                            <span className="text-[11px] text-emerald-800 font-medium">
                              DOB: {matchedProfile.date_of_birth}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Previous consultations, diagnoses, and prescriptions are attached to{' '}
                          <strong>{matchedProfile.full_name}</strong>.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUnlinkProfile}
                      className="h-8 text-xs font-semibold text-slate-600 hover:text-red-700 border-emerald-300 bg-white hover:bg-red-50 shrink-0 self-end sm:self-center"
                    >
                      Different Person (Unlink)
                    </Button>
                  </div>
                )}

                {/* ── Existing Account Suggestions (MPI Match) ── */}
                {!hasLinkedExisting && searchSuggestions.length > 0 && (
                  <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/70 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between text-xs font-extrabold text-brand-950">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-brand-700" />
                        Existing Clinic Natin Account Detected ({searchSuggestions.length})
                      </span>
                      <span className="text-[10px] text-brand-700 font-semibold">
                        Avoids duplicate charts
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {searchSuggestions.map((prof) => {
                        const age = prof.date_of_birth
                          ? Math.floor(
                            (Date.now() - new Date(prof.date_of_birth).getTime()) /
                            (365.25 * 24 * 3600 * 1000)
                          )
                          : null;

                        return (
                          <div
                            key={prof.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-brand-100 rounded-xl shadow-2xs hover:border-brand-300 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {prof.full_name}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {age !== null ? `${age} yrs • ` : ''}
                                {prof.gender ? `${prof.gender} • ` : ''}
                                Phone:{' '}
                                <strong className="font-mono text-slate-700">
                                  {prof.phone_number || 'None on file'}
                                </strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleLinkProfile(prof)}
                                className="h-8 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-lg gap-1 shadow-2xs"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Link &amp; Pre-fill
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDismissedProfileId(prof.id);
                                  setSearchSuggestions((prev) =>
                                    prev.filter((p) => p.id !== prof.id)
                                  );
                                }}
                                className="h-8 text-xs text-slate-400 hover:text-slate-600 px-2"
                                title="Not this patient"
                              >
                                Not them
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Mobile Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-brand-700" />
                  Philippine Mobile Number (09XXXXXXXXX)
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09171234567"
                  className="h-12 text-sm sm:text-base font-bold font-mono border-slate-300 focus:border-brand-700 rounded-2xl bg-white"
                />

                {/* ── Changed Mobile Number Detection Alert ── */}
                {hasLinkedExisting &&
                  originalPhoneNumber &&
                  phone.trim() &&
                  phone.trim() !== originalPhoneNumber && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">New Mobile Number Detected</p>
                        <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                          Patient&apos;s mobile number will be updated from{' '}
                          <strong className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">
                            {originalPhoneNumber}
                          </strong>{' '}
                          to{' '}
                          <strong className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">
                            {phone.trim()}
                          </strong>
                          . All past consultations, lab results, and prescriptions remain 100%
                          preserved under their account.
                        </p>
                      </div>
                    </div>
                  )}

                <p className="text-[11px] text-slate-500 font-medium">
                  Patient receives an automated SMS 2 turns ahead so they can wait comfortably in the lounge.
                </p>
              </div>

              {/* 3. Biological Sex & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Biological Sex
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('FEMALE')}
                      className={`h-11 rounded-2xl text-xs font-bold border transition-all ${gender === 'FEMALE'
                          ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs ring-2 ring-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('MALE')}
                      className={`h-11 rounded-2xl text-xs font-bold border transition-all ${gender === 'MALE'
                          ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-xs ring-2 ring-blue-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      Male
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Date of Birth (Optional)
                  </label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-11 text-xs border-slate-300 rounded-2xl bg-white"
                  />
                </div>
              </div>

              {/* 4. Priority Privilege Category */}
              <div className="pt-3 border-t border-slate-100">
                <label className="text-xs sm:text-sm font-bold text-slate-900 block mb-2">
                  Patient Category &amp; Statutory Discounts
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'NONE', label: 'Regular', desc: 'Standard Line' },
                    { id: 'SENIOR', label: 'Senior (60+)', desc: '20% Discount' },
                    { id: 'PWD', label: 'PWD', desc: '20% Discount' },
                    { id: 'PREGNANT', label: 'Pregnant', desc: 'Express Lane' },
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as PriorityCategory)}
                        className={`p-3 rounded-2xl text-left border transition-all ${isSelected
                            ? 'bg-brand-700 text-white border-brand-700 shadow-sm ring-2 ring-brand-300/40'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        <span className="text-xs font-bold block leading-tight">{p.label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'} block mt-0.5`}>
                          {p.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {(priority === 'SENIOR' || priority === 'PWD') && (
                  <div className="mt-3 bg-amber-50/70 border border-amber-200 p-3 rounded-2xl animate-in fade-in">
                    <label className="text-xs font-bold text-amber-950 block mb-1">
                      {priority === 'SENIOR' ? 'OSCA Senior Citizen ID Number' : 'PWD ID Card Number'}
                    </label>
                    <Input
                      type="text"
                      value={priorityIdNumber}
                      onChange={(e) => setPriorityIdNumber(e.target.value)}
                      placeholder="e.g. OSCA-CDO-2024-9981"
                      className="h-10 text-xs border-amber-300 bg-white rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || !fullName.trim()}
                  className="w-full h-12 text-sm sm:text-base font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-2xl shadow-md gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Stethoscope className="h-5 w-5" />
                  )}
                  <span>Register &amp; Record Baseline Vitals →</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !fullName.trim()}
                  className="w-full h-11 text-xs sm:text-sm font-bold text-slate-700 border-slate-300 hover:bg-slate-100 rounded-2xl gap-2"
                >
                  <Ticket className="h-4 w-4 text-brand-700" />
                  <span>Issue Ticket Only (Take Vitals Later)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Ticket Slip Preview */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-2 border-dashed border-slate-300 bg-white shadow-xs rounded-3xl overflow-hidden">
            <div className="bg-brand-800 text-white p-5 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest block text-brand-200">
                Ticket Slip Preview
              </span>
              <p className="text-sm font-bold mt-1">
                {clinic?.hospital_name || 'Maria Reyna XU Hospital'}
              </p>
              <p className="text-xs text-brand-200">
                Room {clinic?.room_number || '304'} &bull; {doctor?.name || 'Dr. Maria Santos'}
              </p>
            </div>

            <CardContent className="p-6 text-center space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Next Available Token
                </span>
                <span className="font-mono text-3xl font-black text-brand-700 block my-1">
                  {previewToken}
                </span>
                <Badge variant="outline" className="text-xs font-bold text-slate-700 bg-slate-50">
                  Walk-In Slot #{nextEvenNumber}
                </Badge>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString('en-US')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Queue Line:</span>
                  <span className="font-semibold">{priority === 'NONE' ? 'Walk-In Regular' : priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Standard Fee:</span>
                  <span className="font-semibold">₱{doctor?.consultation_fee?.toFixed(2) || '600.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
