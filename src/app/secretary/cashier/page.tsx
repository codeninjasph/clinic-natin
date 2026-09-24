'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft,
  ChevronRight,
  Coins,
} from 'lucide-react';
import { useSecretary, type Appointment } from '../secretary-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

const STATUS_LABEL: Record<string, string> = {
  WAITING: 'Waiting in Queue',
  BOOKED: 'Reserved',
  SERVING: 'Consulting',
  COMPLETED: 'Completed',
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
  const [idNumber, setIdNumber] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'HMO' | 'FREE'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [gcashRef, setGcashRef] = useState('');
  const [hmoProvider, setHmoProvider] = useState(HMO_PROVIDERS[0]);
  const [hmoApprovalCode, setHmoApprovalCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

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

  // Handle preselection from URL query param
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
  }, [preselectedId, appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selectedAppt from refreshed data after payment
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
  }, [selectedAppt?.id, doctor?.consultation_fee]);

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

  const unpaidPatients = useMemo(
    () => appointments.filter((a) => !a.is_paid_to_clinic && a.status !== 'CANCELLED_NO_SHOW'),
    [appointments]
  );

  const handleSettlePayment = async () => {
    if (!selectedAppt) return;

    if (paymentMethod === 'HMO' && !hmoApprovalCode.trim()) {
      setFormError('Please enter the HMO Approval / GL Authorization Code before saving.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      const meta = {
        hmoProvider: paymentMethod === 'HMO' ? hmoProvider : undefined,
        hmoCode: paymentMethod === 'HMO' ? hmoApprovalCode.trim() : undefined,
        gcashRef: paymentMethod === 'GCASH' ? gcashRef.trim() : undefined,
        idNumber: isSeniorDiscount || isPwdDiscount ? idNumber.trim() : undefined,
      };

      const ok = await updateAppointmentPaid(selectedAppt.id, paymentMethod, netPayable, meta);
      if (!ok) throw new Error('Payment could not be saved. Please check your network connection.');

      showToast(`Payment of ₱${netPayable.toFixed(2)} recorded for ${selectedAppt.display_name}!`);
      setShowReceiptModal(true);
      await refreshData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not save payment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const node = receiptRef.current;
    if (!node) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Clinic Natin Official Receipt</title>
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
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl p-4 shadow-xl text-sm font-black flex items-center gap-3 border ${
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
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-700" />
            Cashier &amp; Fee Settlement
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Collect professional consultation fees, apply statutory discounts, and issue official receipts.
          </p>
        </div>
      </div>

      {/* ── MOBILE QUICK UNPAID PATIENTS SCROLLBAR ── */}
      {unpaidPatients.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-emerald-600" />
              Unpaid Invoices ({unpaidPatients.length})
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Select patient to settle:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {unpaidPatients.map((p) => {
              const isSel = selectedAppt?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedAppt(p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border shrink-0 transition-all ${
                    isSel
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span
                    className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                      isSel ? 'bg-white/20 text-white' : 'bg-white border border-slate-200'
                    }`}
                  >
                    #{p.queue_number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate max-w-[130px]">{p.display_name}</p>
                    <p className={`text-[10px] ${isSel ? 'text-white/80' : 'text-slate-400'}`}>
                      ₱{p.consultation_fee || doctor?.consultation_fee || 600}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ── LEFT: Patient Billing Ledger (Hidden on small mobile when patient selected, visible on desktop) ── */}
        <div className="hidden lg:block lg:col-span-4 space-y-3">
          <Card className="border-slate-200/90 shadow-xs bg-white rounded-3xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black text-slate-900">
                  Patient Billing Ledger
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
                  placeholder="Search patient name or ticket token..."
                  className="h-10 pl-9 text-xs border-slate-200 bg-white rounded-xl"
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
                  <p className="text-xs text-slate-400 font-semibold">No patients found matching your search.</p>
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
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-300/30 shadow-xs'
                          : isPaid
                          ? 'bg-slate-50/50 border-slate-100 opacity-60 hover:opacity-80'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {appt.token_code}
                        </span>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            <Check className="h-3 w-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-black">
                            Unpaid
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-black text-slate-900 truncate leading-snug">
                        {appt.display_name}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5 font-medium">
                        <span>#{appt.queue_number} · {STATUS_LABEL[appt.status] ?? appt.status}</span>
                        <span className="font-bold text-slate-700">
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
            <Card className="border-slate-200 shadow-xs bg-white rounded-3xl overflow-hidden">
              {/* Transaction Header Banner */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Active Patient Transaction
                  </span>
                  <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {selectedAppt.display_name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-brand-700 text-white font-mono font-black text-sm px-3 py-1 rounded-xl shadow-xs">
                    {selectedAppt.token_code}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    Queue #{selectedAppt.queue_number}
                  </p>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Already Paid Notice Banner */}
                {selectedAppt.is_paid_to_clinic && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-300 p-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-emerald-950">Patient Consultation Already Paid</p>
                        <p className="text-xs text-emerald-700">
                          The professional consultation fee has been settled and recorded for this patient.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReceiptModal(true)}
                      className="h-10 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl"
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Receipt
                    </Button>
                  </div>
                )}

                {/* 1. Fee Breakdown & Discounts */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700">
                    <span>Consultation Fee (Physician Professional Fee):</span>
                    <span className="font-mono text-base text-slate-900 font-black">
                      ₱{baseFee.toFixed(2)}
                    </span>
                  </div>

                  {/* Statutory Discounts */}
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">
                      Statutory Discounts (Philippine Republic Acts)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-3 text-xs font-bold text-slate-800 bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={isSeniorDiscount}
                          disabled={selectedAppt.is_paid_to_clinic}
                          onChange={(e) => {
                            setIsSeniorDiscount(e.target.checked);
                            if (e.target.checked) setIsPwdDiscount(false);
                          }}
                          className="h-4.5 w-4.5 rounded accent-brand-700"
                        />
                        <span>Senior Citizen (RA 9994 — 20% Discount)</span>
                      </label>
                      <label className="flex items-center gap-3 text-xs font-bold text-slate-800 bg-white p-3 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={isPwdDiscount}
                          disabled={selectedAppt.is_paid_to_clinic}
                          onChange={(e) => {
                            setIsPwdDiscount(e.target.checked);
                            if (e.target.checked) setIsSeniorDiscount(false);
                          }}
                          className="h-4.5 w-4.5 rounded accent-brand-700"
                        />
                        <span>PWD (RA 7277 — 20% Discount)</span>
                      </label>
                    </div>

                    {(isSeniorDiscount || isPwdDiscount) && (
                      <div className="space-y-2 pt-1 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs bg-emerald-100/70 border border-emerald-300 rounded-xl px-3 py-2 font-black text-emerald-900">
                          <span>20% Statutory Discount Deducted:</span>
                          <span className="font-mono font-bold">-₱{discountAmount.toFixed(2)}</span>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">
                            {isSeniorDiscount ? 'Senior Citizen ID / OSCA Number' : 'PWD ID Number'}
                          </label>
                          <div className="relative">
                            <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              type="text"
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              placeholder={isSeniorDiscount ? 'e.g. OSCA-12345' : 'e.g. PWD-CDO-9876'}
                              className="h-10 pl-9 text-xs border-slate-300 bg-white rounded-xl"
                              disabled={selectedAppt.is_paid_to_clinic}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Net Payable Highlight */}
                  <div className="pt-3 border-t-2 border-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Total Amount Due
                      </span>
                      <span className="text-xs font-bold text-slate-700">Net Payable</span>
                    </div>
                    <span className="text-3xl font-black text-emerald-700 font-mono">
                      ₱{netPayable.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 2. Payment Method Selector */}
                {!selectedAppt.is_paid_to_clinic && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-black text-slate-800 block">
                        Payment Method:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'CASH', label: 'Cash', icon: Banknote },
                          { id: 'GCASH', label: 'GCash / Maya', icon: Smartphone },
                          { id: 'HMO', label: 'HMO Card / GL', icon: ShieldCheck },
                          { id: 'FREE', label: 'Complimentary (₱0)', icon: Percent },
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
                              className={`p-3 rounded-2xl border text-center transition-all ${
                                isSel
                                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300/40'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <Icon className={`h-5 w-5 mx-auto mb-1 ${isSel ? 'text-white' : 'text-slate-500'}`} />
                              <span className="text-xs font-black block leading-tight">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Cash Received & Change Calculator */}
                    {paymentMethod === 'CASH' && (
                      <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
                        <label className="text-xs font-bold text-slate-800 block">
                          Cash Tendered &amp; Change Due:
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                            Quick Cash:
                          </span>
                          {[
                            { label: `Exact (₱${netPayable})`, val: String(netPayable) },
                            { label: '₱500 Bill', val: '500' },
                            { label: '₱1,000 Bill', val: '1000' },
                          ].map((q) => (
                            <button
                              key={q.val}
                              type="button"
                              onClick={() => setCashTendered(q.val)}
                              className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-900 hover:bg-emerald-50 shadow-xs"
                            >
                              {q.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">
                              Amount Tendered by Patient (₱)
                            </span>
                            <Input
                              type="number"
                              value={cashTendered}
                              onChange={(e) => setCashTendered(e.target.value)}
                              placeholder="e.g. 1000"
                              className="h-12 text-xl font-black text-slate-900 border-emerald-200 bg-white rounded-xl"
                            />
                          </div>
                          <div className="rounded-2xl bg-emerald-600 text-white p-3.5 text-center shadow-xs">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 block">
                              Change Due to Patient
                            </span>
                            <span className="text-2xl sm:text-3xl font-black font-mono">
                              ₱{changeDue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* GCash Reference */}
                    {paymentMethod === 'GCASH' && (
                      <div className="bg-violet-50/70 p-4 rounded-2xl border border-violet-200 space-y-2.5">
                        <label className="text-xs font-bold text-slate-800 block">
                          GCash / Maya E-Wallet:
                        </label>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">
                            Reference Number from patient confirmation screen
                          </span>
                          <div className="relative">
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500" />
                            <Input
                              type="text"
                              value={gcashRef}
                              onChange={(e) => setGcashRef(e.target.value)}
                              placeholder="e.g. GC-REF-2026-123456"
                              className="h-11 pl-9 text-xs font-semibold border-violet-300 bg-white rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HMO Fields */}
                    {paymentMethod === 'HMO' && (
                      <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-3">
                        <label className="text-xs font-bold text-slate-800 block">
                          HMO Guarantee Letter (GL):
                        </label>
                        <div className="space-y-2.5">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">
                              HMO Provider
                            </span>
                            <select
                              value={hmoProvider}
                              onChange={(e) => setHmoProvider(e.target.value)}
                              className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-brand-700"
                            >
                              {HMO_PROVIDERS.map((hmo) => (
                                <option key={hmo} value={hmo}>
                                  {hmo}
                                </option>
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
                              onChange={(e) => {
                                setHmoApprovalCode(e.target.value);
                                setFormError(null);
                              }}
                              placeholder="e.g. MAXI-AUTH-88219"
                              className={`h-11 text-xs font-semibold border-slate-300 bg-white rounded-xl ${
                                formError ? 'border-red-400 focus:border-red-500' : ''
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Free confirmation */}
                    {paymentMethod === 'FREE' && (
                      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                        <Percent className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                          This consultation will be recorded as a <strong>Complimentary Follow-up (₱0)</strong>. 
                        </p>
                      </div>
                    )}

                    {formError && (
                      <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-bold">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <Separator />

                    {/* Settle Action Button */}
                    <Button
                      onClick={handleSettlePayment}
                      disabled={isSubmitting}
                      className="w-full h-13 text-sm sm:text-base font-black bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl shadow-md gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                      <span>
                        {isSubmitting ? 'Recording Payment...' : 'Confirm Payment & Issue Receipt'}
                      </span>
                    </Button>
                  </>
                )}

                {selectedAppt.is_paid_to_clinic && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReceiptModal(true)}
                    className="w-full h-11 text-xs font-black border-slate-300 text-slate-800 hover:bg-slate-50 rounded-2xl gap-2"
                  >
                    <Printer className="h-4 w-4 text-slate-600" />
                    <span>View &amp; Print Receipt</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : notFoundPreselectedId ? (
            <Card className="border-2 border-amber-300 bg-amber-50/70 p-8 text-center rounded-3xl space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-amber-950">Patient Not Found</h3>
              <p className="text-xs text-amber-800 max-w-md mx-auto">
                The requested appointment ID was not found in today&apos;s active queue.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setNotFoundPreselectedId(null);
                  const firstUnpaid = appointments.find((a) => !a.is_paid_to_clinic) || appointments[0];
                  if (firstUnpaid) setSelectedAppt(firstUnpaid);
                }}
                className="text-xs font-bold border-amber-300 bg-white text-amber-900 rounded-xl"
              >
                Select First Unpaid Patient
              </Button>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-slate-200 bg-white p-12 text-center rounded-3xl">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-black text-slate-700">No Patient Selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Select a patient from the ledger above to settle consultation fees.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── RECEIPT MODAL ── */}
      {showReceiptModal && selectedAppt && (
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-md bg-white p-0 rounded-3xl shadow-2xl border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4" ref={receiptRef}>
              <div className="text-center border-b border-dashed border-slate-300 pb-4">
                <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Clinic Natin Healthcare
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {clinic?.hospital_name || 'Maria Reyna XU Hospital'} &bull; Room {clinic?.room_number || '304'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Physician: {doctor?.name || 'Dr. Maria Santos'} ({doctor?.title || 'MD'})
                </p>
                <div className="mt-2 inline-block rounded border border-slate-300 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                  OFFICIAL CLINIC ACKNOWLEDGEMENT RECEIPT
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-slate-700 font-mono">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-bold">CN-REC-{selectedAppt.token_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date &amp; Time:</span>
                  <span>{new Date().toLocaleString('en-PH')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patient Name:</span>
                  <span className="font-bold text-slate-900">{selectedAppt.display_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ticket Token:</span>
                  <span className="font-bold">{selectedAppt.token_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-bold">
                    {paymentMethod}
                    {paymentMethod === 'GCASH' && gcashRef ? ` (Ref: ${gcashRef})` : ''}
                  </span>
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

              <div className="text-xs space-y-1 text-slate-700 font-mono">
                <div className="flex justify-between">
                  <span>Consultation Fee:</span>
                  <span>₱{baseFee.toFixed(2)}</span>
                </div>
                {(isSeniorDiscount || isPwdDiscount) && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>20% Statutory Discount:</span>
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
                      <span>Change Due:</span>
                      <span>₱{changeDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
                <p>Thank you for visiting Clinic Natin.</p>
                <p className="mt-0.5 font-mono">Non-VAT Exempt Transaction under RA 10963</p>
              </div>
            </div>

            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex sm:justify-between gap-2">
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
                className="text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white gap-1.5 rounded-xl"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Official Receipt</span>
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
          Loading Cashier &amp; Billing Terminal...
        </div>
      }
    >
      <CashierPageContent />
    </Suspense>
  );
}
