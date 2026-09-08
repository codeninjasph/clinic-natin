'use client';

import * as React from 'react';
import {
  Radio,
  AlertTriangle,
  Clock,
  Users,
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Building2,
  Calendar,
  Zap,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { INITIAL_CDO_CLINICS, type CDOClinic } from '@/lib/admin/data';

export default function QueueMonitorPage() {
  const [clinics, setClinics] = React.useState<CDOClinic[]>(INITIAL_CDO_CLINICS);
  const [selectedHospitalFilter, setSelectedHospitalFilter] = React.useState<string>('ALL');
  
  // Emergency Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [selectedClinicForOverride, setSelectedClinicForOverride] = React.useState<CDOClinic | null>(null);
  const [overrideAction, setOverrideAction] = React.useState<'PAUSE' | 'RESCHEDULE' | 'EMERGENCY_DELAY'>('PAUSE');
  const [overrideReason, setOverrideReason] = React.useState('');
  const [delayMinutes, setDelayMinutes] = React.useState<number>(30);
  const [overrideError, setOverrideError] = React.useState<string | null>(null);

  const filteredClinics = clinics.filter((c) => {
    if (selectedHospitalFilter === 'ALL') return true;
    return c.hospital.toLowerCase().includes(selectedHospitalFilter.toLowerCase());
  });

  const openOverrideDialog = (clinic: CDOClinic) => {
    setSelectedClinicForOverride(clinic);
    setOverrideReason('');
    setOverrideError(null);
    setOverrideModalOpen(true);
  };

  const handleApplyOverride = () => {
    if (!selectedClinicForOverride) return;
    if (!overrideReason.trim()) {
      setOverrideError('Please specify the official administrative reason (e.g. Hospital brownout, Doctor emergency surgery).');
      return;
    }
    setOverrideError(null);

    setClinics((prev) =>
      prev.map((c) => {
        if (c.id === selectedClinicForOverride.id) {
          return {
            ...c,
            status: overrideAction === 'PAUSE' ? 'PAUSED' : 'MODERATE',
            isOverridden: true,
            overrideReason: `${overrideAction}: ${overrideReason}`,
          };
        }
        return c;
      })
    );

    // Write to audit log
    const existingAudit = JSON.parse(localStorage.getItem('clinic_natin_audit_logs') || '[]');
    existingAudit.unshift({
      id: `audit-${Date.now()}`,
      actorId: 'admin-super',
      actorName: 'Atty. Rafael Ramos (Admin Ops)',
      actorRole: 'ADMIN',
      action: 'OVERRIDE_TRIGGERED',
      resourceTable: 'queue_sessions',
      recordId: selectedClinicForOverride.id,
      details: `Emergency Override triggered for ${selectedClinicForOverride.hospital} (${selectedClinicForOverride.room}): ${overrideAction} - ${overrideReason}`,
      ipAddress: '124.106.129.5 (Admin Ops HQ)',
      timestamp: new Date().toLocaleString(),
    });
    localStorage.setItem('clinic_natin_audit_logs', JSON.stringify(existingAudit));

    setOverrideModalOpen(false);
  };

  const handleResumeQueue = (clinicId: string) => {
    setClinics((prev) =>
      prev.map((c) => {
        if (c.id === clinicId) {
          return {
            ...c,
            status: 'OPTIMAL',
            isOverridden: false,
            overrideReason: undefined,
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Hospital Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Radio className="h-6 w-6 text-brand-700 animate-pulse" />
            City-Wide Live Queue Operations & Bottlenecks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time outpatient queue metrics across Cagayan de Oro Medical Centers.
          </p>
        </div>

        {/* Hospital Selector Filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
          <Button
            size="sm"
            variant={selectedHospitalFilter === 'ALL' ? 'brand' : 'ghost'}
            onClick={() => setSelectedHospitalFilter('ALL')}
            className="text-xs font-semibold h-8"
          >
            All Hospitals
          </Button>
          <Button
            size="sm"
            variant={selectedHospitalFilter === 'Maria Reyna' ? 'brand' : 'ghost'}
            onClick={() => setSelectedHospitalFilter('Maria Reyna')}
            className="text-xs font-semibold h-8"
          >
            Maria Reyna
          </Button>
          <Button
            size="sm"
            variant={selectedHospitalFilter === 'CUMC' ? 'brand' : 'ghost'}
            onClick={() => setSelectedHospitalFilter('CUMC')}
            className="text-xs font-semibold h-8"
          >
            CUMC
          </Button>
          <Button
            size="sm"
            variant={selectedHospitalFilter === 'Polymedic' ? 'brand' : 'ghost'}
            onClick={() => setSelectedHospitalFilter('Polymedic')}
            className="text-xs font-semibold h-8"
          >
            Polymedic
          </Button>
          <Button
            size="sm"
            variant={selectedHospitalFilter === 'NMMC' ? 'brand' : 'ghost'}
            onClick={() => setSelectedHospitalFilter('NMMC')}
            className="text-xs font-semibold h-8"
          >
            NMMC
          </Button>
        </div>
      </div>

      {/* 2. Bottleneck & Telemetry Threshold Rule Callout */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Activity className="h-5 w-5 text-brand-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              Automatic Bottleneck Detection Protocol
            </p>
            <p className="text-[11px] text-slate-500">
              Alert triggers automatically when patient wait time exceeds <strong>90 minutes</strong> or consultation variance diverges &gt; 15 mins.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
            2 Optimal
          </Badge>
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200 font-bold">
            1 Moderate
          </Badge>
          <Badge variant="outline" className="text-xs bg-rose-50 text-rose-800 border-rose-200 font-bold">
            1 Bottleneck
          </Badge>
        </div>
      </div>

      {/* 3. Live Hospital Clinic Queue Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {filteredClinics.map((clinic) => {
          const isBottleneck = clinic.status === 'BOTTLENECK';
          const isPaused = clinic.status === 'PAUSED';

          return (
            <Card
              key={clinic.id}
              className={`bg-white border transition-all shadow-xs ${
                isBottleneck
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : isPaused
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-600 bg-slate-50">
                        {clinic.hospital}
                      </Badge>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs text-slate-500 font-semibold">{clinic.building}</span>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">{clinic.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-600 mt-0.5">
                      {clinic.room} &bull; <strong>{clinic.activeDoctor}</strong> ({clinic.doctorSpecialty})
                    </CardDescription>
                  </div>

                  <Badge
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      clinic.status === 'OPTIMAL'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : clinic.status === 'BOTTLENECK'
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : clinic.status === 'PAUSED'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {clinic.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Emergency Override Banner if active */}
                {clinic.isOverridden && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      Active Queue Override Active
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">{clinic.overrideReason}</p>
                  </div>
                )}

                {/* Queue Numbers Grid */}
                <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serving</p>
                    <p className="text-lg font-bold text-brand-700 mt-0.5">#{clinic.servingNumber}</p>
                    <span className="text-[10px] text-slate-500">Inside Room</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Waiting</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{clinic.patientsWaiting}</p>
                    <span className="text-[10px] text-slate-500">In Lobby</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Consult</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{clinic.averageConsultationMin}m</p>
                    <span className="text-[10px] text-slate-500">Per Patient</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Variance</p>
                    <p className={`text-lg font-bold mt-0.5 ${clinic.waitTimeVarianceMin > 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                      &plusmn;{clinic.waitTimeVarianceMin}m
                    </p>
                    <span className="text-[10px] text-slate-500">Wait Spread</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Operating Hours:</span>
                    <strong className="text-slate-900">{clinic.operatingHours}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Contact Reception Desk:</span>
                    <span className="font-mono text-slate-700">{clinic.contactNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Door Check-in:</span>
                    <span className="font-semibold text-emerald-700">QR Standee Active</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 flex justify-end gap-2 border-t border-slate-100">
                {clinic.isOverridden ? (
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => handleResumeQueue(clinic.id)}
                    className="text-xs font-bold h-8 gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume Queue Session
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openOverrideDialog(clinic)}
                    className="text-xs font-semibold h-8 border-slate-300 gap-1.5 hover:bg-slate-100"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-slate-600" />
                    Emergency Override...
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Emergency Override Dialog (shadcn UI Dialog) */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Administrative Queue Override Trigger
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              For force majeure, hospital power outage, emergency surgery delays, or clinic evacuations.
            </DialogDescription>
          </DialogHeader>

          {selectedClinicForOverride && (
            <div className="space-y-4 py-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <p className="font-bold text-slate-900">{selectedClinicForOverride.hospital}</p>
                <p className="text-slate-600">
                  {selectedClinicForOverride.name} &bull; {selectedClinicForOverride.room}
                </p>
                <p className="text-slate-500 mt-1">
                  Active Doctor: <strong>{selectedClinicForOverride.activeDoctor}</strong> ({selectedClinicForOverride.patientsWaiting} patients waiting)
                </p>
              </div>

              {overrideError && (
                <Alert variant="destructive" className="py-2">
                  <AlertTitle className="text-xs font-bold">Required Information</AlertTitle>
                  <AlertDescription className="text-xs">{overrideError}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Override Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={overrideAction === 'PAUSE' ? 'brand' : 'outline'}
                    onClick={() => setOverrideAction('PAUSE')}
                    className="text-xs font-bold"
                  >
                    Pause Queue
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={overrideAction === 'EMERGENCY_DELAY' ? 'brand' : 'outline'}
                    onClick={() => setOverrideAction('EMERGENCY_DELAY')}
                    className="text-xs font-bold"
                  >
                    Doctor Delay
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={overrideAction === 'RESCHEDULE' ? 'brand' : 'outline'}
                    onClick={() => setOverrideAction('RESCHEDULE')}
                    className="text-xs font-bold"
                  >
                    Reschedule
                  </Button>
                </div>
              </div>

              {overrideAction === 'EMERGENCY_DELAY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delay Duration (Minutes)
                  </label>
                  <Input
                    type="number"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="text-sm bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Administrative Reason & Patient Notice <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Maria Reyna Medical Arts Bldg is operating on generator backup due to regional grid maintenance; queue delayed 30 minutes."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-700"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-900 text-[11px]">
                Triggering this override will automatically dispatch an emergency SMS notice to all <strong>{selectedClinicForOverride.patientsWaiting}</strong> queued patients and record an immutable entry in the RA 10173 audit log.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOverrideModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleApplyOverride}
              className="text-xs font-bold"
            >
              Execute Emergency Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
