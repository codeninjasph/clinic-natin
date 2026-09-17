'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  FlaskConical,
  HeartPulse,
  Microscope,
  Stethoscope,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export interface DiagnosticTestItem {
  id: string;
  category: 'Hematology' | 'Clinical Microscopy' | 'Blood Chemistry' | 'Imaging & Cardiology' | 'Other';
  testName: string;
  details?: string;
  fastingRequired?: boolean;
}

export interface DiagnosticOrder {
  tests: DiagnosticTestItem[];
  clinicalImpression: string;
  notes: string;
}

const PRESET_PANELS: Array<{
  category: DiagnosticTestItem['category'];
  icon: typeof FlaskConical;
  tests: Array<{ name: string; details?: string; fasting?: boolean }>;
}> = [
  {
    category: 'Hematology',
    icon: FlaskConical,
    tests: [
      { name: 'Complete Blood Count (CBC) w/ Platelet Count', details: 'Includes Hemoglobin, Hematocrit, RBC, WBC Differential' },
      { name: 'Blood Typing & Rh Factor', details: 'ABO and Rh grouping' },
      { name: 'Prothrombin Time (PT / INR)', details: 'Coagulation profile' },
      { name: 'Partial Thromboplastin Time (aPTT)', details: 'Intrinsic pathway evaluation' },
      { name: 'Peripheral Blood Smear (PBS)', details: 'Microscopic morphology review' },
    ],
  },
  {
    category: 'Clinical Microscopy',
    icon: Microscope,
    tests: [
      { name: 'Routine Urinalysis', details: 'Clean-catch midstream urine microscopy & dipstick' },
      { name: 'Routine Fecalysis', details: 'Direct fecal smear for ova and parasites' },
      { name: 'Fecal Occult Blood Test (FOBT)', details: 'Screening for lower GI bleeding' },
      { name: 'Urine Pregnancy Test (hCG)', details: 'Qualitative rapid screening' },
    ],
  },
  {
    category: 'Blood Chemistry',
    icon: Activity,
    tests: [
      { name: 'Fasting Blood Sugar (FBS)', details: 'Requires 8-10h strict fasting', fasting: true },
      { name: 'Lipid Profile (Cholesterol, Triglycerides, HDL, LDL)', details: 'Requires 10-12h strict fasting', fasting: true },
      { name: 'Glycated Hemoglobin (HbA1c)', details: '3-month diabetic glycemic control indicator' },
      { name: 'Serum Creatinine', details: 'Renal function & eGFR estimation' },
      { name: 'Blood Urea Nitrogen (BUN)', details: 'Renal nitrogenous clearance' },
      { name: 'Blood Uric Acid (BUA)', details: 'Hyperuricemia & gout screening' },
      { name: 'SGPT / ALT', details: 'Liver transaminase evaluation' },
      { name: 'SGOT / AST', details: 'Hepatic & cellular enzyme evaluation' },
      { name: 'Serum Electrolytes (Na+, K+, Cl-)', details: 'Electrolyte balance panel' },
    ],
  },
  {
    category: 'Imaging & Cardiology',
    icon: HeartPulse,
    tests: [
      { name: 'Chest X-Ray PA View', details: 'Upright posteroanterior thoracic view' },
      { name: '12-Lead Electrocardiogram (ECG)', details: 'Resting cardiac rhythm & ischemia evaluation' },
      { name: 'Whole Abdominal Ultrasound', details: 'NPO 6-8h prior; full bladder required' },
      { name: 'Upper Abdominal Ultrasound (HBT)', details: 'Liver, gallbladder, pancreas, biliary tree' },
      { name: '2D-Echocardiography w/ Doppler', details: 'Transthoracic cardiac structural evaluation' },
    ],
  },
];

