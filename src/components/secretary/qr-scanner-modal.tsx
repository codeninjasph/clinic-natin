'use client';

import React, { useState } from 'react';
import {
  QrCode,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  UserCheck,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/app/secretary/secretary-context';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  onCheckInSuccess?: (appointmentId: string) => void;
}

export function QRScannerModal({
  isOpen,
  onClose,
  appointments,
  onCheckInSuccess,
}: QRScannerModalProps) {
  const supabase = createClient();
  const [searchToken, setSearchToken] = useState('');
  const [matchedAppt, setMatchedAppt] = useState<Appointment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSearch = (term: string) => {
    setSearchToken(term);
    setStatusMessage(null);
    if (!term.trim()) {
      setMatchedAppt(null);
      return;
    }

    const clean = term.trim().toUpperCase();
    const found = appointments.find(
      (a) =>
        a.token_code.toUpperCase() === clean ||
        String(a.queue_number) === clean ||
        a.display_name.toUpperCase().includes(clean) ||
        (a.phone_number && a.phone_number.includes(clean))
    );

    setMatchedAppt(found || null);
    if (!found && clean.length >= 3) {
      setStatusMessage({
        type: 'error',
        text: `No matching appointment found for "${term}". Please verify booking reference.`,
      });
    }
  };

  const handleConfirmArrival = async () => {
    if (!matchedAppt) return;
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'WAITING',
          served_at: null,
        })
        .eq('id', matchedAppt.id);

      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: `Check-in confirmed for ${matchedAppt.display_name} (${matchedAppt.token_code}). Now marked as WAITING.`,
      });

      if (onCheckInSuccess) onCheckInSuccess(matchedAppt.id);
      setTimeout(() => {
        onClose();
        setMatchedAppt(null);
        setSearchToken('');
        setStatusMessage(null);
      }, 1500);
    } catch (err: unknown) {
      console.error('[QRScanner] Check-in error:', err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update patient arrival status.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-2xl border-slate-200">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Patient Pass Scanner & Check-In
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Scan patient digital pass or search booking token to confirm clinic arrival
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Simulated Scanner Viewfinder Card */}
          <div className="relative rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="h-16 w-16 rounded-2xl bg-white border border-brand-200 shadow-sm flex items-center justify-center text-brand-700 mb-2">
              <Camera className="h-8 w-8 animate-pulse" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Hold Patient Mobile Pass to Camera
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Camera viewfinder is active for instant token capture
            </p>
          </div>

          {/* Manual Input Fallback */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Or Type Token / Mobile / Name Manually:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={searchToken}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="e.g. CN-A109, 0917..., or Juan dela Cruz"
                className="h-12 pl-10 text-sm font-semibold border-slate-300 focus:border-brand-700"
                autoFocus
              />
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Matched Patient Card */}
          {matchedAppt && (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-700 text-white font-mono text-sm px-2.5 py-0.5">
                  {matchedAppt.token_code}
                </Badge>
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Slot #{matchedAppt.queue_number}
                </span>
              </div>

              <div>
                <p className="text-base font-extrabold text-slate-900">
                  {matchedAppt.display_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Current Status: <strong>{matchedAppt.status}</strong></span>
                </div>
              </div>

              <Button
                variant="brand"
                onClick={handleConfirmArrival}
                disabled={isProcessing}
                className="w-full h-11 text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Confirm Arrival & Mark as Waiting in Lounge
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
