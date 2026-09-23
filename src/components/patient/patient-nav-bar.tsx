'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Ticket,
  FileText,
  Users,
  User,
  HeartPulse,
  Activity,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ClinicNatinLogo } from '@/components/brand/clinic-natin-logo';

export function PatientNavBar() {
  const pathname = usePathname();
  const [activeQueueCount, setActiveQueueCount] = useState<number>(0);
  const [servingNumber, setServingNumber] = useState<number | null>(null);
  const [myTokenCode, setMyTokenCode] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Dianne Pondoc');
  const [dependents, setDependents] = useState<Array<{ id: string; full_name: string; relationship: string }>>([]);
  const [activeDependent, setActiveDependent] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    async function loadActiveState() {
      try {
        const supabase = createClient();
        const { data: appts } = await supabase
          .from('appointments')
          .select('id, queue_number, token_code, status, queue_sessions(current_serving_number)')
          .in('status', ['BOOKED', 'WAITING', 'SERVING'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (appts && appts.length > 0) {
          setActiveQueueCount(appts.length);
          const first = appts[0] as any;
          setMyTokenCode(first.token_code);
          const qs = first.queue_sessions;
          if (qs?.current_serving_number) {
            setServingNumber(qs.current_serving_number);
          }
        }

        // Load dependents
        const res = await fetch('/api/patient/dependents?profileId=971463e5-9348-42c0-b759-5b56f9df9e99');
        if (res.ok) {
          const json = await res.json();
          if (json.dependents) {
            setDependents(json.dependents);
          }
        }
      } catch (e) {
        // silent fallback
      }
    }
    loadActiveState();
  }, []);

  const navItems = [
    {
      label: 'Specialists',
      desktopLabel: 'Find Specialists',
      href: '/discover',
      icon: Compass,
      active: pathname === '/discover',
    },
    {
      label: 'Live Turn',
      desktopLabel: 'Live Queue',
      href: '/my-queue',
      icon: Ticket,
      active: pathname === '/my-queue',
      badge: activeQueueCount > 0 ? (myTokenCode ? myTokenCode.replace('CN-', '') : '1') : undefined,
    },
    {
      label: 'Prescriptions',
      desktopLabel: 'Medical Records (℞)',
      href: '/records',
      icon: FileText,
      active: pathname.startsWith('/records'),
    },
    {
      label: 'Family Hub',
      desktopLabel: 'Family Hub',
      href: '/family',
      icon: Users,
      active: pathname === '/family',
      count: dependents.length > 0 ? dependents.length : undefined,
    },
    {
      label: 'Health Passport',
      desktopLabel: 'Health Passport',
      href: '/account',
      icon: User,
      active: pathname === '/account',
    },
  ];

  return (
    <>
      {/* ── Top Navigation Bar (Responsive on Mobile & Desktop) ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-2xs transition-all">
        <div className="mx-auto flex max-w-7xl 2xl:max-w-[1536px] items-center justify-between px-4 sm:px-6 lg:px-10 py-2.5">
          {/* Brand: Official Logo Banner */}
          <div className="flex items-center gap-3">
            <ClinicNatinLogo height={34} href="/discover" priority />
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-dark border border-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              CDO Outpatient
            </span>
          </div>

          {/* Desktop Center Pill Nav */}
          <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1 border border-slate-200/70 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-150 ${
                    item.active
                      ? 'bg-white text-brand-dark shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${item.active ? 'text-brand' : 'text-slate-400'}`} />
                  <span>{item.desktopLabel}</span>
                  {item.badge && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-black text-white shadow-xs animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Active Turn Indicator & Family Profile Dropdown */}
          <div className="flex items-center gap-2.5">
            {activeQueueCount > 0 && (
              <Link
                href="/my-queue"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition"
                title="View your turn in queue"
              >
                <Ticket className="h-3.5 w-3.5 animate-bounce" />
                <span className="hidden sm:inline">Now Serving</span>
                <span>#{servingNumber || 1}</span>
              </Link>
            )}

            {/* Profile & Dependent Switcher */}
            <div className="relative">
              <button
                type="button"
                id="patient-nav-profile-menu"
                onClick={() => setDropdownOpen((p) => !p)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs hover:border-slate-300 transition"
                aria-label="Patient Profile and Family Switcher"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-xs font-black text-white shadow-xs">
                  {activeDependent ? activeDependent.slice(0, 2).toUpperCase() : 'DP'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {activeDependent || patientName}
                  </p>
                  <p className="text-[10px] font-semibold text-brand-dark leading-none">
                    {activeDependent ? 'Dependent Profile' : 'Primary Account'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Family Profile
                    </p>
                  </div>

                  <div className="space-y-1 py-1 max-h-56 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDependent(null);
                        setDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                        activeDependent === null
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{patientName}</p>
                        <p className="text-[10px] text-slate-400">Myself (Account Holder)</p>
                      </div>
                      {activeDependent === null && <ShieldCheck className="h-4 w-4 text-brand-700" />}
                    </button>

                    {dependents.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => {
                          setActiveDependent(dep.full_name);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                          activeDependent === dep.full_name
                            ? 'bg-brand-50 text-brand-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold">{dep.full_name}</p>
                          <p className="text-[10px] text-slate-400">{dep.relationship}</p>
                        </div>
                        {activeDependent === dep.full_name && <ShieldCheck className="h-4 w-4 text-brand-700" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                    <Link
                      href="/family"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      <Users className="h-3.5 w-3.5 text-brand-700" />
                      Manage Dependents
                    </Link>
                    <Link
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      Health Passport & Settings
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Floating Glassmorphic Dock ── */}
      <nav className="fixed bottom-3 inset-x-3 max-w-md mx-auto z-50 block md:hidden">
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl px-2 py-1.5 shadow-xl ring-1 ring-black/5">
          <div className="grid grid-cols-5 gap-1 text-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                    item.active
                      ? 'bg-brand-50 text-brand-dark font-extrabold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${item.active ? 'text-brand' : 'text-slate-400'}`} />
                    {item.badge && (
                      <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-1 text-[8px] font-black text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] mt-1 tracking-tight leading-none truncate max-w-full">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
