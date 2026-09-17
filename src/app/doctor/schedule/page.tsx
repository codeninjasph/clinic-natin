'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CalendarX,
  Clock,
  Building2,
  Play,
  Pause,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  BellRing,
  Users,
  MapPin,
  Trash2,
  Stethoscope,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDoctor } from '../doctor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ScheduleSlot {
  id: string;
  doctor_id: string;
  clinic_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_patients: number;
  is_active: boolean;
  clinic: {
    id: string;
    name: string;
    hospital_name: string;
    room_number: string;
    address: string;
  };
}

interface ScheduleOverride {
  id: string;
  doctor_id: string;
  target_date: string;
  override_type:
    | 'CANCELLED_CLINIC'
    | 'TIME_CHANGE'
    | 'CLINIC_SWAP'
    | 'DOCTOR_EMERGENCY_DELAY'
    | 'SURGERY_EXTENSION';
  delay_minutes: number;
  announcement_message: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  new_clinic_id: string | null;
  created_at: string;
  clinic?: {
    id: string;
    name: string;
    hospital_name: string;
    room_number: string;
  } | null;
}

interface ClinicOption {
  id: string;
  name: string;
  hospital_name: string;
  room_number: string;
}

const DAYS = [
  { num: 1, name: 'Monday', short: 'Mon' },
  { num: 2, name: 'Tuesday', short: 'Tue' },
  { num: 3, name: 'Wednesday', short: 'Wed' },
  { num: 4, name: 'Thursday', short: 'Thu' },
  { num: 5, name: 'Friday', short: 'Fri' },
  { num: 6, name: 'Saturday', short: 'Sat' },
  { num: 7, name: 'Sunday', short: 'Sun' },
];

