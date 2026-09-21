'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CircleDollarSign,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  Calendar,
  Lock,
  Loader2,
  Printer,
  History,
  Coins,
  BadgePercent,
  Receipt,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSecretary } from '../secretary-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

export default function DailySummariesPage() {
  const supabase = createClient();
  const { activeSession, appointments, doctor, clinic, secretary, refreshData } = useSecretary();

  const [denominations, setDenominations] = useState<Denomination[]>(INITIAL_DENOMINATIONS);
  const [coinsTotal, setCoinsTotal] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [signerName, setSignerName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (secretary?.full_name) {
      setSignerName(secretary.full_name);
    } else {
      setSignerName('Clinic Secretary');
    }
  }, [secretary]);

  // Handle quantity change
  const handleQtyChange = (index: number, val: string) => {
    setDenominations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], qty: val };
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

    const totalPatientsSeen = appointments.filter((a) => a.status === 'COMPLETED').length;
    const totalOnline = appointments.filter((a) => a.booking_channel === 'ONLINE').length;
    const totalWalkin = appointments.filter((a) => a.booking_channel === 'WALK_IN').length;
    const totalPriority = appointments.filter((a) => a.priority_category !== 'NONE').length;

    let cashCollected = 0;
    let gcashCollected = 0;
    let hmoClaimsCount = 0;

    paidAppointments.forEach((a) => {
      let method = (a.clinic_payment_method || 'CASH').toUpperCase();
      if (method === 'CASH' && a.payment_notes?.toLowerCase().includes('gcash')) {
        method = 'GCASH';
      }
      const fee = a.consultation_fee || doctor?.consultation_fee || 600;
      if (method === 'CASH') {
        cashCollected += fee;
      } else if (method === 'GCASH' || method === 'MAYA') {
        gcashCollected += fee;
      } else if (method === 'HMO') {
        hmoClaimsCount += 1;
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
      totalAppointments: appointments.length,
    };
  }, [appointments, doctor?.consultation_fee]);

  // Variance between physical cash counted and system expected cash
  const cashDifference = useMemo(() => {
    return physicalCashTotal - systemMetrics.cashCollected;
  }, [physicalCashTotal, systemMetrics.cashCollected]);

  const handleSubmitDailySummary = async () => {
    if (!activeSession?.id || !doctor?.id) {
      setErrorMessage('No active clinic session found to reconcile.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const denominationBreakdown = {
      bills: denominations.map((d) => ({
        denomination: d.value,
        qty: parseInt(d.qty, 10) || 0,
        subtotal: (parseInt(d.qty, 10) || 0) * d.value,
      })),
      coins: parseFloat(coinsTotal) || 0,
      physical_cash_counted: physicalCashTotal,
      system_expected_cash: systemMetrics.cashCollected,
      discrepancy: cashDifference,
      submitted_by: signerName || 'Clinic Secretary',
      submitted_at: new Date().toISOString(),
    };

    try {
      // Check if a summary already exists for this session
      const { data: existing } = await supabase
        .from('daily_clinic_summaries')
        .select('id')
        .eq('queue_session_id', activeSession.id)
        .maybeSingle();

      const payload = {
        queue_session_id: activeSession.id,
        doctor_id: doctor.id,
        secretary_id: secretary?.id || null,
        session_date: activeSession.session_date,
        total_patients_seen: systemMetrics.totalPatientsSeen,
        total_online_bookings: systemMetrics.totalOnline,
        total_walkin_patients: systemMetrics.totalWalkin,
        total_priority_patients: systemMetrics.totalPriority,
        total_cash_collected: physicalCashTotal > 0 ? physicalCashTotal : systemMetrics.cashCollected,
        total_hmo_claims_count: systemMetrics.hmoClaimsCount,
        status: 'OPEN', // OPEN for admin verification in /cnadmin/finops
        notes: closingNotes
          ? `${closingNotes} | Signed by: ${signerName}`
          : `Signed by: ${signerName}`,
      };

      if (existing) {
        const { error } = await supabase
          .from('daily_clinic_summaries')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('daily_clinic_summaries')
          .insert(payload);
        if (error) throw error;
      }

      setSubmissionSuccess(true);
      await refreshData();
    } catch (err: unknown) {
      console.error('[Summaries] Submission error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Could not submit cashier summary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <CircleDollarSign className="h-6 w-6 text-brand-700" />
          End-of-Day Cash Drawer Reconciliation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Count physical money in your cash drawer, verify against system collections, and submit your daily remittance
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {submissionSuccess && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">
                Daily Cashier Summary Successfully Submitted!
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                Your remittance has been forwarded to Hospital Administration &amp; FinOps for verification.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs font-bold border-emerald-300 text-emerald-900 hover:bg-emerald-100 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Cash Envelope Slip
          </Button>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Consultations */}
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Consultations
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {systemMetrics.totalPatientsSeen} / {systemMetrics.totalAppointments}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Completed Today
            </span>
          </CardContent>
        </Card>

        {/* Expected Cash in Drawer */}
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Expected Cash
            </span>
            <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">
              ₱{systemMetrics.cashCollected.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              From cash consultations
            </span>
          </CardContent>
        </Card>

        {/* GCash / Maya Total */}
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              E-Wallet (GCash/Maya)
            </span>
            <span className="text-2xl font-black text-blue-700 font-mono mt-1 block">
              ₱{systemMetrics.gcashCollected.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Direct QR settlements
            </span>
          </CardContent>
        </Card>

        {/* HMO Claims */}
        <Card className="border-slate-200 shadow-2xs bg-white">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              HMO Claims Logged
            </span>
            <span className="text-2xl font-black text-purple-700 font-mono mt-1 block">
              {systemMetrics.hmoClaimsCount}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Guarantee letters filed
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
                    Input piece counts of bills and coins in your cash drawer
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs font-bold text-slate-700 bg-white">
                  Philippine Peso (₱)
                </Badge>
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

                      <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                        <span className="text-xs text-slate-400 font-bold">&times;</span>
                        <Input
                          type="number"
                          min="0"
                          value={denom.qty}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          placeholder="0 pcs"
                          className="h-9 text-center font-bold text-slate-900 bg-white border-slate-300"
                        />
                      </div>

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

                  <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                    <span className="text-xs text-slate-400 font-bold">=</span>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
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
                  <span className="text-xs text-slate-300">Total in Money Envelope</span>
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

              {cashDifference === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Your drawer is perfectly balanced with zero discrepancy.</span>
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

              {/* Secretary Sign-off Name */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800 block">
                  Secretary Electronic Sign-Off:
                </label>
                <Input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Secretary Full Name"
                  className="h-10 text-xs font-semibold border-slate-300"
                />

                <Input
                  type="text"
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
                disabled={isSubmitting || submissionSuccess}
                className="w-full h-12 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs gap-2 mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="h-5 w-5" />
                )}
                {submissionSuccess ? 'Summary Already Submitted' : 'Submit & Close Daily Cash Drawer'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
