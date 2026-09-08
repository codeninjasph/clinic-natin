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
import { INITIAL_FINOPS_TRANSACTIONS, type FinOpsTransaction } from '@/lib/admin/data';

interface CashierSummary {
  clinicName: string;
  hospital: string;
  doctor: string;
  cashOverCounter: number;
  hmoClaimsCount: number;
  hmoClaimsValue: number;
  platformFeesDeducted: number;
  netRemittance: number;
  status: 'RECONCILED' | 'PENDING_REVIEW';
}

const CASHIER_SUMMARIES: CashierSummary[] = [
  {
    clinicName: 'Pediatrics Room 304',
    hospital: 'Maria Reyna XU Hospital',
    doctor: 'Dr. Maria Santos, MD',
    cashOverCounter: 14700.0,
    hmoClaimsCount: 6,
    hmoClaimsValue: 4200.0,
    platformFeesDeducted: 850.0,
    netRemittance: 13850.0,
    status: 'RECONCILED',
  },
  {
    clinicName: 'Cardiology Suite 402',
    hospital: 'Capitol University Medical Center',
    doctor: 'Dr. Juan Carlos Reyes, MD',
    cashOverCounter: 22000.0,
    hmoClaimsCount: 11,
    hmoClaimsValue: 11000.0,
    platformFeesDeducted: 1400.0,
    netRemittance: 20600.0,
    status: 'PENDING_REVIEW',
  },
  {
    clinicName: 'OB-GYN Room 210',
    hospital: 'Polymedic Medical Plaza',
    doctor: 'Dr. Fatima Al-Hassan, MD',
    cashOverCounter: 11900.0,
    hmoClaimsCount: 4,
    hmoClaimsValue: 3400.0,
    platformFeesDeducted: 450.0,
    netRemittance: 11450.0,
    status: 'RECONCILED',
  },
];

