'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Tv,
  Volume2,
  VolumeX,
  Building2,
  Stethoscope,
  Clock,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { playHospitalChime, announcePatientCall, maskPatientName } from '@/lib/audio/queue-chime';
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
            specialty: sd.doctors?.specialty || 'Internal Medicine / Cardiology',
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

        // Fetch appointments
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
  }, [supabase]);

  // Derived Serving and Upcoming
  const currentlyServingAppt = appointments.find((a) => a.status === 'SERVING');
  const upcomingPatients = appointments
    .filter((a) => a.status === 'WAITING' || a.status === 'BOOKED')
    .slice(0, 4);

  const heroToken = currentlyServingAppt?.token_code || (session?.current_serving_number ? `Token #${session.current_serving_number}` : '—');
  const heroName = currentlyServingAppt
    ? maskNames
      ? maskPatientName(currentlyServingAppt.display_name)
      : currentlyServingAppt.display_name
    : 'Waiting for Call';

  const doctorStatusText =
    session?.status === 'ACTIVE'
      ? 'Currently Consulting in Room'
      : session?.status === 'PAUSED'
      ? 'Doctor on Urgent Hospital Rounds'
      : 'Consultation Session Paused';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      {/* ── TOP 10-FOOT MONITOR HEADER ── */}
      <header className="px-8 py-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-brand-400 block">
              Clinic Natin Outpatient Suite
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {session?.clinic?.hospital_name || 'Maria Reyna XU Hospital'} &bull; Room {session?.clinic?.room_number || '304'}
            </h1>
            <p className="text-sm font-semibold text-slate-400">
              {session?.doctor?.full_name || 'Dr. Maria Santos, MD'} — {session?.doctor?.specialty || 'Cardiology'}
            </p>
          </div>
        </div>

        {/* Right: Clock & Monitor Controls */}
        <div className="flex items-center gap-6">
          {/* Doctor Status Banner */}
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-sm font-bold shadow-xs ${
              session?.status === 'ACTIVE'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-400'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                session?.status === 'ACTIVE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span>{doctorStatusText}</span>
          </div>

          {/* Large Clock */}
          <div className="text-right">
            <span className="text-3xl font-black font-mono tracking-wider text-slate-100 block">
              {currentTime}
            </span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playHospitalChime();
            }}
            className={`p-3 rounded-2xl border transition-all ${
              soundEnabled
                ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Audio Chime is On (Click to Mute)' : 'Audio Chime is Muted'}
          >
            {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>

          {/* Privacy Name Masking Toggle */}
          <button
            type="button"
            onClick={() => setMaskNames(!maskNames)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              maskNames
                ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle RA 10173 Privacy Name Masking"
          >
            RA 10173: {maskNames ? 'Masked' : 'Full Name'}
          </button>

          {/* Exit Back to Desk */}
          <Link href="/secretary/dashboard">
            <button
              type="button"
              className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
              title="Return to Secretary Desk"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </header>

      {/* ── 10-FOOT MAIN DISPLAY CANVAS ── */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8 items-stretch">
        {/* Left 7 Cols: Massive Hero "NOW SERVING" Box */}
        <div className="col-span-7 flex flex-col justify-between rounded-3xl border-2 border-brand-500/60 bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Stethoscope className="h-72 w-72 text-brand-300" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 border border-brand-500/40 px-5 py-2 text-sm font-black uppercase tracking-widest text-brand-300">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400 animate-ping" />
              <span>Now Serving &bull; Kasalukuyang Tinatawag</span>
            </div>

            {/* Giant Hero Token */}
            <div className="my-6">
              <span className="font-mono text-8xl xl:text-9xl font-black text-white tracking-tighter block drop-shadow-lg">
                {heroToken}
              </span>
              <p className="text-3xl xl:text-4xl font-extrabold text-brand-200 mt-2 truncate">
                {heroName}
              </p>
            </div>
          </div>

          {/* Location Callout Banner */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-xl">
                {session?.clinic?.room_number || '304'}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-300 block">
                  Proceed to Consultation Room
                </span>
                <p className="text-xl font-black text-white">
                  Room {session?.clinic?.room_number || '304'} &bull; {session?.clinic?.hospital_name || 'Maria Reyna Hospital'}
                </p>
              </div>
            </div>

            <Badge className="bg-emerald-500 text-slate-950 font-black text-sm px-4 py-2">
              PLEASE PROCEED INSIDE
            </Badge>
          </div>
        </div>

        {/* Right 5 Cols: Upcoming Patients in Line */}
        <div className="col-span-5 flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-base font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-400" />
                <span>Next in Line &bull; Maghanda na po</span>
              </h2>
              <span className="text-xs font-mono font-bold text-slate-500">
                {upcomingPatients.length} Patients Waiting
              </span>
            </div>

            {upcomingPatients.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <Users className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-bold">No patients waiting in queue</p>
                <p className="text-xs text-slate-600 mt-1">
                  Walk-ins and online arrivals will display here automatically
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingPatients.map((patient, idx) => (
                  <div
                    key={patient.id}
                    className={`rounded-2xl border p-5 transition-all flex items-center justify-between ${
                      idx === 0
                        ? 'bg-amber-950/40 border-amber-500/50 shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-base ${
                          idx === 0 ? 'bg-amber-500 text-slate-950 font-mono' : 'bg-slate-700 text-slate-300 font-mono'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="font-mono text-2xl font-black text-white block leading-tight">
                          {patient.token_code}
                        </span>
                        <p className="text-sm font-semibold text-slate-400 truncate max-w-[200px]">
                          {maskNames ? maskPatientName(patient.display_name) : patient.display_name}
                        </p>
                      </div>
                    </div>

                    <div>
                      {idx === 0 ? (
                        <Badge className="bg-amber-500 text-slate-950 font-extrabold text-xs px-3 py-1">
                          Next Patient
                        </Badge>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-medium">
              💡 Please watch your token code on this screen and listen for the audio chime callout.
            </p>
          </div>
        </div>
      </main>

      {/* ── HOSPITAL MARQUEE TICKER ── */}
      <footer className="bg-brand-900 border-t border-brand-800 py-3.5 px-6 overflow-hidden flex items-center gap-4">
        <div className="flex items-center gap-2 text-brand-200 font-black text-xs uppercase tracking-widest shrink-0">
          <Clock className="h-4 w-4" />
          <span>Hospital Notice:</span>
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <p className="text-sm font-bold text-white inline-block animate-marquee">
            {session?.announcement_notice ||
              'Welcome to Clinic Natin. Senior citizens, pregnant women, and PWDs are given statutory priority. Free Wi-Fi is available in the waiting lounge. Please present your mobile pass at the secretary desk.'}
          </p>
        </div>
      </footer>
    </div>
  );
}
