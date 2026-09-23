'use client';

import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Circle, Flame, Calendar, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MedicationDose {
  id: string;
  name: string;
  dosage: string;
  slot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'BEDTIME' | 'PRN';
  timeLabel: string;
  instructions: string;
  taken: boolean;
}

export function MedicationTracker({
  patientId = '971463e5-9348-42c0-b759-5b56f9df9e99',
}: {
  patientId?: string;
}) {
  const [doses, setDoses] = useState<MedicationDose[]>([
    {
      id: 'dose-1',
      name: 'Amlodipine Besylate (Norvasc)',
      dosage: '5mg Tablet',
      slot: 'MORNING',
      timeLabel: '8:00 AM &bull; Morning',
      instructions: 'Take 1 tablet after breakfast with water',
      taken: false,
    },
    {
      id: 'dose-2',
      name: 'Metformin HCl',
      dosage: '500mg Tablet',
      slot: 'EVENING',
      timeLabel: '7:00 PM &bull; Evening',
      instructions: 'Take 1 tablet with evening meal',
      taken: false,
    },
    {
      id: 'dose-3',
      name: 'Paracetamol (Biogesic)',
      dosage: '500mg Tablet',
      slot: 'PRN',
      timeLabel: 'As Needed (PRN)',
      instructions: 'Every 6 hours for tension headache or fever',
      taken: false,
    },
  ]);

  const [streakDays, setStreakDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);

  // Load today's adherence logs from API
  useEffect(() => {
    async function loadAdherence() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/patient/adherence?patientId=${patientId}&date=${todayStr}`);
        if (res.ok) {
          const json = await res.json();
          const logs = json.logs || [];
          const loggedNames = new Set(logs.map((l: any) => `${l.medication_name}-${l.scheduled_slot}`));

          setDoses((prev) =>
            prev.map((dose) => ({
              ...dose,
              taken: loggedNames.has(`${dose.name}-${dose.slot}`),
            }))
          );
        }
      } catch (e) {
        console.warn('Adherence load error, keeping local state:', e);
      } finally {
        setLoading(false);
      }
    }
    loadAdherence();
  }, [patientId]);

  const toggleDose = async (index: number) => {
    const dose = doses[index];
    const newStatus = !dose.taken;

    setDoses((prev) =>
      prev.map((d, i) => (i === index ? { ...d, taken: newStatus } : d))
    );

    try {
      await fetch('/api/patient/adherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          medicationName: dose.name,
          dosage: dose.dosage,
          scheduledSlot: dose.slot,
          action: 'TOGGLE',
        }),
      });
    } catch (e) {
      console.warn('Failed to sync adherence log to server:', e);
    }
  };

  const takenCount = doses.filter((d) => d.taken).length;
  const progressPercent = Math.round((takenCount / doses.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Pill className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Daily Medication Adherence
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-synchronized with your doctor&apos;s digital prescriptions
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
          <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
          <span>{streakDays}-Day Streak</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Today&apos;s Schedule</span>
          <span>
            {takenCount} of {doses.length} doses taken ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-700 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Doses List */}
      <div className="space-y-2.5 pt-1">
        {doses.map((dose, idx) => (
          <div
            key={dose.id}
            onClick={() => toggleDose(idx)}
            className={`cursor-pointer rounded-xl border p-3 flex items-start justify-between gap-3 transition ${
              dose.taken
                ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold ${
                    dose.taken ? 'line-through text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {dose.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {dose.dosage}
                </span>
              </div>
              <p
                className="text-[11px] text-slate-500 mt-0.5"
                dangerouslySetInnerHTML={{ __html: dose.timeLabel }}
              />
              <p className="text-[10px] text-slate-600 italic mt-0.5">
                {dose.instructions}
              </p>
            </div>

            <button
              type="button"
              className="shrink-0 p-1 text-slate-400 hover:text-emerald-700 transition"
              aria-label={dose.taken ? 'Mark as untaken' : 'Mark as taken'}
            >
              {dose.taken ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 fill-emerald-100" />
              ) : (
                <Circle className="h-6 w-6 text-slate-300" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
