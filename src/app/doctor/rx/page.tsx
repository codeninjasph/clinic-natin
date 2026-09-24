'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Pill,
  Search,
  X,
  AlertTriangle,
  Printer,
  ArrowLeft,
  Plus,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Trash2,
  ChevronRight,
  FileText,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { searchFormulary, type PhDrug } from '@/data/ph-formulary';
import { useDoctor } from '../doctor-context';
import QRCode from 'qrcode';
import { DiagnosticRequisitionPad, type DiagnosticOrder } from '@/components/doctor/diagnostic-requisition-pad';
import { PatientSearchAutocomplete, type PatientSearchResult } from '@/components/doctor/patient-search-autocomplete';
import { generateRxVerificationHash } from '@/lib/crypto/rx-security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface RxItem {
  id: string;
  genericName: string;
  brandName: string;
  dosageForm: string;
  strength: string;
  quantity: string;
  frequency: string;
  duration: string;
  instructions: string;
  isS2: boolean;
  isControlled: boolean;
}

interface DoctorProfile {
  name: string;
  title: string;
  specialty: string;
  prcLicense: string;
  ptrNumber: string;
  s2License: string;
  signatureUrl?: string | null;
  clinicAddress: string;
  clinicPhone: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Frequency presets
// ──────────────────────────────────────────────────────────────────────────────
const FREQUENCY_PRESETS = [
  { label: 'OD (Once Daily)', value: '1 × OD (Once Daily)' },
  { label: 'BID (Twice Daily)', value: '1 × BID (Twice Daily)' },
  { label: 'TID (3× Daily)', value: '1 × TID (Three Times Daily)' },
  { label: 'QID (4× Daily)', value: '1 × QID (Four Times Daily)' },
  { label: 'Q4h (Every 4h)', value: '1 × Q4 hours' },
  { label: 'Q8h (Every 8h)', value: '1 × Q8 hours' },
  { label: 'HS (Bedtime)', value: '1 × HS (At Bedtime)' },
  { label: 'PRN (As Needed)', value: '1 × PRN (As Needed)' },
  { label: 'STAT (Immediately)', value: 'STAT (Give Immediately)' },
];

const DURATION_PRESETS = [
  '3 days', '5 days', '7 days', '10 days', '14 days', '28 days', '1 month', '3 months', 'Ongoing / Until further notice',
];

function newRxItem(): RxItem {
  return {
    id: crypto.randomUUID(),
    genericName: '',
    brandName: '',
    dosageForm: '',
    strength: '',
    quantity: '',
    frequency: '',
    duration: '',
    instructions: '',
    isS2: false,
    isControlled: false,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: Parse textual SOAP plan lines into structured Rx items
// ──────────────────────────────────────────────────────────────────────────────
function parsePlanToRxItems(planText: string): RxItem[] {
  const lines = planText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [newRxItem()];

  const items = lines.map((line) => {
    const cleaned = line.replace(/^(\d+[\.\)]|\-|\*|•)\s*/, '').trim();
    let qty = '';
    const qtyMatch = cleaned.match(/(?:#|qty:?\s*|quantity:?\s*)(\d+)/i);
    if (qtyMatch) qty = qtyMatch[1];

    const parts = cleaned.split(/\s*[-—–]\s*/);
    const medPart = parts[0] || cleaned;
    const sigPart = parts.slice(1).join(' — ') || 'Take as directed';

    const medWords = medPart.replace(/(?:#|qty:?\s*|quantity:?\s*)\d+/i, '').trim().split(/\s+/);
    const genericName = medWords[0] || '';
    const strengthOrDosage = medWords.slice(1).join(' ') || '';

    const freqMatch = sigPart.match(/(OD|BID|TID|QID|Q\d+h|HS|PRN|daily|twice|thrice)/i);
    let frequency = '1 × OD (Once Daily)';
    if (freqMatch) {
      const f = freqMatch[0].toUpperCase();
      if (f === 'BID') frequency = '1 × BID (Twice Daily)';
      else if (f === 'TID') frequency = '1 × TID (Three Times Daily)';
      else if (f === 'QID') frequency = '1 × QID (Four Times Daily)';
      else if (f === 'HS') frequency = '1 × HS (At Bedtime)';
      else if (f === 'PRN') frequency = '1 × PRN (As Needed)';
      else if (f.startsWith('Q')) frequency = `1 × ${f}`;
    }

    const durMatch = sigPart.match(/(\d+\s*(days|weeks|months|d|w|m))/i);
    const duration = durMatch ? durMatch[0] : '7 days';

    const matchedDrug = genericName ? searchFormulary(genericName)[0] : undefined;

    return {
      id: crypto.randomUUID(),
      genericName: matchedDrug?.genericName || genericName,
      brandName: matchedDrug?.brandNames[0] || '',
      dosageForm: strengthOrDosage.toLowerCase().includes('cap')
        ? 'Capsule'
        : strengthOrDosage.toLowerCase().includes('syr')
        ? 'Syrup'
        : 'Tablet',
      strength: strengthOrDosage.replace(/\b(tab|tablets?|cap|capsules?|syr|syrup)\b/gi, '').trim(),
      quantity: qty,
      frequency,
      duration,
      instructions: sigPart,
      isS2: matchedDrug?.is_s2 || false,
      isControlled: matchedDrug?.is_controlled || false,
    };
  });

  return items.length > 0 ? items : [newRxItem()];
}

// ──────────────────────────────────────────────────────────────────────────────
// Printable Rx Header (also shown in UI)
// ──────────────────────────────────────────────────────────────────────────────
function RxHeader({
  doctor,
  patientName,
  patientAge,
  rxDate,
}: {
  doctor: DoctorProfile;
  patientName: string;
  patientAge: string;
  rxDate: string;
}) {
  return (
    <div className="rx-header">
      {/* Doctor branding */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Clinic Natin — Digital Rx
          </p>
          <h2 className="text-lg font-black text-slate-900 mt-0.5">
            {doctor.title} {doctor.name}
          </h2>
          <p className="text-xs font-semibold text-brand-700">{doctor.specialty}</p>
          <p className="text-xs text-slate-500 mt-1">{doctor.clinicAddress}</p>
          <p className="text-xs text-slate-500">{doctor.clinicPhone}</p>
        </div>
        <div className="text-right space-y-0.5">
          <div className="flex flex-col items-end gap-0.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">PRC Lic:</span>
              <span className="font-bold font-mono">{doctor.prcLicense || '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-400">PTR No:</span>
              <span className="font-bold font-mono">{doctor.ptrNumber || '—'}</span>
            </div>
            {doctor.s2License && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-amber-600">S2 Lic:</span>
                <span className="font-bold font-mono text-amber-700">{doctor.s2License}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      {/* Patient info row */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">
            Patient Name
          </span>
          <span className="font-bold text-slate-900 border-b border-slate-300 block pb-0.5">
            {patientName || '______________________________'}
          </span>
        </div>
        <div>
          <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">
            Age / Sex
          </span>
          <span className="font-bold text-slate-900 border-b border-slate-300 block pb-0.5">
            {patientAge || '________'}
          </span>
        </div>
        <div>
          <span className="block text-slate-400 font-semibold uppercase tracking-wider text-[10px] mb-0.5">
            Date
          </span>
          <span className="font-bold text-slate-900 border-b border-slate-300 block pb-0.5">
            {rxDate}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Single Rx Line Item Row (editable)
// ──────────────────────────────────────────────────────────────────────────────
function RxLineItem({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: RxItem;
  index: number;
  onUpdate: (id: string, updates: Partial<RxItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [drugQuery, setDrugQuery] = useState(item.genericName);
  const [drugResults, setDrugResults] = useState<PhDrug[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<PhDrug | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDrugSearch = (q: string) => {
    setDrugQuery(q);
    onUpdate(item.id, { genericName: q });
    if (q.length >= 2) {
      setDrugResults(searchFormulary(q));
      setShowDropdown(true);
    } else {
      setDrugResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectDrug = (drug: PhDrug) => {
    setSelectedDrug(drug);
    setDrugQuery(drug.genericName);
    setShowDropdown(false);
    setDrugResults([]);
    onUpdate(item.id, {
      genericName: drug.genericName,
      brandName: drug.brandNames[0] || '',
      dosageForm: drug.dosageForms[0] || '',
      strength: drug.strengths[0] || '',
      isS2: drug.is_s2,
      isControlled: drug.is_controlled,
    });
  };

  const hasDrugSelected = !!item.genericName;
  const drug = selectedDrug;

  return (
    <div
      className={`rounded-2xl border-2 p-4 space-y-3 ${
        item.isS2
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-slate-100 bg-white'
      }`}
    >
      {/* Row header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-brand-700 text-white text-xs font-black flex items-center justify-center">
            ℞{index + 1}
          </div>
          {item.isS2 && (
            <Badge variant="warning" className="text-[10px] gap-1">
              <ShieldAlert className="h-2.5 w-2.5" />
              S2 — Dangerous Drug Prescription Required
            </Badge>
          )}
          {item.isControlled && (
            <Badge variant="destructive" className="text-[10px]">
              Schedule IV — Controlled
            </Badge>
          )}
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drug search */}
      <div ref={containerRef} className="relative">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Generic Drug Name
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={drugQuery}
            onChange={(e) => handleDrugSearch(e.target.value)}
            onFocus={() => drugResults.length > 0 && setShowDropdown(true)}
            placeholder="Search PH Formulary: Amoxicillin, Amlodipine, Metformin..."
            className="pl-9 text-sm font-semibold"
          />
        </div>

        {showDropdown && drugResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            {drugResults.map((d) => (
              <button
                key={d.genericName}
                type="button"
                onClick={() => handleSelectDrug(d)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-brand-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <Pill className="h-4 w-4 text-brand-700 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{d.genericName}</p>
                  <p className="text-[10px] text-brand-700 font-semibold">{d.category}</p>
                  <p className="text-[10px] text-slate-500">
                    {d.brandNames.slice(0, 3).join(' · ')} · {d.strengths.join(', ')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {d.is_s2 && (
                    <span className="text-[9px] font-black bg-amber-100 text-amber-800 rounded-md px-1.5 py-0.5">
                      S2
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drug detail fields — shown after a drug is selected or filled manually */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Brand Name */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Brand Name
          </label>
          <Input
            value={item.brandName}
            onChange={(e) => onUpdate(item.id, { brandName: e.target.value })}
            placeholder={drug?.brandNames[0] || 'Optional'}
            className="text-xs"
          />
        </div>

        {/* Dosage Form */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Form
          </label>
          <div className="relative">
            <Input
              value={item.dosageForm}
              onChange={(e) => onUpdate(item.id, { dosageForm: e.target.value })}
              placeholder="Tab / Cap / Syrup"
              className="text-xs"
              list={`form-${item.id}`}
            />
            {drug && (
              <datalist id={`form-${item.id}`}>
                {drug.dosageForms.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Strength */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Strength
          </label>
          <div className="relative">
            <Input
              value={item.strength}
              onChange={(e) => onUpdate(item.id, { strength: e.target.value })}
              placeholder="500mg"
              className="text-xs"
              list={`strength-${item.id}`}
            />
            {drug && (
              <datalist id={`strength-${item.id}`}>
                {drug.strengths.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Qty (#)
          </label>
          <Input
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, { quantity: e.target.value })}
            placeholder="e.g., 21"
            className="text-xs"
            type="number"
            min={1}
          />
        </div>
      </div>

      {/* Frequency + Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Frequency (Sig)
          </label>
          <Input
            value={item.frequency}
            onChange={(e) => onUpdate(item.id, { frequency: e.target.value })}
            placeholder="1 × TID (Three Times Daily)"
            className="text-xs"
            list={`freq-${item.id}`}
          />
          <datalist id={`freq-${item.id}`}>
            {FREQUENCY_PRESETS.map((f) => (
              <option key={f.value} value={f.value} />
            ))}
          </datalist>
          {/* Quick-select frequency chips */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {['OD', 'BID', 'TID', 'QID', 'PRN'].map((freq) => {
              const preset = FREQUENCY_PRESETS.find((p) => p.label.startsWith(freq));
              return (
                <button
                  key={freq}
                  type="button"
                  onClick={() => onUpdate(item.id, { frequency: preset?.value || freq })}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-800 transition-colors"
                >
                  {freq}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Duration
          </label>
          <Input
            value={item.duration}
            onChange={(e) => onUpdate(item.id, { duration: e.target.value })}
            placeholder="7 days"
            className="text-xs"
            list={`dur-${item.id}`}
          />
          <datalist id={`dur-${item.id}`}>
            {DURATION_PRESETS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {['3 days', '5 days', '7 days', '14 days', '1 month'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onUpdate(item.id, { duration: d })}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-800 transition-colors"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Special instructions */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Special Instructions (Optional)
        </label>
        <Input
          value={item.instructions}
          onChange={(e) => onUpdate(item.id, { instructions: e.target.value })}
          placeholder="e.g., Take with food. Avoid alcohol. Store in cool dry place."
          className="text-xs"
        />
      </div>

      {/* S2 warning per item */}
      {item.isS2 && (
        <Alert variant="warning" className="py-2">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="text-xs">S2 Prescription Required (DDB Regulation)</AlertTitle>
          <AlertDescription className="text-[11px]">
            This drug is classified as a Dangerous Drug under RA 9165. It must be written on a
            <strong> yellow DDB-issued S2 prescription form</strong> using your S2 License Number:{' '}
            <strong className="font-mono">
              {/* S2 license is shown from doctor profile */}
              {typeof window !== 'undefined'
                ? localStorage.getItem('doctor_s2_license') || 'Not configured — set in Settings'
                : '—'}
            </strong>
            . Only one item per S2 prescription pad is allowed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Printable Rx Preview (rendered on screen + print)
// ──────────────────────────────────────────────────────────────────────────────
function PrintableRx({
  doctor,
  patientName,
  patientAge,
  rxDate,
  items,
}: {
  doctor: DoctorProfile;
  patientName: string;
  patientAge: string;
  rxDate: string;
  items: RxItem[];
}) {
  const regularItems = items.filter((i) => !i.isS2 && (i.genericName || i.brandName));
  const s2Items = items.filter((i) => i.isS2 && (i.genericName || i.brandName));

  const verification = generateRxVerificationHash({
    doctorPrc: doctor.prcLicense,
    patientId: patientName || 'Walk-in',
    date: rxDate,
    items: items.map((i) => ({ genericName: i.genericName, dosage: i.dosageForm })),
  });

  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinicnatin.ph';
    const verifyUrl = `${origin}/verify-rx/${verification.verificationCode}`;
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 80 })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [verification.verificationCode]);

  const renderRxSlip = (slipItems: RxItem[], padColor: 'white' | 'yellow') => (
    <div
      className={`rounded-2xl border-2 p-6 space-y-4 rx-slip ${
        padColor === 'yellow'
          ? 'border-amber-300 bg-amber-50/70 print:bg-amber-100/70 print:border-amber-500'
          : 'border-slate-200 bg-white print:border-slate-800'
      }`}
    >
      <RxHeader
        doctor={doctor}
        patientName={patientName}
        patientAge={patientAge}
        rxDate={rxDate}
      />

      {slipItems.length === 0 ? (
        <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl my-3">
          <p className="text-3xl font-serif text-brand-700 font-bold mb-1">℞</p>
          <p className="text-xs italic text-slate-400">Blank Prescription Pad</p>
          <div className="space-y-3 mt-4 max-w-sm mx-auto text-left opacity-40">
            <div className="border-b border-slate-300 pb-1 text-slate-400 text-xs">1. _____________________________________________</div>
            <div className="border-b border-slate-300 pb-1 text-slate-400 text-xs">2. _____________________________________________</div>
            <div className="border-b border-slate-300 pb-1 text-slate-400 text-xs">3. _____________________________________________</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {slipItems.map((item, idx) => (
            <div key={item.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black text-brand-700 shrink-0">℞{idx + 1}</span>
                <div>
                  <p className="font-black text-slate-900">
                    {item.genericName || item.brandName || 'Medication'}
                    {item.brandName && item.genericName && (
                      <span className="font-medium text-slate-600 ml-1.5">({item.brandName})</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-700">
                    {[item.dosageForm, item.strength].filter(Boolean).join(' ')}
                    {item.quantity && (
                      <span className="font-bold ml-1.5">#{item.quantity}</span>
                    )}
                  </p>
                  {item.frequency && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sig: {item.frequency}
                      {item.duration && ` × ${item.duration}`}
                    </p>
                  )}
                  {item.instructions && (
                    <p className="text-[11px] text-slate-500 italic">{item.instructions}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signature & Verification Area */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex items-end justify-between gap-4">
        {/* Left: Tamper-Evident QR Code & Token */}
        <div className="flex items-center gap-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="FDA Verification QR"
              className="h-16 w-16 border border-slate-200 rounded-lg p-0.5 bg-white shrink-0"
            />
          ) : (
            <div className="h-16 w-16 border border-slate-200 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-mono text-slate-400">QR</span>
            </div>
          )}
          <div className="text-[9px] text-slate-500 font-mono space-y-0.5">
            <p className="font-bold text-slate-800 uppercase tracking-tight">FDA Circular 2020-007</p>
            <p>Verification Token: <strong className="text-brand-800">{verification.verificationCode}</strong></p>
            <p className="text-[8px] text-slate-400">Scan QR or visit clinicnatin.ph/verify-rx</p>
          </div>
        </div>

        {/* Right: Electronic Signature & Credentials */}
        <div className="text-right text-xs flex flex-col items-end shrink-0">
          {doctor.signatureUrl ? (
            <img
              src={doctor.signatureUrl}
              alt="Doctor Signature"
              className="h-10 object-contain max-w-[140px] -mb-1"
            />
          ) : (
            <div className="border-t border-slate-800 w-36 mb-1" />
          )}
          <p className="font-bold text-slate-800">
            {doctor.title} {doctor.name}
          </p>
          <p className="text-slate-500">{doctor.specialty}</p>
          <p className="font-mono text-slate-600 text-[10px]">PRC {doctor.prcLicense}</p>
          <p className="font-mono text-slate-600 text-[10px]">PTR {doctor.ptrNumber}</p>
          {padColor === 'yellow' && doctor.s2License && (
            <p className="font-mono text-amber-700 font-bold text-[10px]">
              S2 Lic: {doctor.s2License}
            </p>
          )}
        </div>
      </div>

      {padColor === 'yellow' && (
        <div className="text-center text-[10px] text-amber-700 font-bold border-t border-amber-200 pt-2">
          ⚠️ DANGEROUS DRUG PRESCRIPTION — ONE ITEM PER S2 FORM — DDB / RA 9165 COMPLIANT
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {regularItems.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 no-print">
            Regular Prescription (White Pad)
          </p>
          {renderRxSlip(regularItems, 'white')}
        </div>
      )}
      {s2Items.map((item) => (
        <div key={item.id}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5 no-print">
            <ShieldAlert className="h-3 w-3" />
            S2 Dangerous Drug Prescription (Yellow Pad) — 1 per Form
          </p>
          {renderRxSlip([item], 'yellow')}
        </div>
      ))}
      {regularItems.length === 0 && s2Items.length === 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 no-print">
            Prescription Pad Preview
          </p>
          {renderRxSlip([], 'white')}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Rx Pad Page Content (wrapped in Suspense for useSearchParams)
// ──────────────────────────────────────────────────────────────────────────────
function RxPadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const appointmentIdParam = searchParams.get('appointmentId') || '';
  const patientNameParam = searchParams.get('patient') || '';
  const tokenCodeParam = searchParams.get('token') || '';
  const patientIdParam = searchParams.get('patientId') || '';
  const planParam = searchParams.get('plan') || '';

  // Pad mode state (Prescription vs Diagnostic Lab Requisition)
  const [padMode, setPadMode] = useState<'PRESCRIPTION' | 'LAB_REQUISITION'>('PRESCRIPTION');

  // Resolved appointment & patient state
  const [activeAppointmentId, setActiveAppointmentId] = useState<string>(appointmentIdParam);
  const [activePatientId, setActivePatientId] = useState<string | null>(patientIdParam || null);
  const [patientName, setPatientName] = useState(patientNameParam);
  const [patientAge, setPatientAge] = useState('');
  const [patientAllergies, setPatientAllergies] = useState<string[]>([]);
  const [tokenCode, setTokenCode] = useState(tokenCodeParam);
  const [isServingAutoLinked, setIsServingAutoLinked] = useState(false);

  // Rx state
  const [rxItems, setRxItems] = useState<RxItem[]>(() => {
    if (planParam) {
      return parsePlanToRxItems(planParam);
    }
    return [newRxItem()];
  });
  const [doctorNotes, setDoctorNotes] = useState('');
  const [rxDate] = useState(
    new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  );
  const [showPreview, setShowPreview] = useState(!!planParam);
  const [isSaving, setIsSaving] = useState(false);
  const [toastNotice, setToastNotice] = useState<{
    type: 'success' | 'destructive';
    message: string;
  } | null>(null);

  const { doctor, selectedRoom } = useDoctor();

  const doctorProfile: DoctorProfile = {
    name: doctor?.name.replace(/^Dr\.\s*/i, '') || 'Maria Santos',
    title: doctor?.title || 'Dr.',
    specialty: doctor?.specialty || 'General Practice',
    prcLicense: doctor?.prcLicense || '0123456',
    ptrNumber: doctor?.ptrNumber || 'PTR-CDO-2026-00189',
    s2License: doctor?.s2License || '',
    signatureUrl: doctor?.signatureUrl || (typeof window !== 'undefined' ? localStorage.getItem('doctor_signature_url') : null),
    clinicAddress: selectedRoom ? `${selectedRoom.room}, ${selectedRoom.hospital}` : 'Room 304, Maria Reyna XU Hospital, CDO',
    clinicPhone: '+63 88 850 3000',
  };

  // ── Patient Selection Handlers for Autocomplete ─────────────────────────────
  const handleSelectPatient = useCallback((p: PatientSearchResult) => {
    setActivePatientId(p.id);
    setPatientName(p.fullName);
    if (p.appointmentId) {
      setActiveAppointmentId(p.appointmentId);
      setTokenCode(p.tokenCode || '');
      setIsServingAutoLinked(p.queueStatus === 'SERVING');
    } else {
      setActiveAppointmentId('');
      setTokenCode('');
      setIsServingAutoLinked(false);
    }
    if (p.age !== null) {
      setPatientAge(`${p.age} yrs ${p.gender ? `· ${p.gender}` : ''}`);
    } else if (p.gender) {
      setPatientAge(p.gender);
    } else {
      setPatientAge('');
    }
    setPatientAllergies(p.allergies || []);
  }, []);

  const handleSelectWalkIn = useCallback((name: string) => {
    setActivePatientId(null);
    setActiveAppointmentId('');
    setTokenCode('');
    setIsServingAutoLinked(false);
    setPatientName(name);
    setPatientAge('');
    setPatientAllergies([]);
  }, []);

  const handleClearPatient = useCallback(() => {
    setActivePatientId(null);
    setActiveAppointmentId('');
    setTokenCode('');
    setIsServingAutoLinked(false);
    setPatientName('');
    setPatientAge('');
    setPatientAllergies([]);
  }, []);

  // ── Auto-resolve patient details & existing prescriptions ──────────────────
  useEffect(() => {
    let isCancelled = false;

    const resolvePatientAndPrescriptions = async () => {
      try {
        let apptIdToLoad = activeAppointmentId;

        // If no appointmentId was passed in query, find the currently SERVING patient in the queue
        if (!apptIdToLoad && !patientIdParam) {
          const { data: servingAppt } = await supabase
            .from('appointments')
            .select('id, token_code, queue_number, walk_in_name, booking_channel, patient_id, profiles:patient_id(full_name, date_of_birth, gender, allergies)')
            .eq('status', 'SERVING')
            .order('served_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (servingAppt && !isCancelled) {
            apptIdToLoad = servingAppt.id;
            setActiveAppointmentId(servingAppt.id);
            setIsServingAutoLinked(true);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prof = (servingAppt as any).profiles;
            const displayName = prof?.full_name || servingAppt.walk_in_name || `Patient ${servingAppt.token_code}`;
            setPatientName(displayName);
            setTokenCode(servingAppt.token_code);
            if (servingAppt.patient_id) setActivePatientId(servingAppt.patient_id);
            if (prof?.date_of_birth) {
              const age = Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));
              setPatientAge(`${age} yrs ${prof.gender ? `· ${prof.gender}` : ''}`);
            }
            if (prof?.allergies) setPatientAllergies(prof.allergies);
          }
        } else if (apptIdToLoad) {
          // If appointmentId was provided, fetch complete demographics
          const { data: appt } = await supabase
            .from('appointments')
            .select('id, token_code, queue_number, walk_in_name, booking_channel, patient_id, profiles:patient_id(full_name, date_of_birth, gender, allergies)')
            .eq('id', apptIdToLoad)
            .maybeSingle();

          if (appt && !isCancelled) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prof = (appt as any).profiles;
            const displayName = prof?.full_name || appt.walk_in_name || `Patient ${appt.token_code}`;
            if (!patientName) setPatientName(displayName);
            if (!tokenCode) setTokenCode(appt.token_code);
            if (appt.patient_id) setActivePatientId(appt.patient_id);
            if (prof?.date_of_birth) {
              const age = Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));
              setPatientAge(`${age} yrs ${prof.gender ? `· ${prof.gender}` : ''}`);
            }
            if (prof?.allergies) setPatientAllergies(prof.allergies);
          }
        } else if (patientIdParam && !patientName) {
          // Patient ID directly provided in URL
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, full_name, date_of_birth, gender, allergies')
            .eq('id', patientIdParam)
            .maybeSingle();

          if (prof && !isCancelled) {
            setPatientName(prof.full_name);
            setActivePatientId(prof.id);
            if (prof.date_of_birth) {
              const age = Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));
              setPatientAge(`${age} yrs ${prof.gender ? `· ${prof.gender}` : ''}`);
            }
            if (prof.allergies) setPatientAllergies(prof.allergies);
          }
        }

        // Auto-load already saved prescriptions from Supabase (if not already parsed from plan)
        const loadEndpoint = apptIdToLoad
          ? `/api/doctor/prescriptions?appointmentId=${apptIdToLoad}`
          : activePatientId
          ? `/api/doctor/prescriptions?patientId=${activePatientId}`
          : null;

        if (loadEndpoint && !planParam) {
          const res = await fetch(loadEndpoint);
          const data = await res.json();
          if (data?.prescriptions && data.prescriptions.length > 0 && !isCancelled) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const loaded: RxItem[] = data.prescriptions
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((p: any) => !p.item_type || p.item_type === 'MEDICATION')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((p: any) => ({
                id: p.id || crypto.randomUUID(),
                genericName: p.generic_name || '',
                brandName: p.brand_name || '',
                dosageForm: p.dosage || '',
                strength: '',
                quantity: p.details?.replace(/^Qty:\s*#?/, '') || '',
                frequency: p.frequency || '',
                duration: p.duration || '',
                instructions: p.instructions || '',
                isS2: false,
                isControlled: false,
              }));
            if (loaded.length > 0) {
              setRxItems(loaded);
              setShowPreview(true);
            }
          }
        }
      } catch (err) {
        console.error('Error resolving patient and prescriptions:', err);
      }
    };

    resolvePatientAndPrescriptions();
    return () => {
      isCancelled = true;
    };
  }, [activeAppointmentId, activePatientId, patientIdParam, supabase, patientName, tokenCode, planParam]);

  // Check if any item is S2
  const hasS2Items = rxItems.some((i) => i.isS2 && i.genericName);
  const hasControlledItems = rxItems.some((i) => i.isControlled && i.genericName);
  const hasValidItems = rxItems.some((i) => i.genericName && i.frequency && i.duration);

  // Rx item handlers
  const handleUpdateItem = useCallback(
    (id: string, updates: Partial<RxItem>) => {
      setRxItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const handleRemoveItem = useCallback((id: string) => {
    setRxItems((prev) => {
      const filtered = prev.filter((i) => i.id !== id);
      return filtered.length > 0 ? filtered : [newRxItem()];
    });
  }, []);

  const handleAddItem = () => {
    setRxItems((prev) => [...prev, newRxItem()]);
  };

  // Save to Supabase & Optional Push to Patient Passport
  const handleSave = async (pushToPatient = false) => {
    if (doctor && (!doctor.isVerified || doctor.verificationStatus === 'PENDING')) {
      setToastNotice({
        type: 'destructive',
        message: '⚠️ Prescription issuance requires active PRC credential verification by Clinic Natin Operations (FDA Circular 2020-007).',
      });
      return;
    }
    if (!hasValidItems) return;
    setIsSaving(true);
    try {
      const itemsToSave = rxItems
        .filter((i) => i.genericName && i.frequency && i.duration)
        .map((i) => ({
          genericName: i.genericName,
          brandName: i.brandName || undefined,
          dosage: [i.dosageForm, i.strength].filter(Boolean).join(' '),
          frequency: i.frequency,
          duration: i.duration,
          quantity: i.quantity ? parseInt(i.quantity) : undefined,
          instructions: i.instructions || undefined,
          isS2: i.isS2,
        }));

      const res = await fetch('/api/doctor/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: activeAppointmentId || undefined,
          patientId: activePatientId || undefined,
          items: itemsToSave,
          pushToPatient,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setToastNotice({
        type: 'success',
        message: pushToPatient
          ? `✅ Official e-Prescription saved & pushed to patient via SMS.`
          : `✅ ${data.prescriptionCount} Rx item(s) saved to EMR.`,
      });
      setTimeout(() => setToastNotice(null), 6000);
    } catch {
      setToastNotice({ type: 'destructive', message: '❌ Could not save to Supabase. Print anyway.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLabOrders = async (order: DiagnosticOrder) => {
    setIsSaving(true);
    try {
      const itemsToSave = order.tests.map((t) => ({
        itemType: t.category === 'Imaging & Cardiology' ? ('IMAGING' as const) : ('LAB_TEST' as const),
        genericName: t.testName,
        details: t.details || (t.fastingRequired ? '10-12h Fasting' : undefined),
        instructions: order.clinicalImpression || undefined,
      }));

      const res = await fetch('/api/doctor/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: activeAppointmentId || undefined,
          patientId: activePatientId || undefined,
          items: itemsToSave,
          pushToPatient: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setToastNotice({
        type: 'success',
        message: `✅ Diagnostic requisition issued and saved (${order.tests.length} tests).`,
      });
      setTimeout(() => setToastNotice(null), 6000);
    } catch {
      setToastNotice({
        type: 'destructive',
        message: '❌ Could not save lab order to database.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Print
  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className={`space-y-5 ${showPreview ? 'max-w-6xl' : 'max-w-4xl'} transition-all`}>
      {/* ── Top breadcrumb & Mode Toggle ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 text-xs text-slate-600">
            <Link href="/doctor/dashboard">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Cockpit
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-4" />

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPadMode('PRESCRIPTION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                padMode === 'PRESCRIPTION'
                  ? 'bg-white text-brand-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="h-3.5 w-3.5 text-brand-600" />
              Prescription (℞)
            </button>
            <button
              type="button"
              onClick={() => setPadMode('LAB_REQUISITION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                padMode === 'LAB_REQUISITION'
                  ? 'bg-white text-brand-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-brand-600" />
              Lab Requisition (Req)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tokenCode && (
            <Badge variant="success" className="font-mono text-xs">
              Token: {tokenCode}
            </Badge>
          )}
          {padMode === 'PRESCRIPTION' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview((v) => !v)}
                className="text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                {showPreview ? 'Hide Slip' : 'Preview Slip'}
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={() => handleSave(true)}
                disabled={!hasValidItems || isSaving || (!activeAppointmentId && !activePatientId)}
                className="text-xs font-semibold"
                title={!activeAppointmentId && !activePatientId ? 'Please select or search a patient to save and push' : ''}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                )}
                Push to Passport (SMS)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Active Consultation Context Banner ────────────────────────────────── */}
      {patientName && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50/70 border border-brand-200 rounded-xl px-4 py-2.5 text-xs no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-900">Active Patient:</span>
            <span className="font-semibold text-slate-800">{patientName}</span>
            {patientAge && <Badge variant="outline" className="text-[10px] bg-white">{patientAge}</Badge>}
            {tokenCode && <Badge variant="brand" className="text-[10px] font-mono">{tokenCode}</Badge>}
            {isServingAutoLinked && (
              <Badge variant="success" className="text-[10px]">Serving in Cockpit</Badge>
            )}
          </div>
          <span className="text-[11px] text-brand-700">Digital prescription linked to this consultation encounter.</span>
        </div>
      )}

      {/* ── Mode Render ──────────────────────────────────────────────────────── */}
      {padMode === 'LAB_REQUISITION' ? (
        <DiagnosticRequisitionPad
          patientName={patientName}
          patientAge={patientAge}
          doctorProfile={doctorProfile}
          onSaveOrders={activeAppointmentId || activePatientId ? handleSaveLabOrders : undefined}
          isSaving={isSaving}
        />
      ) : (
        <>
          {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastNotice && (
        <Alert variant={toastNotice.type === 'destructive' ? 'destructive' : 'success'} className="no-print">
          <div className="flex items-center justify-between w-full">
            <AlertDescription>{toastNotice.message}</AlertDescription>
            <button
              onClick={() => setToastNotice(null)}
              className="text-xs text-slate-500 hover:text-slate-900 ml-4 font-semibold"
            >
              ×
            </button>
          </div>
        </Alert>
      )}

      {/* ── Pending PRC Verification Gatekeeping Alert ────────────────────── */}
      {doctor && (!doctor.isVerified || doctor.verificationStatus === 'PENDING') && (
        <Alert variant="warning" className="border-amber-300 bg-amber-50/80 text-amber-900 no-print">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="font-bold text-xs">PRC Credential Verification Required (FDA Circular No. 2020-007)</AlertTitle>
          <AlertDescription className="text-xs mt-1 leading-relaxed">
            Your application (PRC #{doctor.prcLicense}) is currently under review by Clinic Natin Operations. In compliance with Philippine Food and Drug Administration and Professional Regulation Commission regulations, official digital prescription issuance will activate once your credentials are administratively verified.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Global S2 warning ──────────────────────────────────────────────── */}
      {hasS2Items && (
        <Alert variant="warning" className="border-2 no-print">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-black text-sm">
            ⚠️ S2 Dangerous Drug Items Detected
          </AlertTitle>
          <AlertDescription>
            One or more items require a <strong>DDB-issued S2 (Yellow Pad) prescription</strong>.
            Under RA 9165 and DDB regulations, dangerous drugs must be written on a
            separate yellow prescription pad — <strong>one item per pad</strong>. Each S2 Rx pad
            requires your S2 License Number and must be verified by the dispensing pharmacist.
            <br />
            {hasControlledItems && (
              <span className="text-red-700 font-bold block mt-1">
                🔴 Schedule IV Controlled Substance: Special DEA/DDB monitoring may apply.
                Notify DDB regional office for monitoring requirements.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className={`grid grid-cols-1 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>

        {/* ── Left: Rx Editor ──────────────────────────────────────────────── */}
        <div className="space-y-4 rx-editor-column">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Patient &amp; Prescription Details</CardTitle>
                  <CardDescription>
                    {patientNameParam
                      ? `Pre-filled from: ${patientNameParam}`
                      : 'Fill in patient information or launch from Consultation Cockpit'}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {rxDate}
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Patient Lookup &amp; Digital Passport Link *
                  </label>
                  <PatientSearchAutocomplete
                    selectedPatientId={activePatientId}
                    patientName={patientName}
                    patientAge={patientAge}
                    tokenCode={tokenCode}
                    allergies={patientAllergies}
                    onSelect={handleSelectPatient}
                    onSelectWalkIn={handleSelectWalkIn}
                    onClear={handleClearPatient}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Age / Sex
                    </label>
                    <Input
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="e.g. 28 yrs · Female"
                      className="text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Clinical Notes / Indication (Optional)
                    </label>
                    <Input
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="e.g., Acute bacterial rhinosinusitis, Uncontrolled hypertension"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Documented Drug Allergy Alert ─────────────────────────────────── */}
          {patientAllergies.length > 0 && (
            <Alert variant="warning" className="border-amber-300 bg-amber-50 text-amber-900 no-print py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold">Documented Drug Allergy Alert</AlertTitle>
              <AlertDescription className="text-xs mt-0.5">
                Patient has documented allergies to: <strong className="text-amber-950 font-bold">{patientAllergies.join(', ')}</strong>. Please verify prescribed medications to prevent adverse reactions.
              </AlertDescription>
            </Alert>
          )}

          {/* ── Medication Line Items ────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Prescription Line Items ({rxItems.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Philippine National Formulary search enabled
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Medicine (Rx)
              </Button>
            </div>

            {rxItems.map((item, index) => (
              <RxLineItem
                key={item.id}
                item={item}
                index={index}
                onUpdate={handleUpdateItem}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>

          {/* Bottom actions */}
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-800">{rxItems.length}</strong> item(s) total
                  </span>
                  <span>
                    <strong className="text-amber-700">
                      {rxItems.filter((i) => i.isS2 && i.genericName).length}
                    </strong>{' '}
                    S2 / Yellow Pad
                  </span>
                  <span>
                    <strong className="text-emerald-700">
                      {rxItems.filter((i) => !i.isS2 && i.genericName).length}
                    </strong>{' '}
                    Regular / White Pad
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSave(false)}
                    disabled={!hasValidItems || isSaving || (!activeAppointmentId && !activePatientId)}
                    className="text-xs border-brand-300 text-brand-700 hover:bg-brand-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Save to EMR
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={handlePrint}
                    className="text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print All Prescriptions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Live Preview & Print Zone ────────────────────────────── */}
        <div
          id="rx-print-zone"
          className={`rx-print-zone ${showPreview ? 'block' : 'hidden print:block'}`}
        >
          <div className="no-print mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Live Print Preview
            </p>
            <Badge variant="brand" className="text-[10px]">
              A5 Letterhead Format
            </Badge>
          </div>
          <PrintableRx
            doctor={doctorProfile}
            patientName={patientName}
            patientAge={patientAge}
            rxDate={rxDate}
            items={rxItems}
          />
        </div>
      </div>
      </>
      )}

      {/* ── Print CSS (Formatted for Philippine Standard 1/2 Letter Bond Paper) ─ */}
      <style>{`
        @media print {
          /* 1. Hide web app chrome */
          header,
          aside,
          nav,
          .no-print,
          .rx-editor-column,
          button {
            display: none !important;
          }

          /* 2. Reset html & body for high-fidelity printing */
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          /* 3. Hide all body children by default */
          body * {
            visibility: hidden;
          }

          /* 4. Only show printable prescription & lab zone */
          .rx-print-zone,
          .rx-print-zone *,
          #lab-requisition-slip,
          #lab-requisition-slip * {
            visibility: visible !important;
          }

          /* 5. Anchor print zone to top-left of paper */
          .rx-print-zone,
          #lab-requisition-slip {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 6mm !important;
            background: #ffffff !important;
          }

          /* 6. Force background colors and borders (crucial for yellow S2 pad) */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 7. Avoid breaking inside prescription pad slips */
          .rx-slip {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 12mm !important;
            box-shadow: none !important;
          }

          @page {
            size: 8.5in 5.5in;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page export — wrapped in Suspense for useSearchParams (Next.js 15 requirement)
// ──────────────────────────────────────────────────────────────────────────────
export default function DoctorRxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-3 text-brand-700 font-semibold text-sm h-40">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Rx Pad...
        </div>
      }
    >
      <RxPadContent />
    </Suspense>
  );
}
