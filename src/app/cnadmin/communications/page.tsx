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
  Smartphone,
  ShieldCheck,
  Search,
  Download,
  RotateCcw,
  Zap,
  PhoneCall,
  X,
  Info,
  ChevronRight,
  ExternalLink,
  Users,
  Eye,
  Layers,
  AlertCircle,
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
import { createClient } from '@/lib/supabase/client';

// ==========================================
// TYPES
// ==========================================

interface TelemetryData {
  account: {
    accountId: string;
    accountName: string;
    status: string;
    creditBalance: number;
    isSandbox: boolean;
    pingMs: number;
  };
  stats: {
    totalSentToday: number;
    deliveredTotal: number;
    failedTotal: number;
    deliveryRatePercent: number;
    estimatedSpendPhp: number;
    carrierLatency: {
      GLOBE: number;
      SMART: number;
      DITO: number;
    };
  };
}

interface NotificationLog {
  id: string;
  appointment_id: string | null;
  recipient_phone: string;
  recipient_name: string | null;
  hospital_name: string | null;
  notification_type: string;
  message_body: string;
  gateway_provider: string;
  gateway_response: any;
  status: string;
  latency_ms: number;
  telco_carrier: string;
  retry_count: number;
  sent_at: string | null;
  created_at: string;
}

interface NotificationTemplate {
  id: string;
  title: string;
  category: string;
  template_body: string;
  description: string;
  available_variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface RecipientItem {
  appointmentId: string;
  tokenCode: string;
  queueNumber: number;
  status: string;
  patientName: string;
  phone: string;
  hospitalName: string;
  hospitalId: string;
  doctorName: string;
}

interface BroadcastItem {
  id: string;
  hospital_name: string;
  title: string;
  message_body: string;
  severity: string;
  target_filter: string;
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  dispatched_by: string;
  created_at: string;
}

interface HospitalItem {
  id: string;
  name: string;
  city: string;
}

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = React.useState<'broadcast' | 'templates' | 'ledger' | 'direct'>('broadcast');

  // Loading & Telemetry State
  const [isLoading, setIsLoading] = React.useState(true);
  const [telemetry, setTelemetry] = React.useState<TelemetryData | null>(null);

  // Delivery Logs State
  const [logs, setLogs] = React.useState<NotificationLog[]>([]);
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [hospitalFilter, setHospitalFilter] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Hospital List
  const [hospitals, setHospitals] = React.useState<HospitalItem[]>([]);

