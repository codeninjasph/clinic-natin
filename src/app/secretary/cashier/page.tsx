'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Receipt,
  Search,
  Check,
  CheckCircle2,
  Printer,
  ShieldCheck,
  User,
  AlertCircle,
  Loader2,
  QrCode,
  Banknote,
  Percent,
  X,
  CreditCard,
  Smartphone,
  IdCard,
  AlertTriangle,
} from 'lucide-react';
import { useSecretary, type Appointment } from '../secretary-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';

const HMO_PROVIDERS = [
  'Maxicare Healthcare',
  'Intellicare',
  'Medicard Philippines',
  'PhilHealth Konsulta',
  'Caritas Health Shield',
  'Etiqa Philippines',
  'Pacific Cross',
  'Cocolife Healthcare',
  'Other / Company Direct Bill',
];

// Friendly status label map
const STATUS_LABEL: Record<string, string> = {
  WAITING: 'Waiting',
  BOOKED: 'Reserved',
  SERVING: 'In Room',
  COMPLETED: 'Done',
  BUFFERED: 'Buffer Lane',
  SKIPPED: 'Skipped',
  CANCELLED_NO_SHOW: 'No-Show',
};

function CashierPageContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('appointmentId');

  const { appointments, doctor, clinic, updateAppointmentPaid, refreshData } = useSecretary();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [notFoundPreselectedId, setNotFoundPreselectedId] = useState<string | null>(null);

  // Cashier Terminal Form State
  const [baseFee, setBaseFee] = useState<number>(600);
  const [isSeniorDiscount, setIsSeniorDiscount] = useState(false);
  const [isPwdDiscount, setIsPwdDiscount] = useState(false);
  const [idNumber, setIdNumber] = useState('');  // Bug #7 fix: wired up

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'HMO' | 'FREE'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [gcashRef, setGcashRef] = useState(''); // Bug #10 fix: GCash reference number
  const [hmoProvider, setHmoProvider] = useState(HMO_PROVIDERS[0]);
  const [hmoApprovalCode, setHmoApprovalCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // Bug #8 fix: validation
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  // Bug #3 fix: auto-dismiss toast
  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // Set default base fee from doctor
  useEffect(() => {
    if (doctor?.consultation_fee) {
      setBaseFee(doctor.consultation_fee);
    }
  }, [doctor?.consultation_fee]);

  // Handle preselection from URL query param (UX-05: Do not silently fallback)
  useEffect(() => {
    if (preselectedId && appointments.length > 0) {
      const found = appointments.find((a) => a.id === preselectedId);
      if (found) {
        setSelectedAppt(found);
        setNotFoundPreselectedId(null);
      } else {
        setSelectedAppt(null);
        setNotFoundPreselectedId(preselectedId);
      }
    } else if (!preselectedId && !selectedAppt && appointments.length > 0) {
      const firstUnpaid = appointments.find((a) => !a.is_paid_to_clinic) || appointments[0];
      setSelectedAppt(firstUnpaid);
      setNotFoundPreselectedId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedId, appointments]);

  // Bug #4 fix: Sync selectedAppt from refreshed data after payment
  useEffect(() => {
    if (selectedAppt) {
      const updated = appointments.find((a) => a.id === selectedAppt.id);
      if (updated && updated !== selectedAppt) {
        setSelectedAppt(updated);
      }
    }
  }, [appointments, selectedAppt]);

  // Synchronize discounts & fee when patient changes
  useEffect(() => {
    if (selectedAppt) {
      const isSenior = selectedAppt.priority_category === 'SENIOR';
      const isPwd = selectedAppt.priority_category === 'PWD';
      setIsSeniorDiscount(isSenior);
      setIsPwdDiscount(isPwd);
      setCashTendered('');
      setGcashRef('');
      setHmoApprovalCode('');
      setIdNumber('');
      setPaymentMethod('CASH');
      setFormError(null);
      if (selectedAppt.consultation_fee && selectedAppt.consultation_fee > 0) {
        setBaseFee(selectedAppt.consultation_fee);
      } else if (doctor?.consultation_fee) {
        setBaseFee(doctor.consultation_fee);
      }
    }
  }, [selectedAppt?.id, doctor?.consultation_fee]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computations
  const discountAmount = useMemo(() => {
    if (paymentMethod === 'FREE') return baseFee;
    if (isSeniorDiscount || isPwdDiscount) return baseFee * 0.20;
    return 0;
  }, [baseFee, isSeniorDiscount, isPwdDiscount, paymentMethod]);

  const netPayable = useMemo(() => {
    if (paymentMethod === 'FREE') return 0;
    return Math.max(0, baseFee - discountAmount);
  }, [baseFee, discountAmount, paymentMethod]);

  const changeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    if (tendered <= 0) return 0;
    return Math.max(0, tendered - netPayable);
  }, [cashTendered, netPayable]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const term = searchTerm.trim().toUpperCase();
      if (!term) return true;
      return (
        a.display_name.toUpperCase().includes(term) ||
        a.token_code.toUpperCase().includes(term) ||
        (a.phone_number && a.phone_number.includes(term))
      );
    });
  }, [appointments, searchTerm]);

  // Bug #8 fix: HMO validation + pass meta to context
  const handleSettlePayment = async () => {
    if (!selectedAppt) return;

    // Validation
    if (paymentMethod === 'HMO' && !hmoApprovalCode.trim()) {
      setFormError('Please enter the HMO Approval / GL Code before settling.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      const meta = {
        hmoProvider: paymentMethod === 'HMO' ? hmoProvider : undefined,
        hmoCode: paymentMethod === 'HMO' ? hmoApprovalCode.trim() : undefined,
        gcashRef: paymentMethod === 'GCASH' ? gcashRef.trim() : undefined,
        idNumber: (isSeniorDiscount || isPwdDiscount) ? idNumber.trim() : undefined,
      };

      const ok = await updateAppointmentPaid(selectedAppt.id, paymentMethod, netPayable, meta);
      if (!ok) throw new Error('Payment settlement failed. Please check your connection and try again.');

      showToast(`Payment of ₱${netPayable.toFixed(2)} recorded for ${selectedAppt.display_name}!`);
      setShowReceiptModal(true);
      await refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not settle payment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bug #5 fix: print only the receipt div using iframe
  const handlePrintReceipt = () => {
    const node = receiptRef.current;
    if (!node) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`
      <html>
        <head>
          <title>Clinic Natin Receipt</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; margin: 16px; color: #111; }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #999; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .bold { font-weight: bold; }
            .big { font-size: 15px; font-weight: bold; }
            .small { font-size: 10px; color: #555; }
          </style>
        </head>
        <body>${node.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert — Bug #3 fix: auto-dismissed via showToast */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl p-4 shadow-xl text-sm font-bold flex items-center gap-3 border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
          <button type="button" onClick={() => setToastMsg(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="h-5 w-5 text-brand-700" />
            Cashier & Fee Settlement Terminal
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Settle physician fees, apply RA 9994/RA 7277 discounts, and issue official receipts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT: Patient Billing Ledger ── */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-900">
                  Today&apos;s Billing Ledger
                </CardTitle>
                <Badge variant="outline" className="font-bold text-slate-500 text-[10px] border-slate-200">
                  {appointments.length} Patients
                </Badge>
              </div>
              <div className="relative mt-2.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name or token..."
                  className="h-9 pl-9 text-xs border-slate-200 bg-white rounded-xl"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">No patient records found.</p>
                </div>
              ) : (
                filteredAppointments.map((appt) => {
                  const isSelected = selectedAppt?.id === appt.id;
                  const isPaid = appt.is_paid_to_clinic;

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => {
                        setSelectedAppt(appt);
                        setNotFoundPreselectedId(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-brand-50 border-brand-700 ring-2 ring-brand-300/30 shadow-xs'
                          : isPaid
                          ? 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-80'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${
                            isSelected
                              ? 'bg-brand-700 text-white border-brand-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {appt.token_code}
                        </span>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            <Check className="h-3 w-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                            Unpaid
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 truncate leading-snug">
                        {appt.display_name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 font-medium">
                        {/* Bug #9 fix: readable status labels */}
                        <span>#{appt.queue_number} · {STATUS_LABEL[appt.status] ?? appt.status}</span>
                        <span className="font-bold text-slate-600">
                          ₱{(appt.consultation_fee || doctor?.consultation_fee || 600).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Cashier Terminal ── */}
        <div className="lg:col-span-8">
          {selectedAppt ? (
            <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
              {/* Transaction Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                    Active Transaction
                  </span>
                  <p className="text-base font-black text-slate-900 mt-0.5">{selectedAppt.display_name}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-brand-700 text-white font-mono font-black text-sm px-3 py-1 rounded-lg">
                    {selectedAppt.token_code}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Slot #{selectedAppt.queue_number}</p>
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* Already Paid Banner */}
                {selectedAppt.is_paid_to_clinic && (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Payment Already Settled</p>
                      <p className="text-xs text-emerald-600">This patient&apos;s consultation fee has been collected.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptModal(true)}
                      className="ml-auto h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1.5 rounded-lg"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Reprint
                    </Button>
                  </div>
                )}

                {/* 1. Fee Breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Doctor&apos;s Professional Fee:</span>
                    <span className="font-mono text-sm text-slate-900 font-bold">₱{baseFee.toFixed(2)}</span>
                  </div>

                  {/* Statutory Discounts */}
                  <div className="pt-2.5 border-t border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-widest">
                      Statutory Privilege Discounts (Philippine Laws)
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 flex-1 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={isSeniorDiscount}
                          disabled={selectedAppt.is_paid_to_clinic}
                          onChange={(e) => {
                            setIsSeniorDiscount(e.target.checked);
                            if (e.target.checked) setIsPwdDiscount(false);
                          }}
                          className="h-4 w-4 rounded accent-brand-700"
                        />
                        <span>Senior Citizen (RA 9994 — 20%)</span>
                      </label>
                      <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 flex-1 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={isPwdDiscount}
                          disabled={selectedAppt.is_paid_to_clinic}
                          onChange={(e) => {
                            setIsPwdDiscount(e.target.checked);
                            if (e.target.checked) setIsSeniorDiscount(false);
                          }}
                          className="h-4 w-4 rounded accent-brand-700"
                        />
                        <span>Person with Disability (RA 7277 — 20%)</span>
                      </label>
                    </div>

                    {/* Bug #7 fix: ID Number input */}
                    {(isSeniorDiscount || isPwdDiscount) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 font-semibold text-emerald-800">
                          <span>20% Statutory Discount Applied:</span>
                          <span className="font-mono font-bold">-₱{discountAmount.toFixed(2)}</span>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {isSeniorDiscount ? 'Senior Citizen ID / OSCA Number' : 'PWD ID Number'} (required for audit)
                          </label>
                          <div className="relative">
                            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              type="text"
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              placeholder={isSeniorDiscount ? 'e.g. OSCA-12345' : 'e.g. PWD-CDO-9876'}
                              className="h-9 pl-9 text-xs border-slate-200 bg-white rounded-xl"
                              disabled={selectedAppt.is_paid_to_clinic}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Net Payable */}
                  <div className="pt-3 border-t-2 border-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Amount Due</span>
                      <span className="text-xs font-bold text-slate-600">Net Payable</span>
                    </div>
                    <span className="text-3xl font-black text-emerald-700 font-mono">
                      ₱{netPayable.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 2. Payment Method */}
                {!selectedAppt.is_paid_to_clinic && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Select Payment Method:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'CASH', label: 'Cash', icon: Banknote },
                          { id: 'GCASH', label: 'GCash / Maya', icon: Smartphone },
                          { id: 'HMO', label: 'HMO / GL Letter', icon: ShieldCheck },
                          { id: 'FREE', label: 'Free Follow-up', icon: Percent },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isSel = paymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(m.id as 'CASH' | 'GCASH' | 'HMO' | 'FREE');
                                setFormError(null);
                              }}
                              className={`p-3 rounded-xl border text-center transition-all ${
                                isSel
                                  ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <Icon className={`h-5 w-5 mx-auto mb-1 ${isSel ? 'text-white' : 'text-slate-400'}`} />
                              <span className="text-xs font-bold block leading-tight">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Cash Calculator */}
                    {paymentMethod === 'CASH' && (
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-3">
                        <label className="text-xs font-bold text-slate-700 block">
                          Cash Received & Change Calculator:
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Quick:</span>
                          {[
                            { label: `Exact (₱${netPayable})`, val: String(netPayable) },
                            { label: '₱500', val: '500' },
                            { label: '₱1,000', val: '1000' },
                          ].map((q) => (
                            <button
                              key={q.val}
                              type="button"
                              onClick={() => setCashTendered(q.val)}
                              className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-50 shadow-xs"
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-center">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">Amount Tendered (₱)</span>
                            <Input
                              type="number"
                              value={cashTendered}
                              onChange={(e) => setCashTendered(e.target.value)}
                              placeholder="e.g. 1000"
                              className="h-12 text-lg font-black text-slate-900 border-slate-200 bg-white rounded-xl"
                            />
                          </div>
                          <div className="rounded-xl bg-emerald-600 text-white p-3 text-center shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 block">
                              Change Due
                            </span>
                            <span className="text-2xl font-black font-mono">
                              ₱{changeDue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* GCash Reference — Bug #10 fix */}
                    {paymentMethod === 'GCASH' && (
                      <div className="bg-violet-50/60 p-4 rounded-2xl border border-violet-200 space-y-2.5">
                        <label className="text-xs font-bold text-slate-700 block">
                          GCash / Maya E-Wallet Payment:
                        </label>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">
                            GCash / Maya Reference Number (optional but recommended)
                          </span>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-400" />
                            <Input
                              type="text"
                              value={gcashRef}
                              onChange={(e) => setGcashRef(e.target.value)}
                              placeholder="e.g. GC-REF-2026-123456"
                              className="h-10 pl-9 text-xs font-semibold border-violet-200 bg-white rounded-xl"
                            />
                          </div>
                          <p className="text-[10px] text-violet-500 mt-1">
                            Reference number is saved for your daily cash reconciliation records.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* HMO Fields */}
                    {paymentMethod === 'HMO' && (
                      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 space-y-3">
                        <label className="text-xs font-bold text-slate-700 block">
                          HMO Guarantee Letter (GL) Pre-Authorization:
                        </label>
                        <div className="space-y-2.5">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">HMO Provider</span>
                            <select
                              value={hmoProvider}
                              onChange={(e) => setHmoProvider(e.target.value)}
                              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-brand-700"
                            >
                              {HMO_PROVIDERS.map((hmo) => (
                                <option key={hmo} value={hmo}>{hmo}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">
                              Approval / GL Authorization Code <span className="text-red-500">*</span>
                            </span>
                            <Input
                              type="text"
                              value={hmoApprovalCode}
                              onChange={(e) => { setHmoApprovalCode(e.target.value); setFormError(null); }}
                              placeholder="e.g. MAXI-AUTH-88219"
                              className={`h-10 text-xs font-semibold border-slate-200 bg-white rounded-xl ${
                                formError ? 'border-red-400 focus:border-red-500' : ''
                              }`}
                            />
                            {/* Bug #8 fix: inline error */}
                            {formError && (
                              <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {formError}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Free follow-up confirmation */}
                    {paymentMethod === 'FREE' && (
                      <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                        <Percent className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 font-semibold">
                          This consultation will be recorded as a <strong>Free Follow-up</strong> with zero payment. 
                          The doctor may waive the fee for regular patients or post-surgery check-ups.
                        </p>
                      </div>
                    )}

                    {/* Top-level form error (non-HMO) */}
                    {formError && paymentMethod !== 'HMO' && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {formError}
                      </div>
                    )}

                    <Separator />

                    {/* 4. Settle Action — Bug #6 fix: Print button hidden until paid */}
                    <Button
                      onClick={handleSettlePayment}
                      disabled={isSubmitting}
                      className="w-full h-12 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                      {isSubmitting ? 'Processing Payment...' : 'Confirm Payment & Issue Receipt'}
                    </Button>
                  </>
                )}

                {/* Bug #6 fix: Print Receipt only shown after payment is settled */}
                {selectedAppt.is_paid_to_clinic && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReceiptModal(true)}
                    className="w-full h-10 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-2"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    View / Print Official Receipt
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : notFoundPreselectedId ? (
            <Card className="border-2 border-amber-300 bg-amber-50/70 p-12 text-center rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-amber-950">Patient Appointment Not Found</h3>
              <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed">
                The requested appointment ID (<span className="font-mono text-[11px] font-bold">{notFoundPreselectedId}</span>) does not exist in today&apos;s active clinic queue. The link may have expired or belongs to another date.
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotFoundPreselectedId(null);
                    const firstUnpaid = appointments.find((a) => !a.is_paid_to_clinic) || appointments[0];
                    if (firstUnpaid) setSelectedAppt(firstUnpaid);
                  }}
                  className="text-xs font-bold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 rounded-xl"
                >
                  Select First Unpaid Patient
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-slate-200 bg-white p-16 text-center rounded-2xl">
              <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">No Patient Selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Select a patient from the billing ledger to settle their consultation fee
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── RECEIPT MODAL — Bug #5 fix: print only receipt content ── */}
      {showReceiptModal && selectedAppt && (
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-md bg-white p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4" ref={receiptRef}>
              {/* Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-4">
                <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Clinic Natin Healthcare
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {clinic?.hospital_name || 'Maria Reyna XU Hospital'} &bull; Room {clinic?.room_number || '304'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Attending: {doctor?.name || 'Dr. Maria Santos'} ({doctor?.title || 'MD'})
                </p>
                <div className="mt-2 inline-block rounded border border-slate-300 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                  OFFICIAL CLINIC ACKNOWLEDGEMENT RECEIPT
                </div>
              </div>

              {/* Details */}
              <div className="text-xs space-y-1.5 text-slate-700 font-mono">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-bold">CN-REC-{selectedAppt.token_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{new Date().toLocaleString('en-PH')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patient Name:</span>
                  <span className="font-bold text-slate-900">{selectedAppt.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Queue Token:</span>
                  <span className="font-bold">{selectedAppt.token_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-bold">{paymentMethod}{paymentMethod === 'GCASH' && gcashRef ? ` (Ref: ${gcashRef})` : ''}</span>
                </div>
                {paymentMethod === 'HMO' && (
                  <>
                    <div className="flex justify-between">
                      <span>HMO Provider:</span>
                      <span className="font-bold">{hmoProvider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GL Auth Code:</span>
                      <span className="font-bold">{hmoApprovalCode || 'N/A'}</span>
                    </div>
                  </>
                )}
                {(isSeniorDiscount || isPwdDiscount) && idNumber && (
                  <div className="flex justify-between">
                    <span>Discount ID:</span>
                    <span className="font-bold">{idNumber}</span>
                  </div>
                )}
              </div>

              <Separator className="border-dashed" />

              {/* Fee Breakdown */}
              <div className="text-xs space-y-1 text-slate-700 font-mono">
                <div className="flex justify-between">
                  <span>Outpatient Consultation:</span>
                  <span>₱{baseFee.toFixed(2)}</span>
                </div>
                {(isSeniorDiscount || isPwdDiscount) && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Statutory 20% Discount:</span>
                    <span>-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono">₱{netPayable.toFixed(2)}</span>
                </div>
                {paymentMethod === 'CASH' && cashTendered && (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>Cash Tendered:</span>
                      <span>₱{parseFloat(cashTendered).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                      <span>Change Given:</span>
                      <span>₱{changeDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                <p>Thank you for trusting Clinic Natin.</p>
                <p className="mt-0.5 font-mono">Non-VAT Exempt Transaction under RA 10963</p>
              </div>
            </div>

            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReceiptModal(false)}
                className="text-xs font-bold rounded-xl"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handlePrintReceipt}
                className="text-xs font-bold bg-brand-700 hover:bg-brand-700/90 text-white gap-1.5 rounded-xl"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt Slip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function CashierPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm font-semibold text-slate-500">
          Loading Cashier & Fee Settlement Terminal...
        </div>
      }
    >
      <CashierPageContent />
    </Suspense>
  );
}
