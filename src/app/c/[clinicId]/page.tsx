'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Users,
  Building2,
  Ticket,
  UserPlus,
  ShieldCheck,
  Star,
  Accessibility,
  Baby,
  ArrowRight,
  Sparkles,
  Phone,
  AlertCircle,
  QrCode,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { INITIAL_CDO_CLINICS, type CDOClinic } from '@/lib/admin/data';

export default function ClinicQRCheckInPage() {
  const params = useParams();
  const clinicId = (params?.clinicId as string) || 'clinic-mr-304';

  const defaultClinic =
    INITIAL_CDO_CLINICS.find((c) => c.id === clinicId) || INITIAL_CDO_CLINICS[0];

  const [clinic, setClinic] = React.useState<CDOClinic>(defaultClinic);
  const [isLoadingClinic, setIsLoadingClinic] = React.useState(false);
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [alternateClinicToday, setAlternateClinicToday] = React.useState<any | null>(null);

  // ISO day: 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 7 = Sun
  const currentIsoDay = React.useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  const DAY_NAMES: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  };

  const todayDayName = DAY_NAMES[currentIsoDay] || 'Today';

  // Check if this room has active consultation hours today
  const isOpenToday = React.useMemo(() => {
    if (!schedules || schedules.length === 0) {
      return clinic.status === 'OPTIMAL';
    }
    return schedules.some((s) => s.day_of_week === currentIsoDay && s.is_active !== false);
  }, [schedules, currentIsoDay, clinic.status]);

  // Compute next available session in this room
  const nextSessionText = React.useMemo(() => {
    if (!schedules || schedules.length === 0) return null;
    const sorted = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week);
    let nextSched = sorted.find((s) => s.day_of_week > currentIsoDay && s.is_active !== false);
    if (!nextSched) {
      nextSched = sorted.find((s) => s.is_active !== false) || sorted[0];
    }
    if (!nextSched) return null;
    const dayLabel = DAY_NAMES[nextSched.day_of_week];
    const isTomorrow = ((currentIsoDay % 7) + 1) === nextSched.day_of_week;
    const startTimeFormatted = nextSched.start_time ? nextSched.start_time.slice(0, 5) : '08:30';
    return `${isTomorrow ? 'Tomorrow (' + dayLabel + ')' : dayLabel} at ${startTimeFormatted}`;
  }, [schedules, currentIsoDay]);

  // Attempt to fetch live clinic data from database if available
  React.useEffect(() => {
    let isMounted = true;
    async function loadLiveClinic() {
      if (!clinicId) return;
      setIsLoadingClinic(true);
      try {
        const res = await fetch(`/api/admin/clinics?id=${encodeURIComponent(clinicId)}`);
        if (res.ok) {
          const json = await res.json();
          const row = json.clinic || json.data;
          if (row && isMounted) {
            const docSchedules = row.doctor_clinic_schedules || [];
            setSchedules(docSchedules);

            const primarySchedule = docSchedules[0];
            const doctor = primarySchedule?.doctors;
            const profile = doctor?.profiles;
            const doctorName = profile?.full_name
              ? `${doctor?.title ? doctor.title + ' ' : 'Dr. '}${profile.full_name}`
              : defaultClinic.activeDoctor;

            const activeSession = row.queue_sessions?.[0];

            // Check if doctor has an alternate clinic session on today's day of week
            const allDoctorSchedules = doctor?.doctor_clinic_schedules || [];
            const jsDay = new Date().getDay();
            const currentDay = jsDay === 0 ? 7 : jsDay;
            const altToday = allDoctorSchedules.find(
              (s: any) => s.clinic_id !== row.id && s.day_of_week === currentDay && s.is_active !== false
            );
            setAlternateClinicToday(altToday || null);

            setClinic({
              ...defaultClinic,
              id: row.id,
              name: row.name || defaultClinic.name,
              hospital: row.hospitals?.short_name || row.hospitals?.name || row.hospital_name || defaultClinic.hospital,
              building: row.building_name || defaultClinic.building,
              floor: row.floor_number || defaultClinic.floor,
              room: row.room_number ? (row.room_number.startsWith('Room') || row.room_number.startsWith('Suite') ? row.room_number : `Room ${row.room_number}`) : defaultClinic.room,
              activeDoctor: doctorName,
              doctorSpecialty: doctor?.specialty || defaultClinic.doctorSpecialty,
              servingNumber: activeSession?.current_serving_number || defaultClinic.servingNumber || 1,
              patientsWaiting: defaultClinic.patientsWaiting ?? 3,
              averageConsultationMin: defaultClinic.averageConsultationMin || 15,
              operatingHours: row.operating_hours || defaultClinic.operatingHours,
              status: row.status === 'ACTIVE' ? 'OPTIMAL' : 'PAUSED',
              contactNumber: row.contact_phone || row.hospitals?.contact_phone || defaultClinic.contactNumber,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load clinic by ID, using default:', err);
      } finally {
        if (isMounted) setIsLoadingClinic(false);
      }
    }
    loadLiveClinic();
    return () => {
      isMounted = false;
    };
  }, [clinicId]);

  const [mode, setMode] = React.useState<'MENU' | 'ONLINE_CHECKIN' | 'WALKIN_REGISTER' | 'SUCCESS_ONLINE' | 'SUCCESS_WALKIN'>('MENU');

  // Online Check-in State
  const [tokenInput, setTokenInput] = React.useState('');
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [verifiedToken, setVerifiedToken] = React.useState('');

  // Walk-in Registration State
  const [walkinName, setWalkinName] = React.useState('');
  const [walkinPhone, setWalkinPhone] = React.useState('');
  const [priorityCategory, setPriorityCategory] = React.useState<'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT'>('NONE');
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [checkinError, setCheckinError] = React.useState<string | null>(null);
  const [walkinError, setWalkinError] = React.useState<string | null>(null);
  const [generatedWalkinToken, setGeneratedWalkinToken] = React.useState<{
    tokenCode: string;
    queueNumber: number;
    patientName: string;
    estimatedWaitMins: number;
    priority: string;
  } | null>(null);

  const handleConfirmOnlineArrival = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setCheckinError('Please enter your Token Code (e.g. CN-ON001) or Mobile Number.');
      return;
    }
    setCheckinError(null);

    setIsCheckingIn(true);
    setTimeout(() => {
      setIsCheckingIn(false);
      const code = tokenInput.trim().toUpperCase();
      setVerifiedToken(code.startsWith('CN-') ? code : `CN-ON00${Math.floor(Math.random() * 8) + 1}`);
      setMode('SUCCESS_ONLINE');
    }, 700);
  };

  const handleRegisterWalkIn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOpenToday) {
      setWalkinError(`Registration is closed today. ${clinic.activeDoctor} is scheduled in this room on ${clinic.operatingHours}.`);
      return;
    }

    if (!walkinName.trim()) {
      setWalkinError('Please enter your full name.');
      return;
    }
    if (!walkinPhone.trim()) {
      setWalkinError('Please enter your mobile phone number to receive turn alerts.');
      return;
    }
    setWalkinError(null);

    setIsRegistering(true);
    setTimeout(() => {
      setIsRegistering(false);
      const nextQueueNumber = (clinic.servingNumber || 4) + (clinic.patientsWaiting || 10) * 2;
      const formattedToken = `CN-WK${String(nextQueueNumber).padStart(3, '0')}`;
      
      setGeneratedWalkinToken({
        tokenCode: formattedToken,
        queueNumber: nextQueueNumber,
        patientName: walkinName.trim(),
        estimatedWaitMins: (clinic.patientsWaiting + 1) * clinic.averageConsultationMin,
        priority: priorityCategory,
      });

      setMode('SUCCESS_WALKIN');
    }, 800);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between"
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* 1. Header Banner */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold text-xs">
              CN
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 leading-tight">Clinic Natin</p>
              <p className="text-[10px] text-slate-500 font-medium">Self-Service Clinic Check-In</p>
            </div>
          </div>

          {isOpenToday ? (
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Clinic Queue
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Clinic Closed Today
            </Badge>
          )}
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Clinic Identity & Real-Time Status Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200 mb-1">
                  {clinic.hospital}
                </Badge>
                <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                  {clinic.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-0.5">
                  {clinic.room} &bull; {clinic.building}
                </CardDescription>
              </div>
            </div>
            <p className="text-xs font-semibold text-brand-700 mt-1">
              {clinic.activeDoctor} ({clinic.doctorSpecialty})
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-2">
            {/* Live Queue Pulse Bar */}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-center">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Now Serving</p>
                <p className="text-lg font-bold text-brand-700">#{clinic.servingNumber}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Waiting</p>
                <p className="text-lg font-bold text-slate-900">{clinic.patientsWaiting}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg Consult</p>
                <p className="text-lg font-bold text-slate-900">{clinic.averageConsultationMin}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Off-Day Clinical Alert Banner */}
        {!isOpenToday && (
          <div className="space-y-3">
            <Alert variant="destructive" className="bg-amber-50/80 border-amber-300 text-amber-950 p-4">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  No Consultations Today in {clinic.room}
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 space-y-1.5 text-amber-800">
                  <p>
                    <strong>{clinic.activeDoctor}</strong> does not hold clinic hours in {clinic.room} ({clinic.hospital}) on <strong>{todayDayName}s</strong>.
                  </p>
                  <p className="font-semibold text-amber-900">
                    Official consultation schedule in this room: {clinic.operatingHours}
                  </p>
                  {nextSessionText && (
                    <div className="text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-lg font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      <span>Next Session in this room: <strong>{nextSessionText}</strong></span>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>

            {/* Cross-Hospital Alternate Location Recommendation */}
            {alternateClinicToday && (
              <div className="rounded-2xl border-2 border-brand-300 bg-brand-50/70 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-brand-900">
                  <Sparkles className="h-4 w-4 text-brand-700 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Physician Active at Alternate Hospital Today
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>{clinic.activeDoctor}</strong> is holding clinic consultations today ({todayDayName}) at:
                </p>
                <div className="bg-white rounded-xl p-3.5 border border-brand-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="text-[9px] bg-brand-50 text-brand-800 border-brand-200 font-bold mb-0.5">
                      {alternateClinicToday.clinics?.hospital_name || 'Partner Hospital'}
                    </Badge>
                    <p className="text-xs font-black text-slate-900">
                      {alternateClinicToday.clinics?.room_number || 'Consultation Suite'} &bull; {alternateClinicToday.clinics?.name || 'Clinic'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Consultation Hours: {alternateClinicToday.start_time?.slice(0, 5)} – {alternateClinicToday.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  {alternateClinicToday.clinics?.id && (
                    <Link
                      href={`/c/${alternateClinicToday.clinics.id}`}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-brand-700 hover:bg-brand-800 px-3.5 py-2 rounded-xl transition shadow-xs shrink-0"
                    >
                      Check In There <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATE 1: MENU SELECTION ── */}
        {mode === 'MENU' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-700 text-center uppercase tracking-wider">
              Please choose an option:
            </p>

            {/* Option A: Online Booking Arrival */}
            <button
              type="button"
              onClick={() => setMode('ONLINE_CHECKIN')}
              className="w-full text-left rounded-2xl border border-brand-200 bg-white p-4 shadow-xs hover:border-brand-700 hover:shadow-md transition active:scale-[0.99] group"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0 border border-brand-200 group-hover:bg-brand-700 group-hover:text-white transition">
                  <Ticket className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition">
                      I have an Online Booking
                    </p>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-700 group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirm you have arrived at the hospital so the doctor knows you are waiting.
                  </p>
                </div>
              </div>
            </button>

            {/* Option B: Walk-In Registration */}
            <button
              type="button"
              disabled={!isOpenToday}
              onClick={() => isOpenToday && setMode('WALKIN_REGISTER')}
              className={`w-full text-left rounded-2xl border p-4 transition ${
                isOpenToday
                  ? 'border-blue-200 bg-white shadow-xs hover:border-blue-600 hover:shadow-md active:scale-[0.99] group'
                  : 'border-slate-200 bg-slate-100/80 cursor-not-allowed opacity-75'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition ${
                    isOpenToday
                      ? 'bg-blue-50 text-blue-700 border-blue-200 group-hover:bg-blue-600 group-hover:text-white'
                      : 'bg-slate-200 text-slate-400 border-slate-300'
                  }`}
                >
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-bold ${
                        isOpenToday
                          ? 'text-slate-900 group-hover:text-blue-700'
                          : 'text-slate-500'
                      }`}
                    >
                      I am a Walk-In Patient
                    </p>
                    {isOpenToday ? (
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
                    ) : (
                      <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 border-rose-200 font-bold">
                        Closed Today
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isOpenToday
                      ? 'Get your live digital queue number on your phone. No physical line needed.'
                      : `Walk-in registration is unavailable today because ${clinic.activeDoctor} does not hold clinic hours here on ${todayDayName}s.`}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── STATE 2: ONLINE CHECK-IN FORM ── */}
        {mode === 'ONLINE_CHECKIN' && (
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Ticket className="h-4 w-4 text-brand-700" />
                Confirm Online Booking Arrival
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enter your Token Code (e.g. CN-ON001) or the Philippine mobile number you registered with.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {checkinError && (
                <Alert variant="destructive" className="py-2 mb-3">
                  <AlertDescription className="text-xs">{checkinError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleConfirmOnlineArrival} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Token Code or Mobile Number
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. CN-ON001 or 0917XXXXXXX"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="text-sm bg-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setMode('MENU'); setCheckinError(null); }}
                    className="w-1/3 text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="brand"
                    size="sm"
                    disabled={isCheckingIn}
                    className="w-2/3 text-xs font-bold"
                  >
                    {isCheckingIn ? 'Checking In...' : "Confirm Arrival (I'm Here)"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── STATE 3: WALKIN REGISTRATION FORM ── */}
        {mode === 'WALKIN_REGISTER' && (
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-blue-700" />
                Get Walk-In Queue Token
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                You will receive a digital queue number and automatic SMS alerts when your turn is near.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {walkinError && (
                <Alert variant="destructive" className="py-2 mb-3">
                  <AlertDescription className="text-xs">{walkinError}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleRegisterWalkIn} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Juan dela Cruz"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    required
                    placeholder="0917XXXXXXX or +639XXXXXXXXX"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="text-xs bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">We will text you when 2 patients are ahead.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Statutory Priority Classification
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={priorityCategory === 'NONE' ? 'brand' : 'outline'}
                      onClick={() => setPriorityCategory('NONE')}
                      className="text-[11px] font-semibold h-8"
                    >
                      Regular
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={priorityCategory === 'SENIOR' ? 'brand' : 'outline'}
                      onClick={() => setPriorityCategory('SENIOR')}
                      className="text-[11px] font-semibold h-8 gap-1 text-amber-900 border-amber-300"
                    >
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      Senior (20% Off)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={priorityCategory === 'PWD' ? 'brand' : 'outline'}
                      onClick={() => setPriorityCategory('PWD')}
                      className="text-[11px] font-semibold h-8 gap-1 text-blue-900 border-blue-300"
                    >
                      <Accessibility className="h-3 w-3 text-blue-600" />
                      PWD (20% Off)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={priorityCategory === 'PREGNANT' ? 'brand' : 'outline'}
                      onClick={() => setPriorityCategory('PREGNANT')}
                      className="text-[11px] font-semibold h-8 gap-1 text-rose-900 border-rose-300"
                    >
                      <Baby className="h-3 w-3 text-rose-600" />
                      Maternal Priority
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMode('MENU')}
                    className="w-1/3 text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="brand"
                    size="sm"
                    disabled={isRegistering}
                    className="w-2/3 text-xs font-bold"
                  >
                    {isRegistering ? 'Generating Token...' : 'Get Walk-In Number'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── STATE 4: SUCCESS ONLINE ARRIVAL CONFIRMATION ── */}
        {mode === 'SUCCESS_ONLINE' && (
          <Card className="bg-white border-emerald-200 shadow-sm text-center p-6 space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold mb-1">
                Arrival Confirmed
              </Badge>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                You&apos;re Checked In!
              </h2>
              <p className="font-mono text-lg font-bold text-brand-700 mt-0.5">
                Token #{verifiedToken}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 text-left space-y-1">
              <p>Doctor: <strong>{clinic.activeDoctor}</strong></p>
              <p>Location: <strong>{clinic.room}, {clinic.hospital}</strong></p>
              <p className="text-emerald-700 font-semibold pt-1">
                &bull; Status updated to WAITING on the clinic screen.
              </p>
            </div>

            <p className="text-xs text-slate-500">
              Please take a seat in the waiting area. You will receive an SMS when 2 patients are ahead of you.
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('MENU')}
              className="w-full text-xs font-semibold"
            >
              Done
            </Button>
          </Card>
        )}

        {/* ── STATE 5: SUCCESS WALKIN TOKEN PASS ── */}
        {mode === 'SUCCESS_WALKIN' && generatedWalkinToken && (
          <Card className="bg-white border-brand-200 shadow-md text-center p-6 space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center">
              <Ticket className="h-6 w-6" />
            </div>

            <div>
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 font-bold mb-1">
                Walk-In Token Generated
              </Badge>
              <p className="text-xs text-slate-500">Your Official Queue Number</p>
              <h2 className="text-3xl font-black text-brand-700 tracking-tight font-mono mt-1">
                {generatedWalkinToken.tokenCode}
              </h2>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {generatedWalkinToken.patientName}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 text-left space-y-1.5">
              <div className="flex justify-between">
                <span>Clinic Room:</span>
                <strong className="text-slate-900">{clinic.room}</strong>
              </div>
              <div className="flex justify-between">
                <span>Attending Doctor:</span>
                <strong className="text-slate-900">{clinic.activeDoctor}</strong>
              </div>
              <div className="flex justify-between">
                <span>Estimated Wait:</span>
                <strong className="text-brand-700 font-bold">~{generatedWalkinToken.estimatedWaitMins} mins</strong>
              </div>
              {generatedWalkinToken.priority !== 'NONE' && (
                <div className="flex justify-between pt-1 border-t border-slate-200 text-amber-800">
                  <span>Priority Category:</span>
                  <strong className="font-bold">{generatedWalkinToken.priority} (20% Discount)</strong>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-950 text-left flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                SMS confirmation queued. You can safely wait in the cafeteria or lobby; we will text you when 2 patients are ahead.
              </span>
            </div>

            <Button
              variant="brand"
              size="sm"
              onClick={() => setMode('MENU')}
              className="w-full text-xs font-bold"
            >
              Done / Back to Home
            </Button>
          </Card>
        )}
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-1 text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-700" />
          <span>Clinic Natin &bull; Compliant with Philippine RA 10173</span>
        </div>
      </footer>
    </div>
  );
}
