'use client';

import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BufferGraceCardProps {
  appointmentId: string;
  tokenCode: string;
  bufferedAt?: string;
  onRestored: () => void;
}

export function BufferGraceCard({
  appointmentId,
  tokenCode,
  bufferedAt,
  onRestored,
}: BufferGraceCardProps) {
  const [timeLeftMins, setTimeLeftMins] = useState<number>(45);
  const [timeLeftSecs, setTimeLeftSecs] = useState<number>(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  useEffect(() => {
    const startTime = bufferedAt ? new Date(bufferedAt).getTime() : Date.now();
    const deadline = startTime + 45 * 60 * 1000;

    const interval = setInterval(() => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setTimeLeftMins(0);
        setTimeLeftSecs(0);
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeftMins(m);
        setTimeLeftSecs(s);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bufferedAt]);

  const handleCheckInArrival = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch('/api/queue/restore-buffered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoredNotice('Arrival confirmed! You have been placed 2 slots ahead in the active line.');
        setTimeout(() => {
          onRestored();
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to restore buffered token');
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error checking in arrival');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-white shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
            <Timer className="h-6 w-6 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                ⏳ Buffer Lane Grace Period
              </span>
              <span className="font-mono text-xs font-black bg-black/25 px-2 py-0.5 rounded">
                {String(timeLeftMins).padStart(2, '0')}:{String(timeLeftSecs).padStart(2, '0')} Left
              </span>
            </div>

            <h3 className="text-sm font-bold mt-1">
              Token {tokenCode} is on Grace Hold
            </h3>
            <p className="text-xs text-amber-100 mt-0.5">
              You were called while away. Click below as soon as you arrive at the clinic desk to be inserted 2 slots ahead.
            </p>

            {restoredNotice ? (
              <div className="mt-2 text-xs font-bold text-emerald-100 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
                <span>{restoredNotice}</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleCheckInArrival}
                disabled={isRestoring}
                className="mt-3 rounded-xl bg-white hover:bg-white/90 text-amber-950 font-black text-xs h-9 shadow-sm"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
                    I Am Here &bull; Check-in (+2 Slots Ahead)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
