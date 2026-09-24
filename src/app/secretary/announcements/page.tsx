'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Clock,
  Send,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Tv,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useSecretary } from '../secretary-context';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function AnnouncementsPage() {
  const supabase = createClient();
  const { activeSession, refreshData } = useSecretary();

  const [customNotice, setCustomNotice] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleBroadcast = async (minutes: number, reason: string) => {
    if (!activeSession) {
      showToast('No active clinic session available to broadcast.', 'error');
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/queue/delay-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          delayMinutes: minutes,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch broadcast');

      showToast(`Announcement broadcasted! Sent ${data.smsSent ?? 0} SMS alerts and updated TV display.`, 'success');
      setCustomNotice('');
      await refreshData();
    } catch (err: unknown) {
      console.error('[AnnouncementsPage] Broadcast failed:', err);
      showToast(err instanceof Error ? err.message : 'Could not dispatch announcement.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleClearNotice = async () => {
    if (!activeSession) return;
    try {
      await supabase
        .from('queue_sessions')
        .update({ announcement_notice: null })
        .eq('id', activeSession.id);
      showToast('Announcement cleared from waiting room TV monitor.');
      await refreshData();
    } catch (err: unknown) {
      showToast('Could not clear announcement.', 'error');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/secretary/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Queue Logbook</span>
        </Link>
        <span className="text-[11px] font-bold text-slate-400">
          TV Marquee &amp; SMS Dispatch
        </span>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl p-4 shadow-xl text-sm font-black flex items-center gap-3 border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-rose-600" />
          Clinic Announcements &amp; Delay Broadcasts
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
          Instantly broadcast notices to the waiting room TV display and send automated SMS alerts to queued patients.
        </p>
      </div>

      {/* Active Broadcast Notice Card */}
      {activeSession?.announcement_notice && (
        <Card className="border-2 border-amber-300 bg-amber-50 shadow-xs rounded-3xl overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                <Tv className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                  Active Notice on Waiting Room TV Monitor
                </span>
                <p className="text-sm sm:text-base font-black text-amber-950 mt-0.5">
                  &ldquo;{activeSession.announcement_notice}&rdquo;
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearNotice}
              className="text-xs font-black border-amber-300 text-amber-900 hover:bg-amber-100 gap-1.5 shrink-0 rounded-xl"
            >
              <X className="h-4 w-4" />
              Clear from Screen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 1-Tap Quick Delay Triggers */}
      <Card className="border-slate-200 shadow-xs bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-brand-700" />
            1-Tap Delay Alerts (Quick Presets)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Automatically sends SMS notifications to queued patients and updates the waiting room TV ticker.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleBroadcast(15, 'Doctor is currently attending inpatient hospital rounds (+15 mins)')}
              disabled={isBroadcasting}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-98"
            >
              <span className="text-sm font-black text-slate-900 block">
                ⏱️ +15 Mins Delay
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Doctor is attending to inpatient rounds at the hospital ward
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleBroadcast(30, 'Doctor attending urgent procedure / surgery (+30 mins)')}
              disabled={isBroadcasting}
              className="p-4 rounded-2xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-left transition-all active:scale-98"
            >
              <span className="text-sm font-black text-amber-950 block">
                🚨 +30 Mins Delay
              </span>
              <span className="text-xs text-amber-900 mt-1 block">
                Emergency case or extended procedure in the operating room
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleBroadcast(45, 'Doctor delayed in transit/traffic (+45 mins)')}
              disabled={isBroadcasting}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all active:scale-98"
            >
              <span className="text-sm font-black text-slate-900 block">
                🚗 +45 Mins Delay
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Doctor delayed in transit; consultations starting shortly
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Announcement Composer */}
      <Card className="border-slate-200 shadow-xs bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-brand-700" />
            Custom Broadcast Notice
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Compose a custom marquee ticker message for the waiting room monitor.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Announcement Message:
            </label>
            <Input
              type="text"
              value={customNotice}
              onChange={(e) => setCustomNotice(e.target.value)}
              placeholder="e.g. Clinic will be on lunch break from 12:00 PM to 1:00 PM. Consultations resume at 1:00 PM."
              className="h-12 text-sm border-slate-300 rounded-2xl bg-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Broadcasts to waiting room monitor and dispatches SMS alerts</span>
            </div>

            <Button
              onClick={() => handleBroadcast(delayMinutes, customNotice.trim())}
              disabled={isBroadcasting || !customNotice.trim()}
              className="h-12 px-6 text-sm font-black bg-brand-700 hover:bg-brand-800 text-white rounded-2xl gap-2 shadow-xs"
            >
              {isBroadcasting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Broadcast Announcement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
