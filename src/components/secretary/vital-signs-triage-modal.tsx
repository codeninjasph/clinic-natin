'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Thermometer,
  Activity,
  Weight,
  Ruler,
  Wind,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
  Stethoscope,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Appointment } from '@/app/secretary/secretary-context';

const QUICK_COMPLAINTS = [
  'Fever',
  'Cough & Cold',
  'Headache',
  'Abdominal Pain',
  'Dizziness',
  'Chest Discomfort',
  'Routine Check-up',
  'Prescription Refill / Follow-up',
  'Medical Certificate',
];

interface VitalSignsTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  doctorId?: string;
  onSaveSuccess?: () => void;
}

export function VitalSignsTriageModal({
  isOpen,
  onClose,
  appointment,
  doctorId,
  onSaveSuccess,
}: VitalSignsTriageModalProps) {
  const supabase = createClient();

  // Vitals State
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [temperature, setTemperature] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Height Converter State
  const [heightMode, setHeightMode] = useState<'ft' | 'cm'>('ft');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('2');
  const [heightCm, setHeightCm] = useState('157');

  const [oxygenSaturation, setOxygenSaturation] = useState('98');
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [chiefComplaintNote, setChiefComplaintNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync height inputs
  const handleFeetInchesChange = (feet: string, inches: string) => {
    setHeightFeet(feet);
    setHeightInches(inches);
    const f = parseFloat(feet) || 0;
    const i = parseFloat(inches) || 0;
    const totalInches = f * 12 + i;
    const cm = Math.round(totalInches * 2.54);
    setHeightCm(String(cm));
  };

  const handleCmChange = (cmVal: string) => {
    setHeightCm(cmVal);
    const cm = parseFloat(cmVal) || 0;
    const totalInches = cm / 2.54;
    const f = Math.floor(totalInches / 12);
    const i = Math.round(totalInches % 12);
    setHeightFeet(String(f));
    setHeightInches(String(i));
  };

  // Live BMI Calculation
  const computedBmi = React.useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (!w || !h || h <= 0) return null;
    const bmi = w / (h * h);
    return Math.round(bmi * 10) / 10;
  }, [weightKg, heightCm]);

  const bmiCategory = React.useMemo(() => {
    if (!computedBmi) return null;
    if (computedBmi < 18.5) return { label: 'Underweight', color: 'bg-amber-100 text-amber-800' };
    if (computedBmi < 25) return { label: 'Normal Weight', color: 'bg-emerald-100 text-emerald-800' };
    if (computedBmi < 30) return { label: 'Overweight', color: 'bg-amber-100 text-amber-800' };
    return { label: 'Obese', color: 'bg-red-100 text-red-800' };
  }, [computedBmi]);

  // Blood Pressure Flag
  const bpFlag = React.useMemo(() => {
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    if (isNaN(sys) && isNaN(dia)) return null;
    if (sys >= 160 || dia >= 100) return { label: 'High BP (Critical)', color: 'bg-red-100 text-red-800 border-red-200' };
    if (sys >= 130 || dia >= 85) return { label: 'Elevated BP (Warning)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { label: 'Normal BP', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  }, [systolic, diastolic]);

  // Temperature Flag
  const tempFlag = React.useMemo(() => {
    const t = parseFloat(temperature);
    if (isNaN(t) || !t) return null;
    if (t >= 38.0) return { label: 'High Fever', color: 'bg-red-100 text-red-800' };
    if (t >= 37.5) return { label: 'Low-Grade Fever', color: 'bg-amber-100 text-amber-800' };
    return { label: 'Normal Temp', color: 'bg-emerald-100 text-emerald-800' };
  }, [temperature]);

  // Fetch existing vitals if already recorded
  useEffect(() => {
    if (isOpen && appointment) {
      setSaveError(null);
      (async () => {
        try {
          const { data } = await supabase
            .from('medical_records')
            .select('vitals, chief_complaint')
            .eq('appointment_id', appointment.id)
            .maybeSingle();

          if (data?.vitals) {
            const v = data.vitals;
            if (v.blood_pressure) {
              const [s, d] = String(v.blood_pressure).split('/');
              if (s) setSystolic(s);
              if (d) setDiastolic(d);
            }
            if (v.temperature_c) setTemperature(String(v.temperature_c));
            if (v.heart_rate) setHeartRate(String(v.heart_rate));
            if (v.weight_kg) setWeightKg(String(v.weight_kg));
            if (v.height_cm) handleCmChange(String(v.height_cm));
            if (v.oxygen_saturation) setOxygenSaturation(String(v.oxygen_saturation));
            if (data.chief_complaint) setChiefComplaintNote(data.chief_complaint);
          } else {
            // Default healthy adult baseline for fast typing
            setSystolic('120');
            setDiastolic('80');
            setTemperature('36.6');
            setHeartRate('76');
            setWeightKg('65');
            handleFeetInchesChange('5', '3');
            setOxygenSaturation('98');
            setSelectedComplaints([]);
            setChiefComplaintNote('');
          }
        } catch (e) {
          console.error('[TriageModal] load vitals error:', e);
        }
      })();
    }
  }, [isOpen, appointment, supabase]);

  const toggleComplaint = (tag: string) => {
    setSelectedComplaints((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!appointment) return;
    setIsSaving(true);
    setSaveError(null);

    const bpString = systolic && diastolic ? `${systolic}/${diastolic}` : systolic || '';
    const fullChiefComplaint = [
      ...selectedComplaints,
      chiefComplaintNote.trim(),
    ].filter(Boolean).join(', ');

    const vitalsPayload = {
      blood_pressure: bpString,
      heart_rate: heartRate ? parseInt(heartRate, 10) : null,
      temperature_c: temperature ? parseFloat(temperature) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      bmi: computedBmi,
      oxygen_saturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : null,
      recorded_by: 'Secretary Front-Desk',
      recorded_at: new Date().toISOString(),
    };

    try {
      // Check if medical record exists
      const { data: existing } = await supabase
        .from('medical_records')
        .select('id')
        .eq('appointment_id', appointment.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('medical_records')
          .update({
            vitals: vitalsPayload,
            chief_complaint: fullChiefComplaint || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Need a doctor_id and patient_id (or fallback)
        let finalPatientId = appointment.patient_id;
        if (!finalPatientId) {
          // Check or create anonymous profile for walkin
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .maybeSingle();
          finalPatientId = profile?.id || null;
        }

        let finalDoctorId = doctorId;
        if (!finalDoctorId) {
          const { data: doc } = await supabase.from('doctors').select('id').limit(1).single();
          finalDoctorId = doc?.id;
        }

        if (!finalPatientId || !finalDoctorId) {
          throw new Error('Missing physician or patient profile reference.');
        }

        const { error } = await supabase.from('medical_records').insert({
          appointment_id: appointment.id,
          patient_id: finalPatientId,
          doctor_id: finalDoctorId,
          vitals: vitalsPayload,
          chief_complaint: fullChiefComplaint || null,
        });

        if (error) throw error;
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('[TriageModal] Save vitals failed:', err);
      setSaveError(err instanceof Error ? err.message : 'Could not save vital signs.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border-slate-200">
        {/* Paper Slip Top Header */}
        <div className="bg-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">
                  Patient Vital Signs Slip (Pre-Triage)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Record baseline vital signs before the patient enters the consultation room
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-white/10 text-white border-white/20 font-mono text-sm px-3 py-1">
              {appointment.token_code || `#${appointment.queue_number}`}
            </Badge>
          </div>

          {/* Patient Banner Card */}
          <div className="mt-4 flex items-center justify-between bg-white/10 rounded-xl p-3 border border-white/15 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient Name</span>
              <span className="font-extrabold text-sm text-white">{appointment.display_name}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Queuing Channel</span>
              <span className="font-semibold text-slate-200">
                {appointment.booking_channel === 'ONLINE' ? 'Online Reserved' : 'Front-Desk Walk-In'}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Form Canvas (Large inputs designed for fast typing) */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50/50">
          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{saveError}</span>
            </div>
          )}

          {/* 1. Blood Pressure & Heart Rate Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blood Pressure */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-red-500" />
                  Blood Pressure (mmHg)
                </label>
                {bpFlag && (
                  <Badge variant="outline" className={`text-[10px] font-bold ${bpFlag.color}`}>
                    {bpFlag.label}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Systolic</span>
                  <Input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="120"
                    className="h-12 text-center text-lg font-black text-slate-900 border-slate-300 focus:border-brand-600"
                  />
                </div>
                <span className="text-2xl font-light text-slate-400 mt-4">/</span>
                <div className="flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Diastolic</span>
                  <Input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="80"
                    className="h-12 text-center text-lg font-black text-slate-900 border-slate-300 focus:border-brand-600"
                  />
                </div>
              </div>
            </div>

            {/* Heart Rate / Pulse */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-brand-700" />
                  Pulse Rate (bpm)
                </label>
                <span className="text-[10px] text-slate-400">Normal: 60–100 bpm</span>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Beats per minute</span>
                <Input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="76"
                  className="h-12 text-center text-lg font-black text-slate-900 border-slate-300 focus:border-brand-600"
                />
              </div>
            </div>
          </div>

          {/* 2. Temperature & Oxygen Saturation Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Body Temperature */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4 text-amber-500" />
                  Body Temperature (°C)
                </label>
                {tempFlag && (
                  <Badge variant="outline" className={`text-[10px] font-bold ${tempFlag.color}`}>
                    {tempFlag.label}
                  </Badge>
                )}
              </div>

              <Input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="36.5"
                className="h-12 text-center text-lg font-black text-slate-900 border-slate-300 focus:border-brand-600"
              />

              {/* Quick Temperature Pills */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Quick:</span>
                <button
                  type="button"
                  onClick={() => setTemperature('36.5')}
                  className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                >
                  36.5°C Normal
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature('37.5')}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100"
                >
                  37.5°C Low Fever
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature('38.5')}
                  className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 hover:bg-red-100"
                >
                  38.5°C High Fever
                </button>
              </div>
            </div>

            {/* Oxygen Saturation */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Wind className="h-4 w-4 text-cyan-600" />
                  Oxygen Saturation (SpO2 %)
                </label>
                <span className="text-[10px] text-slate-400">Target: ≥ 95%</span>
              </div>

              <Input
                type="number"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="98"
                className="h-12 text-center text-lg font-black text-slate-900 border-slate-300 focus:border-brand-600"
              />

              <p className="text-[10px] text-slate-400">
                Measured via fingertip pulse oximeter
              </p>
            </div>
          </div>

          {/* 3. Weight & Height with Live Feet/Inches Converter & BMI */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Weight className="h-4 w-4 text-emerald-600" />
                Anthropometrics & Live BMI Calculator
              </label>
              {bmiCategory && (
                <Badge className={`text-xs font-bold ${bmiCategory.color}`}>
                  BMI: {computedBmi} — {bmiCategory.label}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weight */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Body Weight (kg)</span>
                <Input
                  type="number"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="65"
                  className="h-12 text-center text-lg font-black text-slate-900 border-slate-300"
                />
              </div>

              {/* Height with Converter Tabs */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-slate-400">Body Height</span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setHeightMode('ft')}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        heightMode === 'ft' ? 'bg-brand-700 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Feet/Inches
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeightMode('cm')}
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        heightMode === 'cm' ? 'bg-brand-700 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Centimeters (cm)
                    </button>
                  </div>
                </div>

                {heightMode === 'ft' ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={heightFeet}
                        onChange={(e) => handleFeetInchesChange(e.target.value, heightInches)}
                        placeholder="5"
                        className="h-12 text-center text-lg font-black text-slate-900 border-slate-300"
                      />
                      <span className="text-[9px] text-slate-400 text-center block mt-0.5">feet (ft)</span>
                    </div>
                    <span className="text-slate-400 font-bold">'</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={heightInches}
                        onChange={(e) => handleFeetInchesChange(heightFeet, e.target.value)}
                        placeholder="2"
                        className="h-12 text-center text-lg font-black text-slate-900 border-slate-300"
                      />
                      <span className="text-[9px] text-slate-400 text-center block mt-0.5">inches (in)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Input
                      type="number"
                      value={heightCm}
                      onChange={(e) => handleCmChange(e.target.value)}
                      placeholder="157"
                      className="h-12 text-center text-lg font-black text-slate-900 border-slate-300"
                    />
                    <span className="text-[9px] text-slate-400 text-center block mt-0.5">centimeters (cm)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Chief Complaints Quick Chips */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-brand-700" />
              Reason for Visit / Chief Complaint
            </label>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_COMPLAINTS.map((complaint) => {
                const isSelected = selectedComplaints.includes(complaint);
                return (
                  <button
                    key={complaint}
                    type="button"
                    onClick={() => toggleComplaint(complaint)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-brand-700 text-white border-brand-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {isSelected ? `✓ ${complaint}` : complaint}
                  </button>
                );
              })}
            </div>

            <Input
              type="text"
              value={chiefComplaintNote}
              onChange={(e) => setChiefComplaintNote(e.target.value)}
              placeholder="Additional patient notes (e.g., fever started yesterday, coughing for 3 days)..."
              className="text-xs mt-2"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 px-5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </Button>

          <Button
            variant="brand"
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 px-6 text-sm font-bold shadow-sm rounded-xl gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Vitals for Doctor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