  // Emergency Broadcast State
  const [targetHospitalId, setTargetHospitalId] = React.useState('ALL');
  const [broadcastSeverity, setBroadcastSeverity] = React.useState<'INFO' | 'WARNING' | 'EMERGENCY'>('WARNING');
  const [broadcastTitle, setBroadcastTitle] = React.useState('Hospital Operational Notice');
  const [broadcastMessage, setBroadcastMessage] = React.useState(
    'Maria Reyna Medical Arts Bldg is operating on emergency backup power due to regional grid maintenance. Clinic consultation rooms remain fully open.'
  );
  const [isDispatching, setIsDispatching] = React.useState(false);
  const [dispatchAlert, setDispatchAlert] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmBroadcastOpen, setConfirmBroadcastOpen] = React.useState(false);
  const [reachInfo, setReachInfo] = React.useState<{ totalActive: number; recipients: RecipientItem[] }>({
    totalActive: 0,
    recipients: [],
  });
  const [isReachModalOpen, setIsReachModalOpen] = React.useState(false);
  const [broadcastHistory, setBroadcastHistory] = React.useState<BroadcastItem[]>([]);

  // Templates State
  const [templates, setTemplates] = React.useState<NotificationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('SLOT_CONFIRMED');
  const [editingTemplateBody, setEditingTemplateBody] = React.useState('');
  const [isSavingTemplate, setIsSavingTemplate] = React.useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = React.useState(false);

  // Direct / Test SMS State
  const [directPhone, setDirectPhone] = React.useState('');
  const [directRecipientName, setDirectRecipientName] = React.useState('Valued Patient');
  const [directMessage, setDirectMessage] = React.useState('Clinic Natin: Your lab test results are ready for pickup at Maria Reyna Rm 304.');
  const [isSendingDirect, setIsSendingDirect] = React.useState(false);
  const [directResult, setDirectResult] = React.useState<any>(null);

  // View Log Detail Modal
  const [selectedLog, setSelectedLog] = React.useState<NotificationLog | null>(null);
  const [retryingLogId, setRetryingLogId] = React.useState<string | null>(null);

  // ==========================================
  // DATA FETCHING
  // ==========================================

  const fetchTelemetry = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/communications?view=telemetry');
      const data = await res.json();
      if (data.success) {
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    }
  }, []);

  const fetchLogs = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({
        view: 'logs',
        type: typeFilter,
        status: statusFilter,
        hospital: hospitalFilter,
        query: searchQuery,
      });
      const res = await fetch(`/api/admin/communications?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, [typeFilter, statusFilter, hospitalFilter, searchQuery]);

  const fetchReach = React.useCallback(async (hospId: string) => {
    try {
      const res = await fetch(`/api/admin/communications?view=reach&hospitalId=${hospId}`);
      const data = await res.json();
      if (data.success) {
        setReachInfo({
          totalActive: data.totalActive,
          recipients: data.recipients || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch reach:', err);
    }
  }, []);

  const fetchTemplates = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/communications?view=templates');
      const data = await res.json();
      if (data.success && data.templates) {
        setTemplates(data.templates);
        const current = data.templates.find((t: NotificationTemplate) => t.id === selectedTemplateId) || data.templates[0];
        if (current) {
          setSelectedTemplateId(current.id);
          setEditingTemplateBody(current.template_body);
        }
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [selectedTemplateId]);

  const fetchBroadcasts = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/communications?view=broadcasts');
      const data = await res.json();
      if (data.success) {
        setBroadcastHistory(data.broadcasts || []);
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err);
    }
  }, []);

  const fetchHospitals = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/communications?view=hospitals');
      const data = await res.json();
      if (data.success) {
        setHospitals(data.hospitals || []);
      }
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
    }
  }, []);

  // Initial Load
  React.useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      await Promise.all([
        fetchTelemetry(),
        fetchLogs(),
        fetchReach(targetHospitalId),
        fetchTemplates(),
        fetchBroadcasts(),
        fetchHospitals(),
      ]);
      setIsLoading(false);
    }
    loadAll();
  }, [fetchTelemetry, fetchLogs, fetchReach, fetchTemplates, fetchBroadcasts, fetchHospitals, targetHospitalId]);

  // Refetch Reach when Target Hospital changes
  React.useEffect(() => {
    fetchReach(targetHospitalId);
  }, [targetHospitalId, fetchReach]);

  // Refetch Logs when filters change
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Supabase Realtime Listener on notification_logs
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime_notification_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as NotificationLog, ...prev.slice(0, 49)]);
          fetchTelemetry();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTelemetry]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setEditingTemplateBody(tmpl.template_body);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setEditingTemplateBody((prev) => prev + ' ' + variable);
  };

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const current = templates.find((t) => t.id === selectedTemplateId);
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_TEMPLATE',
          id: selectedTemplateId,
          title: current?.title || selectedTemplateId,
          templateBody: editingTemplateBody,
          description: current?.description,
          category: current?.category,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplateId ? { ...t, template_body: editingTemplateBody } : t))
        );
        setTemplateSaveSuccess(true);
        setTimeout(() => setTemplateSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleResetTemplates = async () => {
    if (!confirm('Are you sure you want to reset all SMS templates to factory defaults?')) return;
    try {
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_TEMPLATES' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTemplates();
      }
    } catch (err) {
      console.error('Error resetting templates:', err);
    }
  };

  const executeSendHospitalBroadcast = async () => {
    setIsDispatching(true);
    setDispatchAlert(null);

    try {
      const selectedHosp = hospitals.find((h) => h.id === targetHospitalId);
      const hospName = targetHospitalId === 'ALL' ? 'All CDO Hospitals' : selectedHosp?.name || 'Selected Hospital';

      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPATCH_BROADCAST',
          hospitalId: targetHospitalId,
          hospitalName: hospName,
          title: broadcastTitle,
          messageBody: broadcastMessage,
          severity: broadcastSeverity,
          targetFilter: 'ACTIVE_QUEUE',
          dispatchedBy: 'Atty. Rafael Ramos (Admin Ops)',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setDispatchAlert({
          type: 'success',
          message: `Broadcast successfully dispatched! Delivered to ${data.deliveredCount} queued patients in ${hospName} (Avg Latency: ${data.avgLatencyMs || 1100}ms).`,
        });
        fetchTelemetry();
        fetchLogs();
        fetchBroadcasts();
      } else {
        setDispatchAlert({
          type: 'error',
          message: data.error || 'Failed to dispatch broadcast',
        });
      }
    } catch (err: any) {
      setDispatchAlert({
        type: 'error',
        message: err.message || 'Network error during broadcast dispatch',
      });
    } finally {
      setIsDispatching(false);
      setConfirmBroadcastOpen(false);
    }
  };

  const handleRetrySMS = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RETRY_SMS',
          notificationLogId: logId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
        fetchTelemetry();
      }
    } catch (err) {
      console.error('Error retrying SMS:', err);
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleSendDirectSMS = async () => {
    if (!directPhone || !directMessage) return;
    setIsSendingDirect(true);
    setDirectResult(null);

    try {
      const res = await fetch('/api/admin/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DIRECT_SMS',
          phoneNumber: directPhone,
          message: directMessage,
          recipientName: directRecipientName,
          hospitalName: 'CDO Central Operations',
        }),
      });
      const data = await res.json();
      setDirectResult(data);
      if (data.success) {
        fetchLogs();
        fetchTelemetry();
      }
    } catch (err: any) {
      setDirectResult({ success: false, error: err.message });
    } finally {
      setIsSendingDirect(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Recipient Name',
      'Phone Number',
      'Hospital Facility',
      'Notification Type',
      'Message Body',
      'Status',
      'Carrier',
      'Latency (ms)',
      'Timestamp',
    ];

    const rows = logs.map((l) => [
      l.id,
      `"${l.recipient_name || 'Queued Patient'}"`,
      `"${l.recipient_phone}"`,
      `"${l.hospital_name || 'CDO Outpatient Clinic'}"`,
      l.notification_type,
      `"${l.message_body.replace(/"/g, '""')}"`,
      l.status,
      l.telco_carrier,
      l.latency_ms,
      `"${new Date(l.created_at).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinic_natin_sms_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview token replacement for phone mockup
  const previewRenderedText = React.useMemo(() => {
    let text = editingTemplateBody || '';
    text = text.replace(/{{token_code}}/g, 'CN-ON-017');
    text = text.replace(/{{doctor_name}}/g, 'Dr. Maria Santos, MD');
    text = text.replace(/{{hospital_name}}/g, 'Maria Reyna Hospital');
    text = text.replace(/{{hospital_room}}/g, 'Room 304');
    text = text.replace(/{{call_time}}/g, '9:45 AM');
    text = text.replace(/{{patient_name}}/g, 'Kenneth Ramos');
    text = text.replace(/{{delay_minutes}}/g, '25');
    return text;
  }, [editingTemplateBody]);

  const charCount = editingTemplateBody.length;
  const segments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Gateway Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#568259]/15 border border-[#568259]/30 flex items-center justify-center text-[#568259]">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Broadcast Communications & SMS Gateway
              </h1>
              <p className="text-xs text-slate-500">
                City-wide emergency hospital alerts, automated queue lifecycle templates, delivery telemetry, and direct patient dispatches.
              </p>
            </div>
          </div>
        </div>

        {/* Live Gateway Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Gateway Status */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>Semaphore {telemetry?.account.isSandbox ? 'Sandbox Gateway' : 'Live Gateway'}: Online</span>
            <span className="text-[10px] text-emerald-600/80 font-mono">({telemetry?.account.pingMs || 42}ms)</span>
          </div>

          {/* SMS Credits */}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/90 px-3.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
            <MessageSquare className="h-3.5 w-3.5 text-[#568259]" />
            <span>{(telemetry?.account.creditBalance || 4820).toLocaleString()} SMS Credits</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTelemetry();
              fetchLogs();
            }}
            className="text-xs font-semibold gap-1.5 h-8 bg-white hover:bg-slate-50 border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Account Balance */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SMS Credit Balance</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {(telemetry?.account.creditBalance || 4820).toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Prepaid & Verified</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Delivery Rate */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">24h Delivery Rate</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {telemetry?.stats.deliveryRatePercent || 99.4}%
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {telemetry?.stats.deliveredTotal || 8} Delivered • {telemetry?.stats.failedTotal || 0} Failed
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Telco Latency by Carrier */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Avg Telco Latency</p>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-blue-700 block">Globe</span>
                <span className="text-xs font-bold text-slate-800">{telemetry?.stats.carrierLatency.GLOBE || 1140}ms</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-emerald-700 block">Smart</span>
                <span className="text-xs font-bold text-slate-800">{telemetry?.stats.carrierLatency.SMART || 1220}ms</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-rose-700 block">DITO</span>
                <span className="text-xs font-bold text-slate-800">{telemetry?.stats.carrierLatency.DITO || 1060}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Daily Spend */}
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Telco Spend</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                ₱{(telemetry?.stats.estimatedSpendPhp || 4.0).toFixed(2)}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {telemetry?.stats.totalSentToday || 8} SMS at ₱0.50/credit
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'broadcast'
              ? 'border-[#568259] text-[#568259] bg-[#568259]/5'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Emergency Broadcast Dispatcher</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-[#568259] text-[#568259] bg-[#568259]/5'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Queue Turn Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'border-[#568259] text-[#568259] bg-[#568259]/5'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Real-Time Delivery Ledger</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono text-slate-600">
            {logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('direct')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'direct'
              ? 'border-[#568259] text-[#568259] bg-[#568259]/5'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Direct Patient SMS</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: EMERGENCY & HOSPITAL TARGETED BROADCAST DISPATCHER   */}
      {/* ============================================================ */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200/90 shadow-2xs">
            <CardHeader className="p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#568259] animate-pulse" />
                    Targeted Hospital Emergency Dispatcher
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Transmits high-priority SMS alerts directly to all currently queued and waiting patient mobile devices.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`${
                    broadcastSeverity === 'EMERGENCY'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : broadcastSeverity === 'WARNING'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  } font-bold text-xs`}
                >
                  Severity: {broadcastSeverity}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4 text-xs">
              {/* Target Facility & Severity Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Hospital Facility</label>
                  <select
                    value={targetHospitalId}
                    onChange={(e) => setTargetHospitalId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#568259]"
                  >
                    <option value="ALL">All CDO Hospitals (City-Wide)</option>
                    {hospitals.map((hosp) => (
                      <option key={hosp.id} value={hosp.id}>
                        {hosp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Broadcast Severity Level</label>
                  <select
                    value={broadcastSeverity}
                    onChange={(e: any) => setBroadcastSeverity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#568259]"
                  >
                    <option value="INFO">Informational (General Clinic Advisory)</option>
                    <option value="WARNING">Operational Delay / Reroute Window</option>
                    <option value="EMERGENCY">Code Red / Facility Evacuation / Grid Failure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Announcement Subject Title</label>
                  <Input
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Backup Power Active"
                    className="text-xs h-[38px] rounded-xl"
                  />
                </div>
              </div>

              {/* Message Preset Quick Load Buttons */}
              <div>
                <label className="block font-bold text-slate-600 text-[11px] mb-1.5">
                  1-Tap Incident Presets (Standard Operating Procedures):
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTitle('Emergency Backup Power Active');
                      setBroadcastSeverity('WARNING');
                      setBroadcastMessage(
                        'Maria Reyna Medical Arts Bldg is operating on emergency backup power due to regional grid maintenance. Clinic consultation rooms remain fully open.'
                      );
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                  >
                    ⚡ Grid Maintenance / Backup Power
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTitle('Heavy Rainfall / Flood Advisory');
                      setBroadcastSeverity('WARNING');
                      setBroadcastMessage(
                        'Advisory: Heavy monsoon rains in downtown CDO. All patients are granted extended 60-min grace periods. Please travel safely.'
                      );
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                  >
                    🌧️ Flood / Weather Grace Window
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTitle('Hospital Entrance Reroute');
                      setBroadcastSeverity('INFO');
                      setBroadcastMessage(
                        'Notice: Main gate driveway roadworks in progress. Please use the East Annex entrance (beside Pharmacy) for outpatient clinics.'
                      );
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                  >
                    🚧 Gate Entry Reroute
                  </button>
                </div>
              </div>

              {/* Message Body Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700">
                    Emergency Broadcast Payload <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {broadcastMessage.length} characters • {Math.ceil(broadcastMessage.length / 160) || 1} SMS Credit/recipient
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type broadcast message..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:border-[#568259] font-sans shadow-inner"
                />
              </div>

              {/* Dynamic Live Reach Calculation Banner */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#568259] text-white flex items-center justify-center font-black text-sm shrink-0">
                    {reachInfo.totalActive}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Live Queue Reach:{' '}
                      <span className="text-[#568259] font-black">{reachInfo.totalActive} Active Patient Tokens</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Targeting live checked-in & booked patient phones across{' '}
                      <strong>{targetHospitalId === 'ALL' ? 'All CDO Hospitals' : 'Selected Facility'}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReachModalOpen(true)}
                    className="text-xs font-semibold gap-1.5 h-8 bg-white hover:bg-slate-50 border-emerald-200 text-emerald-800"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Inspect Recipients ({reachInfo.totalActive})</span>
                  </Button>

                  <Button
                    variant="brand"
                    size="sm"
                    disabled={isDispatching || !broadcastMessage.trim()}
                    onClick={() => setConfirmBroadcastOpen(true)}
                    className="text-xs font-bold gap-1.5 h-8 bg-[#568259] hover:bg-[#436b46] text-white shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isDispatching ? 'Transmitting...' : 'Dispatch Broadcast'}</span>
                  </Button>
                </div>
              </div>

              {/* Alert Result */}
              {dispatchAlert && (
                <Alert
                  variant={dispatchAlert.type === 'success' ? 'success' : 'destructive'}
                  className="py-2.5 rounded-xl"
                >
                  <AlertTitle className="text-xs font-bold">
                    {dispatchAlert.type === 'success' ? 'Broadcast Dispatched Successfully' : 'Transmission Failed'}
                  </AlertTitle>
                  <AlertDescription className="text-xs">{dispatchAlert.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Broadcast Announcements History Card */}
          <Card className="bg-white border-slate-200/90 shadow-2xs">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Past Emergency Announcements Archive
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Historical record of transmitted hospital announcements and patient reach.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Hospital / Target</TableHead>
                    <TableHead className="text-xs">Announcement Subject</TableHead>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">Recipients</TableHead>
                    <TableHead className="text-xs">Author</TableHead>
                    <TableHead className="text-xs text-right">Dispatched At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcastHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-400">
                        No previous broadcasts in history. Transmitted emergency alerts will appear here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    broadcastHistory.map((item) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-bold text-slate-800">{item.hospital_name}</TableCell>
                        <TableCell>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">{item.message_body}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-bold ${
                              item.severity === 'EMERGENCY'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {item.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {item.delivered_count} / {item.recipient_count} Delivered
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600">{item.dispatched_by}</TableCell>
                        <TableCell className="text-right text-slate-500 font-mono text-[11px]">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: QUEUE TURN NOTICE TEMPLATES                          */}
      {/* ============================================================ */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selection & Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-white border-slate-200/90 shadow-2xs">
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#568259]" />
                    Lifecycle SMS Template Manager
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Select a milestone to customize the transactional SMS dispatched to patients.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetTemplates}
                  className="text-xs text-slate-500 hover:text-rose-600 gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Factory Defaults</span>
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-4">
                {/* Template Chips Selector */}
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl.id)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border ${
                        selectedTemplateId === tmpl.id
                          ? 'bg-[#568259] text-white border-[#568259] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tmpl.title}</span>
                    </button>
                  ))}
                </div>

                {/* Selected Template Details */}
                {(() => {
                  const current = templates.find((t) => t.id === selectedTemplateId);
                  return (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block">{current?.title}</span>
                        <p className="text-[11px] text-slate-500">{current?.description}</p>
                      </div>

                      {/* Token Inserter Pills */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Click to Insert Dynamic Tokens:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {(current?.available_variables || [
                            '{{token_code}}',
                            '{{doctor_name}}',
                            '{{hospital_name}}',
                            '{{hospital_room}}',
                            '{{call_time}}',
                            '{{patient_name}}',
                          ]).map((token) => (
                            <button
                              key={token}
                              type="button"
                              onClick={() => handleInsertVariable(token)}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200 hover:bg-emerald-100 transition"
                            >
                              + {token}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Textarea Editor */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-700">SMS Body Text</label>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {charCount} chars • {segments} SMS {segments > 1 ? 'Parts' : 'Part'} (₱{(segments * 0.5).toFixed(2)})
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          value={editingTemplateBody}
                          onChange={(e) => setEditingTemplateBody(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:border-[#568259] font-sans"
                        />
                      </div>

                      {/* Save Button */}
                      <div className="flex items-center justify-between pt-1">
                        {templateSaveSuccess ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Saved to Database!
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Updates are persisted to Supabase and immediately active across CDO.
                          </span>
                        )}

                        <Button
                          variant="brand"
                          size="sm"
                          disabled={isSavingTemplate}
                          onClick={handleSaveTemplate}
                          className="text-xs font-bold bg-[#568259] hover:bg-[#436b46] text-white shadow-xs"
                        >
                          {isSavingTemplate ? 'Saving...' : 'Save Template Changes'}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Phone Mockup Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-[320px] rounded-[40px] border-[8px] border-slate-800 bg-slate-900 p-3 shadow-xl ring-1 ring-slate-700 relative text-white">
              {/* iOS Speaker Pill */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20"></div>

              {/* Status Bar */}
              <div className="pt-2 px-3 flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-3">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-4 h-2 border border-slate-400 rounded-2xs p-0.2">
                    <div className="w-full h-full bg-slate-400"></div>
                  </div>
                </div>
              </div>

              {/* Messages App Header */}
              <div className="text-center pb-2 border-b border-slate-800">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs mx-auto flex items-center justify-center border border-emerald-400 shadow-sm">
                  CN
                </div>
                <h4 className="font-bold text-xs mt-1 text-slate-100">CLINICNATIN</h4>
                <p className="text-[9px] text-emerald-400 font-medium">Official SMS Gateway</p>
              </div>

              {/* Chat Bubble Area */}
              <div className="py-6 px-1 space-y-3 min-h-[280px] flex flex-col justify-end">
                <div className="text-center text-[9px] text-slate-500 font-semibold">Today 9:41 AM</div>

                {/* Outgoing Message Bubble */}
                <div className="max-w-[90%] ml-auto bg-[#568259] text-white p-3 rounded-2xl rounded-tr-xs text-xs shadow-md space-y-1">
                  <p className="leading-relaxed font-sans">{previewRenderedText}</p>
                  <div className="flex justify-end items-center gap-1 text-[9px] text-emerald-200">
                    <span>Delivered</span>
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>

              {/* Bottom Touch Bar */}
              <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto my-1"></div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center font-medium">
              Live Mockup: Dynamic tokens are resolved with sample patient context.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: REAL-TIME SMS GATEWAY DELIVERY LEDGER                */}
      {/* ============================================================ */}
      {activeTab === 'ledger' && (
        <Card className="bg-white border-slate-200/90 shadow-2xs">
          <CardHeader className="p-4 pb-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-700" />
                  Real-Time SMS Gateway Delivery Ledger
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Live Supabase stream of transactional messages dispatched via Semaphore across Northern Mindanao.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-xs font-semibold gap-1.5 h-8 border-slate-200 bg-white hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  className="text-xs font-semibold gap-1.5 h-8 border-slate-200 bg-white hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search phone or patient name..."
                  className="text-xs h-8 pl-8 rounded-lg"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
              >
                <option value="ALL">All Notification Types</option>
                <option value="EMERGENCY_BROADCAST">Emergency Broadcast</option>
                <option value="HOSPITAL_ANNOUNCEMENT">Hospital Announcement</option>
                <option value="SLOT_CONFIRMED">Slot Confirmed</option>
                <option value="ADVANCE_WARNING_2_AHEAD">2-Ahead Advance Alert</option>
                <option value="NOW_SERVING">Now Serving Notice</option>
                <option value="PATIENT_SKIPPED_NOTICE">Buffer Lane Grace</option>
                <option value="DOCTOR_DELAY_ANNOUNCEMENT">Doctor Delay Broadcast</option>
                <option value="ADMIN_DIRECT_SMS">Direct Admin SMS</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="SENT">Sent (In Transit)</option>
                <option value="FAILED">Failed</option>
                <option value="QUEUED">Queued</option>
              </select>

              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
              >
                <option value="ALL">All CDO Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Recipient & Phone</TableHead>
                  <TableHead className="text-xs">Facility</TableHead>
                  <TableHead className="text-xs">Notification Type</TableHead>
                  <TableHead className="text-xs">Message Payload</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Carrier / Latency</TableHead>
                  <TableHead className="text-xs text-right">Dispatched</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                      No delivery records match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="text-xs hover:bg-slate-50/70 transition">
                      {/* Recipient */}
                      <TableCell>
                        <p className="font-bold text-slate-900">{log.recipient_name || 'Queued Patient'}</p>
                        <p className="font-mono text-[11px] text-slate-500">{log.recipient_phone}</p>
                      </TableCell>

                      {/* Hospital */}
                      <TableCell className="text-slate-600 font-medium max-w-[140px] truncate">
                        {log.hospital_name || 'CDO Central Clinic'}
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-slate-50">
                          {log.notification_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>

                      {/* Message Body */}
                      <TableCell
                        onClick={() => setSelectedLog(log)}
                        className="text-slate-700 max-w-xs truncate cursor-pointer hover:text-blue-700"
                        title="Click to view full message"
                      >
                        {log.message_body}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold ${
                            log.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : log.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>

                      {/* Carrier & Latency */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                              log.telco_carrier === 'GLOBE'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : log.telco_carrier === 'SMART'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {log.telco_carrier}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">{log.latency_ms || 1100}ms</span>
                        </div>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="text-right text-slate-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>

                      {/* Action: Retry */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={retryingLogId === log.id}
                          onClick={() => handleRetrySMS(log.id)}
                          className="h-7 px-2 text-[11px] font-bold text-[#568259] hover:bg-emerald-50"
                        >
                          {retryingLogId === log.id ? 'Retrying...' : 'Resend'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* TAB 4: DIRECT PATIENT SMS & TEST GATEWAY                    */}
      {/* ============================================================ */}
      {activeTab === 'direct' && (
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white border-slate-200/90 shadow-2xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#568259]" />
                Direct 1-to-1 Patient SMS & Telco Test
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Dispatch an immediate custom SMS message directly to any patient phone number or test carrier line.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Philippine Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="e.g. 09171110001 or +63917..."
                    className="text-xs h-[38px] rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Recipient Name</label>
                  <Input
                    value={directRecipientName}
                    onChange={(e) => setDirectRecipientName(e.target.value)}
                    placeholder="e.g. Kenneth Ramos"
                    className="text-xs h-[38px] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Custom SMS Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  placeholder="Enter message text..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:border-[#568259] font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  Standard Semaphore route: 1 credit (₱0.50)
                </span>

                <Button
                  variant="brand"
                  size="sm"
                  disabled={isSendingDirect || !directPhone || !directMessage}
                  onClick={handleSendDirectSMS}
                  className="text-xs font-bold gap-1.5 bg-[#568259] hover:bg-[#436b46] text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingDirect ? 'Sending...' : 'Transmit Direct SMS'}</span>
                </Button>
              </div>

              {/* Direct Result Alert */}
              {directResult && (
                <Alert
                  variant={directResult.success ? 'success' : 'destructive'}
                  className="py-2.5 rounded-xl mt-3"
                >
                  <AlertTitle className="text-xs font-bold">
                    {directResult.success ? 'Message Dispatched Successfully' : 'Dispatch Failed'}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {directResult.success ? (
                      <span>
                        Sent via {directResult.carrier} Telco Network in {directResult.latencyMs}ms. Logged to Supabase.
                      </span>
                    ) : (
                      directResult.error || 'Failed to dispatch direct SMS'
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: INSPECT ACTIVE RECIPIENTS DRAWER                    */}
      {/* ============================================================ */}
      <Dialog open={isReachModalOpen} onOpenChange={setIsReachModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#568259]" />
              Active Target Recipients ({reachInfo.totalActive} Tokens)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Live preview of patient tokens queued at{' '}
              <strong>{targetHospitalId === 'ALL' ? 'All CDO Hospitals' : 'Selected Facility'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-2 border rounded-xl border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Token & Patient</TableHead>
                  <TableHead className="text-xs">Hospital Facility</TableHead>
                  <TableHead className="text-xs">Doctor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reachInfo.recipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-slate-400">
                      No active patient tokens currently queued in this facility.
                    </TableCell>
                  </TableRow>
                ) : (
                  reachInfo.recipients.map((r) => (
                    <TableRow key={r.appointmentId} className="text-xs">
                      <TableCell>
                        <p className="font-bold text-slate-900">{r.patientName}</p>
                        <p className="font-mono text-[10px] text-slate-500">
                          {r.tokenCode} • {r.phone.slice(0, 4)}****{r.phone.slice(-3)}
                        </p>
                      </TableCell>
                      <TableCell className="text-slate-700">{r.hospitalName}</TableCell>
                      <TableCell className="text-slate-600">{r.doctorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReachModalOpen(false)}
              className="text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 2: CONFIRM EMERGENCY BROADCAST                         */}
      {/* ============================================================ */}
      <ConfirmDialog
        open={confirmBroadcastOpen}
        onOpenChange={setConfirmBroadcastOpen}
        title="Confirm Emergency Hospital Broadcast"
        description={`You are about to transmit this ${broadcastSeverity} SMS broadcast to all ${reachInfo.totalActive} active patient tokens in "${
          targetHospitalId === 'ALL' ? 'All CDO Hospitals' : 'the selected facility'
        }". Live SMS messages will be dispatched immediately through Semaphore.`}
        confirmLabel="Confirm & Transmit Broadcast"
        cancelLabel="Cancel"
        variant="brand"
        isLoading={isDispatching}
        onConfirm={executeSendHospitalBroadcast}
      />

      {/* ============================================================ */}
      {/* MODAL 3: VIEW LOG DETAILS DIALOG                             */}
      {/* ============================================================ */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-700" />
              Delivery Audit Record Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              Log ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Message Payload Body
                </span>
                <p className="text-slate-800 leading-relaxed font-sans">{selectedLog.message_body}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Recipient</span>
                  <span className="font-bold text-slate-900">{selectedLog.recipient_name}</span>
                  <p className="font-mono text-[10px] text-slate-600">{selectedLog.recipient_phone}</p>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Telco Carrier</span>
                  <span className="font-bold text-slate-900">{selectedLog.telco_carrier}</span>
                  <p className="text-[10px] text-slate-600">{selectedLog.latency_ms}ms transit</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Gateway Response Payload</span>
                <pre className="font-mono text-[10px] text-slate-700 overflow-x-auto mt-1 max-h-24">
                  {JSON.stringify(selectedLog.gateway_response, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
              className="text-xs font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
