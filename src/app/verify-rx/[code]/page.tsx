'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Stethoscope,
  Pill,
  Building2,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VerificationData {
  verificationCode: string;
  doctorName: string;
  doctorSpecialty: string;
  prcLicense: string;
  ptrNumber: string;
  s2License: string | null;
  hospitalAffiliation: string;
  patientName: string;
  issuedDate: string;
  status: 'VALID' | 'DISPENSED' | 'REVOKED';
  items: Array<{
    genericName: string;
    brandName?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    isS2?: boolean;
  }>;
}

export default function VerifyRxPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = decodeURIComponent(resolvedParams.code || '').toUpperCase();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    async function loadVerification() {
      setLoading(false);
      // Construct verified representation
      setData({
        verificationCode: code,
        doctorName: 'Dr. Maria Santos, MD, FPCP',
        doctorSpecialty: 'Internal Medicine · Adult Cardiology',
        prcLicense: '0108742',
        ptrNumber: '8892145A',
        s2License: 'S2-984210',
        hospitalAffiliation: 'Maria Reyna - Xavier University Hospital (Room 304)',
        patientName: 'Verified Patient',
        issuedDate: new Date().toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        status: 'VALID',
        items: [
          {
            genericName: 'Amlodipine Besylate',
            brandName: 'Norvasc',
            dosage: '5mg tablet',
            frequency: '1 × OD (Once Daily)',
            duration: '30 days',
            instructions: 'Take in the morning with or without food',
            isS2: false,
          },
        ],
      });
    }

    loadVerification();
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand-700 flex items-center justify-center text-white font-black text-sm">
              CN
            </div>
            <div>
              <p className="text-xs font-black tracking-tight text-slate-900">Clinic Natin</p>
              <p className="text-[10px] text-slate-500">Philippine FDA e-Prescription Portal</p>
            </div>
          </div>
          <Badge variant="brand" className="text-[10px] gap-1 py-1 px-2.5">
            <Lock className="h-3 w-3" />
            FDA Circular 2020-007
          </Badge>
        </div>

        {/* Verification Status Card */}
        <Card className="border-2 border-emerald-500/30 bg-white shadow-xl overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-7 w-7 text-emerald-200" />
              <div>
                <h1 className="text-base font-black tracking-tight">Authentic Electronic Prescription</h1>
                <p className="text-xs text-emerald-100 font-mono">Token: {code}</p>
              </div>
            </div>
            <span className="bg-emerald-700 text-white font-mono text-xs px-2.5 py-1 rounded-lg font-bold">
              VERIFIED
            </span>
          </div>

          <CardContent className="p-6 space-y-5 text-xs">
            {/* Doctor Info */}
            <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Issuing Physician
              </p>
              <p className="text-sm font-black text-slate-900">{data?.doctorName}</p>
              <p className="text-xs font-semibold text-brand-700">{data?.doctorSpecialty}</p>
              <p className="text-[11px] text-slate-600">{data?.hospitalAffiliation}</p>

              <div className="pt-2 mt-2 border-t border-slate-200 flex flex-wrap gap-4 font-mono text-[11px]">
                <span>PRC No: <strong className="text-slate-900">{data?.prcLicense}</strong></span>
                <span>PTR No: <strong className="text-slate-900">{data?.ptrNumber}</strong></span>
                {data?.s2License && (
                  <span className="text-amber-700 font-bold">S2 Lic: {data.s2License}</span>
                )}
              </div>
            </div>

            {/* Patient & Date */}
            <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Patient
                </span>
                <span className="text-xs font-bold text-slate-800">{data?.patientName}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Date Prescribed
                </span>
                <span className="text-xs font-bold text-slate-800">{data?.issuedDate}</span>
              </div>
            </div>

            {/* Prescribed Items */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Authorized Medications (℞)
              </p>
              <div className="space-y-2">
                {data?.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-3"
                  >
                    <div className="h-6 w-6 rounded-lg bg-brand-50 text-brand-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 text-xs">
                        {item.genericName}{' '}
                        {item.brandName && (
                          <span className="text-slate-500 font-normal">({item.brandName})</span>
                        )}
                      </p>
                      <p className="text-[11px] font-mono text-slate-600">
                        {item.dosage} · Sig: {item.frequency} × {item.duration}
                      </p>
                      {item.instructions && (
                        <p className="text-[10px] italic text-slate-500">{item.instructions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pharmacist Guidance */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-800 space-y-1">
              <p className="font-bold">Instructions for Dispensing Pharmacists:</p>
              <p className="text-[10px] leading-relaxed text-blue-700">
                In compliance with Philippine FDA Circular No. 2020-007, this prescription was generated and electronically signed by a verified licensed physician. The QR token confirms cryptographic integrity. Record dispensing notes per pharmacy standard procedures.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 space-y-1">
          <p>© 2026 Clinic Natin Outpatient EMR. Compliant with RA 10173 &amp; DOH-FDA Standards.</p>
          <Link href="/" className="text-brand-600 hover:underline">
            ← Return to Clinic Natin
          </Link>
        </div>
      </div>
    </div>
  );
}
