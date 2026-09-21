'use client';

import React, { useState } from 'react';
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
import { Hourglass, Clock, AlertCircle } from 'lucide-react';

interface BufferModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    token_code: string;
    queue_number: number;
    display_name: string;
  } | null;
  onConfirm: (appointmentId: string, graceMinutes: number, reason: string) => Promise<void>;
  isLoading?: boolean;
}

const GRACE_OPTIONS = [
  { minutes: 15, label: '15 mins', desc: 'Quick CBC / Rapid Test' },
  { minutes: 30, label: '30 mins', desc: 'Routine Blood Test' },
  { minutes: 45, label: '45 mins', desc: 'Standard Diagnostic (Default)' },
  { minutes: 60, label: '60 mins', desc: 'X-Ray / Ultrasound' },
  { minutes: 90, label: '90 mins', desc: 'Off-site / Hospital Ward' },
  { minutes: 120, label: '120 mins', desc: 'Dialysis / Specialized Procedure' },
];

const REASON_PRESETS = [
  'Sent for Laboratory / Bloodwork',
  'Sent for Imaging / X-Ray / Ultrasound',
  'Stepped out temporarily',
  'Awaiting relative / guardian',
];

export function BufferModal({
  isOpen,
  onClose,
  appointment,
  onConfirm,
  isLoading = false,
}: BufferModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(45);
  const [reason, setReason] = useState<string>('Sent for Laboratory / Bloodwork');
  const [customReason, setCustomReason] = useState<string>('');

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'Custom' ? customReason.trim() || 'Buffered by clinic staff' : reason;
    await onConfirm(appointment.id, selectedMinutes, finalReason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Place in Buffer Lane
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Token <span className="font-bold text-slate-700">{appointment.token_code}</span> (#{appointment.queue_number}) — {appointment.display_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Grace Period Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              Select Grace Period Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GRACE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.minutes}
                  onClick={() => setSelectedMinutes(opt.minutes)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    selectedMinutes === opt.minutes
                      ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-500 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-xs font-black ${selectedMinutes === opt.minutes ? 'text-amber-900' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Reason for Buffering
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {REASON_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setReason(preset);
                    setCustomReason('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    reason === preset
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setReason('Custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  reason === 'Custom'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Custom Reason...
              </button>
            </div>

            {reason === 'Custom' && (
              <Input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific diagnostic or departure reason..."
                className="h-9 text-xs rounded-lg"
                autoFocus
              />
            )}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Patient will be dispatched an SMS notice with their {selectedMinutes}-minute return deadline. When the patient returns with results, click <span className="font-bold text-amber-700">&ldquo;Restore&rdquo;</span> to insert them +2 slots ahead in the active consultation line.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {isLoading ? 'Saving...' : `Confirm (${selectedMinutes}m Grace)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
