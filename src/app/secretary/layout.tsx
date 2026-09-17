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
  },
  {
    href: '/secretary/walk-in',
    label: 'Register Walk-In Patient',
    description: 'Add new patient & issue ticket',
    icon: UserPlus,
  },
  {
    href: '/secretary/cashier',
    label: 'Cashier & Fee Settlement',
    description: 'Receipts, discounts & cash collections',
    icon: Receipt,
  },
  {
    href: '/secretary/summaries',
    label: 'Daily Cash Drawer Tally',
    description: 'End-of-day money envelope balance',
    icon: CircleDollarSign,
  },
  {
    href: '/secretary/announcements',
    label: 'Announcements & Delays',
    description: 'Waiting room notices & doctor delay alerts',
    icon: Megaphone,
  },
];

function SecretaryLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { doctor, clinic, activeSession, isRealtime } = useSecretary();

  // If viewing dedicated TV display route, render full-screen without desk sidebar/header
  if (pathname === '/secretary/display') {
    return <>{children}</>;
  }

  const doctorLocation =
    activeSession?.status === 'ACTIVE'
      ? 'In Room (Consulting)'
      : activeSession?.status === 'PAUSED'
      ? 'On Hospital Rounds'
      : 'Session Not Started';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      {/* ── TOP PERSISTENT DESK HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          {/* Left: Clinic & Doctor Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-xs">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
                  Secretary Front-Desk
                </span>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      activeSession?.status === 'ACTIVE'
                        ? 'bg-emerald-500 animate-pulse'
                        : activeSession?.status === 'PAUSED'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Doctor: {doctorLocation}
                  </span>
                </div>
              </div>

              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {clinic
                  ? `${clinic.hospital_name} — Room ${clinic.room_number}`
                  : 'Maria Reyna XU Hospital — Room 304'}{' '}
                <span className="text-sm font-semibold text-slate-500">
                  ({doctor?.name || 'Dr. Maria Santos'})
                </span>
              </h1>
            </div>
          </div>

          {/* Right: Now Serving & Quick Links */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Now Serving Big Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 shadow-2xs">
              <Clock className="h-4 w-4 text-brand-700" />
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block leading-none">
                  Now Serving
                </span>
                <span className="text-base sm:text-lg font-black text-brand-700 font-mono leading-tight">
                  #{activeSession?.current_serving_number || '0'}
                </span>
              </div>
            </div>

            {/* TV Waiting Room Mode Button */}
            <Link href="/secretary/display" target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 gap-2 px-3 rounded-xl shadow-2xs"
                title="Open 10-foot TV Waiting Room Monitor in a new screen"
              >
                <Tv className="h-4 w-4 text-brand-700" />
                <span className="hidden md:inline">Open TV Display</span>
              </Button>
            </Link>

            {/* Back to Doctor Cockpit */}
            <Link href="/doctor/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-xs font-bold text-slate-600 hover:text-brand-800 gap-1.5 px-3 rounded-xl hidden lg:flex"
                title="Switch to physician consultation cockpit"
              >
                <Stethoscope className="h-4 w-4" />
                <span>Doctor Cockpit</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>

            {/* Realtime Status Indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isRealtime
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {isRealtime ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span className="hidden sm:inline">{isRealtime ? 'Live Sync' : 'Connecting'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE (SIDEBAR + CONTENT CANVAS) ── */}
      <div className="mx-auto max-w-7xl w-full flex-1 flex flex-col md:flex-row p-4 sm:p-6 gap-6">
        {/* Left: Navigation Sidebar (Designed with Large, Readable Tap Targets) */}
        <aside className="w-full md:w-64 shrink-0 space-y-1.5">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Front-Desk Operations
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={`flex items-start gap-3 rounded-xl px-3 py-3 transition-all ${
                      isActive
                        ? 'bg-brand-700 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 mt-0.5 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-bold leading-tight ${
                          isActive ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {item.label}
                      </p>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? 'text-brand-100' : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Doctor Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Physician on Duty
            </p>
            <p className="text-sm font-extrabold text-slate-900 leading-tight">
              {doctor?.name || 'Dr. Maria Santos, MD'}
            </p>
            <p className="text-xs text-brand-700 font-semibold mt-0.5">
              {doctor?.specialty || 'Internal Medicine / Cardiology'}
            </p>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Standard Consultation Fee:</span>
              <Badge variant="outline" className="font-bold text-slate-800 bg-slate-50">
                ₱{doctor?.consultation_fee?.toFixed(2) || '600.00'}
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
