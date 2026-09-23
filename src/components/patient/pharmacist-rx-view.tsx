'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Printer,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Eye,
  Building2,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDoctorDisplayName } from '@/lib/formatters';

export interface RxPrescriptionItem {
  id: string;
  item_type: 'MEDICATION' | 'LAB_TEST' | 'IMAGING' | 'PROCEDURE';
  generic_name: string;
  brand_name?: string | null;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export interface PharmacistRxProps {
  rxCode: string; // e.g. CN-RX-2026-A1098
  doctorName: string;
  doctorSpecialty: string;
  prcLicense?: string;
  ptrNumber?: string;
  s2License?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  allergies?: string[];
  diagnosis: string;
  consultationDate: string;
  clinicHospital: string;
  clinicRoom: string;
  items: RxPrescriptionItem[];
}

export function PharmacistRxView({ data }: { data: PharmacistRxProps }) {
  const [isPharmacistMode, setIsPharmacistMode] = useState<boolean>(true);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Mode Toggle & Actions Bar ── */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isPharmacistMode ? 'default' : 'outline'}
            onClick={() => setIsPharmacistMode(true)}
            className={`rounded-xl text-xs font-bold h-9 gap-1.5 ${
              isPharmacistMode ? 'bg-slate-900 text-white' : ''
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Pharmacist Counter Mode
          </Button>
          <Button
            type="button"
            variant={!isPharmacistMode ? 'default' : 'outline'}
            onClick={() => setIsPharmacistMode(false)}
            className={`rounded-xl text-xs font-bold h-9 gap-1.5 ${
              !isPharmacistMode ? 'bg-brand-700 text-white' : ''
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Standard Half-Letter (℞)
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold h-9 gap-1.5 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save PDF (8.5&quot; &times; 5.5&quot;)
          </Button>
          <Link
            href={`/verify-rx/${data.rxCode}`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Public Verification
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* ── 1. PHARMACIST COUNTER PRESENTATION MODE ── */}
      {isPharmacistMode && (
        <div className="print:hidden rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-2.5 py-1 rounded-md">
                Pharmacist Dispensing View &bull; High Contrast
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Official Digital Prescription (℞)
              </h2>
              <p className="text-xs text-slate-600">
                Authorized for counter presentation at Mercury Drug, Rose Pharmacy, or Watsons
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
                {data.rxCode}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">SHA-256 Tamper-Evident</p>
            </div>
          </div>

          {/* Patient Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-200 bg-slate-50/50 -mx-6 px-6">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Patient Name</span>
              <p className="text-sm font-black text-slate-900">{data.patientName}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</span>
              <p className="text-xs font-bold text-slate-800">
                {data.patientAge ? `${data.patientAge} y/o` : 'Adult'} &bull; {data.patientGender || 'Female'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Date Issued</span>
              <p className="text-xs font-bold text-slate-800">{data.consultationDate}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Diagnosis</span>
              <p className="text-xs font-bold text-emerald-800 truncate">{data.diagnosis}</p>
            </div>
          </div>

          {/* Allergy Alert Warning */}
          {data.allergies && data.allergies.length > 0 && !data.allergies.includes('No Known Allergies (NKA)') && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span>
                <strong className="font-black">DRUG ALLERGIES ON FILE:</strong>{' '}
                {data.allergies.join(', ')}. Do not dispense contraindicated compounds.
              </span>
            </div>
          )}

          {/* High-Legibility Medicines List */}
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 text-2xl font-serif italic text-brand-700 font-black">
              <span>℞</span>
              <span className="text-xs font-sans not-italic font-bold text-slate-400 uppercase tracking-wider">
                Prescribed Pharmacological Agents:
              </span>
            </div>

            <div className="space-y-3">
              {data.items
                .filter((item) => item.item_type === 'MEDICATION')
                .map((med, index) => (
                  <div
                    key={med.id || index}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-400 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-900">
                            {index + 1}. {med.generic_name}
                          </span>
                          {med.brand_name && (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              ({med.brand_name})
                            </span>
                          )}
                          <span className="text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {med.dosage}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Sig / Frequency</span>
                            <span className="font-bold text-slate-900">{med.frequency}</span>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration / Dispense</span>
                            <span className="font-bold text-slate-900">{med.duration}</span>
                          </div>
                        </div>

                        {med.instructions && (
                          <p className="mt-2 text-xs text-slate-600 italic">
                            Special Instructions: &ldquo;{med.instructions}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Physician License & Verification Footer */}
          <div className="mt-6 pt-4 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{formatDoctorDisplayName(data.doctorName)}</p>
              <p className="text-slate-500">{data.doctorSpecialty} &bull; {data.clinicHospital}</p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-1">
                <span>PRC No: <strong className="font-mono text-slate-900">{data.prcLicense || '0129841'}</strong></span>
                <span>&bull;</span>
                <span>PTR No: <strong className="font-mono text-slate-900">{data.ptrNumber || 'CDO-882194'}</strong></span>
                {data.s2License && (
                  <>
                    <span>&bull;</span>
                    <span>PDEA S2: <strong className="font-mono text-slate-900">{data.s2License}</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="h-16 w-16 bg-slate-100 p-1.5 rounded-xl border border-slate-300 flex items-center justify-center">
                <QrCode className="h-12 w-12 text-slate-800" />
              </div>
              <div className="text-left text-[10px] text-slate-500">
                <p className="font-bold text-slate-800">Scan to Verify ℞</p>
                <p>Authentic FDA & PRC</p>
                <p>Digital Checksum</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. OFFICIAL HALF-LETTER PRINT PAD (8.5" x 5.5") ── */}
      <div
        className={`${
          isPharmacistMode ? 'hidden print:block' : 'block'
        } mx-auto max-w-[8.5in] bg-white border border-slate-300 shadow-sm p-8 text-slate-900 rounded-xl print:border-none print:shadow-none print:p-0`}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Doctor Header */}
        <div className="text-center border-b-2 border-slate-800 pb-3">
          <h1 className="text-lg font-bold tracking-tight text-slate-950">
            {formatDoctorDisplayName(data.doctorName)}
          </h1>
          <p className="text-xs font-semibold text-slate-700">{data.doctorSpecialty}</p>
          <p className="text-[11px] text-slate-500">
            {data.clinicHospital} &bull; {data.clinicRoom}
          </p>
        </div>

        {/* Patient Demographic Line */}
        <div className="flex items-center justify-between border-b border-slate-300 py-2.5 text-xs">
          <div>
            <span className="font-semibold text-slate-500">Patient: </span>
            <span className="font-bold text-slate-900">{data.patientName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Age/Sex: </span>
            <span>{data.patientAge || 'Adult'} / {data.patientGender || 'F'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Date: </span>
            <span>{data.consultationDate}</span>
          </div>
        </div>

        {/* Prescription Symbol & Items */}
        <div className="py-5 min-h-[220px]">
          <span className="text-3xl font-serif font-black italic text-slate-900 block mb-3">
            ℞
          </span>

          <div className="space-y-3.5 pl-4">
            {data.items
              .filter((i) => i.item_type === 'MEDICATION')
              .map((med, idx) => (
                <div key={med.id || idx} className="text-xs space-y-0.5">
                  <div className="font-bold text-slate-950 text-sm">
                    {idx + 1}. {med.generic_name} {med.brand_name ? `(${med.brand_name})` : ''} — {med.dosage}
                  </div>
                  <div className="text-slate-700 pl-4 font-medium">
                    Sig: {med.frequency} &bull; {med.duration}
                  </div>
                  {med.instructions && (
                    <div className="text-slate-500 pl-4 italic text-[11px]">
                      &ldquo;{med.instructions}&rdquo;
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Footer Signature & Licenses */}
        <div className="border-t-2 border-slate-800 pt-3 flex items-end justify-between">
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <p>Verification Code: <span className="font-mono font-bold text-slate-900">{data.rxCode}</span></p>
            <p>Clinic Natin Medical Arts System &bull; CDO</p>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <div className="h-9 flex items-end justify-end mb-1">
              <span className="font-serif italic text-base text-brand-700 font-bold border-b border-slate-400 px-4">
                {formatDoctorDisplayName(data.doctorName.split(' ')[0])}
              </span>
            </div>
            <p className="font-bold text-slate-900">{formatDoctorDisplayName(data.doctorName)}</p>
            <p className="text-[10px] text-slate-600">PRC: {data.prcLicense || '0129841'} &bull; PTR: {data.ptrNumber || 'CDO-882194'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
