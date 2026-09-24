'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Tv,
  Volume2,
  VolumeX,
  Stethoscope,
  Clock,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Users,
  DoorOpen,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { playHospitalChime, announcePatientCall, maskPatientName } from '@/lib/audio/queue-chime';
import { ClinicNatinLogo } from '@/components/brand/clinic-natin-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DisplaySession {
  id: string;
  session_date: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  current_serving_number: number;
  announcement_notice: string | null;
  doctor?: {
    full_name: string;
    specialty: string;
  };
  clinic?: {
    hospital_name: string;
    room_number: string;
  };
}

interface DisplayAppointment {
  id: string;
  queue_number: number;
  token_code: string;
  display_name: string;
  status: string;
  priority_category: string;
}

export default function WaitingRoomDisplayPage() {
  const supabase = createClient();

  const [session, setSession] = useState<DisplaySession | null>(null);
  const [appointments, setAppointments] = useState<DisplayAppointment[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [maskNames, setMaskNames] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const prevServingNumberRef = useRef<number | null>(null);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen Detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Fetch live session and appointments
  const fetchDisplayData = async () => {
    try {
      const { data: sessData } = await supabase
        .from('queue_sessions')
        .select(`
          id,
          session_date,
          status,
          current_serving_number,
          announcement_notice,
          doctors (
            specialty,
            profiles ( full_name )
          ),
          clinics (
            hospital_name,
            room_number
          )
        `)
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sd = sessData as any;
        const currentServing = sd.current_serving_number || 0;

        const currentSession: DisplaySession = {
          id: sd.id,
          session_date: sd.session_date,
          status: sd.status,
          current_serving_number: currentServing,
          announcement_notice: sd.announcement_notice,
          doctor: {
            full_name: sd.doctors?.profiles?.full_name || 'Dr. Maria Santos',
            specialty: sd.doctors?.specialty || 'General Practice / Internal Medicine',
          },
          clinic: {
            hospital_name: sd.clinics?.hospital_name || 'Maria Reyna XU Hospital',
            room_number: sd.clinics?.room_number || '304',
          },
        };

        // If serving number changed and sound is enabled, play chime & announce!
        if (
          prevServingNumberRef.current !== null &&
          prevServingNumberRef.current !== currentServing &&
          currentServing > 0 &&
          soundEnabled
        ) {
          playHospitalChime().then(() => {
            announcePatientCall({
              tokenCode: `Token #${currentServing}`,
              roomNumber: currentSession.clinic?.room_number,
              maskName: maskNames,
            });
          });
        }
        prevServingNumberRef.current = currentServing;
        setSession(currentSession);

        // Fetch appointments for this session
        const { data: apptsData } = await supabase
          .from('appointments')
          .select(`
            id,
            queue_number,
            token_code,
            status,
            priority_category,
            booking_channel,
            walk_in_name,
            profiles:patient_id ( full_name )
          `)
          .eq('queue_session_id', sd.id)
          .order('queue_number', { ascending: true });

        if (apptsData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: DisplayAppointment[] = (apptsData || []).map((a: any) => {
            const isOnline = a.booking_channel === 'ONLINE' || (!a.booking_channel && !a.walk_in_name);
            const name = a.profiles?.full_name || a.walk_in_name || (isOnline ? `Online Patient #${a.queue_number}` : `Walk-in Patient #${a.queue_number}`);
            const token = a.token_code || (isOnline ? `CN-ON${String(a.queue_number).padStart(3, '0')}` : `CN-WK${String(a.queue_number).padStart(3, '0')}`);

            return {
              id: a.id,
              queue_number: a.queue_number,
              token_code: token,
              display_name: name,
              status: a.status,
              priority_category: a.priority_category || 'NONE',
            };
          });
          setAppointments(mapped);
        }
      }
    } catch (err) {
      console.error('[DisplayPage] Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchDisplayData();

    // Postgres Realtime
    const channel: RealtimeChannel = supabase
      .channel('tv-waiting-room-display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_sessions' }, fetchDisplayData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchDisplayData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived Serving and Upcoming
  const currentlyServingAppt = appointments.find((a) => a.status === 'SERVING');
  const upcomingPatients = appointments
    .filter((a) => a.status === 'WAITING' || a.status === 'BOOKED')
    .slice(0, 5);

  const heroToken = currentlyServingAppt?.token_code || (session?.current_serving_number ? `Token #${session.current_serving_number}` : '—');
  const heroName = currentlyServingAppt
    ? maskNames
      ? maskPatientName(currentlyServingAppt.display_name)
      : currentlyServingAppt.display_name
    : 'Waiting for Doctor Call';

  const doctorStatusConfig = {
    ACTIVE: {
      text: 'Doctor Consulting in Room',
      badgeClass: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400',
      dotClass: 'bg-emerald-400 animate-ping',
    },
    PAUSED: {
      text: 'Doctor on Break / Rounds',
      badgeClass: 'bg-amber-950/80 border-amber-500/60 text-amber-400',
      dotClass: 'bg-amber-400',
    },
    COMPLETED: {
      text: 'Clinic Session Finished',
      badgeClass: 'bg-slate-900 border-slate-700 text-slate-400',
      dotClass: 'bg-slate-500',
    },
    PENDING: {
      text: 'Awaiting Session Start',
      badgeClass: 'bg-slate-900 border-slate-700 text-slate-400',
      dotClass: 'bg-slate-500',
    },
    CANCELLED: {
      text: 'Clinic Session Closed',
      badgeClass: 'bg-rose-950/80 border-rose-500/60 text-rose-400',
      dotClass: 'bg-rose-500',
    },
  }[session?.status || 'PENDING'];

  return (
    <div className="min-h-screen bg-[#071311] text-white flex flex-col justify-between overflow-hidden font-sans select-none antialiased">
      {/* ── TOP 10-FOOT MONITOR HEADER (CLINIC NATIN BRANDED) ── */}
      <header className="px-6 lg:px-10 py-4 bg-[#0a1b17]/95 backdrop-blur-md border-b border-brand-900/60 flex items-center justify-between shadow-md">
        {/* Left: Brand Logo & Clinic Location */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="bg-white/95 rounded-2xl p-2 px-3 shadow-md flex items-center shrink-0 border border-brand-200">
            <ClinicNatinLogo height={32} href="/secretary/dashboard" priority />
          </div>

          <div className="hidden sm:block h-8 w-px bg-brand-800/60" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">
                {session?.clinic?.hospital_name || 'Maria Reyna XU Hospital'}
              </h1>
              <span className="text-xs font-black uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2.5 py-0.5 rounded-full">
                Room {session?.clinic?.room_number || '304'}
              </span>
            </div>
            <p className="text-xs lg:text-sm font-semibold text-brand-200/70 truncate mt-0.5">
              {session?.doctor?.full_name || 'Dr. Maria Santos, MD'} &bull; {session?.doctor?.specialty || 'General Practice / Internal Medicine'}
            </p>
          </div>
        </div>

        {/* Right: Clock & Monitor Controls */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* Doctor Status Banner */}
          <div
            className={`hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border text-xs font-bold shadow-xs ${doctorStatusConfig.badgeClass}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${doctorStatusConfig.dotClass}`} />
            <span>{doctorStatusConfig.text}</span>
          </div>

          {/* Large Digital Clock */}
          <div className="text-right">
            <span className="text-2xl lg:text-3xl font-black font-mono tracking-wider text-slate-100 block leading-none">
              {currentTime || '--:--:--'}
            </span>
            <span className="text-[10px] lg:text-[11px] font-bold text-brand-300/60 uppercase tracking-widest block mt-1">
              {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center gap-2">
            {/* Audio Chime Toggle */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playHospitalChime();
              }}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-brand-600 border-brand-500 text-white shadow-sm ring-2 ring-brand-400/30'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Audio Chime is ON (Click to Mute)' : 'Audio Chime is MUTED (Click to Unmute)'}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>

            {/* Privacy Name Masking Toggle */}
            <button
              type="button"
              onClick={() => setMaskNames(!maskNames)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all hidden sm:inline-flex items-center gap-1.5 ${
                maskNames
                  ? 'bg-brand-900/60 border-brand-500 text-brand-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Philippine Data Privacy Act (RA 10173) name masking"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
              <span>{maskNames ? 'Masked' : 'Full Name'}</span>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter 10-Foot Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>

            {/* Exit Back to Secretary Desk */}
            <Link href="/secretary/dashboard">
              <button
                type="button"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Return to Secretary Desk"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 10-FOOT MAIN DISPLAY CANVAS (BRANDED WIDESCREEN) ── */}
      <main className="flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left 7 Cols: Massive Hero "NOW SERVING" Stage */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border-2 border-brand-500/70 bg-gradient-to-br from-[#0c221d] via-[#091a16] to-[#061210] p-8 lg:p-12 shadow-[0_0_60px_rgba(50,190,166,0.18)] relative overflow-hidden">
          {/* Subtle Ambient Brand Watermark */}
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Stethoscope className="h-96 w-96 text-brand-300" />
          </div>

          <div>
            {/* Now Serving Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-brand-500/20 border border-brand-500/50 px-5 py-2 text-sm font-black uppercase tracking-widest text-brand-300 shadow-xs">
              <span className="h-3 w-3 rounded-full bg-brand-400 animate-ping" />
              <span>Now Serving in Room {session?.clinic?.room_number || '304'}</span>
            </div>

            {/* Giant Hero Token Number */}
            <div className="my-6 lg:my-8">
              <span className="font-mono text-7xl sm:text-8xl lg:text-9xl 2xl:text-[10rem] font-black text-white tracking-tight block drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                {heroToken}
              </span>
              <p className="text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl font-black text-brand-200 mt-2 truncate">
                {heroName}
              </p>
            </div>
          </div>

          {/* Destination Guidance Banner */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-500 text-slate-950 flex items-center justify-center font-black text-2xl shrink-0 shadow-md">
                <DoorOpen className="h-7 w-7 text-slate-950" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-300 block">
                  Proceed to Consultation Room
                </span>
                <p className="text-lg lg:text-xl font-black text-white mt-0.5">
                  Room {session?.clinic?.room_number || '304'} &bull; {session?.clinic?.hospital_name || 'Maria Reyna XU Hospital'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Badge className="bg-brand-500 hover:bg-brand-400 text-slate-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-md">
                Please Proceed Inside
              </Badge>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Upcoming Patients in Line */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-brand-900/60 bg-[#0c1c18]/90 backdrop-blur-md p-6 lg:p-8 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-brand-900/60 mb-6">
              <h2 className="text-base font-black uppercase tracking-widest text-slate-200 flex items-center gap-2.5">
                <Users className="h-5 w-5 text-brand-400" />
                <span>Next in Line</span>
              </h2>
              <span className="text-xs font-mono font-bold text-brand-300/80 bg-brand-950/60 border border-brand-900 px-2.5 py-1 rounded-full">
                {upcomingPatients.length} Waiting
              </span>
            </div>

            {upcomingPatients.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Users className="h-16 w-16 mx-auto mb-3 opacity-30 text-brand-400" />
                <p className="text-lg font-bold text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">
                  No patients currently waiting in line. New arrivals will appear automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {upcomingPatients.map((patient, idx) => (
                  <div
                    key={patient.id}
                    className={`rounded-2xl border p-4 lg:p-5 transition-all flex items-center justify-between ${
                      idx === 0
                        ? 'bg-brand-950/80 border-brand-500/60 shadow-[0_0_20px_rgba(50,190,166,0.12)] ring-1 ring-brand-400/40'
                        : 'bg-[#10221e]/70 border-brand-900/40 hover:border-brand-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 font-mono shadow-xs ${
                          idx === 0
                            ? 'bg-brand-500 text-slate-950'
                            : 'bg-slate-800/80 text-brand-200 border border-brand-900/40'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-xl lg:text-2xl font-black text-white block leading-tight">
                          {patient.token_code}
                        </span>
                        <p className="text-xs lg:text-sm font-semibold text-brand-100/70 truncate max-w-[180px] sm:max-w-[240px]">
                          {maskNames ? maskPatientName(patient.display_name) : patient.display_name}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {idx === 0 ? (
                        <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-lg uppercase tracking-wider shadow-xs">
                          Next Patient
                        </Badge>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#091512] border border-brand-900/50 text-center mt-6">
            <p className="text-xs text-brand-200/70 font-medium flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-400 shrink-0" />
              <span>Please keep your queue ticket token ready and listen for the audio chime.</span>
            </p>
          </div>
        </div>
      </main>

      {/* ── HOSPITAL MARQUEE TICKER (CLINIC NATIN BRANDED) ── */}
      <footer className="bg-gradient-to-r from-brand-950 via-[#0a241e] to-brand-950 border-t border-brand-800/70 py-3.5 px-6 lg:px-8 overflow-hidden flex items-center gap-4 shadow-lg">
        <div className="flex items-center gap-2 text-brand-300 font-black text-xs uppercase tracking-widest shrink-0">
          <Clock className="h-4 w-4 text-brand-400" />
          <span>Clinic Notice:</span>
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <p className="text-sm font-bold text-white inline-block animate-marquee">
            {session?.announcement_notice ||
              'Welcome to Clinic Natin. Senior citizens, pregnant women, and PWDs are given statutory priority. Please present your mobile token or physical ticket at the reception desk.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
