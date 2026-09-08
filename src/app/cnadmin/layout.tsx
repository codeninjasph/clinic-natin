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
  const [isImpersonationModalOpen, setIsImpersonationModalOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<'DOCTOR' | 'PATIENT'>('DOCTOR');
  const [targetUser, setTargetUser] = React.useState('Dr. Maria Santos, MD');

  // Check existing session
  React.useEffect(() => {
    const active = localStorage.getItem('clinic_natin_impersonation_active');
    const ticket = localStorage.getItem('clinic_natin_impersonation_ticket');
    if (active) {
      setImpersonatedUser(active);
      setTicketRef(ticket || 'SUP-DEMO');
    }
  }, []);

  const handleStartImpersonation = () => {
    if (!ticketRef.trim()) {
      alert('Support Ticket Reference # is required for RA 10173 compliance logging.');
      return;
    }
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
      actorName: 'Atty. Rafael Ramos (Admin Ops)',
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
            <Link href="/cnadmin" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                CN
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900 tracking-tight">Clinic Natin</span>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Admin Cockpit
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Cagayan de Oro & Region X Operations</p>
              </div>
            </Link>
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
              <span>4,820 SMS Credits</span>
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
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                AR
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">Atty. Rafael Ramos</p>
                <p className="text-[10px] text-slate-500 font-medium">Compliance & Ops Director</p>
              </div>
            </div>
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
      <Dialog open={isImpersonationModalOpen} onOpenChange={setIsImpersonationModalOpen}>
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
