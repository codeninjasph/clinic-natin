'use client';

import * as React from 'react';
import {
  Megaphone,
  MessageSquare,
  Send,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  RefreshCw,
  Edit3,
  Sliders,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { INITIAL_SMS_LOGS, type SMSLogEntry } from '@/lib/admin/data';

export default function CommunicationsPage() {
  const [smsLogs, setSmsLogs] = React.useState<SMSLogEntry[]>(INITIAL_SMS_LOGS);

  // Broadcast Dispatcher State
  const [targetHospital, setTargetHospital] = React.useState('ALL');
  const [broadcastMessage, setBroadcastMessage] = React.useState(
    'Maria Reyna Medical Arts Bldg is operating on emergency backup power due to regional grid maintenance. Clinic consultation rooms remain fully open.'
  );
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [dispatchSuccess, setDispatchSuccess] = React.useState(false);

  // SMS Templates State
  const [templates, setTemplates] = React.useState({
    bookingConfirmation: 'Clinic Natin: Confirmed! Token {{token_code}} for {{doctor_name}} at {{hospital_room}}. Expected {{call_time}}.',
    advanceWarning: 'Clinic Natin: 2 patients ahead for Token {{token_code}}. Please proceed to {{hospital_room}} waiting area.',
    nowServing: 'Clinic Natin: NOW SERVING Token {{token_code}}. Please enter consultation room with {{doctor_name}}.',
  });

  const [broadcastError, setBroadcastError] = React.useState<string | null>(null);
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = React.useState(false);

  const handleInitiateBroadcast = () => {
    if (!broadcastMessage.trim()) {
      setBroadcastError('Please enter a valid emergency announcement message before transmitting.');
      return;
    }
    setBroadcastError(null);
    setConfirmBroadcastOpen(true);
  };

  const executeSendHospitalBroadcast = () => {
    setIsDispatching(true);

    setTimeout(() => {
      setIsDispatching(false);
      setDispatchSuccess(true);

      const newLog: SMSLogEntry = {
        id: `sms-${Date.now()}`,
        recipientPhone: 'ALL QUEUED (+63-CDO)',
        recipientName: `Target: ${targetHospital}`,
        type: 'EMERGENCY_BROADCAST',
        messageBody: broadcastMessage,
        gatewayStatus: 'DELIVERED',
        latencyMs: 1100,
        dispatchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setSmsLogs((prev) => [newLog, ...prev]);

      // Write to audit log
      const existingAudit = JSON.parse(localStorage.getItem('clinic_natin_audit_logs') || '[]');
      existingAudit.unshift({
        id: `audit-${Date.now()}`,
        actorId: 'admin-super',
        actorName: 'Atty. Rafael Ramos (Admin Ops)',
        actorRole: 'ADMIN',
        action: 'OVERRIDE_TRIGGERED',
        resourceTable: 'notification_logs',
        recordId: newLog.id,
        details: `Emergency Hospital Broadcast sent to ${targetHospital}: "${broadcastMessage.slice(0, 50)}..."`,
        ipAddress: '124.106.129.5',
        timestamp: new Date().toLocaleString(),
      });
      localStorage.setItem('clinic_natin_audit_logs', JSON.stringify(existingAudit));

      setTimeout(() => setDispatchSuccess(false), 4000);
    }, 900);
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-brand-700" />
            Broadcast Communications & SMS Gateway Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Emergency city-wide hospital announcements, Semaphore SMS template management, and delivery telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold">
            Semaphore Gateway: Online
          </Badge>
          <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200 text-xs font-bold">
            4,820 SMS Credits
          </Badge>
        </div>
      </div>

      {/* 2. City-Wide & Hospital Targeted Broadcast Dispatcher */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Radio className="h-4 w-4 text-brand-700 animate-pulse" />
            Targeted Hospital Emergency Dispatcher
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Instantly sends urgent SMS and push notices to all currently queued patients across selected hospital facilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Hospital Facility</label>
              <select
                value={targetHospital}
                onChange={(e) => setTargetHospital(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-700"
              >
                <option value="ALL">All CDO Hospitals (City-Wide)</option>
                <option value="Maria Reyna XU Hospital">Maria Reyna XU Hospital</option>
                <option value="Capitol University Medical Center">Capitol University Medical Center</option>
                <option value="Polymedic Medical Plaza">Polymedic Medical Plaza</option>
                <option value="Northern Mindanao Medical Center">Northern Mindanao Medical Center</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Emergency Broadcast Content <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-700 font-sans"
              />
            </div>
          </div>

          {broadcastError && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{broadcastError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-500">
              Estimated reach: <strong>86 active patient tokens</strong> queued across {targetHospital}.
            </span>

            <Button
              variant="brand"
              size="sm"
              disabled={isDispatching}
              onClick={handleInitiateBroadcast}
              className="text-xs font-bold gap-1.5 shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              {isDispatching ? 'Transmitting...' : 'Dispatch Emergency Broadcast'}
            </Button>
          </div>

          {dispatchSuccess && (
            <Alert variant="success" className="py-2">
              <AlertTitle className="text-xs font-bold">Broadcast Dispatched</AlertTitle>
              <AlertDescription className="text-xs">
                Emergency Broadcast successfully dispatched through Semaphore SMS Gateway.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Confirm Dialog */}
      <ConfirmDialog
        open={confirmBroadcastOpen}
        onOpenChange={setConfirmBroadcastOpen}
        title="Confirm Emergency Hospital Broadcast"
        description={`You are about to transmit this emergency SMS broadcast to all 86 active patient tokens in "${targetHospital}". This action will dispatch live SMS notifications immediately.`}
        confirmLabel="Confirm & Transmit Broadcast"
        cancelLabel="Cancel"
        variant="brand"
        isLoading={isDispatching}
        onConfirm={executeSendHospitalBroadcast}
      />

      {/* 3. Turn Notice SMS Templates */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-brand-700" />
          Automated Queue Turn Notice Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-slate-50">Token Confirmation</Badge>
              <CardTitle className="text-xs font-bold text-slate-900 mt-1">Booking Confirmation SMS</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <textarea
                rows={3}
                value={templates.bookingConfirmation}
                onChange={(e) => setTemplates({ ...templates, bookingConfirmation: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 focus:outline-none focus:border-brand-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Dispatched immediately upon slot reservation.</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200">2 Ahead Warning</Badge>
              <CardTitle className="text-xs font-bold text-slate-900 mt-1">Advance Warning Notice</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <textarea
                rows={3}
                value={templates.advanceWarning}
                onChange={(e) => setTemplates({ ...templates, advanceWarning: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 focus:outline-none focus:border-brand-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Prevents lobby bottlenecks & no-shows.</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">Now Serving</Badge>
              <CardTitle className="text-xs font-bold text-slate-900 mt-1">Now Serving Notice</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <textarea
                rows={3}
                value={templates.nowServing}
                onChange={(e) => setTemplates({ ...templates, nowServing: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 focus:outline-none focus:border-brand-700"
              />
              <p className="text-[10px] text-slate-400 mt-1">Calls patient into the doctor room.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Live Semaphore SMS Gateway Delivery Logs */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-700" />
          Real-Time SMS Gateway Delivery Logs
        </h2>
        <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient & Phone</TableHead>
                <TableHead>Notification Type</TableHead>
                <TableHead>SMS Message Payload</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Telco Latency</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="font-bold text-xs text-slate-900">{log.recipientName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{log.recipientPhone}</p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-slate-50">
                      {log.type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-700 max-w-sm truncate">
                    {log.messageBody}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={`text-[10px] font-bold ${
                        log.gatewayStatus === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {log.gatewayStatus}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs font-mono text-slate-600">
                    {log.latencyMs}ms
                  </TableCell>

                  <TableCell className="text-right text-xs text-slate-500 font-mono">
                    {log.dispatchedAt}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
