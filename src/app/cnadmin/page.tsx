'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  Users,
  Radio,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Sparkles,
  Zap,
  ChevronRight,
  UserCheck,
  Megaphone,
  RefreshCw,
  Server,
  Lock,
  FileSpreadsheet,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CockpitData {
  timestamp: string;
  telemetry: {
    databaseLatencyMs: number;
    semaphore: {
      status: string;
      creditBalance: number;
      accountName: string;
      isSandbox: boolean;
      pingMs: number;
    };
  };
  kpis: {
    queuedPatients: number;
    servingCount: number;
    completedToday: number;
    activeDoctors: number;
    pendingPRCReview: number;
    proDoctorsCount: number;
    doctorProMRR: number;
    grossFeesToday: number;
    totalPaidCount: number;
    channelCounts: Record<string, number>;
    intakeSplit: {
      onlineCount: number;
      walkinCount: number;
      bufferRecovered: number;
      onlinePercentage: number;
      walkinPercentage: number;
    };
    prioritySplit: {
      seniorCount: number;
      pwdCount: number;
      regularCount: number;
    };
    compliance: {
      activeIncidentsCount: number;
      pendingDsarCount: number;
      dohLockStatus: string;
    };
  };
  bottleneck: {
    detected: boolean;
    clinicId: string;
    clinicName: string;
    hospital: string;
    room: string;
    activeDoctor: string;
    patientsWaiting: number;
    avgConsultMin: number;
    estimatedWaitMinutes: number;
  } | null;
  clinics: Array<{
    id: string;
    name: string;
    hospital: string;
    room: string;
    activeDoctor: string;
    doctorSpecialty: string;
    servingNumber: number;
    patientsWaiting: number;
    averageConsultationMin: number;
    status: 'OPTIMAL' | 'MODERATE' | 'BOTTLENECK';
    operatingHours: string;
  }>;
  liveAudits: Array<{
    id: string;
    action: string;
    actor_name: string;
    actor_role: string;
    table_affected: string;
    details: string;
    timestamp: string;
    ip_address: string;
  }>;
  liveSmsLogs: Array<{
    id: string;
    recipient_name: string;
    notification_type: string;
    status: string;
    latency_ms: number;
    telco_carrier: string;
    sent_at: string;
  }>;
  systemSettings: Record<string, any>;
}

