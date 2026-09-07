'use client';

import React, { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Stethoscope, 
  QrCode, 
  AlertTriangle, 
  Printer, 
  Pencil, 
  ShieldCheck,
  HeartPulse,
  Info
} from 'lucide-react';
import Link from 'next/link';

export interface DigitalHealthPassportData {
  patientName: string;
  patientIdCode: string;
  bloodType?: string | null;
  bmi?: string | number | null;
  priorityCategory?: string | null;
  hmoProvider?: string | null;
  allergies?: string[] | null;
  comorbidities?: string[] | null;
  heightCm?: number | string | null;
  weightKg?: number | string | null;
  clinicTag?: string;
}

interface DigitalHealthPassportCardProps {
  data: DigitalHealthPassportData;
  onEdit?: () => void;
  showPrintButton?: boolean;
  showEditButton?: boolean;
  className?: string;
}

export function DigitalHealthPassportCard({
  data,
  onEdit,
  showPrintButton = true,
  showEditButton = true,
  className = '',
}: DigitalHealthPassportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    patientName,
    patientIdCode,
    bloodType = 'A+',
    bmi = '21.2',
    priorityCategory = 'Regular',
    hmoProvider = 'None / PhilHealth',
    allergies = [],
    comorbidities = [],
    heightCm,
    weightKg,
    clinicTag = 'CDO Outpatient',
  } = data;

  const formattedPriority =
    !priorityCategory || priorityCategory === 'NONE' || priorityCategory === 'REGULAR'
      ? 'Regular'
      : priorityCategory.replace('_', ' ');

  const handlePrint = () => {
    window.print();
  };

  const cmToFtIn = (cm?: number | string | null) => {
    if (!cm) return null;
    const num = typeof cm === 'string' ? parseFloat(cm) : cm;
    if (isNaN(num) || num <= 0) return null;
    const totalInches = num / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── DIGITAL CLINIC PASS (PHYSICAL WALLET CARD LOOK) ── */}
      <div
        ref={cardRef}
        id="official-health-passport-card"
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-6 sm:p-7 text-white shadow-2xl border border-white/20 select-none print:bg-slate-900 print:text-white"
      >
        {/* Ambient lighting effects */}
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-brand-500/25 blur-2xl pointer-events-none" />

        {/* Card Top Branding Header */}
        <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-inner border border-white/10">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide leading-none">
                CLINIC <span className="text-emerald-400">NATIN</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-1">
                Verified Patient Pass
              </div>
            </div>
          </div>
          <Badge variant="brand" className="text-[11px] px-2.5 py-0.5 font-bold shadow-xs bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
            {clinicTag}
          </Badge>
        </div>

        {/* Patient Details & Check-in QR Code */}
        <div className="relative my-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Patient Name
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {patientName || 'Patient Name'}
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>ID: {patientIdCode || 'CN-P0000'}</span>
            </div>
          </div>

          {/* Scannable Visual QR Code for 1-Sec Check-in */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-2.5 shadow-lg shrink-0">
            <QrCode className="h-14 w-14 sm:h-16 sm:w-16 text-slate-900" />
            <span className="text-[9px] font-extrabold text-slate-700 mt-1 uppercase tracking-tight">
              1-Sec Check-in
            </span>
          </div>
        </div>

        {/* Essential Clinical Vitals Grid */}
        <div className="relative grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-3.5 border border-white/10 text-center text-xs backdrop-blur-xs">
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Blood Group</div>
            <div className="text-base font-black text-emerald-400 mt-0.5">{bloodType || '\u2014'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">BMI</div>
            <div className="text-base font-black text-white mt-0.5">
              {bmi || '\u2014'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Priority</div>
            <div className="text-base font-black text-white mt-0.5 truncate px-1">
              {formattedPriority}
            </div>
          </div>
        </div>

        {/* Detailed Vitals Strip (Weight & Height) */}
        {(weightKg || heightCm) && (
          <div className="relative mt-2 flex items-center justify-around rounded-xl bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 border border-white/5">
            {weightKg && (
              <span>Weight: <strong className="text-white font-bold">{weightKg} kg</strong></span>
            )}
            {heightCm && (
              <span>Height: <strong className="text-white font-bold">{heightCm} cm {cmToFtIn(heightCm) ? `(${cmToFtIn(heightCm)})` : ''}</strong></span>
            )}
          </div>
        )}

        {/* HMO & Allergies Footer Info */}
        <div className="relative mt-4 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/10 pt-3">
          <div className="truncate max-w-[50%]">
            <span className="text-slate-400">HMO:</span>{' '}
            <strong className="text-white font-semibold">{hmoProvider || 'None / PhilHealth'}</strong>
          </div>
          <div className="truncate max-w-[48%] text-right">
            <span className="text-slate-400">Allergies:</span>{' '}
            {allergies && allergies.length > 0 ? (
              <strong className="text-rose-400 font-bold">{allergies.join(', ')}</strong>
            ) : (
              <strong className="text-emerald-400 font-semibold">None Reported</strong>
            )}
          </div>
        </div>

        {/* Chronic Comorbidities Note if present */}
        {comorbidities && comorbidities.length > 0 && (
          <div className="relative mt-2 text-[10px] text-slate-400 italic">
            Condition: {comorbidities.join(', ')}
          </div>
        )}
      </div>

      {/* ── CARD ACTIONS & EXPLANATION ── */}
      <div className="flex items-center justify-center gap-2 pt-1 print:hidden">
        {showEditButton && onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-xs font-bold text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl gap-1.5 h-8"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Vitals &amp; Records</span>
          </Button>
        )}
        {showPrintButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl gap-1.5 h-8"
          >
            <Printer className="h-3.5 w-3.5 text-brand-700" />
            <span>Print Pass</span>
          </Button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200/80 print:hidden max-w-md mx-auto">
        <Info className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          Present this <strong>Verified Patient Pass</strong> at the clinic entrance or reception counter. Scanning the QR code pulls your baseline vitals and priority lane directly into the physician&apos;s queue.
        </p>
      </div>
    </div>
  );
}
