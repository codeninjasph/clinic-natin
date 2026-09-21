'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  Activity,
  Calendar,
  RefreshCw,
  Award,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDoctor } from '../doctor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AppointmentStat {
  id: string;
  status: string;
  queue_number: number;
  booking_channel: 'ONLINE' | 'WALK_IN';
  priority_category: string;
  consultation_fee: number;
  created_at: string;
  served_at: string | null;
  completed_at: string | null;
}

interface DiagnosisStat {
  code: string;
  label: string;
  count: number;
}

export default function DoctorAnalyticsPage() {
  const supabase = createClient();
  const { doctor } = useDoctor();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentStat[]>([]);
  const [diagnoses, setDiagnoses] = useState<DiagnosisStat[]>([]);
  const [timeRange, setTimeRange] = useState<'ALL' | 'MONTH' | 'WEEK' | 'TODAY'>('ALL');

  // ── Fetch Analytics Data ──────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch appointments
      const { data: apptsData, error: aErr } = await supabase
        .from('appointments')
        .select(
          'id, status, queue_number, booking_channel, priority_category, consultation_fee, created_at, served_at, completed_at'
        );

      if (aErr) throw aErr;

      const items: AppointmentStat[] = (apptsData || []).map((a) => {
        const isOnline = a.booking_channel === 'ONLINE';
        return {
          id: a.id,
          status: a.status,
          queue_number: a.queue_number,
          booking_channel: (a.booking_channel as 'ONLINE' | 'WALK_IN') || (isOnline ? 'ONLINE' : 'WALK_IN'),
          priority_category: a.priority_category || 'NONE',
          consultation_fee: Number(a.consultation_fee) || doctor?.consultationFeeDefault || 600,
          created_at: a.created_at,
          served_at: a.served_at,
          completed_at: a.completed_at,
        };
      });

      setAppointments(items);

      // 2. Fetch medical records for ICD-10 stats
      const { data: mrData } = await supabase
        .from('medical_records')
        .select('diagnosis, icd10_code');

      const dxMap = new Map<string, { code: string; label: string; count: number }>();
      if (mrData) {
        for (const r of mrData) {
          if (r.icd10_code || r.diagnosis) {
            const key = r.icd10_code || r.diagnosis || 'Unspecified';
            const existing = dxMap.get(key) || {
              code: r.icd10_code || 'DX',
              label: r.diagnosis || r.icd10_code || 'Clinical Encounter',
              count: 0,
            };
            existing.count += 1;
            dxMap.set(key, existing);
          }
        }
      }

      const sortedDx = Array.from(dxMap.values()).sort((a, b) => b.count - a.count);
      setDiagnoses(sortedDx.slice(0, 8));
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, doctor?.consultationFeeDefault]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Filter by Time Range ──────────────────────────────────────────────────
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => {
      if (timeRange === 'ALL') return true;
      const apptDate = new Date(a.created_at);
      if (timeRange === 'TODAY') {
        return apptDate.toDateString() === now.toDateString();
      }
      if (timeRange === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return apptDate >= weekAgo;
      }
      if (timeRange === 'MONTH') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return apptDate >= monthAgo;
      }
      return true;
    });
  }, [appointments, timeRange]);

  // ── Metrics Calculations ──────────────────────────────────────────────────
  const totalConsultations = filteredAppointments.filter((a) => a.status === 'COMPLETED').length;
  const totalPatientsSeen = filteredAppointments.length;

  const onlineCount = filteredAppointments.filter((a) => a.booking_channel === 'ONLINE').length;
  const walkinCount = filteredAppointments.filter((a) => a.booking_channel === 'WALK_IN').length;
  const onlinePercent = totalPatientsSeen > 0 ? Math.round((onlineCount / totalPatientsSeen) * 100) : 50;

  // Senior / PWD priority stats
  const seniorCount = filteredAppointments.filter((a) => a.priority_category === 'SENIOR').length;
  const pwdCount = filteredAppointments.filter((a) => a.priority_category === 'PWD').length;
  const pregnantCount = filteredAppointments.filter((a) => a.priority_category === 'PREGNANT').length;
  const priorityCount = seniorCount + pwdCount + pregnantCount;

  // Estimated Professional Fees (PF)
  // With 20% discount applied to Senior and PWD patients per Philippine law (RA 9994)
  const totalPF = filteredAppointments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => {
      const baseFee = a.consultation_fee || doctor?.consultationFeeDefault || 600;
      const isDiscounted = a.priority_category === 'SENIOR' || a.priority_category === 'PWD';
      const actualFee = isDiscounted ? baseFee * 0.8 : baseFee;
      return sum + actualFee;
    }, 0);

  // Average consultation duration
  const consultTimes = filteredAppointments
    .filter((a) => a.served_at && a.completed_at)
    .map((a) => {
      const start = new Date(a.served_at!).getTime();
      const end = new Date(a.completed_at!).getTime();
      return (end - start) / (1000 * 60); // minutes
    })
    .filter((t) => t > 0 && t < 120);

  const avgConsultDuration =
    consultTimes.length > 0
      ? Math.round(consultTimes.reduce((s, t) => s + t, 0) / consultTimes.length)
      : 15;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Practice Analytics &amp; Clinical Insights
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient Flow Volumes, Professional Fee (PF) Summaries, and Diagnostic Trends
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'MONTH', label: 'Last 30D' },
              { id: 'WEEK', label: 'This Week' },
              { id: 'TODAY', label: 'Today' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id as typeof timeRange)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  timeRange === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="text-xs h-8 px-2.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Consultations */}
        <Card className="p-4 border-brand-100 bg-brand-50/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Completed Consults</p>
            <Stethoscope className="h-4 w-4 text-brand-600" />
          </div>
          <p className="text-3xl font-black text-brand-900 mt-2">{totalConsultations}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Out of {totalPatientsSeen} registered patients
          </p>
        </Card>

        {/* Professional Fees */}
        <Card className="p-4 border-emerald-100 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Gross PF Earnings</p>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-900 mt-2">
            ₱{totalPF.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Compliant with RA 9994 20% discount
          </p>
        </Card>

        {/* Avg Consult Duration */}
        <Card className="p-4 border-blue-100 bg-blue-50/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Avg Consult Time</p>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-900 mt-2">{avgConsultDuration} min</p>
          <p className="text-[11px] text-slate-500 mt-1">Per encounter in Cockpit</p>
        </Card>

        {/* Senior & PWD Proportion */}
        <Card className="p-4 border-amber-100 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Priority (20% Off)</p>
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-900 mt-2">{priorityCount}</p>
          <p className="text-[11px] text-amber-800 font-medium mt-1">
            {seniorCount} Senior · {pwdCount} PWD · {pregnantCount} Pregnant
          </p>
        </Card>
      </div>

      {/* Grid: Channel Distribution & ICD-10 Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Booking Channel Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Patient Lineup Source (Interleaved)</CardTitle>
              <CardDescription>Online Reservations vs Walk-In Registrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ratio bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-emerald-700 flex items-center gap-1">
                    🌐 Online ({onlineCount} pts · {onlinePercent}%)
                  </span>
                  <span className="text-blue-700 flex items-center gap-1">
                    🚶 Walk-In ({walkinCount} pts · {100 - onlinePercent}%)
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{ width: `${onlinePercent}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${100 - onlinePercent}%` }}
                    className="h-full bg-blue-500 transition-all duration-500"
                  />
                </div>
              </div>

              {/* Explanatory cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 text-xs">
                  <p className="font-bold text-emerald-900">Online Slot Retention</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    ₱50 GCash deposit ensures higher patient commitment and near-zero no-shows.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 text-xs">
                  <p className="font-bold text-blue-900">Walk-In Balancing</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Secretary registers on arrival; interleaved queue prevents walk-in crowding.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RA 9994 Compliance Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Philippine Statutory Discounts</CardTitle>
              <CardDescription>RA 9994 (Senior Citizen) &amp; RA 10754 (PWD)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="font-semibold text-slate-700">Senior Citizens (20% Off)</span>
                <span className="font-mono font-bold text-slate-900">{seniorCount} consultations</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="font-semibold text-slate-700">PWD Cardholders (20% Off)</span>
                <span className="font-mono font-bold text-slate-900">{pwdCount} consultations</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="font-semibold text-slate-700">Pregnant Priority</span>
                <span className="font-mono font-bold text-slate-900">{pregnantCount} consultations</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Top Diagnoses (ICD-10) */}
        <div className="lg:col-span-7">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Top ICD-10 Diagnoses Encountered</CardTitle>
                  <CardDescription>Clinical cases documented in SOAP Assessments</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {diagnoses.length} distinct conditions
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {diagnoses.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <HeartPulse className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                  <p className="font-semibold">No diagnosis data recorded yet</p>
                  <p className="text-[11px] mt-0.5">Diagnoses saved in the Cockpit will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {diagnoses.map((dx, idx) => {
                    const maxCount = diagnoses[0]?.count || 1;
                    const percent = Math.round((dx.count / maxCount) * 100);

                    return (
                      <div key={dx.code + idx} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                              {dx.code}
                            </span>
                            <p className="font-bold text-slate-900 truncate">{dx.label}</p>
                          </div>
                          <span className="font-bold text-slate-700 shrink-0 ml-2">
                            {dx.count} {dx.count === 1 ? 'case' : 'cases'}
                          </span>
                        </div>

                        {/* Frequency bar */}
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="h-full bg-brand-600 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
