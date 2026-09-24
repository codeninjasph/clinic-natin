'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CircleDollarSign,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  Calendar,
  Lock,
  Unlock,
  Loader2,
  Printer,
  History,
  Coins,
  Receipt,
  Users,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Wallet,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useSecretary, Appointment } from '../secretary-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Denomination {
  value: number;
  label: string;
  qty: string;
}

const INITIAL_DENOMINATIONS: Denomination[] = [
  { value: 1000, label: '₱1,000 Bill', qty: '' },
  { value: 500, label: '₱500 Bill', qty: '' },
  { value: 200, label: '₱200 Bill', qty: '' },
  { value: 100, label: '₱100 Bill', qty: '' },
  { value: 50, label: '₱50 Bill', qty: '' },
  { value: 20, label: '₱20 Bill', qty: '' },
];

interface HistoricalSummary {
  id: string;
  queueSessionId: string;
  sessionDate: string;
  sessionStatus: string;
  clinicName?: string;
  hospitalName?: string;
  roomNumber?: string;
  secretaryName: string;
  totalPatientsSeen: number;
  totalOnlineBookings: number;
  totalWalkinPatients: number;
  totalPriorityPatients: number;
  totalCashCollected: number;
  totalHmoClaimsCount: number;
  status: 'OPEN' | 'CLOSED_AND_VERIFIED';
  closedAt: string | null;
  createdAt: string;
  notes: string;
  breakdown: {
    bills: { value: number; label: string; qty: string | number; subtotal?: number }[];
    coins: number;
    physicalCashCounted: number;
    systemExpectedCash: number;
    discrepancy: number;
    submittedBy: string;
    submittedAt: string;
    closingRemarks?: string;
  } | null;
}

