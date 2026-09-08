'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  Pill,
  LogOut,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  BellRing,
  Activity,
  UserCheck,
  Building2,
  Crown,
  Lock,
  Sparkles,
  Paperclip,
  Check,
  X,
  History,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

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
  display_name: string;
  booking_channel?: 'ONLINE' | 'WALK_IN';
  patient_id?: string | null;
  created_at: string;
}

interface ClinicRoom {
  id: string;
  hospital: string;
  room: string;
  schedule: string;
  isPrimary: boolean;
}

const CDO_CLINIC_ROOMS: ClinicRoom[] = [
  { id: 'room-1', hospital: 'Maria Reyna XU Hospital', room: 'Room 304', schedule: 'MWF 9:00 AM – 12:00 PM', isPrimary: true },
  { id: 'room-2', hospital: 'Polymedic Medical Plaza', room: 'Room 210', schedule: 'TTh 1:00 PM – 4:00 PM', isPrimary: false },
  { id: 'room-3', hospital: 'Capitol University Medical Center', room: 'Medical Arts 402', schedule: 'Sat 8:00 AM – 11:00 AM', isPrimary: false },
];

export default function DoctorDashboardPage() {
  const [session, setSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'consultation' | 'longitudinal' | 'announcements'>('consultation');
  
  // Subscription Tier State ('free' vs 'pro')
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro'>('pro');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Multi-Clinic Room Selection
  const [selectedRoom, setSelectedRoom] = useState<ClinicRoom>(CDO_CLINIC_ROOMS[0]);

  const [doctorName] = useState('Dr. Maria Santos, MD');
  const [specialty] = useState('Pediatrics / General Practice');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isBroadcastLoading, setIsBroadcastLoading] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'destructive' | 'brand';
    title: string;
    message: string;
  } | null>(null);

  const supabase = createClient();

  const fetchDoctorQueue = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase
        .from('queue_sessions')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData);

        const { data: apptsData } = await supabase
          .from('appointments')
          .select('id, queue_number, token_code, status, priority_category, walk_in_name, patient_id, created_at')
          .eq('queue_session_id', sessionData.id)
          .order('queue_number', { ascending: true });

        if (apptsData) {
          const formatted: Appointment[] = apptsData.map((a) => {
            const isOnline = a.queue_number % 2 === 1;
            return {
              id: a.id,
              queue_number: a.queue_number,
              token_code: a.token_code || (isOnline ? `CN-ON${String(a.queue_number).padStart(3, '0')}` : `CN-WK${String(a.queue_number).padStart(3, '0')}`),
              status: a.status,
              priority_category: a.priority_category || 'NONE',
              display_name: a.walk_in_name || 'Registered Patient',
              booking_channel: isOnline ? 'ONLINE' : 'WALK_IN',
              patient_id: a.patient_id,
              created_at: a.created_at,
            };
          });
          setAppointments(formatted);
        }
      } else {
        // High fidelity fallback for local demonstration
        setSession({
          id: 'mock-session-1',
          status: 'ACTIVE',
          current_serving_number: 2,
          session_date: new Date().toISOString().split('T')[0],
          announcement_notice: 'Doctor is in Room 304. Currently reviewing labs.',
        });
        setAppointments([
          { id: '1', queue_number: 1, token_code: 'CN-ON001', status: 'COMPLETED', priority_category: 'NONE', display_name: 'Juan Dela Cruz', booking_channel: 'ONLINE', created_at: '' },
          { id: '2', queue_number: 2, token_code: 'CN-WK002', status: 'SERVING', priority_category: 'SENIOR', display_name: 'Andres Bonifacio', booking_channel: 'WALK_IN', created_at: '' },
          { id: '3', queue_number: 3, token_code: 'CN-ON003', status: 'WAITING', priority_category: 'NONE', display_name: 'Maria Corazon Aquino', booking_channel: 'ONLINE', created_at: '' },
          { id: '4', queue_number: 4, token_code: 'CN-WK004', status: 'WAITING', priority_category: 'PWD', display_name: 'Apolinario Mabini', booking_channel: 'WALK_IN', created_at: '' },
          { id: '5', queue_number: 5, token_code: 'CN-ON005', status: 'WAITING', priority_category: 'PREGNANT', display_name: 'Gabriela Silang', booking_channel: 'ONLINE', created_at: '' },
        ]);
      }
    } catch (err) {
      console.error('Error loading doctor queue:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDoctorQueue();

    const channel: RealtimeChannel = supabase
      .channel('doctor-dashboard-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_sessions' }, () => {
        fetchDoctorQueue();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchDoctorQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoctorQueue, supabase]);

  const currentlyServing = appointments.find((a) => a.status === 'SERVING');
  const waitingPatients = appointments.filter((a) => a.status === 'WAITING' || a.status === 'BOOKED');
  const nextInLine = waitingPatients[0];

  const handleCallNext = async () => {
    if (!nextInLine || !session) return;
    try {
      setIsSaving(true);

      // Complete current patient if serving
      if (currentlyServing) {
        await supabase
          .from('appointments')
          .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
          .eq('id', currentlyServing.id);
      }

      // Mark next patient as SERVING
      await supabase
        .from('appointments')
        .update({ status: 'SERVING', served_at: new Date().toISOString() })
        .eq('id', nextInLine.id);

      await supabase
        .from('queue_sessions')
        .update({ current_serving_number: nextInLine.queue_number })
        .eq('id', session.id);

      setChiefComplaint('');
      setDiagnosis('');
      setRxNotes('');
      await fetchDoctorQueue();
    } catch (e) {
      console.error('Error calling next patient:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Broadcast announcement via Semaphore SMS endpoint
  const handleSaveAnnouncement = async (minutes: number, customText?: string) => {
    if (!session) return;
    try {
      setIsBroadcastLoading(true);
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
      setSession((prev) => prev ? { ...prev, announcement_notice: data.announcement } : prev);
      setToastNotice({
        type: 'success',
        title: 'Broadcast Dispatched',
        message: `Alerted ${data.smsSent} patients via Semaphore SMS.`,
      });
      setAnnouncementText('');
    } catch (e) {
      console.error('Error broadcasting announcement:', e);
      setToastNotice({
        type: 'destructive',
        title: 'Broadcast Error',
        message: 'Could not broadcast delay notice to queued patients.',
      });
    } finally {
      setIsBroadcastLoading(false);
    }
  };

  const handleRoomSelect = (room: ClinicRoom) => {
    if (subscriptionTier === 'free' && !room.isPrimary) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedRoom(room);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 font-semibold text-brand-700">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Connecting to Clinic Natin Doctor Suite...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-md">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">{doctorName}</span>
                {subscriptionTier === 'pro' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 shadow-xs">
                    <Crown className="h-3 w-3 fill-amber-500 text-amber-600" />
                    Verified Specialist (Pro)
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                    Free Tier (Starter)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{specialty} &bull; {selectedRoom.hospital} {selectedRoom.room}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Tier Demo Switcher */}
            <div className="hidden md:flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setSubscriptionTier('free')}
                className={`rounded-lg px-2.5 py-1 transition ${subscriptionTier === 'free' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'}`}
              >
                Free Tier
              </button>
              <button
                onClick={() => setSubscriptionTier('pro')}
                className={`rounded-lg px-2.5 py-1 transition flex items-center gap-1 ${subscriptionTier === 'pro' ? 'bg-brand-700 text-white shadow-xs font-bold' : 'text-slate-500'}`}
              >
                <Crown className="h-3 w-3" />
                Pro (₱999)
              </button>
            </div>

            <Link
              href="/secretary/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Secretary Desk
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Link>
          </div>
        </div>

        {/* Multi-Clinic Room Switcher Bar */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
                <Building2 className="h-3.5 w-3.5 text-slate-500" /> Clinic Room:
              </span>
              {CDO_CLINIC_ROOMS.map((room) => {
                const isSelected = selectedRoom.id === room.id;
                const isLocked = subscriptionTier === 'free' && !room.isPrimary;
                return (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className={`shrink-0 rounded-xl px-3 py-1 text-xs font-semibold flex items-center gap-1.5 transition border ${
                      isSelected
                        ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                        : isLocked
                        ? 'bg-slate-100/80 text-slate-400 border-slate-200 hover:border-slate-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{room.hospital} ({room.room})</span>
                    {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                  </button>
                );
              })}
              {subscriptionTier === 'free' && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="shrink-0 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  Unlock Multi-Room (Pro)
                </button>
              )}
            </div>

            <span className="text-[11px] font-medium text-slate-500 hidden lg:inline">
              Active Schedule: {selectedRoom.schedule}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {toastNotice && (
          <Alert
            variant={toastNotice.type === 'destructive' ? 'destructive' : toastNotice.type === 'brand' ? 'brand' : 'success'}
            className="mb-6 shadow-xs"
          >
            <div className="flex items-start justify-between w-full">
              <div>
                <AlertTitle className="font-bold">{toastNotice.title}</AlertTitle>
                <AlertDescription className="text-xs">{toastNotice.message}</AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setToastNotice(null)}
                className="text-xs text-slate-500 hover:text-slate-900 ml-4 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        )}

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-6">
          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Now Serving</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-700">
                #{session?.current_serving_number || '\u2014'}
              </span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waiting in Line</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{waitingPatients.length}</span>
              <span className="text-xs text-slate-500 font-medium">interleaved patients</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Today</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">
                {appointments.filter((a) => a.status === 'COMPLETED').length}
              </span>
              <span className="text-xs text-slate-500 font-medium">consultations</span>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-300/40 bg-brand-50/60 p-4 shadow-sm flex flex-col justify-between">
            <p className="text-xs font-bold text-brand-700 uppercase tracking-wider">Next in Line</p>
            <div className="mt-1 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="font-bold text-slate-800 text-sm truncate">{waitingPatients[0]?.display_name || 'None'}</p>
                <p className="text-xs text-brand-700 font-medium">{waitingPatients[0]?.token_code || '\u2014'}</p>
              </div>
              <button
                onClick={handleCallNext}
                disabled={waitingPatients.length === 0 || isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700/90 disabled:opacity-50 shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Call Next
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Active Consultation Area (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-3xl border border-brand-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Active Consultation</h3>
                    <p className="text-xs text-slate-500">
                      Patient currently inside {selectedRoom.hospital} {selectedRoom.room}
                    </p>
                  </div>
                </div>
                {currentlyServing && (
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold ring-1 ring-emerald-200">
                    #{currentlyServing.queue_number} &bull; {currentlyServing.token_code}
                  </span>
                )}
              </div>

              {/* Consultation Navigation Tabs */}
              <div className="flex gap-2 border-b border-slate-100 pb-3 mb-4">
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === 'consultation'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Current Encounter (Vitals & Rx)
                </button>
                <button
                  onClick={() => setActiveTab('longitudinal')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'longitudinal'
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  Longitudinal Medical History
                  {subscriptionTier === 'free' && <Lock className="h-3 w-3 text-amber-500" />}
                </button>
              </div>

              {activeTab === 'consultation' ? (
                currentlyServing ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-lg font-black text-slate-900">{currentlyServing.display_name}</p>
                          <p className="text-xs text-slate-500">
                            {currentlyServing.booking_channel === 'ONLINE' ? 'Online Reservation (₱50 GCash Paid)' : 'Walk-in Registered at Desk'} &bull; PhilHealth / HMO Covered
                          </p>
                        </div>
                        {currentlyServing.priority_category !== 'NONE' && (
                          <span className="rounded-lg bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold">
                            {currentlyServing.priority_category} (20% Off)
                          </span>
                        )}
                      </div>

                      {/* Triage Vitals Bar */}
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-center">
                        <div className="rounded-xl bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block">BP</span>
                          <span className="text-xs font-black text-slate-800">120/80</span>
                        </div>
                        <div className="rounded-xl bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block">PULSE</span>
                          <span className="text-xs font-black text-slate-800">76 bpm</span>
                        </div>
                        <div className="rounded-xl bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block">TEMP</span>
                          <span className="text-xs font-black text-slate-800">36.6 °C</span>
                        </div>
                        <div className="rounded-xl bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block">BMI</span>
                          <span className="text-xs font-black text-emerald-700">22.4 Normal</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Chief Complaint
                        </label>
                        <input
                          type="text"
                          value={chiefComplaint}
                          onChange={(e) => setChiefComplaint(e.target.value)}
                          placeholder="e.g., Fever for 3 days, cough, body aches"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Doctor Diagnosis & Clinical Impression
                        </label>
                        <textarea
                          rows={2}
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          placeholder="e.g., Acute Upper Respiratory Tract Infection (URTI) with bronchospasm"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Digital Prescription Pad (℞) & Regimen
                        </label>
                        <textarea
                          rows={3}
                          value={rxNotes}
                          onChange={(e) => setRxNotes(e.target.value)}
                          placeholder="1. Amoxicillin 500mg cap #21 - 1 cap TID x 7 days&#10;2. Paracetamol 500mg tab #10 - 1 tab Q4h PRN fever"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-xs focus:border-brand-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleCallNext}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700/90 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Save Consultation & Call Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">No active patient in consultation.</p>
                    <p className="text-xs mt-1">Click &quot;Call Next&quot; to bring in the next patient.</p>
                  </div>
                )
              ) : (
                /* Tab 2: Longitudinal History (Pro Gated) */
                subscriptionTier === 'pro' ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold text-emerald-900">Longitudinal EMR Enabled</span>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700">3 Past Encounters Found</span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 space-y-3">
                      <div className="pt-3">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">Encounter: Oct 14, 2025 (Maria Reyna 304)</span>
                          <span className="text-slate-500">Dr. Maria Santos</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">Diagnosis: Acute Bronchitis. Vitals: BP 122/80, HR 80 bpm.</p>
                        <p className="text-[11px] font-mono text-brand-700 mt-0.5">Rx: Co-Amoxiclav 625mg BID x 7 days</p>
                      </div>
                      <div className="pt-3">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">Encounter: June 22, 2025 (Polymedic Plaza 210)</span>
                          <span className="text-slate-500">Dr. Maria Santos</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">Diagnosis: Routine Annual Checkup. Normal ECG.</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-blue-600">
                          <Paperclip className="h-3 w-3" />
                          <span>Attached: Complete_Blood_Count_Lab.pdf</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Locked State in Free Tier */
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Longitudinal EMR & Chart History Locked</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                        In the Free Tier, patient charts are accessible during the active session. Upgrade to <strong>Clinic Natin Pro (₱999/mo)</strong> to view historical encounters, blood pressure progression charts, and lab attachments across all your hospital rooms.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Upgrade to Pro (Less than 2 consults!)
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Delay & Announcement Broadcast Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BellRing className="h-4 w-4 text-amber-500" />
                <h4 className="font-bold text-slate-800 text-sm">Emergency Delay Broadcast (Semaphore SMS)</h4>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Held up in surgery or hospital rounds? 1-tap dispatch alerts waiting patients and updates their turn tracker.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => handleSaveAnnouncement(15, 'Doctor is on urgent hospital rounds')}
                  disabled={isBroadcastLoading}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  ⏱️ +15m Rounds
                </button>
                <button
                  onClick={() => handleSaveAnnouncement(30, 'Doctor is in emergency surgery')}
                  disabled={isBroadcastLoading}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  🚨 +30m Surgery
                </button>
                <button
                  onClick={() => handleSaveAnnouncement(45, 'Doctor held in traffic across Marcos Bridge')}
                  disabled={isBroadcastLoading}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  🚗 +45m Traffic
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Or type custom announcement to waiting patients..."
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-brand-700 focus:outline-none"
                />
                <button
                  onClick={() => handleSaveAnnouncement(30, announcementText)}
                  disabled={isBroadcastLoading || !announcementText.trim()}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition disabled:opacity-50"
                >
                  {isBroadcastLoading ? 'Sending…' : 'Broadcast'}
                </button>
              </div>

              {session?.announcement_notice && (
                <div className="mt-3 rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-xs text-amber-800 flex justify-between items-center">
                  <span>Current Broadcast: <strong>{session.announcement_notice}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Real-time Waiting List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Today&apos;s Interleaved Queue</h4>
                  <p className="text-xs text-slate-500">Alternating Online & Walk-in Lineup</p>
                </div>
                <button
                  onClick={fetchDoctorQueue}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50"
                  title="Refresh Queue"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto pr-1 space-y-1">
                {appointments.map((appt) => (
                  <div key={appt.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          appt.status === 'SERVING'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : appt.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-400 line-through'
                            : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        #{appt.queue_number}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${appt.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {appt.display_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">{appt.token_code}</span>
                          {appt.queue_number % 2 === 1 ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">Online</span>
                          ) : (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 rounded">Walk-in</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          appt.status === 'SERVING'
                            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                            : appt.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {appt.status}
                      </span>
                      {appt.priority_category !== 'NONE' && (
                        <p className="text-[9px] font-bold text-amber-600 mt-0.5">{appt.priority_category}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade to Pro Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-amber-200">
            <div className="mb-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-3 shadow-inner">
                <Crown className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Clinic Natin Pro Practice Suite</h3>
              <p className="text-xs text-slate-500 mt-1">
                Designed for specialists practicing across multiple CDO hospitals
              </p>
              <div className="mt-3 inline-block rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-2 border border-amber-200">
                <span className="text-2xl font-black text-amber-800">₱999</span>
                <span className="text-xs font-semibold text-amber-700"> / month</span>
                <p className="text-[10px] text-amber-600 font-medium">Less than the fee of 2 consultations!</p>
              </div>
            </div>

            <div className="space-y-2.5 my-5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Unlimited Hospital Clinic Rooms:</strong> Maria Reyna, CUMC, Polymedic</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Multiple Secretary Logins:</strong> One per clinic room</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Full Longitudinal EMR History:</strong> Past visits, BP charts, past Rx</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Unlimited Lab & Imaging Uploads:</strong> PDF / JPG chart attachments</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Verified Specialist Badge:</strong> Top priority in patient directory</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Continue on Free Tier
              </button>
              <button
                onClick={() => {
                  setSubscriptionTier('pro');
                  setShowUpgradeModal(false);
                  setToastNotice({
                    type: 'brand',
                    title: 'Upgraded to Pro',
                    message: 'Multi-clinic rooms and longitudinal EMR are now unlocked.',
                  });
                }}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-700 transition"
              >
                Upgrade to Pro (₱999)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
