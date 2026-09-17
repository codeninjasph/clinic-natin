'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Stethoscope,
  Users,
  FolderOpen,
  CalendarDays,
  TrendingUp,
  Settings2,
  LogOut,
  Building2,
  Crown,
  Lock,
  Sparkles,
  ShieldCheck,
  Check,
  Pill,
  Pause,
  Play,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { DoctorProvider, useDoctor, type ClinicRoom } from './doctor-context';

// ──────────────────────────────────────────────────────────────────────────────
// Navigation items
// ──────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/doctor/dashboard', label: 'Consultation Cockpit', icon: Stethoscope },
  { href: '/doctor/rx', label: 'Digital Rx Pad', icon: Pill },
  { href: '/doctor/queue', label: "Today's Queue", icon: Users },
  { href: '/doctor/patients', label: 'Patient Directory', icon: FolderOpen },
  { href: '/doctor/schedule', label: 'My Schedule', icon: CalendarDays },
  { href: '/doctor/analytics', label: 'Practice Analytics', icon: TrendingUp },
  { href: '/doctor/settings', label: 'Credentials & Settings', icon: Settings2 },
];

function DoctorLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    doctor,
    clinicRooms,
    selectedRoom,
    setSelectedRoom,
    activeSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
  } = useDoctor();

  // Authorization state
  const [isAuthorizing, setIsAuthorizing] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  // Multi-clinic & subscription state
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);

  // Session management state (Pause / Rounds / End Day)
  const [showPauseDialog, setShowPauseDialog] = React.useState(false);
  const [showEndDialog, setShowEndDialog] = React.useState(false);
  const [pauseReason, setPauseReason] = React.useState(
    'Doctor on urgent hospital rounds / checking on confined patient'
  );
  const [notifySMS, setNotifySMS] = React.useState(true);
  const [isEmergencyEnd, setIsEmergencyEnd] = React.useState(false);
  const [isProcessingSession, setIsProcessingSession] = React.useState(false);

  const handleStartSession = async () => {
    setIsProcessingSession(true);
    await startSession();
    setIsProcessingSession(false);
  };

  const handleConfirmPause = async () => {
    setIsProcessingSession(true);
    await pauseSession(pauseReason, notifySMS);
    setIsProcessingSession(false);
    setShowPauseDialog(false);
  };

  const handleResumeSession = async () => {
    setIsProcessingSession(true);
    await resumeSession();
    setIsProcessingSession(false);
  };

  const handleConfirmEndSession = async () => {
    setIsProcessingSession(true);
    await endSession(isEmergencyEnd, notifySMS);
    setIsProcessingSession(false);
    setShowEndDialog(false);
  };

  // ── Dual-verification auth guard (cookie + Supabase — mirrors cnadmin pattern) ──
  React.useEffect(() => {
    let isMounted = true;

    const verifyDoctorAccess = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const roleCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('clinic_natin_role='))
          ?.split('=')[1];
        const demoRole = localStorage.getItem('clinic_natin_demo_role');
        const demoUserStr = localStorage.getItem('clinic_natin_demo_user');

        let verifiedDoctor = false;

        // 1. Live Supabase user check
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('auth_id', user.id)
            .maybeSingle();

          const role =
            profile?.role || (user.user_metadata?.role as string) || roleCookie;

          if (role === 'DOCTOR') {
            verifiedDoctor = true;
            const fullName =
              profile?.full_name ||
              user.user_metadata?.full_name ||
              'Dr. Maria Santos';
            const initials = fullName
              .split(' ')
              .filter(Boolean)
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();
          }
        }

        // 2. Demo / cookie session fallback
        if (!verifiedDoctor && (demoRole === 'DOCTOR' || roleCookie === 'DOCTOR')) {
          verifiedDoctor = true;
        }

        if (!isMounted) return;

        if (verifiedDoctor) {
          setIsAuthorized(true);
          setIsAuthorizing(false);
        } else {
          // Redirect to the appropriate portal
          const effectiveRole = roleCookie || demoRole;
          if (effectiveRole === 'ADMIN') {
            router.replace('/cnadmin?unauthorized=1');
          } else if (effectiveRole === 'SECRETARY') {
            router.replace('/secretary/dashboard?unauthorized=1');
          } else if (effectiveRole === 'PATIENT') {
            router.replace('/my-queue?unauthorized=1');
          } else {
            router.replace(
              `/login?returnUrl=${encodeURIComponent(pathname)}&unauthorized=1`
            );
          }
        }
      } catch {
        if (isMounted) {
          router.replace(
            `/login?returnUrl=${encodeURIComponent(pathname)}&unauthorized=1`
          );
        }
      }
    };

    verifyDoctorAccess();
    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleRoomSelect = (room: ClinicRoom) => {
    if (subscriptionTier === 'free' && !room.isPrimary) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedRoom(room);
  };

  const handleUpgrade = () => {
    localStorage.setItem('doctor_subscription_tier', 'pro');
    setShowUpgradeModal(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
    document.cookie = 'clinic_natin_role=; path=/; max-age=0';
    localStorage.removeItem('clinic_natin_demo_role');
    localStorage.removeItem('clinic_natin_demo_user');
    localStorage.removeItem('doctor_selected_room');
    localStorage.removeItem('doctor_subscription_tier');
    router.push('/login');
  };

  const doctorName = doctor?.name || 'Dr. Maria Santos, MD';
  const doctorSpecialty = doctor?.specialty || 'Pediatrics / General Practice';
  const doctorInitials = doctorName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const subscriptionTier = doctor?.subscriptionTier || 'pro';

  // ── Authorization loading screen ──────────────────────────────────────────
  if (isAuthorizing || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand-700/20 border border-brand-700/40 flex items-center justify-center mb-4 shadow-lg animate-pulse">
          <Stethoscope className="h-7 w-7 text-brand-300" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white mb-1">
          Clinic Natin Doctor Suite
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mb-4">
          Verifying physician credentials and RA 10173 session compliance...
        </p>
        <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-700 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  // ── Main Portal Shell ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">

      {/* ── Sticky Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-5">

          {/* Left: Logo + brand */}
          <div className="flex items-center gap-3">
            <Link href="/doctor/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-brand-700 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 tracking-tight">
                    Clinic Natin
                  </span>
                  <Badge variant="brand" className="text-[10px] px-2">
                    Doctor Suite
                  </Badge>
                  {doctor && (!doctor.isVerified || doctor.verificationStatus === 'PENDING') && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 bg-amber-50 text-amber-800 font-semibold">
                      Pending Review
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                  {selectedRoom ? `${selectedRoom.hospital} · ${selectedRoom.room}` : 'Outpatient Clinic'}
                </p>
              </div>
            </Link>
          </div>

          {/* Center: Live telemetry & Session Controls */}
          <div className="hidden md:flex items-center gap-2">
            {activeSession ? (
              activeSession.status === 'PAUSED' ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Paused (On Rounds)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResumeSession}
                    disabled={isProcessingSession}
                    className="h-7 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 gap-1.5 px-2.5 rounded-lg"
                    title="Resume active patient consultation queue"
                  >
                    <Play className="h-3 w-3 fill-emerald-700" />
                    Resume Session
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEmergencyEnd(false);
                      setShowEndDialog(true);
                    }}
                    disabled={isProcessingSession}
                    className="h-7 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border-red-200 gap-1.5 px-2.5 rounded-lg"
                    title="Conclude clinic session for today"
                  >
                    <XCircle className="h-3 w-3" />
                    End Session
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Session Active (Serving #{activeSession.current_serving_number})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPauseDialog(true)}
                    disabled={isProcessingSession}
                    title="Pause queue to check on confined patient or attend hospital rounds"
                    className="h-7 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 gap-1.5 px-2.5 rounded-lg"
                  >
                    <Pause className="h-3 w-3" />
                    Pause (Rounds)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEmergencyEnd(false);
                      setShowEndDialog(true);
                    }}
                    disabled={isProcessingSession}
                    title="Conclude clinic session for today"
                    className="h-7 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200 gap-1.5 px-2.5 rounded-lg"
                  >
                    <XCircle className="h-3 w-3" />
                    End Session
                  </Button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>No Active Session</span>
                </div>
                {selectedRoom && (
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={handleStartSession}
                    disabled={isProcessingSession}
                    className="h-7 text-xs font-semibold gap-1.5 px-2.5 rounded-lg shadow-xs"
                    title={`Open consultation session at ${selectedRoom.clinicName}`}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Start Session
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              <CalendarDays className="h-3 w-3 text-slate-400" />
              <span>{selectedRoom?.schedule || 'Consultation Schedule'}</span>
            </div>
          </div>

          {/* Right: actions + doctor profile */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-xs text-slate-600 hidden sm:inline-flex gap-1.5"
            >
              <Link href="/secretary/dashboard">
                <Users className="h-3.5 w-3.5" />
                Secretary Desk
              </Link>
            </Button>

            <Separator orientation="vertical" className="h-5 hidden sm:block" />

            {/* Doctor profile pill */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <div className="h-7 w-7 rounded-lg bg-brand-700 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {doctorInitials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {doctorName}
                </p>
                <p className="text-[10px] text-brand-700 font-semibold leading-tight">
                  {doctorSpecialty}
                </p>
              </div>
              {subscriptionTier === 'pro' && (
                <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-400 hidden sm:block shrink-0" />
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Sign Out"
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Pending Verification Gatekeeper Banner ────────────────────────── */}
      {doctor && (!doctor.isVerified || doctor.verificationStatus === 'PENDING') && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-50 to-amber-100/30 border-b border-amber-300 px-5 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong>PRC Credential Verification in Progress:</strong> Your medical credentials (PRC #{doctor.prcLicense}) are currently being reviewed by Clinic Natin Operations under <strong>RA 10173</strong> and <strong>FDA Circular No. 2020-007</strong>. Electronic prescription generation and live queue sessions will unlock immediately upon admin validation.
            </p>
          </div>
          <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-900 font-bold shrink-0 self-start sm:self-auto text-[10px]">
            Administrative Review Active
          </Badge>
        </div>
      )}

      {/* ── Layout Body ──────────────────────────────────────────────────── */}
      <div className="flex min-h-[calc(100vh-3.5rem)]">

        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4 flex flex-col gap-0">

          {/* Navigation */}
          <div className="space-y-0.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Navigation
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/doctor/dashboard'
                  ? pathname === '/doctor/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <Separator className="my-4" />

          {/* Clinic room selector */}
          <div className="space-y-1">
            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              Clinic Rooms
            </p>
            {clinicRooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id || selectedRoom?.clinicId === room.clinicId;
              const isLocked = subscriptionTier === 'free' && !room.isPrimary;
              return (
                <button
                  key={room.id}
                  onClick={() => handleRoomSelect(room)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-all border ${
                    isSelected
                      ? 'bg-brand-50 border-brand-300 text-brand-900'
                      : isLocked
                      ? 'border-slate-100 bg-slate-50/60 text-slate-400 cursor-not-allowed'
                      : 'border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{room.room}</span>
                    {isSelected && (
                      <Check className="h-3 w-3 text-brand-700 shrink-0" />
                    )}
                    {isLocked && (
                      <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                    {room.hospital}
                  </p>
                  <p className="text-[9px] text-slate-400 truncate mt-0.5">
                    {room.schedule}
                  </p>
                </button>
              );
            })}
            {subscriptionTier === 'free' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full mt-1 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition flex items-center gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-amber-600" />
                Unlock Multi-Room (Pro)
              </button>
            )}
          </div>

          {/* Spacer pushes alerts to the bottom */}
          <div className="flex-1" />

          <Separator className="my-4" />

          {/* Subscription tier alert */}
          {subscriptionTier === 'pro' ? (
            <Alert variant="success" className="py-3 text-xs">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">Verified Pro Specialist</AlertTitle>
              <AlertDescription className="text-[11px] text-emerald-700">
                Multi-clinic rooms &amp; longitudinal EMR unlocked.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning" className="py-3 text-xs">
              <Crown className="h-4 w-4" />
              <AlertTitle className="text-xs font-bold">Free Tier Active</AlertTitle>
              <AlertDescription className="text-[11px]">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="underline font-bold text-amber-900 hover:text-amber-950"
                >
                  Upgrade to Pro (₱999/mo)
                </button>{' '}
                for multi-room &amp; full EMR history.
              </AlertDescription>
            </Alert>
          )}
        </aside>

        {/* Main content canvas */}
        <main className="flex-1 p-6 bg-slate-50 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      {/* ── Upgrade to Pro Dialog ────────────────────────────────────────── */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader className="items-center text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Crown className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold">
              Clinic Natin Pro Practice Suite
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Designed for specialists practicing across multiple CDO hospitals
            </DialogDescription>
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 px-5 py-2.5 text-center">
              <span className="text-2xl font-black text-amber-800">₱999</span>
              <span className="text-xs font-semibold text-amber-700"> / month</span>
              <p className="text-[10px] text-amber-600 mt-0.5">
                Less than the fee of 2 consultations!
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 my-4 text-xs">
            {[
              {
                label: 'Unlimited Hospital Clinic Rooms',
                desc: 'Maria Reyna, CUMC, Polymedic, NMMC',
              },
              { label: 'Multiple Secretary Logins', desc: 'One per clinic room' },
              {
                label: 'Full Longitudinal EMR History',
                desc: 'Past visits, BP charts, past Rx across all rooms',
              },
              {
                label: 'Unlimited Lab & Imaging Uploads',
                desc: 'PDF / JPG chart attachments',
              },
              {
                label: 'Verified Specialist Badge',
                desc: 'Top priority in patient directory',
              },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>{f.label}:</strong> {f.desc}
                </span>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpgradeModal(false)}
              className="flex-1 text-xs"
            >
              Continue on Free Tier
            </Button>
            <Button
              size="sm"
              onClick={handleUpgrade}
              className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow"
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade to Pro (₱999)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pause Session Dialog (Hospital Rounds / Confined Patient) ──────── */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Pause className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Pause Queue for Hospital Rounds
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Stepping out to attend to a confined patient, surgical emergency, or ICU round? This notifies waiting patients so they know the estimated delay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Notice to Waiting Patients:
              </label>
              <Textarea
                rows={2}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="text-xs resize-none"
                placeholder="Doctor attending to a confined patient / rounds..."
              />
            </div>

            {/* Quick pre-set pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Attending to confined inpatient (30m)',
                'Urgent hospital rounds / ICU (45m)',
                'Called to OR / emergency procedure',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setPauseReason(reason)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
                >
                  {reason}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifySMS}
                onChange={(e) => setNotifySMS(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-700"
              />
              <span className="text-slate-700 font-medium">
                Dispatch Semaphore SMS alert to all waiting patients
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPauseDialog(false)}
              disabled={isProcessingSession}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmPause}
              disabled={isProcessingSession}
              className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow"
            >
              {isProcessingSession ? 'Pausing...' : 'Confirm Pause & Step Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── End Session Dialog (Normal or Emergency Closure) ────────────────── */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEmergencyEnd ? 'Emergency Clinic Closure' : 'Conclude Clinic Session'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {isEmergencyEnd
                ? 'Called away to an urgent medical emergency or need to close early? Any unserved patients will be notified and flagged for priority rescheduling.'
                : 'Conclude today&apos;s outpatient clinic consultation session for this room.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            {/* Mode selection cards */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsEmergencyEnd(false)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  !isEmergencyEnd
                    ? 'border-brand-700 bg-brand-50/50 text-brand-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="block font-semibold">Normal Finish</span>
                <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                  Clinic finished for the day. All queued patients processed.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsEmergencyEnd(true)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  isEmergencyEnd
                    ? 'border-red-600 bg-red-50 text-red-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="block font-semibold text-red-600">Early / Emergency</span>
                <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                  Leaving early due to emergency, surgery, or hospital call.
                </span>
              </button>
            </div>

            {isEmergencyEnd && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                <p className="text-red-800 font-semibold text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  Remaining unserved queue numbers will be marked as &quot;Emergency Rescheduled&quot;.
                </p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifySMS}
                    onChange={(e) => setNotifySMS(e.target.checked)}
                    className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-600"
                  />
                  <span className="text-red-900 font-medium text-[11px]">
                    Send Semaphore SMS apology and priority reschedule instructions
                  </span>
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEndDialog(false)}
              disabled={isProcessingSession}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmEndSession}
              disabled={isProcessingSession}
              className={`flex-1 text-xs font-bold text-white shadow ${
                isEmergencyEnd ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isProcessingSession
                ? 'Processing...'
                : isEmergencyEnd
                ? 'End Session (Emergency)'
                : 'Conclude Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DoctorProvider>
      <DoctorLayoutInner>{children}</DoctorLayoutInner>
    </DoctorProvider>
  );
}