const CLINICAL_BUNDLES = [
  {
    title: 'Hypertension Routine Workup',
    badge: 'Cardio Bundle',
    tests: [
      { category: 'Blood Chemistry' as const, testName: 'Fasting Blood Sugar (FBS)', fastingRequired: true },
      { category: 'Blood Chemistry' as const, testName: 'Lipid Profile (Cholesterol, Triglycerides, HDL, LDL)', fastingRequired: true },
      { category: 'Blood Chemistry' as const, testName: 'Serum Creatinine' },
      { category: 'Blood Chemistry' as const, testName: 'Blood Uric Acid (BUA)' },
      { category: 'Clinical Microscopy' as const, testName: 'Routine Urinalysis' },
      { category: 'Imaging & Cardiology' as const, testName: '12-Lead Electrocardiogram (ECG)' },
    ],
  },
  {
    title: 'Diabetic Monitoring Panel',
    badge: 'Endo Bundle',
    tests: [
      { category: 'Blood Chemistry' as const, testName: 'Fasting Blood Sugar (FBS)', fastingRequired: true },
      { category: 'Blood Chemistry' as const, testName: 'Glycated Hemoglobin (HbA1c)' },
      { category: 'Blood Chemistry' as const, testName: 'Serum Creatinine' },
      { category: 'Clinical Microscopy' as const, testName: 'Routine Urinalysis' },
    ],
  },
  {
    title: 'Acute Infection / Fever Workup',
    badge: 'Infectious Bundle',
    tests: [
      { category: 'Hematology' as const, testName: 'Complete Blood Count (CBC) w/ Platelet Count' },
      { category: 'Clinical Microscopy' as const, testName: 'Routine Urinalysis' },
      { category: 'Imaging & Cardiology' as const, testName: 'Chest X-Ray PA View' },
    ],
  },
];

interface DiagnosticRequisitionPadProps {
  initialImpression?: string;
  patientName: string;
  patientAge?: string;
  patientGender?: string;
  doctorProfile: {
    name: string;
    title: string;
    specialty: string;
    prcLicense: string;
    ptrNumber: string;
    s2License?: string | null;
    signatureUrl?: string | null;
    clinicAddress: string;
  };
  onSaveOrders?: (orders: DiagnosticOrder) => Promise<void>;
  isSaving?: boolean;
}

