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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  INITIAL_CDO_CLINICS,
  INITIAL_DOCTORS,
  INITIAL_FINOPS_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  type CDOClinic,
} from '@/lib/admin/data';

export default function AdminDashboardPage() {
  const [clinics, setClinics] = React.useState<CDOClinic[]>(INITIAL_CDO_CLINICS);
  const pendingDoctorsCount = INITIAL_DOCTORS.filter((d) => d.status === 'PENDING').length;
  const totalWaiting = clinics.reduce((acc, c) => acc + c.patientsWaiting, 0);
  const totalServing = clinics.reduce((acc, c) => acc + (c.servingNumber > 0 ? 1 : 0), 0);
  const bottleneckCount = clinics.filter((c) => c.status === 'BOTTLENECK').length;

  return (
    <div className="space-y-8">
      {/* 1. Header Title & Quick Alert Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Cockpit & Live Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time outpatient throughput across Cagayan de Oro hospital networks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="h-9 border-slate-300 text-xs font-semibold">
            <Link href="/cnadmin/queue-monitor">
              <Radio className="h-3.5 w-3.5 mr-1.5 text-brand-700" />
              Live Queue Matrix
            </Link>
          </Button>

          <Button variant="brand" size="sm" asChild className="h-9 text-xs font-bold shadow-xs">
            <Link href="/cnadmin/communications">
              <Megaphone className="h-3.5 w-3.5 mr-1.5" />
              Emergency Broadcast
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Bottleneck Urgent Banner if any */}
      {bottleneckCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Live Bottleneck Flag: Capitol University Medical Center (Suite 402)
              </p>
              <p className="text-[11px] text-amber-800">
                Average consultation wait time has reached 58 minutes with 28 patients queued. Consider triggering automated patient buffer notification.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" asChild className="border-amber-300 bg-white text-xs font-bold text-amber-900 hover:bg-amber-100">
            <Link href="/cnadmin/queue-monitor">Inspect Queue &rarr;</Link>
          </Button>
        </div>
      )}

      {/* 3. Core Operational KPI Cards (shadcn UI Card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Outpatient Queue */}
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
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {totalWaiting} Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">64% Online Bookings</span>
            <span>&bull; 36% Walk-ins</span>
          </CardContent>
        </Card>

        {/* Currently Serving Rooms */}
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
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {totalServing} Doctors In Session
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">4 CDO Hospital Centers</span>
            <span>&bull; 0 reported delays</span>
          </CardContent>
        </Card>

        {/* Doctor Verification Queue */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Credential Queue
              </CardDescription>
              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {pendingDoctorsCount} Pending PRC
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-purple-700">1 Doctor awaiting review</span>
            <span>&bull; 1 document re-upload</span>
          </CardContent>
        </Card>

        {/* Platform Convenience Fee Revenue */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Convenience Fees Today
              </CardDescription>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              ₱4,850.00
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">97 Transactions</span>
            <span>&bull; GCash, Maya, Cards</span>
          </CardContent>
        </Card>
      </div>

      {/* 4. Real-Time Hospital Queues Overview Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital Center Queue Status</h2>
            <p className="text-xs text-slate-500">Live operational telemetry per affiliated medical center.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 text-xs font-semibold border-slate-300">
            <Link href="/cnadmin/queue-monitor">View All CDO Rooms &rarr;</Link>
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
                  <span>Operating: <strong className="text-slate-700">{clinic.operatingHours}</strong></span>
                  <span>Door Check-in: <strong className="text-emerald-700">QR Standee Active</strong></span>
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

      {/* 5. Split Section: Immutable RA 10173 Audit Activity & Telemetry Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sensitive Clinical Audits */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-brand-700" />
                  RA 10173 Compliance Audit Stream
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Non-deletable log of sensitive medical records and credential accesses.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs font-semibold text-brand-700">
                <Link href="/cnadmin/compliance">Full Audit Trail &rarr;</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {INITIAL_AUDIT_LOGS.slice(0, 4).map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">{log.actorName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                </div>
                <p className="text-slate-600 leading-snug">{log.details}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-bold border-slate-200 bg-white">
                    {log.action}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">{log.ipAddress}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Semaphore & Communication Infrastructure Health */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-blue-700" />
                  Communication Gateway Telemetry
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Semaphore SMS API and Realtime notification health.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs font-semibold text-blue-700">
                <Link href="/cnadmin/communications">SMS Controls &rarr;</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-center">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">SMS Balance</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">4,820</p>
                <span className="text-[10px] text-emerald-700 font-semibold">&bull; Prepaid Credits</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Delivery Rate</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">99.4%</p>
                <span className="text-[10px] text-slate-500">Last 24 hrs</span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Avg Latency</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">1.4s</p>
                <span className="text-[10px] text-slate-500">Telco Gateway</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">Recent Automatic Turn Notices:</p>
              <div className="space-y-2">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600 flex items-center justify-between">
                  <span className="truncate">Token CN-ON001: Dr. Santos (MAB 304)</span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    DELIVERED (1.4s)
                  </Badge>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600 flex items-center justify-between">
                  <span className="truncate">Token CN-ON003: 2 Patients Ahead (CUMC 402)</span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    DELIVERED (1.6s)
                  </Badge>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600 flex items-center justify-between">
                  <span className="truncate">Token CN-ON005: Now Serving (Polymedic 210)</span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    DELIVERED (1.2s)
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
