'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Ticket,
  Clock,
  Building2,
  MapPin,
  Stethoscope,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Wrench,
  QrCode,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDoctorDisplayName } from '@/lib/formatters';

export interface BookDoctorProps {
  doctorId: string;
  doctorName: string;
  specialty: string;
  consultationFee?: number;
  activeClinic: {
    id: string;
    name: string;
    hospital_name: string;
    room_number: string;
    address: string;
    status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  };
  todaySchedule?: {
    id: string;
    start_time: string;
    end_time: string;
  };
}

interface Dependent {
  id: string;
  full_name: string;
  relationship: string;
  priority_category: string;
  priority_id_number?: string;
  date_of_birth?: string;
}

export function BookTokenModal({
  doctor,
  isOpen,
  onClose,
}: {
  doctor: BookDoctorProps | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'CONFIRMED'>('DETAILS');

  // Dependents state
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<'SELF' | string>('SELF');

  // Booking Form State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [priorityCategory, setPriorityCategory] = useState<'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT'>('NONE');
  const [priorityIdNumber, setPriorityIdNumber] = useState('');

  // Submission & Payment State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookedData, setBookedData] = useState<{
    appointmentId: string;
    tokenCode: string;
    queueNumber: number;
    servingNumber: number;
    bookingName: string;
    doctorName: string;
    payment: {
      qrCodeUrl?: string;
      isMock?: boolean;
    };
  } | null>(null);

  const [paymentSimulated, setPaymentSimulated] = useState(false);

  // Load dependents from Supabase or API
  useEffect(() => {
    async function loadDependents() {
      try {
        const res = await fetch('/api/patient/dependents?profileId=971463e5-9348-42c0-b759-5b56f9df9e99');
        if (res.ok) {
          const json = await res.json();
          if (json.dependents) {
            setDependents(json.dependents);
          }
        }
      } catch (e) {
        console.error('Failed to load dependents for booking:', e);
      }
    }
    if (isOpen) {
      loadDependents();
      setStep('DETAILS');
      setPaymentSimulated(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // When switching target, auto-populate priority
  const handleTargetChange = (target: string) => {
    setSelectedTarget(target);
    if (target === 'SELF') {
      setPriorityCategory('NONE');
      setPriorityIdNumber('');
    } else {
      const dep = dependents.find((d) => d.id === target);
      if (dep) {
        if (dep.priority_category === 'SENIOR' || dep.priority_category === 'PWD' || dep.priority_category === 'PREGNANT') {
          setPriorityCategory(dep.priority_category as any);
          setPriorityIdNumber(dep.priority_id_number || '');
        } else {
          setPriorityCategory('NONE');
          setPriorityIdNumber('');
        }
      }
    }
  };

  const handleCreateBooking = async () => {
    if (!doctor || doctor.activeClinic?.status === 'MAINTENANCE') return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        doctorId: doctor.doctorId,
        clinicId: doctor.activeClinic.id,
        scheduleId: doctor.todaySchedule?.id,
        patientId: '971463e5-9348-42c0-b759-5b56f9df9e99', // Dianne Pondoc
        dependentId: selectedTarget !== 'SELF' ? selectedTarget : null,
        priorityCategory,
        priorityIdNumber: priorityIdNumber.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
      };

      const res = await fetch('/api/queue/book-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to issue queue token');
      }

      setBookedData({
        appointmentId: data.appointment.id,
        tokenCode: data.appointment.tokenCode,
        queueNumber: data.appointment.queueNumber,
        servingNumber: data.appointment.servingNumber,
        bookingName: data.appointment.bookingName,
        doctorName: data.appointment.doctorName,
        payment: data.payment,
      });

      setStep('PAYMENT');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Booking error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate payment completion
  const handleSimulatePayment = async (channel: 'GCASH' | 'MAYA' | 'QRPH') => {
    if (!bookedData) return;
    setPaymentSimulated(true);

    try {
      const supabase = createClient();
      // 1. Mark transaction SUCCESS
      await supabase
        .from('transactions')
        .update({
          status: 'SUCCESS',
          payment_channel: channel,
          updated_at: new Date().toISOString(),
        })
        .eq('appointment_id', bookedData.appointmentId);

      // 2. Mark appointment PAID
      await supabase
        .from('appointments')
        .update({
          platform_payment_status: 'PAID',
        })
        .eq('id', bookedData.appointmentId);

      setTimeout(() => {
        setStep('CONFIRMED');
      }, 600);
    } catch (e) {
      console.error('Simulate payment error:', e);
      setStep('CONFIRMED');
    }
  };

  if (!doctor) return null;

  const isMaintenance = doctor.activeClinic?.status === 'MAINTENANCE';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
        {/* Header */}
        <div className={`px-6 py-4 text-white ${isMaintenance ? 'bg-gradient-to-r from-amber-700 to-amber-900' : 'bg-gradient-to-r from-brand to-brand-dark'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                {isMaintenance ? <Wrench className="h-4 w-4 text-white" /> : <Ticket className="h-4 w-4 text-white" />}
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white/90">
                {isMaintenance ? 'Facility Maintenance Mode' : 'Official Queue Reservation'}
              </span>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isMaintenance ? 'text-amber-100 bg-amber-950/40 border border-amber-500/40' : 'text-white/80 bg-white/10'}`}>
              {isMaintenance ? 'Room Suspended' : 'Odd Token • Online'}
            </span>
          </div>

          <DialogTitle className="text-lg font-bold text-white mt-2">
            {formatDoctorDisplayName(doctor.doctorName)}
          </DialogTitle>
          <DialogDescription className="text-white/80 text-xs flex items-center gap-1.5 mt-0.5">
            <span>{doctor.specialty}</span>
            <span>&bull;</span>
            <span>{doctor.activeClinic.hospital_name} ({doctor.activeClinic.room_number})</span>
          </DialogDescription>
        </div>

        {/* ── STEP 1: PATIENT & PRIORITY DETAILS ── */}
        {step === 'DETAILS' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {isMaintenance && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-amber-900">Clinic Room Currently Under Maintenance</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    {doctor.activeClinic.hospital_name} ({doctor.activeClinic.room_number || doctor.activeClinic.name}) is undergoing scheduled facility maintenance. Queue token reservations and in-person admissions are temporarily suspended.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Target Patient Switcher */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                1. Who is this consultation for?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTargetChange('SELF')}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    selectedTarget === 'SELF'
                      ? 'border-brand-700 bg-brand-50/50 ring-1 ring-brand-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Myself (Dianne Pondoc)</p>
                    <p className="text-[11px] text-slate-500">Primary Account Holder</p>
                  </div>
                  {selectedTarget === 'SELF' && <CheckCircle2 className="h-4 w-4 text-brand-700 shrink-0" />}
                </button>

                {dependents.map((dep) => (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => handleTargetChange(dep.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      selectedTarget === dep.id
                        ? 'border-brand-700 bg-brand-50/50 ring-1 ring-brand-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{dep.full_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {dep.relationship} {dep.priority_category === 'SENIOR' ? '&bull; Senior' : ''}
                      </p>
                    </div>
                    {selectedTarget === dep.id && <CheckCircle2 className="h-4 w-4 text-brand-700 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Lane (RA 9994 / RA 7277) */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                2. Statutory Priority Lane
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { key: 'NONE', label: 'Regular' },
                  { key: 'SENIOR', label: '👴 Senior (RA 9994)' },
                  { key: 'PWD', label: '♿ PWD (RA 7277)' },
                  { key: 'PREGNANT', label: '🤰 Maternal' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPriorityCategory(item.key as any)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border text-center transition ${
                      priorityCategory === item.key
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {(priorityCategory === 'SENIOR' || priorityCategory === 'PWD') && (
                <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <ShieldCheck className="h-4 w-4 text-amber-700" />
                    <span>
                      {priorityCategory === 'SENIOR' ? 'OSCA Senior Citizen ID' : 'PWD ID Card Number'}
                    </span>
                  </div>
                  <Input
                    placeholder={priorityCategory === 'SENIOR' ? 'e.g. OSCA-CDO-2023-1948' : 'e.g. PWD-CDO-9912'}
                    value={priorityIdNumber}
                    onChange={(e) => setPriorityIdNumber(e.target.value)}
                    className="bg-white text-xs h-9"
                  />
                  <p className="text-[10px] text-amber-700">
                    Auto-attaches 20% statutory discount + VAT exemption on doctor consultation fee at cashier.
                  </p>
                </div>
              )}
            </div>

            {/* Chief Complaint / Symptoms */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                3. Chief Complaint / Reason for Visit (Optional)
              </label>
              <Input
                placeholder="e.g. Recurrent morning headaches, blood pressure checkup, follow-up"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="text-xs h-9"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['High BP Check', 'Chest Tightness', 'Prescription Refill', 'Routine Checkup', 'Lab Review'].map(
                  (chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setChiefComplaint(chip)}
                      className="rounded-full bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700 px-2 py-0.5 transition"
                    >
                      +{chip}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Fee Transparency Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Platform Convenience Fee (Reserve online):</span>
                <span className="font-bold text-slate-900">₱50.00</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Doctor Consultation Fee (Paid at clinic counter):</span>
                <span>₱{doctor.consultationFee || 600}.00</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/80">
                ⚡ Skip the 7:00 AM hallway clipboard queue. Online tokens receive odd sequence numbers and real-time SMS turn alerts.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              {isMaintenance ? (
                <Button
                  type="button"
                  disabled
                  className="rounded-xl bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs cursor-not-allowed gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Room Under Maintenance
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Reserving Slot...
                    </>
                  ) : (
                    <>
                      Continue to ₱50 QRPH Payment
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 2: PAYMONGO QRPH PAYMENT SETTLEMENT ── */}
        {step === 'PAYMENT' && bookedData && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white font-black text-sm">
                #{bookedData.queueNumber}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-brand text-white font-mono text-[11px]">
                    {bookedData.tokenCode}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-700">Reserved</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  For <span className="font-bold text-slate-900">{bookedData.bookingName}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Currently serving #{bookedData.servingNumber} &bull; Room {doctor.activeClinic.room_number}
                </p>
              </div>
            </div>

            {/* QRPH Pay Card */}
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="font-black text-slate-900 tracking-tight text-sm">
                  ₱50.00 Convenience Fee
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                  QRPH BSP Compliant
                </span>
              </div>

              {/* Dynamic QR Code display */}
              <div className="mx-auto w-44 h-44 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center relative">
                {/* Simulated dynamic QR matrix using SVG */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-slate-800" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-7 w-7 rounded-md bg-white p-0.5 shadow-xs border border-slate-200 flex items-center justify-center">
                      <div className="h-5 w-5 rounded bg-brand-700 text-white flex items-center justify-center font-black text-[9px]">
                        CN
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                Scan with <span className="font-bold text-slate-700">GCash</span>, <span className="font-bold text-slate-700">Maya</span>, <span className="font-bold text-slate-700">ShopeePay</span>, or Philippine banking apps.
              </p>

              {/* Sandbox Instant Simulation buttons */}
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Development Sandbox &bull; 1-Tap Pay Simulation:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => handleSimulatePayment('GCASH')}
                    disabled={paymentSimulated}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl h-9 gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Simulate GCash
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSimulatePayment('MAYA')}
                    disabled={paymentSimulated}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Simulate Maya
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('DETAILS')}
                className="text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              <Button
                type="button"
                onClick={() => handleSimulatePayment('QRPH')}
                disabled={paymentSimulated}
                className="rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold"
              >
                Confirm Payment (₱50)
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 3: TOKEN CONFIRMED & DIGITAL PASS ── */}
        {step === 'CONFIRMED' && bookedData && (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Queue Token Issued & Confirmed
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Token #{bookedData.queueNumber} &bull; {bookedData.tokenCode}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You are token <span className="font-bold text-slate-800">#{bookedData.queueNumber}</span> for{' '}
                <span className="font-bold text-slate-800">{formatDoctorDisplayName(doctor.doctorName)}</span> today.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Consultation Location:</span>
                <span className="font-semibold text-slate-800">{doctor.activeClinic.hospital_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Room:</span>
                <span className="font-bold text-emerald-800">{doctor.activeClinic.room_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-800">{bookedData.bookingName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current Serving:</span>
                <span className="font-mono font-bold text-slate-900">#{bookedData.servingNumber}</span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 text-left flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Wait Anywhere Freedom Active</span>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  You can wait at home or a nearby CDO cafe. We will send an SMS and browser chime when 2 patients are ahead of you.
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto text-xs rounded-xl"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/my-queue');
                }}
                className="w-full sm:w-auto rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                Track Live Turn in My Queue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