export function DiagnosticRequisitionPad({
  initialImpression = '',
  patientName,
  patientAge,
  patientGender,
  doctorProfile,
  onSaveOrders,
  isSaving = false,
}: DiagnosticRequisitionPadProps) {
  const [selectedTests, setSelectedTests] = useState<DiagnosticTestItem[]>([]);
  const [clinicalImpression, setClinicalImpression] = useState(initialImpression);
  const [specialNotes, setSpecialNotes] = useState('');
  const [customTestInput, setCustomTestInput] = useState('');
  const [customCategory, setCustomCategory] = useState<DiagnosticTestItem['category']>('Other');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const isTestSelected = (testName: string) =>
    selectedTests.some((t) => t.testName.toLowerCase() === testName.toLowerCase());

  const toggleTest = (item: DiagnosticTestItem) => {
    if (isTestSelected(item.testName)) {
      setSelectedTests((prev) => prev.filter((t) => t.testName.toLowerCase() !== item.testName.toLowerCase()));
    } else {
      setSelectedTests((prev) => [...prev, item]);
    }
  };

  const applyBundle = (bundleTests: Array<{ category: DiagnosticTestItem['category']; testName: string; fastingRequired?: boolean }>) => {
    setSelectedTests((prev) => {
      const copy = [...prev];
      for (const t of bundleTests) {
        if (!copy.some((c) => c.testName.toLowerCase() === t.testName.toLowerCase())) {
          copy.push({
            id: crypto.randomUUID(),
            category: t.category,
            testName: t.testName,
            fastingRequired: t.fastingRequired,
          });
        }
      }
      return copy;
    });
  };

  const addCustomTest = () => {
    if (!customTestInput.trim()) return;
    setSelectedTests((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category: customCategory,
        testName: customTestInput.trim(),
      },
    ]);
    setCustomTestInput('');
  };

  const removeTest = (testName: string) => {
    setSelectedTests((prev) => prev.filter((t) => t.testName !== testName));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (onSaveOrders && selectedTests.length > 0) {
      await onSaveOrders({
        tests: selectedTests,
        clinicalImpression,
        notes: specialNotes,
      });
    }
  };

  const hasFasting = selectedTests.some((t) => t.fastingRequired);

  return (
    <div className="space-y-6">
      {/* ── Section Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-brand-600" />
            Diagnostic Laboratory &amp; Imaging Requisitions
          </h2>
          <p className="text-xs text-slate-500">
            Generate official clinical request slips with 1-click test panels and physician sign-off
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPrintPreview((v) => !v)}
            className="text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            {showPrintPreview ? 'Hide Order Slip' : 'Preview Order Slip'}
          </Button>
          {onSaveOrders && (
            <Button
              type="button"
              variant="brand"
              size="sm"
              disabled={selectedTests.length === 0 || isSaving}
              onClick={handleSave}
              className="text-xs font-semibold"
            >
              {isSaving ? 'Recording Requisition...' : `Issue Order (${selectedTests.length} Tests)`}
            </Button>
          )}
        </div>
      </div>

      {/* ── Quick Diagnostic Bundles ──────────────────────────────────── */}
      <Card className="border-brand-200 bg-linear-to-r from-brand-50/50 to-emerald-50/30">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            High-Velocity Clinical Bundles (1-Click Presets)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 flex flex-wrap gap-2">
          {CLINICAL_BUNDLES.map((bundle) => (
            <button
              key={bundle.title}
              type="button"
              onClick={() => applyBundle(bundle.tests)}
              className="px-3 py-1.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-xs font-semibold text-slate-700 hover:text-brand-900 transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <span>{bundle.title}</span>
              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-md">
                {bundle.badge}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* ── Panels Grid & Summary ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Test Selection Panels */}
        <div className="lg:col-span-8 space-y-4">
          {PRESET_PANELS.map((panel) => {
            const Icon = panel.icon;
            return (
              <Card key={panel.category} className="shadow-2xs">
                <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand-600" />
                    {panel.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {panel.tests.map((test) => {
                      const selected = isTestSelected(test.name);
                      return (
                        <button
                          key={test.name}
                          type="button"
                          onClick={() =>
                            toggleTest({
                              id: crypto.randomUUID(),
                              category: panel.category,
                              testName: test.name,
                              details: test.details,
                              fastingRequired: test.fasting,
                            })
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                            selected
                              ? 'bg-brand-50 border-brand-500 text-brand-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                              selected
                                ? 'bg-brand-600 border-brand-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {selected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight">{test.name}</p>
                            {test.details && (
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-1">
                                {test.details}
                              </p>
                            )}
                            {test.fasting && (
                              <span className="inline-block mt-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                                ⏳ Fasting Required
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Custom Test Input */}
          <Card className="shadow-2xs">
            <CardHeader className="py-2.5 px-4 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-slate-500" />
                Add Custom or Specialized Test
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={customTestInput}
                  onChange={(e) => setCustomTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTest())}
                  placeholder="e.g., TSH, Free T4, Serum Ferritin, CT Scan Cranial..."
                  className="text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomTest}
                  disabled={!customTestInput.trim()}
                  className="text-xs shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Selected Tests & Order Review */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="shadow-2xs border-slate-200 sticky top-4">
            <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-800">
                  Selected Tests ({selectedTests.length})
                </CardTitle>
                {selectedTests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTests([])}
                    className="text-[10px] text-red-600 hover:underline font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Selected List */}
              {selectedTests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1.5">
                  <FlaskConical className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No tests selected</p>
                  <p className="text-[11px]">Click items from the panels or select a clinical bundle</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedTests.map((item, idx) => (
                    <div
                      key={item.testName}
                      className="p-2 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-bold text-slate-400 font-mono text-[10px]">
                          {idx + 1}.
                        </span>
                        <span className="font-bold text-slate-800 truncate">{item.testName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTest(item.testName)}
                        className="text-slate-300 hover:text-red-600 p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {hasFasting && (
                <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.2" />
                  <span>
                    <strong>Patient Instruction:</strong> Fasting tests selected. Patient must fast for 10-12 hours (water allowed).
                  </span>
                </div>
              )}

              <Separator />

              {/* Clinical Impression */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Clinical Indication / Impression
                </label>
                <Input
                  value={clinicalImpression}
                  onChange={(e) => setClinicalImpression(e.target.value)}
                  placeholder="e.g., Essential Hypertension; R/O Diabetes Mellitus"
                  className="text-xs"
                />
              </div>

              {/* Special Instructions */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Special Notes / Schedule
                </label>
                <Textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g., Please email results to clinic before follow-up consultation..."
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={handlePrint}
                  disabled={selectedTests.length === 0}
                  className="w-full text-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print Official Lab Slip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Official Printable Requisition Slip (Half-Bond Paper) ──────── */}
      <div
        id="lab-requisition-slip"
        className={`bg-white rounded-2xl border-2 border-slate-300 p-8 shadow-sm space-y-6 ${
          showPrintPreview ? 'block' : 'hidden print:block'
        }`}
      >
        {/* Slip Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Clinic Natin — Official Diagnostic Requisition
            </p>
            <h3 className="text-base font-black text-slate-900 mt-0.5">
              {doctorProfile.title} {doctorProfile.name}
            </h3>
            <p className="text-xs font-semibold text-brand-700">{doctorProfile.specialty}</p>
            <p className="text-[11px] text-slate-500">{doctorProfile.clinicAddress}</p>
          </div>
          <div className="text-right font-mono text-[10px] text-slate-600 space-y-0.5">
            <p>PRC Lic: <strong>{doctorProfile.prcLicense}</strong></p>
            <p>PTR No: <strong>{doctorProfile.ptrNumber}</strong></p>
            {doctorProfile.s2License && (
              <p className="text-amber-700">S2 Lic: {doctorProfile.s2License}</p>
            )}
          </div>
        </div>

        {/* Patient Detail Line */}
        <div className="grid grid-cols-3 gap-4 text-xs border-b border-slate-200 pb-2">
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Patient Name</span>
            <span className="font-bold text-slate-900 border-b border-slate-300 block pb-0.5">
              {patientName || '__________________________'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Age / Sex</span>
            <span className="font-bold text-slate-900 border-b border-slate-300 block pb-0.5">
              {[patientAge, patientGender].filter(Boolean).join(' / ') || '________'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Date</span>
            <span className="font-bold text-slate-900 border-b border-slate-300 block pb-0.5">
              {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Clinical Indication */}
        <div className="text-xs">
          <span className="font-bold text-slate-500 uppercase text-[10px] mr-2">
            Clinical Impression / Diagnosis:
          </span>
          <span className="font-bold text-slate-900 border-b border-slate-200 pb-0.5">
            {clinicalImpression || 'Routine Clinical Diagnostic Evaluation'}
          </span>
        </div>

        {/* Test Checklist Table */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            Please perform the following diagnostic examinations:
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border border-slate-200 rounded-xl p-4 bg-slate-50/40">
            {selectedTests.map((t, idx) => (
              <div key={t.testName} className="flex items-start gap-2">
                <span className="font-bold text-brand-700 font-mono text-[11px]">{idx + 1}.</span>
                <div>
                  <span className="font-bold text-slate-900">{t.testName}</span>
                  {t.fastingRequired && (
                    <span className="text-[10px] text-amber-700 block italic">
                      * 10-12 hours fasting required
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {specialNotes && (
          <div className="text-xs">
            <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">
              Special Instructions to Laboratory:
            </span>
            <p className="italic text-slate-700">{specialNotes}</p>
          </div>
        )}

        {/* Doctor Signature Block */}
        <div className="pt-4 border-t border-slate-200 flex items-end justify-between">
          <p className="text-[9px] text-slate-400 max-w-xs">
            Official Laboratory Request Slip · Valid across accredited DOH / PhilHealth Diagnostic Laboratories &amp; Hospital Facilities
          </p>
          <div className="text-right flex flex-col items-end">
            {doctorProfile.signatureUrl ? (
              <img
                src={doctorProfile.signatureUrl}
                alt="Doctor Signature"
                className="h-10 object-contain max-w-[140px] -mb-1"
              />
            ) : (
              <div className="border-t border-slate-800 w-36 mb-1" />
            )}
            <p className="text-xs font-bold text-slate-900">
              {doctorProfile.title} {doctorProfile.name}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              PRC License No. {doctorProfile.prcLicense}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
