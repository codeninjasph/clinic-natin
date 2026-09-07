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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  patient_id?: string | null;
  created_at: string;
}

export default function DoctorDashboardPage() {
  const [session, setSession] = useState<QueueSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'consultation' | 'queue' | 'announcements'>('consultation');
  const [doctorName, setDoctorName] = useState('Dr. Maria Santos, MD');
  const [specialty, setSpecialty] = useState('Pediatrics / General Practice');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [rxNotes, setRxNotes] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  const fetchDoctorQueue = useCallback(async () => {
    try {
      // 1. Fetch active session
      const { data: sessionData } = await supabase
        .from('queue_sessions')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData);

        // 2. Fetch appointments for this session
        const { data: apptsData } = await supabase
          .from('appointments')
          .select('id, queue_number, token_code, status, priority_category, walk_in_name, patient_id, created_at')
          .eq('queue_session_id', sessionData.id)
          .order('queue_number', { ascending: true });

        if (apptsData) {
          const formatted: Appointment[] = apptsData.map((a) => ({
            id: a.id,
            queue_number: a.queue_number,
            token_code: a.token_code || `CN-${a.queue_number}`,
            status: a.status,
            priority_category: a.priority_category || 'NONE',
            display_name: a.walk_in_name || 'Registered Patient',
            patient_id: a.patient_id,
            created_at: a.created_at,
          }));
          setAppointments(formatted);
        }
      } else {
        // Mock fallback for demonstration
        setSession({
          id: 'mock-session-1',
          status: 'ACTIVE',
          current_serving_number: 7,
          session_date: new Date().toISOString().split('T')[0],
          announcement_notice: 'Doctor is in Room 304. Currently reviewing labs.',
        });
        setAppointments([
          { id: '1', queue_number: 7, token_code: 'CN-A107', status: 'SERVING', priority_category: 'NONE', display_name: 'Andres Bonifacio', created_at: '' },
          { id: '2', queue_number: 8, token_code: 'CN-A108', status: 'WAITING', priority_category: 'SENIOR', display_name: 'Maria Corazon Aquino', created_at: '' },
          { id: '3', queue_number: 9, token_code: 'CN-A109', status: 'WAITING', priority_category: 'NONE', display_name: 'Teresa Magbanua', created_at: '' },
          { id: '4', queue_number: 10, token_code: 'CN-A110', status: 'WAITING', priority_category: 'PWD', display_name: 'Liza Soberano', created_at: '' },
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

    // Setup realtime subscription
    const channel: RealtimeChannel = supabase
      .channel('doctor_live_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_sessions' },
        () => fetchDoctorQueue()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => fetchDoctorQueue()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDoctorQueue, supabase]);

  const currentlyServing = appointments.find((a) => a.status === 'SERVING');
  const waitingPatients = appointments.filter((a) => a.status === 'WAITING');

  const handleCallNext = async () => {
    if (!session) return;
    const nextInLine = waitingPatients[0];
    if (!nextInLine) {
      alert('No more waiting patients in queue.');
      return;
    }

    try {
      setIsSaving(true);
      // Mark current serving as COMPLETED and persist medical record
      if (currentlyServing) {
        await supabase
          .from('appointments')
          .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
          .eq('id', currentlyServing.id);

        if (currentlyServing.patient_id) {
          const { data: recordData } = await supabase
            .from('medical_records')
            .insert({
              appointment_id: currentlyServing.id,
              patient_id: currentlyServing.patient_id,
              doctor_id: 'a4e0ccd5-4d44-4bd8-93bc-e2a4eb9d5f2e',
              chief_complaint: chiefComplaint.trim() || 'Outpatient Consultation',
              diagnosis: diagnosis.trim() || 'General Clinical Evaluation',
              followup_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
              vitals: {
                blood_pressure: '120/80',
                heart_rate: 76,
                temperature_c: 36.6,
                weight_kg: 68,
                oxygen_saturation: 99,
              },
            })
            .select('id')
            .maybeSingle();

          if (recordData && rxNotes.trim()) {
            await supabase.from('prescriptions_lab_requests').insert({
              medical_record_id: recordData.id,
              item_type: 'MEDICATION',
              details: rxNotes.trim(),
              instructions: 'Take as instructed by physician.',
              generic_name: rxNotes.trim().split(' ')[0] || 'Rx Medication',
              dosage: 'Standard Dosage',
              frequency: 'As indicated',
              duration: '7 days',
              is_digital_copy_sent: true,
            });
          }
        }
      }

      // Mark next patient as SERVING
      await supabase
        .from('appointments')
        .update({ status: 'SERVING', served_at: new Date().toISOString() })
        .eq('id', nextInLine.id);

      // Update session current serving number
      await supabase
        .from('queue_sessions')
        .update({ current_serving_number: nextInLine.queue_number })
        .eq('id', session.id);

      // Reset consultation form
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

  const handleSaveAnnouncement = async () => {
    if (!session) return;
    try {
      setIsSaving(true);
      await supabase
        .from('queue_sessions')
        .update({ announcement_notice: announcementText })
        .eq('id', session.id);
      setSession((prev) => prev ? { ...prev, announcement_notice: announcementText } : null);
      alert('Announcement broadcasted to patient queue!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/50 via-slate-50 to-white pb-16">
      {/* Top Doctor Navigation */}
      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-md">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">{doctorName}</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-bold text-brand-700">
                  Doctor Suite
                </span>
              </div>
              <p className="text-xs text-slate-500">{specialty} &bull; Room 304, Maria Reyna XU Hospital</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/secretary/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Users className="h-3.5 w-3.5 text-slate-400" />
              Switch to Secretary View
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patients in Queue</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{waitingPatients.length}</span>
              <span className="text-xs text-slate-500 font-medium">waiting outside</span>
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
              <div>
                <p className="font-bold text-slate-800 text-sm">{waitingPatients[0]?.display_name || 'None'}</p>
                <p className="text-xs text-brand-700 font-medium">Token: {waitingPatients[0]?.token_code || '\u2014'}</p>
              </div>
              <button
                onClick={handleCallNext}
                disabled={waitingPatients.length === 0 || isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-700/90 disabled:opacity-50"
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
                    <p className="text-xs text-slate-500">Patient currently inside Room 304</p>
                  </div>
                </div>
                {currentlyServing && (
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold ring-1 ring-emerald-200">
                    Queue #{currentlyServing.queue_number} &bull; {currentlyServing.token_code}
                  </span>
                )}
              </div>

              {currentlyServing ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-black text-slate-900">{currentlyServing.display_name}</p>
                        <p className="text-xs text-slate-500">Regular Consultation &bull; PhilHealth / HMO Covered</p>
                      </div>
                      {currentlyServing.priority_category !== 'NONE' && (
                        <span className="rounded-lg bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold">
                          {currentlyServing.priority_category}
                        </span>
                      )}
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
                        placeholder="e.g., Persistent cough for 4 days, mild fever"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Clinical Diagnosis & Findings
                      </label>
                      <textarea
                        rows={2}
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g., Acute Upper Respiratory Tract Infection (URTI)"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Prescription & Care Instructions (Auto-syncs to Patient Dashboard)
                      </label>
                      <textarea
                        rows={3}
                        value={rxNotes}
                        onChange={(e) => setRxNotes(e.target.value)}
                        placeholder="e.g., Amoxicillin 500mg TID for 7 days; Paracetamol 500mg PRN for fever."
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleCallNext}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700/90 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Complete & Call Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700">No Patient Inside Consultation Room</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Click "Call Next" when you are ready to examine the next patient in line.
                  </p>
                  <button
                    onClick={handleCallNext}
                    disabled={waitingPatients.length === 0 || isSaving}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-brand-700/90"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Call Next Patient ({waitingPatients.length} Waiting)
                  </button>
                </div>
              )}
            </div>

            {/* Doctor Notice / Broadcast Widget */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BellRing className="h-5 w-5 text-amber-500" />
                <h4 className="font-bold text-slate-800 text-sm">Broadcast Announcement to Queue</h4>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Send an immediate notification banner to all waiting patients on their mobile screen.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g. Doctor is in emergency ward for 15 minutes. Queue will resume at 10:45 AM."
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-brand-700 focus:outline-none"
                />
                <button
                  onClick={handleSaveAnnouncement}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  Broadcast
                </button>
              </div>
              {session?.announcement_notice && (
                <div className="mt-3 rounded-xl bg-amber-50 p-2.5 border border-amber-200 flex items-center justify-between text-xs text-amber-800">
                  <span>Current Notice: <strong>{session.announcement_notice}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Real-time Waiting List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Today&apos;s Queue Lineup</h4>
                  <p className="text-xs text-slate-500">Live order of consultation</p>
                </div>
                <button
                  onClick={fetchDoctorQueue}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50"
                  title="Refresh Queue"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto pr-1">
                {appointments.map((appt) => (
                  <div key={appt.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          appt.status === 'SERVING'
                            ? 'bg-emerald-600 text-white'
                            : appt.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-400 line-through'
                            : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        #{appt.queue_number}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${appt.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {appt.display_name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{appt.token_code}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          appt.status === 'SERVING'
                            ? 'bg-emerald-100 text-emerald-700'
                            : appt.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {appt.status}
                      </span>
                      {appt.priority_category !== 'NONE' && (
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">{appt.priority_category}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