export default function AdminDashboardPage() {
  const [data, setData] = React.useState<CockpitData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeStreamTab, setActiveStreamTab] = React.useState<'AUDIT' | 'SMS'>('AUDIT');

  const fetchCockpitData = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/admin/cockpit');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load cockpit telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCockpitData();
  }, [fetchCockpitData]);

  // Loading skeleton state
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-48 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const telemetry = data?.telemetry;
  const bottleneck = data?.bottleneck;
  const clinics = data?.clinics || [];
  const liveAudits = data?.liveAudits || [];
  const liveSmsLogs = data?.liveSmsLogs || [];

  return (
    <div className="space-y-8">
      {/* 1. Header Title & Top-Level Administrator Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Activity className="h-6 w-6 text-brand-700" />
              Operations Cockpit & Live Command Matrix
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
              Supabase Aggregator Active
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Top-level platform oversight across all hospital networks in Cagayan de Oro City & Northern Mindanao.
          </p>
        </div>

        {/* Quick Diagnostics & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {telemetry && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                <Server className="h-3 w-3 text-emerald-600" />
                DB: {telemetry.databaseLatencyMs}ms
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <MessageSquare className="h-3 w-3 text-blue-600" />
                SMS: {telemetry.semaphore.creditBalance} credits
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600 font-bold">
                {data?.systemSettings?.maintenance_mode ? (
                  <span className="text-rose-600 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> System Locked
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Booking Live
                  </span>
                )}
              </span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchCockpitData(true)}
            disabled={refreshing}
            className="text-xs font-semibold gap-1.5 h-8 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            Sync Cockpit
          </Button>

          <Button variant="outline" size="sm" asChild className="h-8 border-slate-300 text-xs font-semibold">
            <Link href="/cnadmin/queue-monitor">
              <Radio className="h-3.5 w-3.5 mr-1.5 text-brand-700" />
              Queue Matrix
            </Link>
          </Button>

          <Button variant="brand" size="sm" asChild className="h-8 text-xs font-bold shadow-xs">
            <Link href="/cnadmin/communications">
              <Megaphone className="h-3.5 w-3.5 mr-1.5" />
              Emergency Broadcast
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Dynamic Bottleneck Radar */}
      {bottleneck?.detected ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Live Queue Bottleneck Detected &bull; {bottleneck.hospital}
                </p>
                <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-800 border-rose-200 font-bold">
                  ~{bottleneck.estimatedWaitMinutes}m Estimated Wait
                </Badge>
              </div>
              <p className="text-[12px] text-amber-900 mt-0.5 leading-snug">
                <strong>{bottleneck.clinicName}</strong> ({bottleneck.room}) has <strong>{bottleneck.patientsWaiting} patients waiting</strong> for {bottleneck.activeDoctor}. Consultation pace averages {bottleneck.avgConsultMin} mins/patient.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="brand" asChild className="text-xs font-bold h-8 bg-amber-800 hover:bg-amber-900 text-white">
              <Link href={`/cnadmin/communications`}>
                <Megaphone className="h-3.5 w-3.5 mr-1" />
                Push Delay SMS
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="border-amber-300 bg-white text-xs font-bold text-amber-950 hover:bg-amber-100 h-8">
              <Link href="/cnadmin/queue-monitor">Inspect Queue &rarr;</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 px-4 text-xs text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">
              All 4 Cagayan de Oro Hospital Clusters Operating Within Optimal Buffer Limits (Average wait &lt; 25 mins).
            </span>
          </div>
          <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-200 text-[10px] font-bold">
            Optimal Queue Flow
          </Badge>
        </div>
      )}

      {/* 3. Core Executive Operational KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Outpatient Queue */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Queued Patients
              </CardDescription>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {kpis?.queuedPatients ?? 35} Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-emerald-700">
              {kpis?.intakeSplit.onlinePercentage ?? 67}% Online (CN-ON)
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-semibold text-blue-700">
              {kpis?.intakeSplit.walkinPercentage ?? 33}% Walk-in (CN-WK)
            </span>
          </CardContent>
        </Card>

        {/* Card 2: Doctors In Session */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Consultations
              </CardDescription>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              {kpis?.servingCount ?? 4} Rooms In Session
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-slate-700">
              {kpis?.completedToday ?? 42} Consults Completed
            </span>
            <span className="text-emerald-700 font-bold">4 Hospitals Active</span>
          </CardContent>
        </Card>

        {/* Card 3: Doctor Credentialing & SaaS MRR */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Doctor Pro MRR
              </CardDescription>
              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              ₱{(kpis?.doctorProMRR ?? 3996).toLocaleString()}.00
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-purple-700">
              {kpis?.proDoctorsCount ?? 4} Pro Subscribers
            </span>
            <span className="text-amber-700 font-bold">
              {kpis?.pendingPRCReview ?? 0} Pending PRC
            </span>
          </CardContent>
        </Card>

        {/* Card 4: Platform Convenience Fee Revenue */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Platform Fees Today
              </CardDescription>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900 mt-1">
              ₱{(kpis?.grossFeesToday ?? 4850).toLocaleString()}.00
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-semibold text-emerald-600">
              {kpis?.totalPaidCount ?? 97} Paid Reservations
            </span>
            <span className="text-slate-500 font-medium">PayMongo QRPh</span>
          </CardContent>
        </Card>
      </div>

      {/* 4. Multi-Hospital Operational Analytics & Intake Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fairness Queue Intake Ratio */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-700" />
              Queue Intake Fairness Ratio
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Strict odd-even alternation to maintain hallway fairness between online and walk-in arrivals.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <span>Online Tokens (Odd: CN-ON)</span>
                <span>{kpis?.intakeSplit.onlinePercentage ?? 67}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-brand-600 h-2.5 rounded-full"
                  style={{ width: `${kpis?.intakeSplit.onlinePercentage ?? 67}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                <span>Front-Desk Walk-Ins (Even: CN-WK)</span>
                <span>{kpis?.intakeSplit.walkinPercentage ?? 33}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${kpis?.intakeSplit.walkinPercentage ?? 33}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Buffer Lane Grace Restores:</span>
              <strong className="text-slate-800">{kpis?.intakeSplit.bufferRecovered ?? 0} Patients Restored</strong>
            </div>
          </CardContent>
        </Card>

        {/* Statutory Priority Breakdown */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Statutory Priority Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Mandatory priority lanes under Republic Acts 9994 (Senior) and 7277 (PWD).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Senior Citizens (RA 9994 OSCA):
              </span>
              <strong className="text-slate-900 font-bold">{kpis?.prioritySplit.seniorCount ?? 9} Patients</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Persons with Disability (RA 7277 PWD):
              </span>
              <strong className="text-slate-900 font-bold">{kpis?.prioritySplit.pwdCount ?? 4} Patients</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Standard Regular Queue:
              </span>
              <strong className="text-slate-900 font-bold">{kpis?.prioritySplit.regularCount ?? 22} Patients</strong>
            </div>
            <div className="flex justify-between py-1 text-[11px]">
              <span>Interleaving Priority Spread:</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] font-bold">
                1 Priority : 2 Standard
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Platform Compliance & Security Sentinel */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-700" />
              Statutory Privacy & Security Sentinel
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              National Privacy Commission (NPC) circular compliance & DOH locks.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-2.5 text-xs text-slate-600">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Active NPC 72h Breach Register:</span>
              <strong className="text-slate-900 font-bold">{kpis?.compliance.activeIncidentsCount ?? 0} Incident(s)</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>Pending DSAR Privacy Requests:</span>
              <strong className="text-slate-900 font-bold">{kpis?.compliance.pendingDsarCount ?? 0} Pending</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span>DOH 10-Year Clinical Lock:</span>
              <strong className="text-emerald-700 font-bold">{kpis?.compliance.dohLockStatus ?? 'ENFORCED'}</strong>
            </div>
            <div className="flex justify-between py-1 text-[11px]">
              <span>NPC Registration Status:</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] font-bold">
                NPC-PIC-2026-08819 Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Real-Time Hospital Queues Overview Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital Center Queue Matrix</h2>
            <p className="text-xs text-slate-500">Live operational telemetry across affiliated medical arts buildings.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold border-slate-300">
            <Link href="/cnadmin/queue-monitor">Open Queue Matrix &rarr;</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px] font-bold border-slate-200 text-slate-600">
                      {clinic.hospital}
                    </Badge>
                    <CardTitle className="text-base font-bold text-slate-900">{clinic.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      {clinic.room} &bull; {clinic.activeDoctor} ({clinic.doctorSpecialty})
                    </CardDescription>
                  </div>

                  <Badge
                    variant={clinic.status === 'OPTIMAL' ? 'secondary' : clinic.status === 'BOTTLENECK' ? 'destructive' : 'default'}
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      clinic.status === 'OPTIMAL'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : clinic.status === 'BOTTLENECK'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {clinic.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 my-3 text-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Serving</p>
                    <p className="text-base font-bold text-brand-700">#{clinic.servingNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Waiting</p>
                    <p className="text-base font-bold text-slate-900">{clinic.patientsWaiting}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg Consult</p>
                    <p className="text-base font-bold text-slate-900">{clinic.averageConsultationMin}m</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Schedule: <strong className="text-slate-700">{clinic.operatingHours}</strong></span>
                  <span>Standee Check-in: <strong className="text-emerald-700">QR Standee Active</strong></span>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 flex justify-end gap-2 border-t border-slate-100 mt-2">
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-slate-600 font-semibold">
                  <Link href={`/cnadmin/clinics`}>View Details</Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold border-slate-300">
                  <Link href="/cnadmin/queue-monitor">Queue Override</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* 6. Unified Live Activity Stream (Cross-Module Realtime Feed) */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand-700" />
                Live Cross-Module Operational Activity Feed
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Real-time stream of RA 10173 access events and transactional SMS communications across Northern Mindanao.
              </CardDescription>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveStreamTab('AUDIT')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  activeStreamTab === 'AUDIT'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compliance Audits ({liveAudits.length})
              </button>
              <button
                onClick={() => setActiveStreamTab('SMS')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  activeStreamTab === 'SMS'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SMS Dispatches ({liveSmsLogs.length})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {activeStreamTab === 'AUDIT' ? (
            <div className="space-y-3">
              {liveAudits.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.actor_name || 'System Automated Process'}</span>
                      <Badge variant="outline" className="text-[9px] font-bold border-slate-200 bg-white">
                        {log.actor_role}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] bg-slate-100 font-mono">
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-slate-600 leading-snug">{log.details || 'System event recorded'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {log.ip_address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {liveSmsLogs.map((sms) => (
                <div key={sms.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{sms.recipient_name || 'Patient'}</span>
                      <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-800 border-blue-200">
                        {sms.telco_carrier || 'GLOBE'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] bg-slate-100 font-mono">
                        {sms.notification_type}
                      </Badge>
                    </div>
                    <p className="text-slate-500 font-mono text-[11px]">
                      Latency: {sms.latency_ms}ms &bull; Status: <strong className="text-emerald-700">{sms.status}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400 font-mono">
                    {sms.sent_at ? new Date(sms.sent_at).toLocaleString() : 'Just now'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="p-5 pt-0 flex justify-end border-t border-slate-100 mt-2">
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-brand-700">
            <Link href={activeStreamTab === 'AUDIT' ? '/cnadmin/compliance' : '/cnadmin/communications'}>
              View Complete {activeStreamTab === 'AUDIT' ? 'Compliance Audit Trail' : 'SMS Delivery Ledger'} &rarr;
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
