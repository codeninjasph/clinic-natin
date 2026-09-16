'use client';

import * as React from 'react';
import {
  Coins,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  TrendingUp,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  Receipt,
  FileCheck,
  Download,
  RefreshCw,
  Calendar,
  Eye,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  X,
  Check,
  User,
  Phone,
  Clock,
  ExternalLink,
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
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface FinOpsTransaction {
  id: string;
  appointmentId: string;
  amount: number;
  channel: string;
  gatewayRef: string;
  paymongoPaymentIntentId: string | null;
  paymongoClientKey: string | null;
  status: 'SUCCESS' | 'PENDING' | 'REFUNDED' | 'FAILED';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  tokenCode: string;
  queueNumber: number | null;
  appointmentStatus: string;
  platformPaymentStatus: string;
  priorityCategory: string;
  priorityNotes: string | null;

  patientId: string | null;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;

  doctorId: string | null;
  doctorName: string;
  doctorSpecialty: string;

  clinicId: string | null;
  clinicName: string;
  hospital: string;
  roomNumber: string;
}

interface CashierSummary {
  id: string;
  queueSessionId: string;
  sessionDate: string;
  doctorName: string;
  doctorTitle: string;
  doctorSpecialty: string;
  clinicName: string;
  hospitalName: string;
  roomNumber: string;
  secretaryName: string;
  totalPatientsSeen: number;
  totalOnlineBookings: number;
  totalWalkinPatients: number;
  totalPriorityPatients: number;
  totalCashCollected: number;
  totalHmoClaimsCount: number;
  platformDeduction: number;
  netRemittance: number;
  status: 'OPEN' | 'CLOSED_AND_VERIFIED';
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface DoctorSubscriptionItem {
  id: string;
  profileId: string;
  fullName: string;
  title: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  consultationFee: number;
  subscriptionTier: 'free' | 'pro';
  proTierActive: boolean;
  subscriptionExpiresAt: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface FinOpsKPIs {
  totalSettledAmount: number;
  totalSettledCount: number;
  pendingAmount: number;
  pendingCount: number;
  refundedAmount: number;
  refundedCount: number;
  failedAmount: number;
  failedCount: number;
  channelSplit: Record<string, number | { count: number; amount: number }>;
  proDoctorCount?: number;
  monthlySubscriptionRevenue?: number;
}

export default function FinOpsPage() {
  const [activeTab, setActiveTab] = React.useState<
    'TRANSACTIONS' | 'REMITTANCES' | 'SUBSCRIPTIONS' | 'DISPUTES'
  >('TRANSACTIONS');

  // Loading & Error states
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Data sets
  const [transactions, setTransactions] = React.useState<FinOpsTransaction[]>([]);
  const [summaries, setSummaries] = React.useState<CashierSummary[]>([]);
  const [doctors, setDoctors] = React.useState<DoctorSubscriptionItem[]>([]);
  const [disputes, setDisputes] = React.useState<any[]>([]);
  const [kpis, setKpis] = React.useState<FinOpsKPIs>({
    totalSettledAmount: 0,
    totalSettledCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
    refundedAmount: 0,
    refundedCount: 0,
    failedAmount: 0,
    failedCount: 0,
    channelSplit: {},
    proDoctorCount: 0,
    monthlySubscriptionRevenue: 0,
  });

  // Filter states
  const [channelFilter, setChannelFilter] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [disputeFilter, setDisputeFilter] = React.useState<'ALL' | 'PENDING' | 'REFUNDED' | 'FORFEITED'>('ALL');

  // Modals & Drawers
  const [detailTx, setDetailTx] = React.useState<FinOpsTransaction | null>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = React.useState(false);
  const [selectedTxForRefund, setSelectedTxForRefund] = React.useState<FinOpsTransaction | null>(null);
  const [refundReason, setRefundReason] = React.useState('');
  const [isRefunding, setIsRefunding] = React.useState(false);
  const [refundError, setRefundError] = React.useState<string | null>(null);

  // Summary Reconciliation Modal State
  const [reconcileModalOpen, setReconcileModalOpen] = React.useState(false);
  const [selectedSummaryForReconcile, setSelectedSummaryForReconcile] = React.useState<CashierSummary | null>(null);
  const [reconcileNotes, setReconcileNotes] = React.useState('');
  const [isReconciling, setIsReconciling] = React.useState(false);

  // Doctor Tier Modal State
  const [tierModalOpen, setTierModalOpen] = React.useState(false);
  const [selectedDoctorForTier, setSelectedDoctorForTier] = React.useState<DoctorSubscriptionItem | null>(null);
  const [newTier, setNewTier] = React.useState<'free' | 'pro'>('pro');
  const [newExpiry, setNewExpiry] = React.useState<string>('');
  const [isUpdatingTier, setIsUpdatingTier] = React.useState(false);

  // ─── Fetching Logic ──────────────────────────────────────────────────────────

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch KPIs
      const kpiRes = await fetch('/api/admin/finops?view=kpis');
      if (kpiRes.ok) {
        const kpiJson = await kpiRes.json();
        setKpis(kpiJson);
      }

      // 2. Fetch Transactions with current filters
      const txParams = new URLSearchParams({
        view: 'transactions',
        channel: channelFilter,
        status: statusFilter,
      });
      if (searchTerm) txParams.set('search', searchTerm);
      if (dateFrom) txParams.set('dateFrom', dateFrom);
      if (dateTo) txParams.set('dateTo', dateTo);

      const txRes = await fetch(`/api/admin/finops?${txParams.toString()}`);
      if (!txRes.ok) throw new Error('Failed to load transaction ledger');
      const txJson = await txRes.json();
      setTransactions(txJson.transactions || []);

      // 3. Fetch Summaries
      const sumParams = new URLSearchParams({ view: 'summaries' });
      if (dateFrom) sumParams.set('dateFrom', dateFrom);
      if (dateTo) sumParams.set('dateTo', dateTo);
      const sumRes = await fetch(`/api/admin/finops?${sumParams.toString()}`);
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummaries(sumJson.summaries || []);
      }

      // 4. Fetch Doctor Subscriptions
      const docRes = await fetch('/api/admin/finops?view=subscriptions');
      if (docRes.ok) {
        const docJson = await docRes.json();
        setDoctors(docJson.doctors || []);
      }

      // 5. Fetch Disputes
      const dispRes = await fetch('/api/admin/finops?view=disputes');
      if (dispRes.ok) {
        const dispJson = await dispRes.json();
        setDisputes(dispJson.disputes || []);
      }
    } catch (err: unknown) {
      console.error('Error fetching finops data:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error loading financial operations data');
    } finally {
      setIsLoading(false);
    }
  }, [channelFilter, statusFilter, searchTerm, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  // Process Real PayMongo Refund
  const handleTriggerRefund = async () => {
    if (!selectedTxForRefund) return;
    if (!refundReason.trim()) {
      setRefundError('Please specify the refund reason for accounting reconciliation.');
      return;
    }
    setRefundError(null);
    setIsRefunding(true);

    try {
      const res = await fetch('/api/admin/finops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REFUND',
          transactionId: selectedTxForRefund.id,
          reason: refundReason.trim(),
          adminActor: 'Admin Ops',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      setSuccessMessage(`Refund of ₱${selectedTxForRefund.amount.toFixed(2)} processed via PayMongo gateway.`);
      setRefundModalOpen(false);
      setDetailTx(null);
      setSelectedTxForRefund(null);
      setRefundReason('');
      fetchData();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : 'Unknown refund error occurred');
    } finally {
      setIsRefunding(false);
    }
  };

  // Reconcile Daily Cashier Summary
  const handleReconcileSummary = async () => {
    if (!selectedSummaryForReconcile) return;
    setIsReconciling(true);

    try {
      const res = await fetch('/api/admin/finops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECONCILE_SUMMARY',
          summaryId: selectedSummaryForReconcile.id,
          adminNotes: reconcileNotes.trim() || 'Verified and approved by admin',
          adminActor: 'Admin Ops',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile summary');

      setSuccessMessage(`Daily summary for ${selectedSummaryForReconcile.clinicName} verified and locked.`);
      setReconcileModalOpen(false);
      setSelectedSummaryForReconcile(null);
      setReconcileNotes('');
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reconcile summary');
    } finally {
      setIsReconciling(false);
    }
  };

  // Update Doctor Subscription Tier
  const handleUpdateDoctorTier = async () => {
    if (!selectedDoctorForTier) return;
    setIsUpdatingTier(true);

    try {
      const res = await fetch('/api/admin/finops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_DOCTOR_TIER',
          doctorId: selectedDoctorForTier.id,
          tier: newTier,
          expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null,
          adminActor: 'Admin Ops',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription tier');

      setSuccessMessage(`Updated ${selectedDoctorForTier.fullName} to ${newTier.toUpperCase()} tier.`);
      setTierModalOpen(false);
      setSelectedDoctorForTier(null);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update doctor tier');
    } finally {
      setIsUpdatingTier(false);
    }
  };

  // Quick Date Range Presets
  const applyDatePreset = (preset: 'TODAY' | 'LAST7' | 'LAST30' | 'THIS_MONTH' | 'ALL') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    if (preset === 'TODAY') {
      const dStr = formatDate(today);
      setDateFrom(dStr);
      setDateTo(dStr);
      return;
    }
    if (preset === 'LAST7') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setDateFrom(formatDate(past));
      setDateTo(formatDate(today));
      return;
    }
    if (preset === 'LAST30') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setDateFrom(formatDate(past));
      setDateTo(formatDate(today));
      return;
    }
    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(formatDate(firstDay));
      setDateTo(formatDate(today));
      return;
    }
  };

  // ─── CSV Export Functionality ───────────────────────────────────────────────

  const exportTransactionsCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Token Code',
      'Patient Name',
      'Doctor Name',
      'Hospital Center',
      'Channel',
      'Gateway Reference',
      'PayMongo Intent ID',
      'Amount (PHP)',
      'Status',
    ];

    const rows = transactions.map((t) => [
      `"${t.id}"`,
      `"${t.createdAt}"`,
      `"${t.tokenCode}"`,
      `"${t.patientName.replace(/"/g, '""')}"`,
      `"${t.doctorName.replace(/"/g, '""')}"`,
      `"${t.hospital.replace(/"/g, '""')}"`,
      `"${t.channel}"`,
      `"${t.gatewayRef}"`,
      `"${t.paymongoPaymentIntentId || ''}"`,
      t.amount.toFixed(2),
      `"${t.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clinic_natin_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSummariesCSV = () => {
    if (summaries.length === 0) return;
    const headers = [
      'Summary ID',
      'Date',
      'Clinic Name',
      'Hospital',
      'Doctor',
      'Secretary',
      'Over Counter Cash (PHP)',
      'Online Bookings Count',
      'HMO Claims Count',
      'Platform Deductions (PHP)',
      'Net Remittance (PHP)',
      'Status',
      'Notes',
    ];

    const rows = summaries.map((s) => [
      `"${s.id}"`,
      `"${s.sessionDate}"`,
      `"${s.clinicName.replace(/"/g, '""')}"`,
      `"${s.hospitalName.replace(/"/g, '""')}"`,
      `"${s.doctorName.replace(/"/g, '""')}"`,
      `"${s.secretaryName.replace(/"/g, '""')}"`,
      s.totalCashCollected.toFixed(2),
      s.totalOnlineBookings,
      s.totalHmoClaimsCount,
      s.platformDeduction.toFixed(2),
      s.netRemittance.toFixed(2),
      `"${s.status}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clinic_natin_cashier_summaries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSubscriptionsCSV = () => {
    if (doctors.length === 0) return;
    const headers = [
      'Doctor ID',
      'Doctor Name',
      'Specialty',
      'Subscription Tier',
      'Active Status',
      'Expires At',
      'Consultation Fee (PHP)',
      'Phone Number',
      'Email',
    ];

    const rows = doctors.map((d) => [
      `"${d.id}"`,
      `"${d.fullName.replace(/"/g, '""')}"`,
      `"${d.specialty.replace(/"/g, '""')}"`,
      `"${d.subscriptionTier.toUpperCase()}"`,
      `"${d.proTierActive ? 'ACTIVE' : 'INACTIVE'}"`,
      `"${d.subscriptionExpiresAt || 'N/A'}"`,
      d.consultationFee.toFixed(2),
      `"${d.phone || ''}"`,
      `"${d.email || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clinic_natin_doctor_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 1. Notifications & Alerts */}
      {successMessage && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium">{successMessage}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSuccessMessage(null)}
            className="h-6 w-6 p-0 text-emerald-700 hover:bg-emerald-100 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">{errorMessage}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setErrorMessage(null)}
            className="h-6 w-6 p-0 text-rose-700 hover:bg-rose-100 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Alert>
      )}

      {/* 2. Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Coins className="h-6 w-6 text-brand-700" />
            FinOps, Payments & Revenue Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Platform convenience fees (₱50), live PayMongo sandbox gateway, cashier end-of-day reconciliations & doctor subscriptions.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
          <Button
            size="sm"
            variant={activeTab === 'TRANSACTIONS' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('TRANSACTIONS')}
            className="text-xs font-semibold h-8"
          >
            Platform Fees (₱50)
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'REMITTANCES' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('REMITTANCES')}
            className="text-xs font-semibold h-8"
          >
            Daily Cashier Remittances
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'SUBSCRIPTIONS' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('SUBSCRIPTIONS')}
            className="text-xs font-semibold h-8 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3 text-amber-500" />
            Doctor Subscriptions
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'DISPUTES' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('DISPUTES')}
            className="text-xs font-semibold h-8 flex items-center gap-1"
          >
            <ShieldAlert className="h-3 w-3 text-rose-500" />
            Disputes & Forfeitures
          </Button>
        </div>
      </div>

      {/* 3. Top Real-Time KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Settled Convenience Fees */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Settled Convenience Fees
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-0.5">
              ₱{kpis.totalSettledAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{kpis.totalSettledCount} transactions settled</span>
          </CardContent>
        </Card>

        {/* Primary Channels */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Channel Split
            </CardDescription>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-slate-900">
                {Object.keys(kpis.channelSplit || {}).length > 0
                  ? Object.keys(kpis.channelSplit).join(' • ')
                  : 'GCash • Maya • QRPh'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            <span>Powered via PayMongo Sandbox Gateway</span>
          </CardContent>
        </Card>

        {/* Pending & Disputed/Refunded */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Disputed / Refunded
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 mt-0.5">
              ₱{kpis.refundedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            <span>{kpis.refundedCount} refunds • {kpis.pendingCount} pending</span>
          </CardContent>
        </Card>

        {/* Doctor PRO Subscriptions */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              PRO Tier SaaS Revenue
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-brand-700 mt-0.5">
              ₱{(kpis.monthlySubscriptionRevenue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500">/mo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            <span>{kpis.proDoctorCount || 0} active PRO doctor subscriptions</span>
          </CardContent>
        </Card>
      </div>

      {/* 4. Global Filters & Date Range Bar */}
      <Card className="bg-white border-slate-200 shadow-xs p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search token code, patient name, doctor, or gateway ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 border-slate-200 rounded-lg"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Date range pickers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyDatePreset('TODAY')}
                className="text-[11px] h-7 px-2 border-slate-200"
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyDatePreset('LAST7')}
                className="text-[11px] h-7 px-2 border-slate-200"
              >
                7d
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyDatePreset('THIS_MONTH')}
                className="text-[11px] h-7 px-2 border-slate-200"
              >
                Month
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => applyDatePreset('ALL')}
                className="text-[11px] h-7 px-2 text-slate-500"
              >
                Clear
              </Button>
            </div>

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              disabled={isLoading}
              className="text-xs h-9 border-slate-200 flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-brand-700' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 5. TAB 1: Platform Fee Transactions Ledger */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Convenience Fee Transactions ({transactions.length} records)
              </h2>
              {isLoading && <span className="text-xs text-slate-400">Loading...</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Channel filter pills */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                {['ALL', 'GCASH', 'MAYA', 'QRPH', 'CARD'].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      channelFilter === ch
                        ? 'bg-brand-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                {['ALL', 'SUCCESS', 'PENDING', 'REFUNDED', 'FAILED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Export CSV Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={exportTransactionsCSV}
                disabled={transactions.length === 0}
                className="text-xs h-8 border-slate-200 flex items-center gap-1 text-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token & Patient</TableHead>
                  <TableHead>Attending Doctor</TableHead>
                  <TableHead>Hospital Center</TableHead>
                  <TableHead>Fee Amount</TableHead>
                  <TableHead>Channel & Gateway Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                      No convenience fee transactions matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div>
                          <span className="font-mono font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-900">
                            {tx.tokenCode}
                          </span>
                          <p className="text-xs font-semibold text-slate-800 mt-1">{tx.patientName}</p>
                          {tx.patientPhone && (
                            <p className="text-[10px] text-slate-400">{tx.patientPhone}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-medium text-slate-700">
                        {tx.doctorName}
                        <p className="text-[10px] text-slate-400">{tx.doctorSpecialty}</p>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {tx.hospital}
                        {tx.roomNumber && <p className="text-[10px] text-slate-400">Room {tx.roomNumber}</p>}
                      </TableCell>

                      <TableCell className="text-xs font-bold text-slate-900">
                        ₱{tx.amount.toFixed(2)}
                      </TableCell>

                      <TableCell>
                        <div>
                          <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-slate-50">
                            {tx.channel}
                          </Badge>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={tx.gatewayRef}>
                            {tx.gatewayRef}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : tx.status === 'REFUNDED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : tx.status === 'PENDING'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDetailTx(tx)}
                            className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2 flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </Button>

                          {tx.status === 'SUCCESS' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTxForRefund(tx);
                                setRefundReason('');
                                setRefundError(null);
                                setRefundModalOpen(true);
                              }}
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 6. TAB 2: Daily Cashier Remittances */}
      {activeTab === 'REMITTANCES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                End-of-Day Clinic Cashier Summaries ({summaries.length} sessions)
              </h2>
              <p className="text-xs text-slate-500">
                Over-the-counter consultation collections, HMO claims filed, and automated platform fee deductions (₱50 per online booking).
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={exportSummariesCSV}
              disabled={summaries.length === 0}
              className="text-xs h-8 border-slate-200 flex items-center gap-1 text-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic & Doctor</TableHead>
                  <TableHead>Hospital Center</TableHead>
                  <TableHead>Over-the-Counter Cash</TableHead>
                  <TableHead>HMO Claims Filed</TableHead>
                  <TableHead>Platform Deduction</TableHead>
                  <TableHead>Net Doctor Remittance</TableHead>
                  <TableHead className="text-right">Reconciliation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-500">
                      No cashier summaries available for the selected dates.
                    </TableCell>
                  </TableRow>
                ) : (
                  summaries.map((summary) => (
                    <TableRow key={summary.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            {summary.doctorTitle} {summary.doctorName}
                          </p>
                          <p className="text-[11px] text-slate-500">{summary.clinicName}</p>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {summary.sessionDate}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {summary.hospitalName}
                        {summary.roomNumber && <p className="text-[10px] text-slate-400">Room {summary.roomNumber}</p>}
                      </TableCell>

                      <TableCell className="text-xs font-bold text-slate-900">
                        ₱{summary.totalCashCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        <p className="text-[10px] text-slate-400 font-normal">
                          {summary.totalWalkinPatients} walk-ins • {summary.totalPatientsSeen} total seen
                        </p>
                      </TableCell>

                      <TableCell>
                        <div>
                          <span className="text-xs font-semibold text-slate-800">
                            {summary.totalHmoClaimsCount} claims
                          </span>
                          <p className="text-[10px] text-slate-400">Maxicare, PhilHealth, Medicard</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-rose-600">
                        -₱{summary.platformDeduction.toFixed(2)}
                        <p className="text-[10px] text-slate-400 font-normal">
                          {summary.totalOnlineBookings} online @ ₱50
                        </p>
                      </TableCell>

                      <TableCell className="text-xs font-bold text-emerald-700">
                        ₱{summary.netRemittance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              summary.status === 'CLOSED_AND_VERIFIED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {summary.status === 'CLOSED_AND_VERIFIED' ? 'VERIFIED' : 'PENDING'}
                          </Badge>

                          {summary.status === 'OPEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSummaryForReconcile(summary);
                                setReconcileNotes('');
                                setReconcileModalOpen(true);
                              }}
                              className="h-7 text-xs border-slate-200 hover:border-emerald-500 hover:text-emerald-700 font-semibold"
                            >
                              Verify & Reconcile
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 7. TAB 3: Doctor Subscriptions (PRO) */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Doctor Subscriptions & Platform SaaS Revenue
              </h2>
              <p className="text-xs text-slate-500">
                Clinic Natin PRO Tier subscription management (₱1,499/mo). Grants custom schedule overrides, clinical EMR, and prescription issuance.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={exportSubscriptionsCSV}
              disabled={doctors.length === 0}
              className="text-xs h-8 border-slate-200 flex items-center gap-1 text-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attending Doctor</TableHead>
                  <TableHead>Medical Specialty</TableHead>
                  <TableHead>Consultation Fee</TableHead>
                  <TableHead>Subscription Tier</TableHead>
                  <TableHead>Status & Expiration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-500">
                      No doctor records registered in platform.
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            {doc.title} {doc.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400">{doc.email || doc.phone || 'No contact on file'}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-700">
                        {doc.specialty}
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-900">
                        ₱{doc.consultationFee.toFixed(2)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold tracking-wide uppercase ${
                            doc.subscriptionTier === 'pro'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {doc.subscriptionTier === 'pro' ? '★ PRO TIER' : 'FREE TIER'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          {doc.proTierActive ? (
                            <span className="font-semibold text-emerald-700">Active</span>
                          ) : (
                            <span className="text-slate-400">Inactive</span>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {doc.subscriptionExpiresAt
                              ? `Expires: ${new Date(doc.subscriptionExpiresAt).toLocaleDateString()}`
                              : 'No expiration date'}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDoctorForTier(doc);
                            setNewTier(doc.subscriptionTier);
                            setNewExpiry(doc.subscriptionExpiresAt ? doc.subscriptionExpiresAt.slice(0, 10) : '');
                            setTierModalOpen(true);
                          }}
                          className="h-7 text-xs border-slate-200 font-semibold"
                        >
                          Manage Tier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 8. TAB 4: Disputes & Forfeitures */}
      {activeTab === 'DISPUTES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                Disputes & Forfeitures Queue ({disputes.length} flagged records)
              </h2>
              <p className="text-xs text-slate-500">
                Review appointments with forfeited platform convenience fees, clinic cancellations, pending checkouts, or refund claims.
              </p>
            </div>

            {/* Filter pills for Disputes */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
              {(['ALL', 'PENDING', 'REFUNDED', 'FORFEITED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setDisputeFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    disputeFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token & Patient</TableHead>
                  <TableHead>Attending Doctor & Clinic</TableHead>
                  <TableHead>Cancellation / Dispute Reason</TableHead>
                  <TableHead>Fee Status</TableHead>
                  <TableHead className="text-right">Administrative Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.filter((d) => disputeFilter === 'ALL' || d.platform_payment_status === disputeFilter).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-xs text-slate-500">
                      No dispute, pending, or forfeited records matching current filter ({disputeFilter}).
                    </TableCell>
                  </TableRow>
                ) : (
                  disputes
                    .filter((d) => disputeFilter === 'ALL' || d.platform_payment_status === disputeFilter)
                    .map((disp) => {
                      const patient = disp.profiles;
                      const qs = disp.queue_sessions;
                      const doc = qs?.doctors;
                      const clinic = qs?.clinics;
                      const tx = disp.transactions?.[0];
                      const docFullName = doc?.profiles?.full_name || '';
                      const formattedDocName = docFullName.startsWith('Dr.') ? docFullName : `${doc?.title || 'Dr.'} ${docFullName}`;

                      return (
                        <TableRow key={disp.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell>
                            <div>
                              <span className="font-mono font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-900">
                                {disp.token_code}
                              </span>
                              <p className="text-xs font-semibold text-slate-800 mt-1">
                                {patient?.full_name || 'Anonymous Patient'}
                              </p>
                              <p className="text-[10px] text-slate-400">{patient?.phone_number || ''}</p>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs">
                            <p className="font-semibold text-slate-900">{formattedDocName}</p>
                            <p className="text-[11px] text-slate-500">{clinic?.name} ({clinic?.hospital_name})</p>
                          </TableCell>

                          <TableCell className="text-xs text-slate-700 max-w-[280px]">
                            <p
                              className={`p-2 rounded-lg text-[11px] border ${
                                disp.platform_payment_status === 'PENDING'
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : disp.platform_payment_status === 'REFUNDED'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : 'bg-rose-50 border-rose-200 text-rose-900'
                              }`}
                            >
                              {disp.priority_notes ||
                                (disp.platform_payment_status === 'PENDING'
                                  ? 'Patient initiated online reservation; payment intent is awaiting customer completion in gateway.'
                                  : 'Patient or clinic cancellation flagged for fee forfeiture.')}
                            </p>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={`text-[10px] font-bold uppercase ${
                                disp.platform_payment_status === 'FORFEITED'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : disp.platform_payment_status === 'PENDING'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {disp.platform_payment_status}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {disp.platform_payment_status === 'PENDING' && (
                                <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                  Awaiting Gateway
                                </span>
                              )}

                              {disp.platform_payment_status === 'REFUNDED' && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Refunded via Gateway
                                </span>
                              )}

                              {tx && tx.status === 'SUCCESS' && disp.platform_payment_status !== 'REFUNDED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTxForRefund({
                                      id: tx.id,
                                      appointmentId: disp.id,
                                      amount: Number(tx.amount || 50.0),
                                      channel: tx.payment_channel || 'QRPH',
                                      gatewayRef: tx.gateway_reference || 'N/A',
                                      paymongoPaymentIntentId: tx.paymongo_payment_intent_id,
                                      paymongoClientKey: null,
                                      status: tx.status,
                                      metadata: tx.metadata || {},
                                      createdAt: tx.created_at,
                                      updatedAt: tx.created_at,
                                      tokenCode: disp.token_code,
                                      queueNumber: disp.queue_number,
                                      appointmentStatus: disp.status,
                                      platformPaymentStatus: disp.platform_payment_status,
                                      priorityCategory: 'NONE',
                                      priorityNotes: disp.priority_notes,
                                      patientId: patient?.id,
                                      patientName: patient?.full_name || 'Patient',
                                      patientPhone: patient?.phone_number,
                                      patientEmail: patient?.email,
                                      doctorId: doc?.id,
                                      doctorName: formattedDocName,
                                      doctorSpecialty: doc?.specialty || '',
                                      clinicId: clinic?.id,
                                      clinicName: clinic?.name || '',
                                      hospital: clinic?.hospital_name || '',
                                      roomNumber: '',
                                    });
                                    setRefundReason(`Dispute resolution for cancelled slot ${disp.token_code}`);
                                    setRefundModalOpen(true);
                                  }}
                                  className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 font-semibold"
                                >
                                  Release & Refund
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 9. TRANSACTION DETAIL DRAWER / MODAL */}
      <Dialog open={!!detailTx} onOpenChange={(open) => !open && setDetailTx(null)}>
        <DialogContent className="sm:max-w-lg bg-white border border-slate-200 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-brand-700" />
                Transaction & Payment Intent Details
              </span>
              {detailTx && (
                <Badge
                  className={`text-[10px] font-bold uppercase ${
                    detailTx.status === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : detailTx.status === 'REFUNDED'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {detailTx.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Live PayMongo gateway payment intent payload, appointment token & patient verification.
            </DialogDescription>
          </DialogHeader>

          {detailTx && (
            <div className="space-y-4 py-2 text-xs">
              {/* Financial Snapshot */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Convenience Fee:</span>
                  <span className="text-base font-bold text-emerald-700">₱{detailTx.amount.toFixed(2)} PHP</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Payment Channel:</span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white">
                    {detailTx.channel}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Gateway Reference:</span>
                  <span className="font-mono text-slate-900 font-semibold">{detailTx.gatewayRef}</span>
                </div>
                {detailTx.paymongoPaymentIntentId && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">PayMongo Intent ID:</span>
                    <span className="font-mono text-slate-700 text-[11px]">{detailTx.paymongoPaymentIntentId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Created Timestamp:</span>
                  <span className="text-slate-700">{new Date(detailTx.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Patient & Clinic Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient Info</span>
                  <p className="font-bold text-slate-900 text-xs mt-1">{detailTx.patientName}</p>
                  <p className="text-[11px] text-slate-500">{detailTx.patientPhone || 'No phone number'}</p>
                  <p className="text-[11px] text-slate-500">{detailTx.patientEmail || 'No email'}</p>
                  <div className="pt-1">
                    <span className="font-mono font-bold text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Token: {detailTx.tokenCode}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinic & Doctor</span>
                  <p className="font-bold text-slate-900 text-xs mt-1">{detailTx.doctorName}</p>
                  <p className="text-[11px] text-slate-500">{detailTx.doctorSpecialty}</p>
                  <p className="text-[11px] text-slate-700 font-medium">{detailTx.hospital}</p>
                  {detailTx.roomNumber && <p className="text-[10px] text-slate-400">Room {detailTx.roomNumber}</p>}
                </div>
              </div>

              {/* PayMongo Gateway Metadata Inspector */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Gateway Metadata & Audit Payload
                </span>
                <pre className="rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 p-3 text-[10px] font-mono overflow-x-auto max-h-40">
                  {JSON.stringify(
                    {
                      id: detailTx.id,
                      appointment_id: detailTx.appointmentId,
                      gateway_reference: detailTx.gatewayRef,
                      payment_intent_id: detailTx.paymongoPaymentIntentId,
                      payment_channel: detailTx.channel,
                      status: detailTx.status,
                      metadata: detailTx.metadata,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailTx(null)}
              className="text-xs"
            >
              Close
            </Button>
            {detailTx && detailTx.status === 'SUCCESS' && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSelectedTxForRefund(detailTx);
                  setRefundReason('');
                  setRefundError(null);
                  setRefundModalOpen(true);
                }}
                className="text-xs font-bold"
              >
                Issue ₱{detailTx.amount.toFixed(2)} Refund
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10. REAL PAYMONGO REFUND MODAL */}
      <Dialog
        open={refundModalOpen}
        onOpenChange={(open) => {
          setRefundModalOpen(open);
          if (!open) setRefundError(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              Process Gateway Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Executes live refund against PayMongo sandbox gateway and creates compliance audit log.
            </DialogDescription>
          </DialogHeader>

          {refundError && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertTitle className="text-xs font-bold">Refund Failed</AlertTitle>
              <AlertDescription className="text-xs">{refundError}</AlertDescription>
            </Alert>
          )}

          {selectedTxForRefund && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Token Code:</span>
                  <strong className="font-mono text-slate-900">{selectedTxForRefund.tokenCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <strong className="text-slate-900">{selectedTxForRefund.patientName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel / Gateway:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTxForRefund.channel} ({selectedTxForRefund.gatewayRef})
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 mt-1">
                  <span className="text-slate-500">Refund Amount:</span>
                  <strong className="text-rose-600 font-bold">₱{selectedTxForRefund.amount.toFixed(2)} PHP</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Refund / Accounting Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Attending physician called away for emergency surgery; clinic session rescheduled."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand-700"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundModalOpen(false)}
              disabled={isRefunding}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleTriggerRefund}
              disabled={isRefunding}
              className="text-xs font-bold flex items-center gap-1"
            >
              {isRefunding ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing via PayMongo...</span>
                </>
              ) : (
                <span>Confirm & Process Refund</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 11. RECONCILE CASHIER SUMMARY MODAL */}
      <Dialog open={reconcileModalOpen} onOpenChange={setReconcileModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Verify & Reconcile Daily Summary
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Locks the cashier session and verifies over-the-counter remittances with platform fee deduction.
            </DialogDescription>
          </DialogHeader>

          {selectedSummaryForReconcile && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor / Clinic:</span>
                  <strong className="text-slate-900">
                    {selectedSummaryForReconcile.doctorTitle} {selectedSummaryForReconcile.doctorName}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hospital:</span>
                  <span className="text-slate-700">{selectedSummaryForReconcile.hospitalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Session Date:</span>
                  <span className="font-mono text-slate-800">{selectedSummaryForReconcile.sessionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Over-the-Counter Cash:</span>
                  <strong className="text-slate-900">
                    ₱{selectedSummaryForReconcile.totalCashCollected.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Platform Fee Deduction:</span>
                  <span>-₱{selectedSummaryForReconcile.platformDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-emerald-700">
                  <span>Net Doctor Remittance:</span>
                  <span>
                    ₱{selectedSummaryForReconcile.netRemittance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Accounting Verification Notes (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bank deposit slip #BDO-9821 validated"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReconcileModalOpen(false)}
              disabled={isReconciling}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleReconcileSummary}
              disabled={isReconciling}
              className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {isReconciling ? 'Locking Summary...' : 'Approve & Reconcile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 12. DOCTOR SUBSCRIPTION TIER MODAL */}
      <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Manage Doctor Subscription Tier
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Override subscription tier and set expiration period for this physician.
            </DialogDescription>
          </DialogHeader>

          {selectedDoctorForTier && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  {selectedDoctorForTier.title} {selectedDoctorForTier.fullName}
                </p>
                <p className="text-slate-500">{selectedDoctorForTier.specialty}</p>
                <p className="text-[11px] text-slate-400">Current Tier: {selectedDoctorForTier.subscriptionTier.toUpperCase()}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Subscription Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTier('free')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                      newTier === 'free'
                        ? 'border-brand-700 bg-brand-50 text-brand-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    FREE TIER
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTier('pro')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                      newTier === 'pro'
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    ★ PRO TIER (₱1,499/mo)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subscription Expiration Date (Optional)
                </label>
                <Input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTierModalOpen(false)}
              disabled={isUpdatingTier}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleUpdateDoctorTier}
              disabled={isUpdatingTier}
              className="text-xs font-bold"
            >
              {isUpdatingTier ? 'Saving Changes...' : 'Update Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
