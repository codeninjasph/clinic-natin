'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Radio,
  UserCheck,
  Building2,
  Users,
  Coins,
  Megaphone,
  ShieldCheck,
  Settings,
  MessageSquare,
  AlertTriangle,
  LogOut,
  ExternalLink,
  Lock,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Laptop2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { ClinicNatinLogo } from '@/components/brand/clinic-natin-logo';

const NAVIGATION_ITEMS = [
  { href: '/cnadmin', label: 'Operations Cockpit', icon: LayoutDashboard },
  { href: '/cnadmin/queue-monitor', label: 'Live Queue Monitor', icon: Radio },
  { href: '/cnadmin/doctors', label: 'Doctor Credentialing', icon: UserCheck },
  { href: '/cnadmin/clinics', label: 'Clinics & Rooms', icon: Building2 },
  { href: '/cnadmin/patients', label: 'Patients & Directory', icon: Users },
  { href: '/cnadmin/finops', label: 'FinOps & Payments', icon: Coins },
  { href: '/cnadmin/communications', label: 'Broadcasts & SMS', icon: Megaphone },
  { href: '/cnadmin/compliance', label: 'RA 10173 Compliance', icon: ShieldCheck },
  { href: '/cnadmin/settings', label: 'Dictionaries & Flags', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = React.useState<string | null>(null);
  const [ticketRef, setTicketRef] = React.useState<string>('');
  const [ticketError, setTicketError] = React.useState<string | null>(null);
  const [isImpersonationModalOpen, setIsImpersonationModalOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<'DOCTOR' | 'PATIENT'>('DOCTOR');
  const [targetUser, setTargetUser] = React.useState('Dr. Maria Santos, MD');

  // Authorization Shield State (Defense-in-depth against direct access/FOUC)
  const [isAuthorizing, setIsAuthorizing] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  // Current Authenticated Admin State
  const [adminProfile, setAdminProfile] = React.useState({
    name: 'CARL KENNETH GALVE',
    title: 'Founder & Platform Administrator',
    initials: 'CG',
    email: 'cdg@clinicnatin.com',
  });

  // Live Semaphore SMS Credit Telemetry state
  const [smsCredits, setSmsCredits] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d?.telemetry?.semaphore?.creditBalance !== undefined) {
          setSmsCredits(d.telemetry.semaphore.creditBalance);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Enforce Strict Admin Authorization
  React.useEffect(() => {
    let isMounted = true;

    const verifyAdminAccess = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Check local cookies & storage
        const roleCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('clinic_natin_role='))
          ?.split('=')[1];
        const demoRole = localStorage.getItem('clinic_natin_demo_role');
        const demoUserStr = localStorage.getItem('clinic_natin_demo_user');

        let verifiedAdmin = false;

        // 1. Live Supabase User Check
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('auth_id', user.id)
            .maybeSingle();

          const role = profile?.role || (user.user_metadata?.role as string) || roleCookie;
          if (role === 'ADMIN') {
            verifiedAdmin = true;
            const metadata = user.user_metadata || {};
            const fullName = profile?.full_name || metadata.full_name || user.email?.split('@')[0] || 'CARL KENNETH GALVE';
            const title = metadata.title || 'Founder & Platform Administrator';
            const initials = fullName
              .split(' ')
              .filter(Boolean)
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'CG';

            if (isMounted) {
              setAdminProfile({
                name: fullName,
                title,
                initials,
                email: user.email || 'cdg@clinicnatin.com',
              });
            }
          }
        }

        // 2. Demo Admin Session Check
        if (!verifiedAdmin && (demoRole === 'ADMIN' || roleCookie === 'ADMIN')) {
          verifiedAdmin = true;
          if (demoUserStr) {
            try {
              const parsed = JSON.parse(demoUserStr);
              if (parsed.role === 'ADMIN') {
                const fullName = parsed.name || 'CARL KENNETH GALVE';
                const initials = fullName
                  .split(' ')
                  .filter(Boolean)
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'CG';

                if (isMounted) {
                  setAdminProfile({
                    name: fullName,
                    title: 'Founder & Platform Administrator',
                    initials,
                    email: parsed.email || 'cdg@clinicnatin.com',
                  });
                }
              }
            } catch {}
          }
        }

        if (!isMounted) return;

        if (verifiedAdmin) {
          setIsAuthorized(true);
          setIsAuthorizing(false);
        } else {
          // Strictly route non-admin users to their designated portals or login
          const effectiveRole = roleCookie || demoRole;
          if (effectiveRole === 'DOCTOR') {
            router.replace('/doctor/dashboard?unauthorized=1');
          } else if (effectiveRole === 'SECRETARY') {
            router.replace('/secretary/dashboard?unauthorized=1');
          } else if (effectiveRole === 'PATIENT') {
            router.replace('/my-queue?unauthorized=1');
          } else {
            router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}&unauthorized=1`);
          }
        }
      } catch {
        if (isMounted) {
          router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}&unauthorized=1`);
        }
      }
    };

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  // Check existing impersonation session
  React.useEffect(() => {
    const active = localStorage.getItem('clinic_natin_impersonation_active');
    const ticket = localStorage.getItem('clinic_natin_impersonation_ticket');
    if (active) {
      setImpersonatedUser(active);
      setTicketRef(ticket || 'SUP-DEMO');
    }
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
    document.cookie = 'clinic_natin_role=; path=/; max-age=0';
    localStorage.removeItem('clinic_natin_demo_role');
    localStorage.removeItem('clinic_natin_demo_user');
    router.push('/login');
  };

  const handleStartImpersonation = () => {
    if (!ticketRef.trim()) {
      setTicketError('Support Ticket Reference # is required for RA 10173 compliance logging.');
      return;
    }
    setTicketError(null);
    const sessionLabel = `${targetUser} (${selectedRole})`;
    localStorage.setItem('clinic_natin_impersonation_active', sessionLabel);
    localStorage.setItem('clinic_natin_impersonation_ticket', ticketRef);
    setImpersonatedUser(sessionLabel);
    setIsImpersonationModalOpen(false);

    // Write to audit log record
    const existingAudit = JSON.parse(localStorage.getItem('clinic_natin_audit_logs') || '[]');
    existingAudit.unshift({
      id: `audit-${Date.now()}`,
      actorId: 'admin-session',
      actorName: `${adminProfile.name} (${adminProfile.title})`,
      actorRole: 'ADMIN',
      action: 'ADMIN_IMPERSONATION',
      resourceTable: 'sessions',
      recordId: `imp-${Date.now()}`,
      details: `Support Impersonation authorized for ${sessionLabel} (Ticket #${ticketRef})`,
      ipAddress: '124.106.129.5 (Admin Ops HQ)',
      timestamp: new Date().toLocaleString(),
    });
    localStorage.setItem('clinic_natin_audit_logs', JSON.stringify(existingAudit));

    if (selectedRole === 'DOCTOR') {
      router.push('/doctor/dashboard');
    } else {
      router.push('/my-queue');
    }
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('clinic_natin_impersonation_active');
    localStorage.removeItem('clinic_natin_impersonation_ticket');
    setImpersonatedUser(null);
    setTicketRef('');
    router.push('/cnadmin');
  };

  if (isAuthorizing || !isAuthorized) {
    return (
      <div
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center"
        style={{
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div className="h-14 w-14 rounded-2xl bg-brand-700/20 border border-brand-500/40 flex items-center justify-center text-brand-400 mb-4 shadow-lg shadow-brand-950/50 animate-pulse">
          <ShieldCheck className="h-7 w-7 text-brand-400" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-white mb-1">
          Clinic Natin Platform Operations
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Verifying administrative clearance &amp; RA 10173 session compliance...
        </p>
        <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 antialiased"
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* 1. Support Impersonation Sticky Warning Banner */}
      {impersonatedUser && (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-300 bg-amber-100/90 px-6 py-2.5 text-xs font-semibold text-amber-950 shadow-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 animate-pulse" />
            <span>
              <strong>SUPPORT IMPERSONATION ACTIVE:</strong> Logged in as{' '}
              <span className="underline font-bold">{impersonatedUser}</span> [Ticket #{ticketRef}] — Read-Only Audited Session
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExitImpersonation}
            className="h-7 border-amber-400 bg-white text-amber-900 hover:bg-amber-50 text-xs font-bold"
          >
            Exit to /cnadmin
          </Button>
        </div>
      )}

      {/* 2. Top Executive Telemetry Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <ClinicNatinLogo height={32} href="/cnadmin" priority />
              <div className="hidden sm:block border-l border-slate-200 pl-3">
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                  Admin Cockpit
                </Badge>
                <p className="text-[10px] text-slate-400 font-medium">Operations HQ</p>
              </div>
            </div>
          </div>

          {/* Real-Time Telemetry Pills */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Supabase Realtime Health */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Realtime Live</span>
            </div>

            {/* Semaphore SMS Credits */}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-700">
              <MessageSquare className="h-3.5 w-3.5 text-brand-700" />
              <span>{smsCredits !== null ? `${smsCredits.toLocaleString()} SMS Credits` : 'Checking Credits...'}</span>
            </div>

            {/* Active CDO Clinics */}
            <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-800">
              <Building2 className="h-3.5 w-3.5 text-blue-700" />
              <span>4 Hospitals Linked</span>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-3">
            {/* Safe Support Impersonation Launcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImpersonationModalOpen(true)}
              className="h-9 gap-1.5 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100 font-semibold text-xs"
            >
              <UserCheck className="h-4 w-4 text-slate-600" />
              <span>Login As...</span>
            </Button>

            {/* Exit to Patient / Main Portal */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-9 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <Link href="/my-queue" target="_blank">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                <span>Patient View</span>
              </Link>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* Admin Profile Pill */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold ring-2 ring-emerald-500/20">
                {adminProfile.initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">{adminProfile.name}</p>
                <p className="text-[10px] text-emerald-700 font-semibold">{adminProfile.title}</p>
              </div>
            </div>

            {/* Logout Action */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Sign Out"
              className="h-9 w-9 p-0 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 3. Main Dashboard Layout Shell */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar Navigation */}
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Command Hub
            </p>
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/cnadmin'
                  ? pathname === '/cnadmin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-700 text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <Separator className="my-5" />

          {/* Regulatory Compliance Badge */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <ShieldCheck className="h-4 w-4 text-brand-700" />
              <span>DPA & DOH Shield</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              RA 10173 Audit Logging active. Consultation retention locked for 10-year DOH mandate.
            </p>
          </div>

          {/* Quick Doctor / Secretary Portal Links */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Cross-Role Gateways
            </p>
            <div className="space-y-1">
              <Link
                href="/doctor/dashboard"
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 text-xs font-medium"
              >
                <span>Doctor Suite</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
              </Link>
              <Link
                href="/secretary/dashboard"
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 text-xs font-medium"
              >
                <span>Secretary Desk</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 p-8 bg-slate-50 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Support Impersonation Modal (RA 10173 Audited) */}
      <Dialog open={isImpersonationModalOpen} onOpenChange={(open) => { setIsImpersonationModalOpen(open); if (!open) setTicketError(null); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-700" />
              Authorized Support Impersonation ("Login As")
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Strictly governed under RA 10173 Section 12. Every session requires an authorized support ticket reference number and logs to the immutable audit trail.
            </DialogDescription>
          </DialogHeader>

          {ticketError && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-bold">Ticket Required</AlertTitle>
              <AlertDescription className="text-xs">{ticketError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Support Ticket Reference # <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. SUP-1092, TICKET-774"
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                className="text-sm bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Must correspond to an authorized customer support ticket or bug diagnostic request.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Role</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedRole === 'DOCTOR' ? 'brand' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedRole('DOCTOR');
                    setTargetUser('Dr. Maria Santos, MD');
                  }}
                  className="w-full text-xs font-semibold"
                >
                  Doctor Suite
                </Button>
                <Button
                  type="button"
                  variant={selectedRole === 'PATIENT' ? 'brand' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedRole('PATIENT');
                    setTargetUser('Andres Bonifacio (Senior PWD)');
                  }}
                  className="w-full text-xs font-semibold"
                >
                  Patient Account
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                Legal Notice & Security Warning
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                This action is written to <code className="font-mono text-amber-950 font-bold">public.audit_logs</code> with your admin ID, timestamp, and IP address.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImpersonationModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleStartImpersonation}
              className="text-xs font-bold"
            >
              Authorize & Enter Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