export default function FinOpsPage() {
  const [transactions, setTransactions] = React.useState<FinOpsTransaction[]>(INITIAL_FINOPS_TRANSACTIONS);
  const [activeTab, setActiveTab] = React.useState<'TRANSACTIONS' | 'REMITTANCES'>('TRANSACTIONS');
  const [channelFilter, setChannelFilter] = React.useState<string>('ALL');

  // Manual Refund Modal
  const [refundModalOpen, setRefundModalOpen] = React.useState(false);
  const [selectedTxForRefund, setSelectedTxForRefund] = React.useState<FinOpsTransaction | null>(null);
  const [refundReason, setRefundReason] = React.useState('');
  const [refundError, setRefundError] = React.useState<string | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    if (channelFilter === 'ALL') return true;
    return tx.channel === channelFilter;
  });

  const totalFeeCollected = transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleTriggerRefund = () => {
    if (!selectedTxForRefund) return;
    if (!refundReason.trim()) {
      setRefundError('Please specify the refund reason for accounting reconciliation.');
      return;
    }
    setRefundError(null);

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === selectedTxForRefund.id) {
          return {
            ...t,
            status: 'REFUNDED',
          };
        }
        return t;
      })
    );

    // Audit log
    const existingAudit = JSON.parse(localStorage.getItem('clinic_natin_audit_logs') || '[]');
    existingAudit.unshift({
      id: `audit-${Date.now()}`,
      actorId: 'admin-super',
      actorName: 'Atty. Rafael Ramos (Admin Ops)',
      actorRole: 'ADMIN',
      action: 'CHANGED_PRIORITY_CATEGORY',
      resourceTable: 'transactions',
      recordId: selectedTxForRefund.id,
      details: `Dispute Refund issued: ₱${selectedTxForRefund.amount} via ${selectedTxForRefund.channel} (${selectedTxForRefund.gatewayRef}). Reason: ${refundReason}`,
      ipAddress: '124.106.129.5',
      timestamp: new Date().toLocaleString(),
    });
    localStorage.setItem('clinic_natin_audit_logs', JSON.stringify(existingAudit));

    setRefundModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Coins className="h-6 w-6 text-brand-700" />
            FinOps, Payments & Revenue Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Platform convenience fees (₱50), PayMongo payment intents, cashier over-the-counter summaries & remittances.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
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
        </div>
      </div>

      {/* 2. Top FinOps Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Settled Convenience Fees
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-0.5">
              ₱{totalFeeCollected.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>100% Platform Retained Revenue</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Primary Channel Split
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-0.5">
              GCash &bull; Maya &bull; QRPh
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            <span>Powered via PayMongo Gateway</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disputed / Refunded
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-0.5">
              ₱50.00
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            <span>1 automated clinic cancellation refund</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Section: Fee Transactions OR Daily Cashier Summaries */}
      {activeTab === 'TRANSACTIONS' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              Recent Convenience Fee Transactions (GCash, Maya, QRPh, BillEase)
            </h2>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5">
              {['ALL', 'GCASH', 'MAYA', 'QRPH', 'BILLEASE'].map((channel) => (
                <Button
                  key={channel}
                  size="sm"
                  variant={channelFilter === channel ? 'brand' : 'outline'}
                  onClick={() => setChannelFilter(channel)}
                  className="text-xs font-semibold h-7 border-slate-200"
                >
                  {channel}
                </Button>
              ))}
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
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div>
                        <span className="font-mono font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 text-slate-900">
                          {tx.tokenCode}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 mt-1">{tx.patientName}</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-slate-700">
                      {tx.doctorName}
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {tx.hospital}
                    </TableCell>

                    <TableCell className="text-xs font-bold text-slate-900">
                      ₱{tx.amount.toFixed(2)}
                    </TableCell>

                    <TableCell>
                      <div>
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-slate-50">
                          {tx.channel}
                        </Badge>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
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
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {tx.status === 'SUCCESS' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTxForRefund(tx);
                            setRefundReason('');
                            setRefundModalOpen(true);
                          }}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                        >
                          Issue Refund
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : (
        /* Daily Cashier Remittances Section */
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              End-of-Day Clinic Cashier Summaries
            </h2>
            <p className="text-xs text-slate-500">
              Over-the-counter consultation collections, HMO receivables, and platform fee deductions.
            </p>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic & Doctor</TableHead>
                  <TableHead>Hospital Complex</TableHead>
                  <TableHead>Over-the-Counter Cash</TableHead>
                  <TableHead>HMO Claims Filed</TableHead>
                  <TableHead>Platform Deduction</TableHead>
                  <TableHead>Net Doctor Remittance</TableHead>
                  <TableHead className="text-right">Reconciliation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CASHIER_SUMMARIES.map((summary, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{summary.doctor}</p>
                        <p className="text-[11px] text-slate-500">{summary.clinicName}</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      {summary.hospital}
                    </TableCell>

                    <TableCell className="text-xs font-bold text-slate-900">
                      ₱{summary.cashOverCounter.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell>
                      <div>
                        <span className="text-xs font-semibold text-slate-800">
                          ₱{summary.hmoClaimsValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400">{summary.hmoClaimsCount} claims (Maxicare/PhilHealth)</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-rose-600">
                      -₱{summary.platformFeesDeducted.toFixed(2)}
                    </TableCell>

                    <TableCell className="text-xs font-bold text-emerald-700">
                      ₱{summary.netRemittance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          summary.status === 'RECONCILED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {summary.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* 4. Manual Refund Modal (shadcn UI Dialog) */}
      <Dialog open={refundModalOpen} onOpenChange={(open) => { setRefundModalOpen(open); if (!open) setRefundError(null); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              Manual Convenience Fee Refund
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Reconciles with PayMongo gateway to return booking convenience fee.
            </DialogDescription>
          </DialogHeader>

          {refundError && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{refundError}</AlertDescription>
            </Alert>
          )}

          {selectedTxForRefund && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Token Code:</span>
                  <strong className="font-mono text-slate-900">{selectedTxForRefund.tokenCode}</strong>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500">Patient:</span>
                  <strong className="text-slate-900">{selectedTxForRefund.patientName}</strong>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500">Refund Amount:</span>
                  <strong className="text-emerald-700">₱{selectedTxForRefund.amount.toFixed(2)}</strong>
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
                  placeholder="e.g. Doctor cancelled afternoon clinic hours before session started."
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
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleTriggerRefund}
              className="text-xs font-bold"
            >
              Process ₱50.00 Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