export default function DoctorSchedulePage() {
  const supabase = createClient();
  const { doctor, selectedRoom, refreshDoctorData, activeSession, startSession } = useDoctor();

  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [allClinics, setAllClinics] = useState<ClinicOption[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOverrideModal, setShowAddOverrideModal] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);

  // New slot form state
  const [newClinicId, setNewClinicId] = useState('');
  const [newDay, setNewDay] = useState(1);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('12:00');
  const [newMaxPatients, setNewMaxPatients] = useState(40);

  // New override form state
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().split('T')[0]);
  const [overrideType, setOverrideType] = useState<
    'CANCELLED_CLINIC' | 'TIME_CHANGE' | 'CLINIC_SWAP' | 'DOCTOR_EMERGENCY_DELAY' | 'SURGERY_EXTENSION'
  >('CANCELLED_CLINIC');
  const [overrideDelay, setOverrideDelay] = useState(30);
  const [overrideAnnouncement, setOverrideAnnouncement] = useState('');
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('13:00');
  const [overrideClinicId, setOverrideClinicId] = useState('');

  // Toast
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'destructive' | 'brand';
    title: string;
    message: string;
  } | null>(null);

  // ── Fetch Schedules & Clinics ─────────────────────────────────────────────
  const fetchSchedulesAndClinics = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all clinics
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select('id, name, hospital_name, room_number')
        .order('hospital_name', { ascending: true });

      setAllClinics(clinicsData || []);
      if (clinicsData && clinicsData.length > 0 && !newClinicId) {
        setNewClinicId(clinicsData[0].id);
      }

      // 2. Fetch doctor schedules
      if (doctor?.id) {
        const { data: schedData, error: sErr } = await supabase
          .from('doctor_clinic_schedules')
          .select('id, doctor_id, clinic_id, day_of_week, start_time, end_time, max_patients, is_active, clinic:clinics (id, name, hospital_name, room_number, address)')
          .eq('doctor_id', doctor.id)
          .order('day_of_week', { ascending: true });

        if (sErr) throw sErr;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items: ScheduleSlot[] = (schedData || []).map((s: any) => ({
          id: s.id,
          doctor_id: s.doctor_id,
          clinic_id: s.clinic_id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          max_patients: s.max_patients,
          is_active: s.is_active,
          clinic: s.clinic || {
            id: s.clinic_id,
            name: 'Clinic Room',
            hospital_name: 'Medical Center',
            room_number: '101',
            address: 'Cagayan de Oro',
          },
        }));

        setSchedules(items);

        // 3. Fetch schedule overrides
        const { data: overData } = await supabase
          .from('schedule_overrides')
          .select('id, doctor_id, target_date, override_type, delay_minutes, announcement_message, new_start_time, new_end_time, new_clinic_id, created_at, clinic:clinics(id, name, hospital_name, room_number)')
          .eq('doctor_id', doctor.id)
          .order('target_date', { ascending: false });

        setOverrides((overData as unknown as ScheduleOverride[]) || []);
      }
    } catch (err) {
      console.error('Error loading schedules and overrides:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, doctor?.id, newClinicId]);

  useEffect(() => {
    fetchSchedulesAndClinics();
  }, [fetchSchedulesAndClinics]);

  // ── Add Schedule Slot ─────────────────────────────────────────────────────
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor?.id || !newClinicId) return;
    setSavingSlot(true);
    try {
      const { error } = await supabase.from('doctor_clinic_schedules').insert({
        doctor_id: doctor.id,
        clinic_id: newClinicId,
        day_of_week: newDay,
        start_time: `${newStartTime}:00`,
        end_time: `${newEndTime}:00`,
        max_patients: newMaxPatients,
        is_active: true,
      });

      if (error) throw error;

      setToastNotice({
        type: 'success',
        title: 'Schedule Added',
        message: 'New clinic operating hours successfully added.',
      });
      setShowAddModal(false);
      await fetchSchedulesAndClinics();
      await refreshDoctorData();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Save Failed',
        message: err instanceof Error ? err.message : 'Could not save schedule slot.',
      });
    } finally {
      setSavingSlot(false);
    }
  };

  // ── Delete Schedule Slot ──────────────────────────────────────────────────
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Remove this schedule slot from your weekly timetable?')) return;
    try {
      const { error } = await supabase.from('doctor_clinic_schedules').delete().eq('id', slotId);
      if (error) throw error;
      setToastNotice({
        type: 'brand',
        title: 'Schedule Removed',
        message: 'Slot has been deleted from your weekly schedule.',
      });
      await fetchSchedulesAndClinics();
      await refreshDoctorData();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not delete slot.',
      });
    }
  };

  // ── Add Schedule Override Handler ─────────────────────────────────────────
  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor?.id || !overrideDate) return;
    setSavingOverride(true);
    try {
      const { error } = await supabase.from('schedule_overrides').insert({
        doctor_id: doctor.id,
        target_date: overrideDate,
        override_type: overrideType,
        delay_minutes:
          overrideType === 'DOCTOR_EMERGENCY_DELAY' || overrideType === 'SURGERY_EXTENSION'
            ? overrideDelay
            : 0,
        announcement_message: overrideAnnouncement.trim() || null,
        new_start_time: overrideType === 'TIME_CHANGE' ? `${overrideStartTime}:00` : null,
        new_end_time: overrideType === 'TIME_CHANGE' ? `${overrideEndTime}:00` : null,
        new_clinic_id: overrideType === 'CLINIC_SWAP' && overrideClinicId ? overrideClinicId : null,
      });

      if (error) throw error;

      // If override applies to today's active session, update announcement or status in real time
      const todayStr = new Date().toISOString().split('T')[0];
      if (overrideDate === todayStr && activeSession) {
        await supabase
          .from('queue_sessions')
          .update({
            announcement_notice: overrideAnnouncement.trim() || null,
            status: overrideType === 'CANCELLED_CLINIC' ? 'CANCELLED' : activeSession.status,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', activeSession.id);
      }

      setToastNotice({
        type: 'success',
        title: 'Override Registered',
        message: 'Calendar override and patient announcement notice successfully saved.',
      });
      setShowAddOverrideModal(false);
      setOverrideAnnouncement('');
      await fetchSchedulesAndClinics();
      await refreshDoctorData();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Override Failed',
        message: err instanceof Error ? err.message : 'Could not save schedule override.',
      });
    } finally {
      setSavingOverride(false);
    }
  };

  // ── Delete Schedule Override Handler ──────────────────────────────────────
  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Remove this schedule override and restore standard clinic hours?')) return;
    try {
      const { error } = await supabase.from('schedule_overrides').delete().eq('id', overrideId);
      if (error) throw error;
      setToastNotice({
        type: 'brand',
        title: 'Override Removed',
        message: 'Schedule override cleared; recurring timetable restored.',
      });
      await fetchSchedulesAndClinics();
      await refreshDoctorData();
    } catch (err: unknown) {
      setToastNotice({
        type: 'destructive',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not remove override.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
            <CalendarDays className="h-5 w-5 text-brand-600" />
            My Schedule &amp; Hospital Timetable
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-Hospital Operating Hours, Daily Queue Control, and Room Rotations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSchedulesAndClinics}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Clinic Hours
          </Button>
        </div>
      </div>

      {/* Today's Live Session Controller Card */}
      <Card className="border-brand-200 bg-gradient-to-r from-brand-50/70 to-white">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                activeSession?.status === 'ACTIVE'
                  ? 'bg-emerald-600 animate-pulse'
                  : activeSession?.status === 'PAUSED'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            >
              <Clock className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Today&apos;s Session:{' '}
                  {activeSession ? (
                    <span className={activeSession.status === 'ACTIVE' ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
                      {activeSession.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED (ON ROUNDS)'}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-semibold">Not Started</span>
                  )}
                </h3>
                {activeSession?.status === 'ACTIVE' && (
                  <Badge variant="success" className="text-[10px]">
                    Serving #{activeSession.current_serving_number || 0}
                  </Badge>
                )}
                {activeSession?.status === 'PAUSED' && (
                  <Badge variant="warning" className="text-[10px]">
                    On Rounds
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Location:{' '}
                <strong>
                  {selectedRoom ? `${selectedRoom.clinicName} (${selectedRoom.room})` : 'None selected'}
                </strong>{' '}
                · {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSession ? (
              <Link href="/doctor/dashboard">
                <Button
                  variant="brand"
                  size="sm"
                  className="text-xs font-semibold shadow-xs"
                >
                  <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                  Open Live Consultation Cockpit →
                </Button>
              </Link>
            ) : (
              <Button
                variant="brand"
                size="sm"
                onClick={() => startSession()}
                className="text-xs"
              >
                <Play className="h-3.5 w-3.5 fill-current mr-1.5" />
                Start Today&apos;s Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const daySlots = schedules.filter((s) => s.day_of_week === day.num);
          const isToday = new Date().getDay() === (day.num === 7 ? 0 : day.num);

          return (
            <Card
              key={day.num}
              className={`flex flex-col h-full ${
                isToday ? 'border-brand-500 ring-2 ring-brand-200/50 bg-brand-50/20' : 'bg-white'
              }`}
            >
              <CardHeader className="p-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {day.name}
                    {isToday && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </CardTitle>
                </div>
                {isToday && (
                  <Badge variant="brand" className="text-[9px] px-1 py-0">
                    Today
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-2.5 flex-1 space-y-2">
                {daySlots.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-center text-slate-400 text-[11px]">
                    Off Clinic
                  </div>
                ) : (
                  daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs space-y-1 relative group"
                    >
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="absolute top-1.5 right-1.5 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove slot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      <p className="font-bold text-slate-900 pr-4 text-[11px] truncate">
                        {slot.clinic.hospital_name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Room {slot.clinic.room_number}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-brand-700 font-semibold mt-1">
                        <Clock className="h-2.5 w-2.5 text-slate-400" />
                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                      </div>
                      <span className="inline-block text-[9px] text-slate-400">
                        Max {slot.max_patients} pts
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Date-Specific Schedule Overrides & Leave Management */}
      <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/30 via-white to-white shadow-xs">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarX className="h-4 w-4 text-amber-600" />
                Date-Specific Overrides &amp; Clinic Leaves
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-amber-800 border-amber-300 bg-amber-50">
                {overrides.length} active
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Declare planned leaves, emergency delays, or room changes for specific calendar dates.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOverrideAnnouncement('');
              setShowAddOverrideModal(true);
            }}
            className="text-xs font-semibold border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Declare Override / Leave
          </Button>
        </CardHeader>

        <CardContent className="pt-0">
          {overrides.length === 0 ? (
            <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
              No calendar overrides declared. Regular weekly timetable is active for all dates.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {overrides.map((ov) => {
                const isPast = new Date(ov.target_date) < new Date(new Date().toDateString());
                return (
                  <div
                    key={ov.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {new Date(ov.target_date).toLocaleDateString('en-PH', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <Badge
                          variant={
                            ov.override_type === 'CANCELLED_CLINIC'
                              ? 'destructive'
                              : ov.override_type === 'DOCTOR_EMERGENCY_DELAY' ||
                                ov.override_type === 'SURGERY_EXTENSION'
                              ? 'warning'
                              : 'outline'
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {ov.override_type.replace(/_/g, ' ')}
                        </Badge>
                        {isPast && (
                          <span className="text-[10px] text-slate-400 font-mono">(Past Date)</span>
                        )}
                      </div>

                      {ov.announcement_message && (
                        <p className="text-slate-600 italic text-[11px]">
                          &ldquo;{ov.announcement_message}&rdquo;
                        </p>
                      )}

                      {ov.delay_minutes > 0 && (
                        <p className="text-amber-800 font-semibold text-[11px]">
                          ⏱️ Doctor Delayed: +{ov.delay_minutes} minutes
                        </p>
                      )}

                      {ov.new_start_time && ov.new_end_time && (
                        <p className="text-slate-700 font-mono text-[11px]">
                          🕒 Adjusted Hours: {ov.new_start_time.slice(0, 5)} - {ov.new_end_time.slice(0, 5)}
                        </p>
                      )}

                      {ov.clinic && (
                        <p className="text-blue-700 text-[11px]">
                          📍 Relocated to: {ov.clinic.hospital_name} — {ov.clinic.name} (Room {ov.clinic.room_number})
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOverride(ov.id)}
                      className="h-7 px-2 text-slate-400 hover:text-red-600 text-xs shrink-0 self-start sm:self-center"
                      title="Remove override"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hospital Locations Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Affiliated Hospital Clinic Rooms</CardTitle>
          <CardDescription>
            Outpatient consultation rooms registered under your medical license
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 text-xs">
            {allClinics.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{c.hospital_name} — {c.name}</p>
                    <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400" /> Room {c.room_number}, Cagayan de Oro City
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-slate-600 text-xs">
                  Verified Facility
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal / Add Hours Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Add Clinic Hours</h3>
                <p className="text-xs text-slate-500">Configure weekly consultation time slot</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hospital / Clinic Room</label>
                <select
                  value={newClinicId}
                  onChange={(e) => setNewClinicId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800"
                  required
                >
                  {allClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.hospital_name} — Room {c.room_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Day of Week</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800"
                >
                  {DAYS.map((d) => (
                    <option key={d.num} value={d.num}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <Input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Patients Cap</label>
                <Input
                  type="number"
                  min={5}
                  max={100}
                  value={newMaxPatients}
                  onChange={(e) => setNewMaxPatients(Number(e.target.value))}
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="brand" size="sm" disabled={savingSlot}>
                  {savingSlot ? 'Saving...' : 'Add Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Declare Schedule Override Dialog */}
      {showAddOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <CalendarX className="h-4 w-4 text-amber-600" />
                  Declare Schedule Override / Leave
                </h3>
                <p className="text-xs text-slate-500">
                  Broadcast date-specific schedule modifications to patients
                </p>
              </div>
              <button
                onClick={() => setShowAddOverrideModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOverride} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Calendar Date</label>
                <Input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Override Reason / Type</label>
                <select
                  value={overrideType}
                  onChange={(e) =>
                    setOverrideType(e.target.value as typeof overrideType)
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800"
                >
                  <option value="CANCELLED_CLINIC">Cancelled Clinic (Doctor on Leave / Out of Town)</option>
                  <option value="DOCTOR_EMERGENCY_DELAY">Emergency Delay (Hospital Rounds / Emergency Consult)</option>
                  <option value="SURGERY_EXTENSION">Surgery Extension (Operating Room Running Overtime)</option>
                  <option value="TIME_CHANGE">Time Change (Adjusted Clinic Hours)</option>
                  <option value="CLINIC_SWAP">Clinic Swap (Relocated to Alternate Hospital Room)</option>
                </select>
              </div>

              {(overrideType === 'DOCTOR_EMERGENCY_DELAY' ||
                overrideType === 'SURGERY_EXTENSION') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Estimated Delay (Minutes)
                  </label>
                  <Input
                    type="number"
                    min={10}
                    max={240}
                    step={5}
                    value={overrideDelay}
                    onChange={(e) => setOverrideDelay(Number(e.target.value))}
                    className="text-xs"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Patient queue tickets will reflect this dynamic delay estimate.
                  </p>
                </div>
              )}

              {overrideType === 'TIME_CHANGE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Start Time</label>
                    <Input
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New End Time</label>
                    <Input
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>
              )}

              {overrideType === 'CLINIC_SWAP' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Relocate To Alternate Room
                  </label>
                  <select
                    value={overrideClinicId}
                    onChange={(e) => setOverrideClinicId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800"
                    required
                  >
                    <option value="">Select clinic facility...</option>
                    {allClinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.hospital_name} — Room {c.room_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Public Announcement Notice to Patients
                </label>
                <textarea
                  rows={3}
                  value={overrideAnnouncement}
                  onChange={(e) => setOverrideAnnouncement(e.target.value)}
                  placeholder={
                    overrideType === 'CANCELLED_CLINIC'
                      ? 'Doctor Santos is attending the Philippine Pediatric Society Annual Convention. Regular clinics resume on Monday.'
                      : overrideType === 'DOCTOR_EMERGENCY_DELAY'
                      ? 'Doctor is attending to an emergency in the ER. Clinic start is deferred by ~30 mins.'
                      : 'Please take note of the schedule adjustment.'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 focus:bg-white resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Displayed on patient tracking screens and included in live ticket updates.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddOverrideModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  disabled={savingOverride}
                  className="bg-amber-700 hover:bg-amber-800 text-white"
                >
                  {savingOverride ? 'Saving Override...' : 'Save & Broadcast Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