export default function DailySummariesPage() {
  const { activeSession, appointments, doctor, clinic, secretary, refreshData } = useSecretary();

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS);
  const [coinsTotal, setCoinsTotal] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [signerName, setSignerName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [summaryRecord, setSummaryRecord] = useState<HistoricalSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<HistoricalSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoricalSlip, setSelectedHistoricalSlip] = useState<HistoricalSummary | null>(null);

  // Collapsible audit drawer
  const [showTransactionAudit, setShowTransactionAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'CASH' | 'GCASH' | 'HMO' | 'UNPAID'>('ALL');

  // Set default signer name
  useEffect(() => {
    if (secretary?.full_name) {
      setSignerName(secretary.full_name);
    } else {
      setSignerName('Clinic Secretary');
    }
  }, [secretary]);

  // Fetch summary for the active queue session
  const fetchSessionSummary = useCallback(async (sessionId: string) => {
    try {
      setLoadingSummary(true);
      const res = await fetch(`/api/secretary/summaries?sessionId=${sessionId}`);
      const data = await res.json();

      if (data.summary) {
        setSummaryRecord(data.summary);
        setSubmissionSuccess(true);

        // Restore breakdown if present
        if (data.summary.breakdown) {
          const bd = data.summary.breakdown;
          if (Array.isArray(bd.bills)) {
            setDenominations((prev) =>
              prev.map((denom) => {
                const found = bd.bills.find(
                  (b: { value?: number; denomination?: number }) =>
                    b.value === denom.value || b.denomination === denom.value
                );
                return {
                  ...denom,
                  qty: found ? String(found.qty || '') : '',
                };
              })
            );
          }
          if (bd.coins !== undefined) {
            setCoinsTotal(bd.coins > 0 ? String(bd.coins) : '');
          }
          if (bd.submittedBy) {
            setSignerName(bd.submittedBy);
          }
          if (bd.closingRemarks || data.summary.notes) {
            setClosingNotes(bd.closingRemarks || data.summary.notes || '');
          }
        }
      } else {
        setSummaryRecord(null);
        setSubmissionSuccess(false);
      }
    } catch (err) {
      console.error('[DailySummaries] Error fetching session summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Fetch historical summaries for this doctor
  const fetchHistory = useCallback(async () => {
    if (!doctor?.id) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/secretary/summaries?history=true&doctorId=${doctor.id}&limit=20`);
      const data = await res.json();
      if (data.summaries) {
        setHistoryList(data.summaries);
      }
    } catch (err) {
      console.error('[DailySummaries] Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [doctor?.id]);

  useEffect(() => {
    if (activeSession?.id) {
      fetchSessionSummary(activeSession.id);
    }
  }, [activeSession?.id, fetchSessionSummary]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Handle quantity changes
  const handleQtyChange = (index: number, val: string) => {
    setDenominations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], qty: val };
      return next;
    });
  };

  // Quick increment button (+1, +5)
  const handleQuickAdd = (index: number, amount: number) => {
    setDenominations((prev) => {
      const next = [...prev];
      const current = parseInt(next[index].qty, 10) || 0;
      next[index] = { ...next[index], qty: String(current + amount) };
      return next;
    });
  };

  // Compute Total Physical Cash Counted
  const physicalCashTotal = useMemo(() => {
    let sum = 0;
    denominations.forEach((d) => {
      const count = parseInt(d.qty, 10) || 0;
      sum += count * d.value;
    });
    const coins = parseFloat(coinsTotal) || 0;
    return sum + coins;
  }, [denominations, coinsTotal]);

  // Aggregate Today's System Collections
  const systemMetrics = useMemo(() => {
    const paidAppointments = appointments.filter((a) => a.is_paid_to_clinic);
    const unpaidAppointments = appointments.filter((a) => !a.is_paid_to_clinic && a.status === 'COMPLETED');

    const totalPatientsSeen = appointments.filter((a) => a.status === 'COMPLETED').length;
    const totalOnline = appointments.filter((a) => a.booking_channel === 'ONLINE').length;
    const totalWalkin = appointments.filter((a) => a.booking_channel === 'WALK_IN').length;
    const totalPriority = appointments.filter((a) => a.priority_category !== 'NONE').length;

    let cashCollected = 0;
    let gcashCollected = 0;
    let hmoClaimsCount = 0;
    let otherCollected = 0;
    let unpaidTotalAmount = 0;

    unpaidAppointments.forEach((a) => {
      const fee = a.consultation_fee != null ? Number(a.consultation_fee) : (doctor?.consultation_fee || 600);
      unpaidTotalAmount += fee;
    });

    paidAppointments.forEach((a) => {
      let method = (a.clinic_payment_method || 'CASH').toUpperCase();
      if (method === 'CASH' && a.payment_notes?.toLowerCase().includes('gcash')) {
        method = 'GCASH';
      }

      // Exact fee resolution: 0 for free follow-up, else custom or doctor default
      const fee = a.consultation_fee != null ? Number(a.consultation_fee) : (doctor?.consultation_fee || 600);

      if (method === 'CASH') {
        cashCollected += fee;
      } else if (method === 'GCASH' || method === 'MAYA') {
        gcashCollected += fee;
      } else if (method === 'HMO') {
        hmoClaimsCount += 1;
      } else if (method === 'FREE_FOLLOWUP') {
        // ₱0 fee
      } else {
        otherCollected += fee;
      }
    });

    return {
      totalPatientsSeen,
      totalOnline,
      totalWalkin,
      totalPriority,
      cashCollected,
      gcashCollected,
      hmoClaimsCount,
      otherCollected,
      totalAppointments: appointments.length,
      unpaidCompletedCount: unpaidAppointments.length,
      unpaidTotalAmount,
    };
  }, [appointments, doctor?.consultation_fee]);

  // Variance between physical cash counted and system expected cash
  const cashDifference = useMemo(() => {
    return physicalCashTotal - systemMetrics.cashCollected;
  }, [physicalCashTotal, systemMetrics.cashCollected]);

  // Fill tallies from expected system cash
  const handleAutoFillExpected = () => {
    let remainder = systemMetrics.cashCollected;
    const newDenoms = INITIAL_DENOMINATIONS.map((d) => {
      const count = Math.floor(remainder / d.value);
      remainder %= d.value;
      return { ...d, qty: count > 0 ? String(count) : '' };
    });
    setDenominations(newDenoms);
    setCoinsTotal(remainder > 0 ? remainder.toFixed(2) : '');
  };

  // Reset all tallies
  const handleResetTallies = () => {
    setDenominations(INITIAL_DENOMINATIONS);
    setCoinsTotal('');
  };

  // Submit Daily Summary to API
  const handleSubmitDailySummary = async () => {
    if (!activeSession?.id) {
      setErrorMessage('No clinic session found to reconcile.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessBanner(null);

    const payload = {
      queueSessionId: activeSession.id,
      secretaryId: secretary?.id || null,
      signerName: signerName.trim() || 'Clinic Secretary',
      denominations: denominations.map((d) => ({
        value: d.value,
        label: d.label,
        qty: parseInt(d.qty, 10) || 0,
        subtotal: (parseInt(d.qty, 10) || 0) * d.value,
      })),
      coinsTotal: parseFloat(coinsTotal) || 0,
      physicalCashCounted: physicalCashTotal,
      systemExpectedCash: systemMetrics.cashCollected,
      cashDifference: cashDifference,
      totalPatientsSeen: systemMetrics.totalPatientsSeen,
      totalOnlineBookings: systemMetrics.totalOnline,
      totalWalkinPatients: systemMetrics.totalWalkin,
      totalPriorityPatients: systemMetrics.totalPriority,
      totalHmoClaimsCount: systemMetrics.hmoClaimsCount,
      closingNotes: closingNotes.trim(),
    };

    try {
      const res = await fetch('/api/secretary/summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Failed to submit daily cashier summary.');
      }

      setSubmissionSuccess(true);
      setSuccessBanner('Daily cash drawer reconciliation successfully submitted and recorded.');
      await fetchSessionSummary(activeSession.id);
      await refreshData();
    } catch (err: unknown) {
      console.error('[Summaries] Submission error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Could not submit cashier summary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered appointments for transaction audit table
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (auditFilter === 'ALL') return true;
      if (auditFilter === 'UNPAID') return !a.is_paid_to_clinic;
      const method = (a.clinic_payment_method || 'CASH').toUpperCase();
      if (auditFilter === 'CASH') return method === 'CASH' && a.is_paid_to_clinic;
      if (auditFilter === 'GCASH') return (method === 'GCASH' || method === 'MAYA') && a.is_paid_to_clinic;
      if (auditFilter === 'HMO') return method === 'HMO' && a.is_paid_to_clinic;
      return true;
    });
  }, [appointments, auditFilter]);

  // Printable slip data (current or selected historical)
  const printableSlip = useMemo(() => {
    if (selectedHistoricalSlip) {
      return {
        sessionDate: selectedHistoricalSlip.sessionDate,
        doctorName: doctor?.name || 'Attending Physician',
        doctorSpecialty: doctor?.specialty || 'General Practice',
        clinicName: selectedHistoricalSlip.clinicName || clinic?.name || 'Clinic Room',
        hospitalName: selectedHistoricalSlip.hospitalName || clinic?.hospital_name || 'Hospital Center',
        roomNumber: selectedHistoricalSlip.roomNumber || clinic?.room_number || '',
        totalPatientsSeen: selectedHistoricalSlip.totalPatientsSeen,
        totalOnlineBookings: selectedHistoricalSlip.totalOnlineBookings,
        totalWalkinPatients: selectedHistoricalSlip.totalWalkinPatients,
        totalPriorityPatients: selectedHistoricalSlip.totalPriorityPatients,
        totalHmoClaimsCount: selectedHistoricalSlip.totalHmoClaimsCount,
        totalCashCollected: selectedHistoricalSlip.totalCashCollected,
        bills: selectedHistoricalSlip.breakdown?.bills || [],
        coins: selectedHistoricalSlip.breakdown?.coins || 0,
        physicalCashCounted: selectedHistoricalSlip.breakdown?.physicalCashCounted ?? selectedHistoricalSlip.totalCashCollected,
        systemExpectedCash: selectedHistoricalSlip.breakdown?.systemExpectedCash ?? selectedHistoricalSlip.totalCashCollected,
        discrepancy: selectedHistoricalSlip.breakdown?.discrepancy ?? 0,
        submittedBy: selectedHistoricalSlip.breakdown?.submittedBy || selectedHistoricalSlip.secretaryName,
        submittedAt: selectedHistoricalSlip.breakdown?.submittedAt || selectedHistoricalSlip.closedAt || selectedHistoricalSlip.createdAt,
        status: selectedHistoricalSlip.status,
        notes: selectedHistoricalSlip.notes,
      };
    }

    return {
      sessionDate: activeSession?.session_date || new Date().toISOString().split('T')[0],
      doctorName: doctor?.name || 'Attending Physician',
      doctorSpecialty: doctor?.specialty || 'General Practice',
      clinicName: clinic?.name || 'Clinic Room',
      hospitalName: clinic?.hospital_name || 'Hospital Center',
      roomNumber: clinic?.room_number || '',
      totalPatientsSeen: systemMetrics.totalPatientsSeen,
      totalOnlineBookings: systemMetrics.totalOnline,
      totalWalkinPatients: systemMetrics.totalWalkin,
      totalPriorityPatients: systemMetrics.totalPriority,
      totalHmoClaimsCount: systemMetrics.hmoClaimsCount,
      totalCashCollected: physicalCashTotal,
      bills: denominations.map((d) => ({
        value: d.value,
        label: d.label,
        qty: parseInt(d.qty, 10) || 0,
        subtotal: (parseInt(d.qty, 10) || 0) * d.value,
      })),
      coins: parseFloat(coinsTotal) || 0,
      physicalCashCounted: physicalCashTotal,
      systemExpectedCash: systemMetrics.cashCollected,
      discrepancy: cashDifference,
      submittedBy: signerName || 'Clinic Secretary',
      submittedAt: summaryRecord?.closedAt || new Date().toISOString(),
      status: summaryRecord?.status || 'OPEN',
      notes: closingNotes,
    };
  }, [
    selectedHistoricalSlip,
    activeSession,
    doctor,
    clinic,
    systemMetrics,
    physicalCashTotal,
    denominations,
    coinsTotal,
    cashDifference,
    signerName,
    summaryRecord,
    closingNotes,
  ]);

  const isLocked = summaryRecord?.status === 'CLOSED_AND_VERIFIED';

  return (
    <>
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* PRINT-ONLY OFFICIAL CASH ENVELOPE SLIP                            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="hidden print:block font-mono text-black p-4 max-w-xl mx-auto text-xs">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              #printable-envelope-slip, #printable-envelope-slip * { visibility: visible; }
              #printable-envelope-slip { position: absolute; left: 0; top: 0; width: 100%; }
              @page { size: portrait; margin: 10mm; }
            }
          `
        }} />
        <div id="printable-envelope-slip" className="border-2 border-black p-6 space-y-4">
          <div className="text-center border-b-2 border-black pb-3">
            <h1 className="text-base font-black tracking-wider uppercase">CLINIC NATIN HEALTHCARE</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
              End-of-Day Cash Drawer Remittance &amp; Envelope Slip
            </p>
            <p className="text-[9px] text-slate-500 mt-1">
              Strictly Confidential — Remittance Form for Hospital FinOps &amp; Cashier Accounting
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-black pb-3">
            <div>
              <span className="font-bold">Attending Doctor:</span> {printableSlip.doctorName}
              <br />
              <span className="font-bold">Specialty:</span> {printableSlip.doctorSpecialty}
              <br />
              <span className="font-bold">Facility:</span> {printableSlip.hospitalName} ({printableSlip.clinicName})
            </div>
            <div className="text-right">
              <span className="font-bold">Session Date:</span> {printableSlip.sessionDate}
              <br />
              <span className="font-bold">Room:</span> {printableSlip.roomNumber || 'Consultation Clinic'}
              <br />
              <span className="font-bold">Audit Status:</span> {printableSlip.status}
            </div>
          </div>

          {/* Consultation Metrics */}
          <div className="border-b border-black pb-3 text-[11px]">
            <span className="font-bold uppercase tracking-wider block text-[10px] mb-1">
              Consultation Activity Summary
            </span>
            <div className="grid grid-cols-4 gap-1 text-center font-bold">
              <div className="border border-black p-1">
                <span className="block text-[9px] font-normal">Patients Seen</span>
                <span>{printableSlip.totalPatientsSeen}</span>
              </div>
              <div className="border border-black p-1">
                <span className="block text-[9px] font-normal">Walk-in</span>
                <span>{printableSlip.totalWalkinPatients}</span>
              </div>
              <div className="border border-black p-1">
                <span className="block text-[9px] font-normal">Online</span>
                <span>{printableSlip.totalOnlineBookings}</span>
              </div>
              <div className="border border-black p-1">
                <span className="block text-[9px] font-normal">HMO Claims</span>
                <span>{printableSlip.totalHmoClaimsCount}</span>
              </div>
            </div>
          </div>

          {/* Physical Cash Breakdown Table */}
          <div className="border-b border-black pb-3">
            <span className="font-bold uppercase tracking-wider block text-[10px] mb-1">
              Physical Cash Denomination Tally
            </span>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">Denomination</th>
                  <th className="py-1 text-center">Piece Count</th>
                  <th className="py-1 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {printableSlip.bills.map((b: { value?: number; label?: string; qty: string | number; subtotal?: number }, idx: number) => {
                  const val = b.value || 0;
                  const qty = typeof b.qty === 'number' ? b.qty : parseInt(b.qty, 10) || 0;
                  const sub = b.subtotal || qty * val;
                  return (
                    <tr key={idx} className="border-b border-dotted border-slate-300">
                      <td className="py-0.5">{b.label || `₱${val.toLocaleString()}`}</td>
                      <td className="py-0.5 text-center font-bold">{qty}</td>
                      <td className="py-0.5 text-right font-bold">₱{sub.toLocaleString()}</td>
                    </tr>
                  );
                })}
                <tr className="border-b border-dotted border-slate-300">
                  <td className="py-0.5">Loose Coins (Barya)</td>
                  <td className="py-0.5 text-center">-</td>
                  <td className="py-0.5 text-right font-bold">₱{Number(printableSlip.coins || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reconciliation Balance Box */}
          <div className="border-2 border-black p-3 space-y-1 text-xs">
            <div className="flex justify-between font-bold">
              <span>Actual Physical Cash Counted (In Envelope):</span>
              <span>₱{Number(printableSlip.physicalCashCounted || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>System Expected Cash:</span>
              <span>₱{Number(printableSlip.systemExpectedCash || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-1">
              <span>Discrepancy (Variance):</span>
              <span>
                {printableSlip.discrepancy === 0
                  ? '₱0.00 (Balanced)'
                  : printableSlip.discrepancy > 0
                  ? `+₱${printableSlip.discrepancy.toFixed(2)} (Over)`
                  : `-₱${Math.abs(printableSlip.discrepancy).toFixed(2)} (Short)`}
              </span>
            </div>
          </div>

          {/* Notes */}
          {printableSlip.notes && (
            <div className="text-[10px] italic border-b border-black pb-2">
              <span className="font-bold not-italic">Remarks:</span> {printableSlip.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="border-t border-black pt-1 text-center">
              <p className="font-bold text-[11px]">{printableSlip.submittedBy}</p>
              <p className="text-[9px] text-slate-600">Secretary Remitter Signature &amp; Date</p>
              <p className="text-[8px] text-slate-400 mt-0.5">
                {new Date(printableSlip.submittedAt).toLocaleString()}
              </p>
            </div>
            <div className="border-t border-black pt-1 text-center">
              <div className="h-4"></div>
              <p className="font-bold text-[11px] text-slate-400">[ Hospital FinOps / Cashier ]</p>
              <p className="text-[9px] text-slate-600">Verified &amp; Received Deposit Signature</p>
            </div>
          </div>

          <div className="text-[8px] text-center text-slate-400 pt-2">
            Generated via Clinic Natin Digital Cashier System &bull; Secure Hash: {activeSession?.id?.slice(0, 8) || 'REMIT'}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SCREEN UI VIEW                                                    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div className="print:hidden space-y-6 w-full pb-12">
        {/* Header Bar with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <CircleDollarSign className="h-6 w-6 text-brand-700" />
                End-of-Day Cash Drawer Reconciliation
              </h1>
              {summaryRecord && (
                <Badge
                  variant="outline"
                  className={`text-xs font-bold gap-1 px-2.5 py-1 ${
                    summaryRecord.status === 'CLOSED_AND_VERIFIED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {summaryRecord.status === 'CLOSED_AND_VERIFIED' ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Verified by FinOps
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      Submitted (Awaiting FinOps)
                    </>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Count physical money in your cash drawer, reconcile against system collections, and submit your daily remittance
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'current' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('current');
                setSelectedHistoricalSlip(null);
              }}
              className={`text-xs font-bold rounded-xl gap-1.5 ${
                activeTab === 'current' ? 'bg-slate-900 text-white' : 'border-slate-200'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Current Session
            </Button>
            <Button
              variant={activeTab === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('history')}
              className={`text-xs font-bold rounded-xl gap-1.5 ${
                activeTab === 'history' ? 'bg-slate-900 text-white' : 'border-slate-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Past Remittances
            </Button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successBanner && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successBanner}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 text-xs font-bold border-emerald-300 text-emerald-900 hover:bg-emerald-100 gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Slip
            </Button>
          </div>
        )}

        {/* Warning: Completed patients that are still unpaid */}
        {systemMetrics.unpaidCompletedCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">
                  {systemMetrics.unpaidCompletedCount} completed consultation(s) marked UNPAID (₱{systemMetrics.unpaidTotalAmount.toFixed(2)})
                </p>
                <p className="text-[11px] text-amber-700">
                  Please confirm whether these patients paid before submitting end-of-day drawer tallies to avoid variances.
                </p>
              </div>
            </div>
            <Link href="/secretary/cashier">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100 gap-1">
                Open Cashier
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}

        {/* TAB 1: CURRENT SESSION TALLY */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {/* Session Status Banner */}
            <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {doctor?.name || 'Attending Physician'}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-200">
                      {clinic?.room_number ? `Room ${clinic.room_number}` : 'Clinic'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {clinic?.hospital_name || 'Hospital Center'} &bull; Session Date: {activeSession?.session_date || 'Today'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshData()}
                  className="h-9 text-xs font-bold border-slate-200 text-slate-700 gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>

                {submissionSuccess && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHistoricalSlip(null);
                      window.print();
                    }}
                    className="h-9 text-xs font-bold border-brand-200 bg-brand-50 text-brand-900 hover:bg-brand-100 gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Envelope Slip
                  </Button>
                )}
              </div>
            </div>

            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Consultations */}
              <Card className="border-slate-200 shadow-2xs bg-white">
                <CardContent className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Consultations
                  </span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    {systemMetrics.totalPatientsSeen} / {systemMetrics.totalAppointments}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {systemMetrics.totalWalkin} Walk-in &bull; {systemMetrics.totalOnline} Online
                  </span>
                </CardContent>
              </Card>

              {/* Expected Cash in Drawer */}
              <Card className="border-slate-200 shadow-2xs bg-white">
                <CardContent className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Expected Cash in Drawer
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">
                    ₱{systemMetrics.cashCollected.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    From physical cash consultations
                  </span>
                </CardContent>
              </Card>

              {/* GCash / Maya Total */}
              <Card className="border-slate-200 shadow-2xs bg-white">
                <CardContent className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    E-Wallet (GCash / Maya)
                  </span>
                  <span className="text-2xl font-black text-blue-700 font-mono mt-1 block">
                    ₱{systemMetrics.gcashCollected.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Direct electronic QR settlements
                  </span>
                </CardContent>
              </Card>

              {/* HMO Claims */}
              <Card className="border-slate-200 shadow-2xs bg-white">
                <CardContent className="p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    HMO Guarantee Claims
                  </span>
                  <span className="text-2xl font-black text-purple-700 font-mono mt-1 block">
                    {systemMetrics.hmoClaimsCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Approved insurance vouchers
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Main Form: Denomination Calculator & Envelope Slip */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Physical Denomination Tally */}
              <div className="lg:col-span-7">
                <Card className="border-slate-200 shadow-xs bg-white">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-brand-700" />
                          Physical Cash Envelope Tally Sheet
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Count paper bills and loose coins inside your remittance envelope
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLocked}
                          onClick={handleAutoFillExpected}
                          className="h-8 text-[11px] font-bold text-slate-600 hover:text-slate-900"
                          title="Auto-populate counts to match system cash"
                        >
                          Auto-fill
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLocked}
                          onClick={handleResetTallies}
                          className="h-8 text-[11px] font-bold text-slate-400 hover:text-red-600"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-3">
                    {/* Denomination Rows */}
                    <div className="space-y-2">
                      {denominations.map((denom, idx) => {
                        const qtyNum = parseInt(denom.qty, 10) || 0;
                        const rowSubtotal = qtyNum * denom.value;

                        return (
                          <div
                            key={denom.value}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3"
                          >
                            <span className="w-24 text-xs font-extrabold text-slate-800">
                              {denom.label}
                            </span>

                            {/* Quick Add Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleQuickAdd(idx, 1)}
                                className="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleQuickAdd(idx, 5)}
                                className="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                +5
                              </button>
                            </div>

                            {/* Quantity Input */}
                            <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                              <span className="text-xs text-slate-400 font-bold">&times;</span>
                              <Input
                                type="number"
                                min="0"
                                disabled={isLocked}
                                value={denom.qty}
                                onChange={(e) => handleQtyChange(idx, e.target.value)}
                                placeholder="0 pcs"
                                className="h-9 text-center font-bold text-slate-900 bg-white border-slate-300"
                              />
                            </div>

                            {/* Row Subtotal */}
                            <span className="font-mono text-xs font-bold text-slate-900 w-28 text-right">
                              ₱{rowSubtotal.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}

                      {/* Loose Coins Input */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
                        <span className="w-24 text-xs font-extrabold text-slate-800 flex items-center gap-1">
                          <Coins className="h-3.5 w-3.5 text-amber-600" />
                          Barya / Coins
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              const curr = parseFloat(coinsTotal) || 0;
                              setCoinsTotal((curr + 10).toFixed(2));
                            }}
                            className="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            +₱10
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                          <span className="text-xs text-slate-400 font-bold">=</span>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            disabled={isLocked}
                            value={coinsTotal}
                            onChange={(e) => setCoinsTotal(e.target.value)}
                            placeholder="₱ total"
                            className="h-9 text-center font-bold text-slate-900 bg-white border-slate-300"
                          />
                        </div>

                        <span className="font-mono text-xs font-bold text-slate-900 w-28 text-right">
                          ₱{(parseFloat(coinsTotal) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Total Physical Count Display */}
                    <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                          Actual Physical Cash Counted
                        </span>
                        <span className="text-xs text-slate-300">Total in Money Remittance Envelope</span>
                      </div>
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        ₱{physicalCashTotal.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right 5 Cols: Reconciliation Balance & Signature */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-slate-200 shadow-xs bg-white">
                  <CardHeader className="p-4 pb-2 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Drawer Reconciliation Comparison
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4 text-xs">
                    <div className="space-y-2 font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>Physical Cash Counted:</span>
                        <span className="font-bold text-slate-900">₱{physicalCashTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>System Expected Cash:</span>
                        <span className="font-bold text-slate-900">₱{systemMetrics.cashCollected.toFixed(2)}</span>
                      </div>

                      <Separator className="my-2" />

                      {/* Variance Display */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-sans font-bold text-slate-700">Discrepancy:</span>
                        <span
                          className={`font-mono text-base font-black px-2.5 py-0.5 rounded-lg ${
                            cashDifference === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : cashDifference > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cashDifference === 0
                            ? '✓ ₱0.00 Balanced'
                            : cashDifference > 0
                            ? `+₱${cashDifference.toFixed(2)} Over`
                            : `-₱${Math.abs(cashDifference).toFixed(2)} Short`}
                        </span>
                      </div>
                    </div>

                    {/* Discrepancy explanation */}
                    {cashDifference === 0 ? (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>Your drawer is balanced with zero discrepancy.</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                          {cashDifference > 0
                            ? 'Drawer has extra cash. Please verify if any patient paid extra or check change given.'
                            : 'Drawer has cash shortage. Please double check envelope count before closing.'}
                        </span>
                      </div>
                    )}

                    {/* Status & Timestamp if already submitted */}
                    {summaryRecord && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">Submission Status:</span>
                          <span className="font-black text-slate-900">{summaryRecord.status}</span>
                        </div>
                        {summaryRecord.closedAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Closed At:</span>
                            <span className="text-slate-700">
                              {new Date(summaryRecord.closedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                        {summaryRecord.secretaryName && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-bold">Signed by:</span>
                            <span className="text-slate-700">{summaryRecord.secretaryName}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Secretary Sign-off Name */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="font-bold text-slate-800 block">
                        Secretary Electronic Sign-Off:
                      </label>
                      <Input
                        type="text"
                        disabled={isLocked}
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Secretary Full Name"
                        className="h-10 text-xs font-semibold border-slate-300"
                      />

                      <Input
                        type="text"
                        disabled={isLocked}
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        placeholder="Closing notes or remarks (optional)..."
                        className="h-10 text-xs border-slate-300"
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      variant="brand"
                      onClick={handleSubmitDailySummary}
                      disabled={isSubmitting || isLocked}
                      className="w-full h-12 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs gap-2 mt-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isLocked ? (
                        <Lock className="h-4 w-4 text-slate-400" />
                      ) : (
                        <FileCheck className="h-5 w-5" />
                      )}
                      {isLocked
                        ? 'Summary Verified & Locked by FinOps'
                        : submissionSuccess
                        ? 'Update & Re-Submit Cash Remittance'
                        : 'Submit & Close Daily Cash Drawer'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Collapsible Section: Transaction Settlement Audit */}
            <div className="pt-2">
              <div
                onClick={() => setShowTransactionAudit(!showTransactionAudit)}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="h-5 w-5 text-brand-700" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Transaction Settlement Audit ({appointments.length} Patients)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Audit breakdown of individual tokens, payment methods, and fees collected today
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold text-slate-600">
                    ₱{systemMetrics.cashCollected.toFixed(2)} Cash
                  </Badge>
                  {showTransactionAudit ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>

              {showTransactionAudit && (
                <div className="mt-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                  {/* Filter chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    {(['ALL', 'CASH', 'GCASH', 'HMO', 'UNPAID'] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setAuditFilter(filterKey)}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          auditFilter === filterKey
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filterKey === 'ALL'
                          ? `All (${appointments.length})`
                          : filterKey === 'UNPAID'
                          ? `Unpaid (${systemMetrics.unpaidCompletedCount})`
                          : filterKey}
                      </button>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Token</th>
                          <th className="py-2.5 px-3">Patient Name</th>
                          <th className="py-2.5 px-3">Channel</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Payment Method</th>
                          <th className="py-2.5 px-3 text-right">Fee</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAppointments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                              No appointments matching &quot;{auditFilter}&quot;
                            </td>
                          </tr>
                        ) : (
                          filteredAppointments.map((appt) => {
                            const method = (appt.clinic_payment_method || 'CASH').toUpperCase();
                            const fee =
                              appt.consultation_fee != null
                                ? Number(appt.consultation_fee)
                                : doctor?.consultation_fee || 600;

                            return (
                              <tr key={appt.id} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 font-mono font-bold text-brand-700">
                                  {appt.token_code}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {appt.display_name}
                                  {appt.priority_category !== 'NONE' && (
                                    <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-bold">
                                      {appt.priority_category}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 font-medium">
                                  {appt.booking_channel}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold ${
                                      appt.status === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {appt.status}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] font-bold ${
                                      method === 'CASH'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : method === 'GCASH' || method === 'MAYA'
                                        ? 'bg-blue-100 text-blue-800'
                                        : method === 'HMO'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {method}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                                  ₱{fee.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {appt.is_paid_to_clinic ? (
                                    <span className="text-emerald-600 font-bold">✓ Paid</span>
                                  ) : (
                                    <span className="text-red-600 font-bold">Unpaid</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REMITTANCE HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Past Daily Remittance History
                </h2>
                <p className="text-xs text-slate-500">
                  Audited cash summaries submitted for Dr. {doctor?.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="h-9 text-xs font-bold border-slate-200 text-slate-700 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-700" />
                <p className="text-xs">Loading past summaries...</p>
              </div>
            ) : historyList.length === 0 ? (
              <Card className="border-slate-200 p-8 text-center bg-white">
                <p className="text-sm font-semibold text-slate-600">No past daily summaries found.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Once daily drawer reconciliations are submitted, they will appear here.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyList.map((item) => {
                  const isVerified = item.status === 'CLOSED_AND_VERIFIED';
                  const dateDisplay = item.sessionDate || item.createdAt.slice(0, 10);
                  const discrepancy = item.breakdown?.discrepancy ?? 0;

                  return (
                    <Card key={item.id} className="border-slate-200 shadow-2xs bg-white hover:border-slate-300 transition-colors">
                      <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-brand-700" />
                            <CardTitle className="text-sm font-black text-slate-900">
                              {dateDisplay}
                            </CardTitle>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.clinicName || 'Clinic'} {item.roomNumber ? `&bull; Room ${item.roomNumber}` : ''}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isVerified ? 'Verified' : 'Pending Verification'}
                        </Badge>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 text-xs">
                        <div className="grid grid-cols-3 gap-2 py-1 font-mono text-center">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="block text-[10px] font-sans font-medium text-slate-400">Seen</span>
                            <span className="text-sm font-black text-slate-800">{item.totalPatientsSeen}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="block text-[10px] font-sans font-medium text-slate-400">Cash</span>
                            <span className="text-sm font-black text-emerald-700">₱{item.totalCashCollected.toFixed(0)}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="block text-[10px] font-sans font-medium text-slate-400">Variance</span>
                            <span className={`text-sm font-black ${
                              discrepancy === 0 ? 'text-emerald-700' : discrepancy > 0 ? 'text-amber-700' : 'text-red-700'
                            }`}>
                              {discrepancy === 0 ? '₱0' : `${discrepancy > 0 ? '+' : ''}₱${discrepancy}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span>Remitted by: <b className="text-slate-800">{item.secretaryName}</b></span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHistoricalSlip(item);
                              setTimeout(() => window.print(), 100);
                            }}
                            className="h-7 text-[11px] font-bold border-slate-200 hover:bg-slate-50 gap-1"
                          >
                            <Printer className="h-3 w-3" />
                            Print Slip
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
