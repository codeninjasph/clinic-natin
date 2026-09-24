'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ClipboardList,
  UserPlus,
  Receipt,
  CircleDollarSign,
  Megaphone,
  Tv,
  Stethoscope,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { SecretaryProvider, useSecretary } from './secretary-context';
import { ClinicNatinLogo } from '@/components/brand/clinic-natin-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  {
    href: '/secretary/dashboard',
    label: 'Queue & Triage',
    shortLabel: 'Queue',
    description: 'Patient waiting list & baseline vitals',
    icon: ClipboardList,
  },
  {
    href: '/secretary/walk-in',
    label: '+ Walk-In',
    shortLabel: '+ Walk-In',
    description: 'Register patient & issue queue ticket',
    icon: UserPlus,
  },
  {
    href: '/secretary/cashier',
    label: 'Cashier & Billing',
    shortLabel: 'Cashier',
    description: 'Receipts, discounts & collections',
    icon: Receipt,
  },
  {
    href: '/secretary/summaries',
    label: 'Cash Drawer',
    shortLabel: 'Drawer',
    description: 'End-of-day cash envelope balance',
    icon: CircleDollarSign,
  },
  {
    href: '/secretary/announcements',
    label: 'Announcements',
    shortLabel: 'Broadcast',
    description: 'Waiting room notices & delay alerts',
    icon: Megaphone,
  },
];

function SecretaryLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { secretary, doctor, clinic, activeSession, appointments } = useSecretary();
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setIsUnauthorized(params.get('unauthorized') === '1');
    }
  }, [pathname]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
    document.cookie = 'clinic_natin_role=; path=/; max-age=0';
    localStorage.removeItem('clinic_natin_demo_role');
    localStorage.removeItem('clinic_natin_demo_user');
    router.push('/login');
  };

  // If viewing dedicated TV display route, render full-screen without desk header
  if (pathname === '/secretary/display') {
    return <>{children}</>;
  }

  const sessionStatus = activeSession?.status;

  const statusConfig = {
    ACTIVE: {
      label: 'Consulting',
      dot: 'bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-pulse',
      text: 'text-emerald-800',
      bg: 'bg-emerald-50 border-emerald-300',
      title: 'Doctor is actively seeing patients in the consultation room',
    },
    PAUSED: {
      label: 'On Break / Rounds',
      dot: 'bg-amber-500',
      text: 'text-amber-800',
      bg: 'bg-amber-50 border-amber-300',
      title: 'Doctor stepped out for hospital rounds or procedure break',
    },
  }[sessionStatus as 'ACTIVE' | 'PAUSED'] ?? {
    label: 'Session Inactive',
    dot: 'bg-slate-400',
    text: 'text-slate-700',
    bg: 'bg-slate-100 border-slate-300',
    title: "Doctor has not yet opened today's clinic session. Walk-ins can still be registered.",
  };

  // Badge calculations for navigation
  const waitingCount = appointments.filter(
    (a) => a.status === 'WAITING' || a.status === 'BOOKED'
  ).length;
  const unpaidCount = appointments.filter(
    (a) => !a.is_paid_to_clinic && a.status !== 'CANCELLED_NO_SHOW'
  ).length;

  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased text-slate-900 bg-slate-50 selection:bg-brand-500 selection:text-white"
      style={{
        background: 'linear-gradient(175deg, #f0fdf4 0%, #f8fafc 35%, #f1f5f9 100%)',
      }}
    >
      {/* ── TOP PERSISTENT DESK NAVBAR (REVAMPED, AIRY & WIDESCREEN) ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 gap-3">
          {/* Left: Brand Logo & Clinic Facility Location */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <ClinicNatinLogo height={32} href="/secretary/dashboard" priority />

            <div className="hidden sm:block h-6 w-px bg-slate-200" />

            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {clinic
                  ? `${clinic.hospital_name} — Room ${clinic.room_number}`
                  : 'Maria Reyna XU Hospital — Room 304'}
              </span>
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${statusConfig.bg}`}
                title={statusConfig.title}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${statusConfig.dot}`} />
                <span className={`text-[10px] sm:text-[11px] font-bold tracking-tight ${statusConfig.text}`}>
                  {doctor?.name ? `${doctor.name} • ${statusConfig.label}` : statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Sleek Horizontal Pill Bar) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.href === '/secretary/dashboard' && waitingCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isActive ? 'bg-white text-brand-700' : 'bg-brand-100 text-brand-800'
                      }`}
                    >
                      {waitingCount}
                    </span>
                  )}
                  {item.href === '/secretary/cashier' && unpaidCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isActive ? 'bg-white text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {unpaidCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Quick Tools, Profile & Sign Out */}
          <div className="flex items-center gap-2 shrink-0">
            {/* TV Display Button (Desktop / Tablet) */}
            <Link href="/secretary/display" target="_blank" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5 px-2.5 rounded-xl shadow-xs"
                title="Open 10-foot TV Waiting Room Monitor in a new tab"
              >
                <Tv className="h-4 w-4 text-brand-700" />
                <span className="hidden xl:inline">TV Monitor</span>
              </Button>
            </Link>

            {/* Back to Doctor Cockpit (Desktop) */}
            <Link href="/doctor/dashboard" className="hidden xl:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-bold text-slate-600 hover:text-brand-700 hover:bg-brand-50 gap-1.5 px-2.5 rounded-xl"
                title="Switch to physician consultation cockpit"
              >
                <Stethoscope className="h-4 w-4 text-brand-700" />
                <span>Doctor Cockpit</span>
              </Button>
            </Link>

            {/* Secretary profile pill */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 border border-slate-200 rounded-xl px-2.5 py-1">
              <div className="h-6 w-6 rounded-lg bg-brand-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {(secretary?.full_name || 'Elena Bautista')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">
                  {secretary?.full_name || 'Elena Bautista'}
                </p>
                <p className="text-[9px] text-slate-500 font-medium leading-none mt-0.5">
                  Front-Desk
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Sign Out of Front-Desk"
              className="h-9 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1.5 px-2.5 rounded-xl hidden sm:flex"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>

            {/* Mobile Menu Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 p-0 lg:hidden rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ── MOBILE QUICK DRAWER / MENU SHEET ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {secretary?.full_name || 'Elena Bautista'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">Front-Desk Secretary</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation links in mobile drawer */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Navigation Menu
              </p>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-xs'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className={`text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {item.href === '/secretary/dashboard' && waitingCount > 0 && (
                      <span className="rounded-full bg-white text-brand-700 text-xs font-black px-2 py-0.5">
                        {waitingCount}
                      </span>
                    )}
                    {item.href === '/secretary/cashier' && unpaidCount > 0 && (
                      <span className="rounded-full bg-emerald-600 text-white text-xs font-black px-2 py-0.5">
                        {unpaidCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Additional tools in mobile menu */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Quick Tools
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/secretary/display"
                  target="_blank"
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200"
                >
                  <Tv className="h-4 w-4 text-brand-700" />
                  <span>TV Display Monitor</span>
                </Link>
                <Link
                  href="/doctor/dashboard"
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200"
                >
                  <Stethoscope className="h-4 w-4 text-brand-700" />
                  <span>Doctor Cockpit</span>
                </Link>
              </div>

              {/* Physician Info Card */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    {doctor?.name || 'Dr. Maria Santos'}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    {doctor?.specialty || 'General Practitioner'}
                  </p>
                </div>
                <Badge className="bg-emerald-600 text-white font-black text-xs">
                  ₱{doctor?.consultation_fee?.toFixed(0) || '600'}
                </Badge>
              </div>

              {/* Logout button */}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full h-11 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-bold gap-2 text-sm justify-center"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of Desk</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unauthorized Alert Banner (e.g. redirected from /cnadmin) ── */}
      {isUnauthorized && (
        <div className="bg-amber-500/10 border-b border-amber-300/80 px-4 sm:px-6 py-2.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong>Admin Clearance Required:</strong> You are currently signed in as <strong>Clinic Secretary</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="h-7 text-xs border-amber-300 bg-white text-amber-900 hover:bg-amber-50 font-bold gap-1.5 rounded-lg shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5 text-amber-700" />
              <span>Switch Account</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsUnauthorized(false)}
              className="h-7 w-7 p-0 text-amber-700 hover:bg-amber-200/50 rounded-lg text-sm"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE (FULL FLUID SCREEN WIDESCREEN DESKTOP) ── */}
      <div className="w-full flex-1 p-3 sm:p-5 lg:p-6 pb-24 md:pb-8">
        <main className="w-full min-w-0">{children}</main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION DOCK (FIXED FOR SMARTPHONES) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden px-2 py-1.5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          {/* 1. Queue */}
          <Link
            href="/secretary/dashboard"
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors relative ${
              pathname === '/secretary/dashboard'
                ? 'text-brand-700 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <ClipboardList className="h-5 w-5" />
              {waitingCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-brand-700 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-xs ring-2 ring-white">
                  {waitingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-bold">Queue</span>
          </Link>

          {/* 2. Walk-in */}
          <Link
            href="/secretary/walk-in"
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors ${
              pathname === '/secretary/walk-in'
                ? 'text-sky-700 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                pathname === '/secretary/walk-in'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <UserPlus className="h-4 w-4" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold">+ Walk-In</span>
          </Link>

          {/* 3. Cashier */}
          <Link
            href="/secretary/cashier"
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors relative ${
              pathname === '/secretary/cashier'
                ? 'text-emerald-700 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Receipt className="h-5 w-5" />
              {unpaidCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-xs ring-2 ring-white">
                  {unpaidCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-bold">Cashier</span>
          </Link>

          {/* 4. Cash Drawer */}
          <Link
            href="/secretary/summaries"
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors ${
              pathname === '/secretary/summaries'
                ? 'text-amber-700 font-black'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CircleDollarSign className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-bold">Drawer</span>
          </Link>

          {/* 5. Menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-800 active:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-bold">Menu</span>
          </button>
        </div>
      </nav>
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
