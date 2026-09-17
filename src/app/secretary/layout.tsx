'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  UserPlus,
  Receipt,
  CircleDollarSign,
  Megaphone,
  Tv,
  Stethoscope,
  Building2,
  Wifi,
  WifiOff,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { SecretaryProvider, useSecretary } from './secretary-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS = [
  {
    href: '/secretary/dashboard',
    label: 'Queue & Triage Logbook',
    description: 'Patient waiting list & baseline vitals',
    icon: ClipboardList,
    color: 'text-brand-700',
  },
  {
    href: '/secretary/walk-in',
    label: 'Register Walk-In Patient',
    description: 'Add new patient & issue ticket',
    icon: UserPlus,
    color: 'text-sky-600',
  },
  {
    href: '/secretary/cashier',
    label: 'Cashier & Fee Settlement',
    description: 'Receipts, discounts & cash collections',
    icon: Receipt,
    color: 'text-emerald-600',
  },
  {
    href: '/secretary/summaries',
    label: 'Daily Cash Drawer Tally',
    description: 'End-of-day money envelope balance',
    icon: CircleDollarSign,
    color: 'text-amber-600',
  },
  {
    href: '/secretary/announcements',
    label: 'Announcements & Delays',
    description: 'Waiting room notices & doctor delay alerts',
    icon: Megaphone,
    color: 'text-rose-500',
  },
];

function SecretaryLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { doctor, clinic, activeSession, isRealtime } = useSecretary();

  // If viewing dedicated TV display route, render full-screen without desk sidebar/header
  if (pathname === '/secretary/display') {
    return <>{children}</>;
  }

  const sessionStatus = activeSession?.status;

  const statusConfig = {
    ACTIVE: {
      label: 'In Room — Consulting',
      dot: 'bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)] animate-pulse',
      text: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    PAUSED: {
      label: 'On Hospital Rounds',
      dot: 'bg-amber-400',
      text: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
  }[sessionStatus as 'ACTIVE' | 'PAUSED'] ?? {
    label: 'Session Not Started',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    bg: 'bg-slate-50 border-slate-200',
  };

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased text-slate-900"
      style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #f8fafc 40%, #f1f5f9 100%)' }}
    >
      {/* ── TOP PERSISTENT DESK HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-0 h-16">
          {/* Left: Clinic & Doctor Identity */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-700/80 text-white shadow-sm ring-2 ring-brand-300/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Secretary Front-Desk
                </span>
                <span className="text-slate-200">•</span>
                <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${statusConfig.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                  <span className={`text-[10px] font-bold ${statusConfig.text}`}>
                    Doctor: {statusConfig.label}
                  </span>
                </div>
              </div>
              <h1 className="text-sm font-black text-slate-900 leading-none">
                {clinic
                  ? `${clinic.hospital_name} — Room ${clinic.room_number}`
                  : 'Maria Reyna XU Hospital — Room 304'}{' '}
                <span className="text-xs font-semibold text-slate-400">
                  ({doctor?.name || 'Dr. Maria Santos'})
                </span>
              </h1>
            </div>
          </div>

          {/* Right: Now Serving & Quick Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Now Serving Big Pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-xs ring-1 ring-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block leading-none">
                  Now Serving
                </span>
                <span className="text-xl font-black text-brand-700 font-mono leading-tight">
                  #{activeSession?.current_serving_number || '0'}
                </span>
              </div>
            </div>

            {/* TV Waiting Room Mode Button */}
            <Link href="/secretary/display" target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 gap-2 px-3.5 rounded-xl shadow-xs"
                title="Open 10-foot TV Waiting Room Monitor in a new screen"
              >
                <Tv className="h-4 w-4 text-brand-700" />
                <span className="hidden md:inline">TV Display</span>
              </Button>
            </Link>

            {/* Back to Doctor Cockpit */}
            <Link href="/doctor/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-bold text-slate-600 hover:text-brand-700 hover:bg-brand-50 gap-1.5 px-3 rounded-xl hidden lg:flex"
                title="Switch to physician consultation cockpit"
              >
                <Stethoscope className="h-4 w-4" />
                <span>Doctor Cockpit</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>

            {/* Realtime Status Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold border ${
                isRealtime
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {isRealtime ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span className="hidden sm:inline">{isRealtime ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE (SIDEBAR + CONTENT CANVAS) ── */}
      <div className="mx-auto max-w-[1400px] w-full flex-1 flex flex-col md:flex-row p-4 sm:p-6 gap-5">
        {/* Left: Navigation Sidebar */}
        <aside className="w-full md:w-60 shrink-0 space-y-3">
          {/* Nav Card */}
          <nav className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm space-y-0.5">
            <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Front-Desk Operations
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100'
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                      isActive ? 'bg-white/20' : 'bg-slate-100'
                    }`}>
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? 'text-white' : item.color
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {item.label}
                      </p>
                      <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                        {item.description}
                      </p>
                    </div>
                    {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/60 shrink-0" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Physician on Duty Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Physician on Duty
            </p>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 shrink-0">
                <Stethoscope className="h-4 w-4 text-brand-700" />
              </div>
              <div>
                <p className="text-[13px] font-extrabold text-slate-900 leading-snug">
                  {doctor?.name || 'Dr. Maria Santos'}
                </p>
                <p className="text-[10px] text-brand-700 font-semibold">
                  {doctor?.specialty || 'Internal Medicine'}
                </p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Consultation Fee</span>
              <Badge variant="outline" className="font-black text-brand-700 border-brand-200 bg-brand-50 text-xs">
                ₱{doctor?.consultation_fee?.toFixed(0) || '600'}
              </Badge>
            </div>
          </div>
        </aside>

        {/* Right: Main Work Canvas */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function SecretaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <SecretaryProvider>
      <SecretaryLayoutContent>{children}</SecretaryLayoutContent>
    </SecretaryProvider>
  );
}
