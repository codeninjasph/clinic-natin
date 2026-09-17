'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Receipt,
  Search,
  Check,
  CheckCircle2,
  Printer,
  CreditCard,
  Building2,
  User,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  QrCode,
  Banknote,
  Percent,
  FileText,
  RotateCcw,
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

function CashierPageContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('appointmentId');

  const { appointments, doctor, clinic, updateAppointmentPaid, refreshData } = useSecretary();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Cashier Terminal Form State
  const [baseFee, setBaseFee] = useState<number>(600);
  const [isSeniorDiscount, setIsSeniorDiscount] = useState(false);
  const [isPwdDiscount, setIsPwdDiscount] = useState(false);
  const [idNumber, setIdNumber] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH' | 'HMO' | 'FREE'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [hmoProvider, setHmoProvider] = useState(HMO_PROVIDERS[0]);
  const [hmoApprovalCode, setHmoApprovalCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  // Set default base fee from doctor
  useEffect(() => {
    if (doctor?.consultation_fee) {
      setBaseFee(doctor.consultation_fee);
    }
  }, [doctor?.consultation_fee]);

  // Handle preselection
  useEffect(() => {
    if (preselectedId && appointments.length > 0) {
      const found = appointments.find((a) => a.id === preselectedId);
      if (found) {
        setSelectedAppt(found);
      }
    } else if (!selectedAppt && appointments.length > 0) {
      // Default to first unpaid completed or waiting patient
      const firstUnpaid = appointments.find((a) => !a.is_paid_to_clinic) || appointments[0];
      setSelectedAppt(firstUnpaid);
    }
  }, [preselectedId, appointments, selectedAppt]);

  // Synchronize discounts when patient changes
  useEffect(() => {
    if (selectedAppt) {
      const isSenior = selectedAppt.priority_category === 'SENIOR';
      const isPwd = selectedAppt.priority_category === 'PWD';
      setIsSeniorDiscount(isSenior);
      setIsPwdDiscount(isPwd);
      setCashTendered('');
      setPaymentMethod('CASH');
      if (selectedAppt.consultation_fee && selectedAppt.consultation_fee > 0) {
        setBaseFee(selectedAppt.consultation_fee);
      } else if (doctor?.consultation_fee) {
        setBaseFee(doctor.consultation_fee);
      }
    }
  }, [selectedAppt, doctor?.consultation_fee]);

  // Computations
  const discountAmount = useMemo(() => {
    if (paymentMethod === 'FREE') return baseFee;
    if (isSeniorDiscount || isPwdDiscount) {
      return baseFee * 0.20; // 20% statutory discount
    }
    return 0;
  }, [baseFee, isSeniorDiscount, isPwdDiscount, paymentMethod]);

  const netPayable = useMemo(() => {
    if (paymentMethod === 'FREE') return 0;
    return Math.max(0, baseFee - discountAmount);
  }, [baseFee, discountAmount, paymentMethod]);

  // Change Calculator ("Sukli")
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

  const handleSettlePayment = async () => {
    if (!selectedAppt) return;
    setIsSubmitting(true);
    try {
      const ok = await updateAppointmentPaid(selectedAppt.id, paymentMethod, netPayable);
      if (!ok) throw new Error('Payment settlement failed.');

      setToastMsg({ text: `Payment of ₱${netPayable.toFixed(2)} recorded successfully!`, type: 'success' });
      setShowReceiptModal(true);
      await refreshData();
    } catch (err: unknown) {
      setToastMsg({ text: err instanceof Error ? err.message : 'Could not settle payment.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
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
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-brand-700" />
            Cashier &amp; Fee Settlement Terminal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Settle physician consultation fees, apply RA 9994/RA 7277 discounts, and issue official receipts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 Cols): Patient Ledger List */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Today&apos;s Billing Ledger
                </CardTitle>
                <Badge variant="outline" className="font-bold text-slate-600 text-[10px]">
                  {appointments.length} Total Patients
                </Badge>
              </div>

              {/* Search Bar */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patient name or token..."
                  className="h-9 pl-9 text-xs border-slate-300"
                />
              </div>
            </CardHeader>

            <CardContent className="p-2 space-y-1.5 max-h-[620px] overflow-y-auto">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No patient records found.
                </div>
              ) : (
                filteredAppointments.map((appt) => {
                  const isSelected = selectedAppt?.id === appt.id;
                  const isPaid = appt.is_paid_to_clinic;

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => setSelectedAppt(appt)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-200 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs font-black ${
                            isSelected ? 'bg-brand-700 text-white border-brand-700' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {appt.token_code}
                        </Badge>
                        {isPaid ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
                            <Check className="h-3 w-3" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                            Unpaid
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm font-extrabold text-slate-900 mt-1.5 truncate">
                        {appt.display_name}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>Slot #{appt.queue_number} &bull; {appt.status}</span>
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

        {/* Right Column (7 Cols): Cashier Terminal & Calculator */}
        <div className="lg:col-span-7">
          {selectedAppt ? (
            <Card className="border-slate-200 shadow-xs bg-white">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Active Transaction
                    </span>
                    <CardTitle className="text-base font-black text-slate-900">
                      {selectedAppt.display_name}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-brand-700 text-white font-mono text-sm px-3 py-0.5">
                      {selectedAppt.token_code}
                    </Badge>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Slot #{selectedAppt.queue_number}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* 1. Fee Breakdown Box */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Doctor&apos;s Professional Fee:</span>
                    <span className="font-mono text-sm text-slate-900 font-bold">
                      ₱{baseFee.toFixed(2)}
                    </span>
                  </div>

                  {/* Statutory Deductions */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                      Statutory Privilege Discounts (Philippine Laws)
                    </span>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 flex-1 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isSeniorDiscount}
                          onChange={(e) => {
                            setIsSeniorDiscount(e.target.checked);
                            if (e.target.checked) setIsPwdDiscount(false);
                          }}
                          className="h-4 w-4 rounded text-brand-700"
                        />
                        <span>Senior Citizen (RA 9994 20%)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 flex-1 cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isPwdDiscount}
                          onChange={(e) => {
                            setIsPwdDiscount(e.target.checked);
                            if (e.target.checked) setIsSeniorDiscount(false);
                          }}
                          className="h-4 w-4 rounded text-brand-700"
                        />
                        <span>Person with Disability (RA 7277 20%)</span>
                      </label>
                    </div>

                    {(isSeniorDiscount || isPwdDiscount) && (
                      <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
                        <span>20% Statutory Discount Deduction:</span>
                        <span className="font-mono font-bold">-₱{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Big Net Payable Display */}
                  <div className="pt-2 border-t-2 border-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Select Payment Method:
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'CASH', label: 'Cash', icon: Banknote },
                      { id: 'GCASH', label: 'GCash / Maya', icon: QrCode },
                      { id: 'HMO', label: 'HMO / Guarantee', icon: ShieldCheck },
                      { id: 'FREE', label: 'Free Follow-up', icon: Percent },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className={`h-5 w-5 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold block">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Conditional Payment Controls */}
                {paymentMethod === 'CASH' && (
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-3">
                    <label className="text-xs font-bold text-slate-800 block">
                      Cash Received &amp; Instant Change Calculator:
                    </label>

                    {/* Quick Cash Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Quick:</span>
                      <button
                        type="button"
                        onClick={() => setCashTendered(String(netPayable))}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        Exact (₱{netPayable})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashTendered('500')}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        ₱500 Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashTendered('1000')}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        ₱1,000 Bill
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          Amount Tendered (₱)
                        </span>
                        <Input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="e.g. 1000"
                          className="h-12 text-lg font-black text-slate-900 border-slate-300"
                        />
                      </div>

                      {/* Giant Change Due Pill */}
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

                {paymentMethod === 'HMO' && (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 space-y-3">
                    <label className="text-xs font-bold text-slate-800 block">
                      HMO Guarantee Letter (GL) Pre-Authorization:
                    </label>

                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">
                          HMO Provider
                        </span>
                        <select
                          value={hmoProvider}
                          onChange={(e) => setHmoProvider(e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none"
                        >
                          {HMO_PROVIDERS.map((hmo) => (
                            <option key={hmo} value={hmo}>{hmo}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">
                          Approval / Pre-Authorization Code *
                        </span>
                        <Input
                          type="text"
                          value={hmoApprovalCode}
                          onChange={(e) => setHmoApprovalCode(e.target.value)}
                          placeholder="e.g. MAXI-AUTH-88219"
                          className="h-11 text-xs font-semibold border-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Settle Payment Action */}
                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="brand"
                    onClick={handleSettlePayment}
                    disabled={isSubmitting || selectedAppt.is_paid_to_clinic}
                    className="flex-1 h-12 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-5 w-5" />
                    )}
                    {selectedAppt.is_paid_to_clinic ? 'Payment Already Settled' : 'Confirm Payment & Issue Receipt'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowReceiptModal(true)}
                    className="h-12 px-4 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl gap-2"
                  >
                    <Printer className="h-4 w-4 text-slate-600" />
                    <span>Print Receipt</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Patient Selected</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Select a patient from the ledger on the left to settle their consultation fee
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── PRINTABLE OFFICIAL RECEIPT MODAL ── */}
      {showReceiptModal && selectedAppt && (
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-md bg-white p-0 rounded-2xl shadow-2xl border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4" ref={receiptRef}>
              {/* Receipt Slip Header */}
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

              {/* Receipt Details */}
              <div className="text-xs space-y-1.5 text-slate-700 font-mono">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-bold">CN-REC-{selectedAppt.token_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date &amp; Time:</span>
                  <span>{new Date().toLocaleString()}</span>
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
                  <span>Payment Channel:</span>
                  <span className="font-bold">{paymentMethod}</span>
                </div>
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

            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReceiptModal(false)}
                className="text-xs font-bold"
              >
                Close
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={handlePrintReceipt}
                className="text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white gap-1.5"
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
          Loading Cashier &amp; Fee Settlement Terminal...
        </div>
      }
    >
      <CashierPageContent />
    </Suspense>
  );
}
