'use client';

import React, { useState } from 'react';
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
      showToast('No active clinic session to broadcast to.', 'error');
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

      showToast(`Broadcast sent! Sent ${data.smsSent ?? 0} Semaphore SMS alerts and updated TV marquee.`, 'success');
      setCustomNotice('');
      await refreshData();
    } catch (err: unknown) {
      console.error('[AnnouncementsPage] Broadcast failed:', err);
      showToast(err instanceof Error ? err.message : 'Could not dispatch broadcast.', 'error');
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
      showToast('Announcement notice cleared from TV screen.');
      await refreshData();
    } catch (err: unknown) {
      showToast('Could not clear notice.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 rounded-2xl p-4 shadow-xl text-sm font-bold flex items-center gap-3 border ${
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
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Megaphone className="h-6 w-6 text-brand-700" />
          Announcements &amp; Doctor Delay Dispatcher
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Broadcast unexpected physician delays or clinic updates directly to the waiting room TV and via SMS
        </p>
      </div>

      {/* Active Broadcast Notice Card */}
      {activeSession?.announcement_notice && (
        <Card className="border-2 border-amber-300 bg-amber-50 shadow-xs">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                <Tv className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Currently Displaying on TV Waiting Lounge Monitor
                </span>
                <p className="text-sm font-extrabold text-amber-950 mt-0.5">
                  &ldquo;{activeSession.announcement_notice}&rdquo;
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearNotice}
              className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100 gap-1.5 shrink-0"
            >
              <X className="h-4 w-4" />
              Clear from Screen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 1-Tap Quick Delay Triggers */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-700" />
            1-Tap Emergency Delay Broadcasts
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Instantly alerts all waiting patients and updates the hospital hallway monitor
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleBroadcast(15, 'Doctor is on urgent in-patient rounds in hospital ward')}
              disabled={isBroadcasting}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group"
            >
              <span className="text-sm font-black text-slate-800 block group-hover:text-brand-700">
                ⏱️ +15 Mins Delay
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Doctor attending hospital in-patient rounds
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleBroadcast(30, 'Doctor is called for emergency procedure in OR')}
              disabled={isBroadcasting}
              className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-left transition-all group"
            >
              <span className="text-sm font-black text-amber-900 block group-hover:text-amber-950">
                🚨 +30 Mins Delay
              </span>
              <span className="text-xs text-amber-800 mt-1 block">
                Emergency surgery / Operating Room extension
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleBroadcast(45, 'Doctor delayed by heavy highway traffic')}
              disabled={isBroadcasting}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all group"
            >
              <span className="text-sm font-black text-slate-800 block group-hover:text-brand-700">
                🚗 +45 Mins Delay
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Doctor held up in severe city traffic
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Announcement Composer */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-700" />
            Custom Waiting Room Marquee Notice
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Write custom notice for the scrolling ticker on the waiting room TV monitor
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Announcement Message:
            </label>
            <Input
              type="text"
              value={customNotice}
              onChange={(e) => setCustomNotice(e.target.value)}
              placeholder="e.g., Clinic will pause consultation at 12:00 PM for lunch break and resume promptly at 1:00 PM."
              className="h-12 text-sm border-slate-300"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-brand-700" />
              <span>Broadcasts to Smart TV monitor &amp; queued patients</span>
            </div>

            <Button
              variant="brand"
              onClick={() => handleBroadcast(delayMinutes, customNotice.trim())}
              disabled={isBroadcasting || !customNotice.trim()}
              className="h-11 px-6 text-xs font-bold bg-brand-700 hover:bg-brand-800 text-white rounded-xl gap-2 shadow-xs"
            >
              {isBroadcasting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Broadcast Notice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
