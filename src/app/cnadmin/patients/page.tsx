'use client';

import * as React from 'react';
import {
  Users, Search, Download, Trash2, ShieldCheck, Star, Accessibility, Baby,
  CheckCircle2, Eye, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, Phone, Mail, Calendar, Droplets, Heart, Pill,
  Lock, Activity, Clock, CreditCard, ShieldOff, UserCog,
  BadgeCheck, BadgeX, Briefcase, History, PauseCircle, PlayCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRecord {
  id: string;
  role: 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';
  full_name: string;
  phone_number: string | null;
  email: string | null;
  avatar_url: string | null;
  priority_category: 'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT';
  is_onboarding_completed: boolean;
  confidentiality_agreed_at: string | null;
  created_at: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  hmo_provider: string | null;
  philhealth_number: string | null;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'ANONYMIZED';
  suspended_at: string | null;
  suspension_reason: string | null;
  lifetime_appointments: number;
}

interface ProfileDetail extends ProfileRecord {
  weight_kg: number | null;
  height_cm: number | null;
  allergies: string[];
  comorbidities: string[];
  maintenance_meds: string[];
  priority_id_number: string | null;
  hmo_card_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  updated_at: string | null;
}

interface AppointmentHistory {
  id: string;
  queue_number: number;
  token_code: string;
  status: string;
  booking_channel: string;
  consultation_fee: number;
  platform_payment_status: string;
  created_at: string;
  completed_at: string | null;
  queue_sessions?: {
    session_date: string;
    clinics?: { name: string; hospital_name: string; room_number: string };
    doctors?: { title: string; specialty: string; profiles?: { full_name: string } };
  } | null;
}

interface DoctorMeta {
  id: string;
  title: string;
  specialty: string;
  subspecialty: string | null;
  prc_license: string | null;
  ptr_number: string | null;
  s2_license: string | null;
  consultation_fee_default: number;
  subscription_tier: string;
  pro_tier_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface SecretaryMeta {
  id: string;
  is_active: boolean;
  hired_at: string | null;
  terminated_at: string | null;
  doctors?: {
    id: string;
    title: string;
    specialty: string;
    profiles?: { full_name: string };
  } | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  table_affected: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  timestamp: string;
  performed_by: string | null;
}

interface KPIs {
  totalAll: number;
  totalPatients: number;
  seniorCount: number;
  pwdCount: number;
  pregnantCount: number;
  priorityTotal: number;
  incompleteOnboarding: number;
  suspendedCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CATEGORIES = ['NONE', 'SENIOR', 'PWD', 'PREGNANT'] as const;
const ROLES = ['ALL', 'PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN'];
const ALL_ROLES = ['PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN'] as const;
const PRIORITIES = ['ALL', 'SENIOR', 'PWD', 'PREGNANT', 'NONE'];
const STATUSES = ['ALL', 'ACTIVE', 'SUSPENDED', 'ANONYMIZED'];
const BASE_DRAWER_TABS = ['Demographics', 'Health', 'Emergency', 'Appointments', 'Privacy'] as const;
type BaseDrawerTab = typeof BASE_DRAWER_TABS[number];
type DrawerTab = BaseDrawerTab | 'Professional';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ageFromDob(dob: string | null): string {
  if (!dob) return '—';
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} yrs`;
}

function auditSummary(entry: AuditLogEntry): string {
  const nd = entry.new_data || {};
  if (nd.suspension_reason) return `Suspended — "${nd.suspension_reason}"`;
  if (nd.suspended_at === null && 'suspended_at' in nd) return 'Account reactivated';
  if (nd.role) return `Role changed to ${nd.role}`;
  if (nd.priority_category) return `Priority set to ${nd.priority_category}`;
  if (typeof nd.is_verified === 'boolean') return nd.is_verified ? 'Doctor verified' : 'Verification revoked';
  if (nd.erasure_executed_at) return 'RA 10173 Sec 16 Erasure executed';
  return `${entry.action} on ${entry.table_affected}`;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PatientsDirectoryPage() {
  const [profiles, setProfiles] = React.useState<ProfileRecord[]>([]);
  const [kpis, setKpis] = React.useState<KPIs | null>(null);
  const [pagination, setPagination] = React.useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('ALL');
  const [priorityFilter, setPriorityFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const [banner, setBanner] = React.useState<{ type: 'success' | 'destructive' | 'warning'; title: string; message: string } | null>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerProfile, setDrawerProfile] = React.useState<ProfileDetail | null>(null);
  const [drawerAppointments, setDrawerAppointments] = React.useState<AppointmentHistory[]>([]);
  const [drawerDoctorMeta, setDrawerDoctorMeta] = React.useState<DoctorMeta | null>(null);
  const [drawerSecretaryMeta, setDrawerSecretaryMeta] = React.useState<SecretaryMeta | null>(null);
  const [drawerAuditLogs, setDrawerAuditLogs] = React.useState<AuditLogEntry[]>([]);
  const [drawerLoading, setDrawerLoading] = React.useState(false);
  const [drawerTab, setDrawerTab] = React.useState<DrawerTab>('Demographics');

  // Priority edit
  const [editingPriority, setEditingPriority] = React.useState(false);
  const [newPriority, setNewPriority] = React.useState<string>('NONE');
  const [savingPriority, setSavingPriority] = React.useState(false);

  // Gap #1 — Role change
  const [editingRole, setEditingRole] = React.useState(false);
  const [newRole, setNewRole] = React.useState<string>('PATIENT');
  const [roleConfirmOpen, setRoleConfirmOpen] = React.useState(false);
  const [savingRole, setSavingRole] = React.useState(false);

  // Gap #2 — Suspension
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [suspendReason, setSuspendReason] = React.useState('');
  const [savingSuspend, setSavingSuspend] = React.useState(false);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = React.useState(false);

  // Gap #6 — Doctor verification
  const [verifyConfirmOpen, setVerifyConfirmOpen] = React.useState(false);
  const [verifyTarget, setVerifyTarget] = React.useState<boolean>(true);
  const [savingVerify, setSavingVerify] = React.useState(false);

  // DSAR
  const [dsarUser, setDsarUser] = React.useState<ProfileRecord | null>(null);
  const [dsarAction, setDsarAction] = React.useState<'EXPORT' | 'ERASURE' | null>(null);
  const [dsarLoading, setDsarLoading] = React.useState(false);

  // Debounce
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch list
  const fetchProfiles = React.useCallback(async (page = 1) => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({ page: String(page), limit: '50', role: roleFilter, priority: priorityFilter });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await fetch(`/api/admin/patients?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProfiles(data.profiles || []);
        setPagination(data.pagination);
        if (data.kpis) setKpis(data.kpis);
      } else {
        setBanner({ type: 'destructive', title: 'Load Error', message: data.error || 'Failed to load directory.' });
      }
    } catch {
      setBanner({ type: 'destructive', title: 'Connection Error', message: 'Could not reach the database.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, priorityFilter, debouncedSearch]);

  React.useEffect(() => { fetchProfiles(1); }, [fetchProfiles]);

  const filteredProfiles = statusFilter === 'ALL'
    ? profiles
    : profiles.filter((p) => p.account_status === statusFilter);

  // Open drawer
  const handleOpenDrawer = async (profile: ProfileRecord) => {
    setDrawerLoading(true);
    setDrawerOpen(true);
    setDrawerTab('Demographics');
    setDrawerProfile(null);
    setDrawerAppointments([]);
    setDrawerDoctorMeta(null);
    setDrawerSecretaryMeta(null);
    setDrawerAuditLogs([]);
    setEditingPriority(false);
    setEditingRole(false);
    try {
      const res = await fetch(`/api/admin/patients?id=${profile.id}`);
      const data = await res.json();
      if (res.ok) {
        setDrawerProfile(data.profile);
        setDrawerAppointments(data.appointments || []);
        setDrawerDoctorMeta(data.doctorMeta || null);
        setDrawerSecretaryMeta(data.secretaryMeta || null);
        setDrawerAuditLogs(data.auditLogs || []);
        setNewRole(data.profile.role);
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  // Save priority
  const handleSavePriority = async () => {
    if (!drawerProfile) return;
    setSavingPriority(true);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: drawerProfile.id, priorityCategory: newPriority }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrawerProfile((p) => p ? { ...p, priority_category: newPriority as any } : p);
        setBanner({ type: 'success', title: 'Priority Updated', message: `${drawerProfile.full_name}'s priority set to ${newPriority}.` });
        setEditingPriority(false);
        fetchProfiles(pagination.page);
      } else {
        setBanner({ type: 'destructive', title: 'Update Failed', message: data.error });
      }
    } finally {
      setSavingPriority(false);
    }
  };

  // Gap #1 — Save role
  const handleSaveRole = async () => {
    if (!drawerProfile) return;
    setSavingRole(true);
    setRoleConfirmOpen(false);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: drawerProfile.id, action: 'CHANGE_ROLE', role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrawerProfile((p) => p ? { ...p, role: newRole as any } : p);
        setBanner({ type: 'success', title: 'Role Updated', message: `${drawerProfile.full_name}'s role changed to ${newRole}.` });
        setEditingRole(false);
        fetchProfiles(pagination.page);
        // Refresh drawer to get updated professional tab if needed
        handleOpenDrawer({ ...drawerProfile, role: newRole as any });
      } else {
        setBanner({ type: 'destructive', title: 'Role Change Failed', message: data.error });
        setEditingRole(false);
      }
    } finally {
      setSavingRole(false);
    }
  };

  // Gap #2 — Suspend
  const handleSuspend = async () => {
    if (!drawerProfile || !suspendReason.trim()) return;
    setSavingSuspend(true);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: drawerProfile.id, action: 'SUSPEND', reason: suspendReason }),
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toISOString();
        setDrawerProfile((p) => p ? { ...p, suspended_at: now, suspension_reason: suspendReason, account_status: 'SUSPENDED' } : p);
        setBanner({ type: 'warning', title: 'Account Suspended', message: `${drawerProfile.full_name} has been suspended.` });
        setSuspendOpen(false);
        setSuspendReason('');
        fetchProfiles(pagination.page);
        // Refresh audit logs
        const refreshed = await fetch(`/api/admin/patients?id=${drawerProfile.id}`);
        const rd = await refreshed.json();
        if (refreshed.ok) setDrawerAuditLogs(rd.auditLogs || []);
      } else {
        setBanner({ type: 'destructive', title: 'Suspension Failed', message: data.error });
      }
    } finally {
      setSavingSuspend(false);
    }
  };

  // Gap #2 — Reactivate
  const handleReactivate = async () => {
    if (!drawerProfile) return;
    setSavingSuspend(true);
    setReactivateConfirmOpen(false);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: drawerProfile.id, action: 'REACTIVATE' }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrawerProfile((p) => p ? { ...p, suspended_at: null, suspension_reason: null, account_status: 'ACTIVE' } : p);
        setBanner({ type: 'success', title: 'Account Reactivated', message: `${drawerProfile.full_name}'s account is now active.` });
        fetchProfiles(pagination.page);
        const refreshed = await fetch(`/api/admin/patients?id=${drawerProfile.id}`);
        const rd = await refreshed.json();
        if (refreshed.ok) setDrawerAuditLogs(rd.auditLogs || []);
      } else {
        setBanner({ type: 'destructive', title: 'Reactivation Failed', message: data.error });
      }
    } finally {
      setSavingSuspend(false);
    }
  };

  // Gap #6 — Set doctor verified
  const handleSetDoctorVerified = async () => {
    if (!drawerProfile || !drawerDoctorMeta) return;
    setSavingVerify(true);
    setVerifyConfirmOpen(false);
    try {
      const res = await fetch('/api/admin/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: drawerProfile.id,
          action: 'SET_DOCTOR_VERIFIED',
          doctorId: drawerDoctorMeta.id,
          isVerified: verifyTarget,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDrawerDoctorMeta((d) => d ? { ...d, is_verified: verifyTarget } : d);
        setBanner({
          type: verifyTarget ? 'success' : 'warning',
          title: verifyTarget ? 'Doctor Verified' : 'Verification Revoked',
          message: `${drawerProfile.full_name} is now ${verifyTarget ? 'verified' : 'unverified'}.`,
        });
        const refreshed = await fetch(`/api/admin/patients?id=${drawerProfile.id}`);
        const rd = await refreshed.json();
        if (refreshed.ok) setDrawerAuditLogs(rd.auditLogs || []);
      } else {
        setBanner({ type: 'destructive', title: 'Verification Update Failed', message: data.error });
      }
    } finally {
      setSavingVerify(false);
    }
  };

  // DSAR export
  const handleExport = async () => {
    if (!dsarUser) return;
    setDsarLoading(true);
    try {
      const res = await fetch('/api/admin/patients/dsar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EXPORT', id: dsarUser.id }),
      });
      const data = await res.json();
      if (res.ok && data.archive) {
        const blob = new Blob([JSON.stringify(data.archive, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DSAR-Portability-${(dsarUser.full_name || 'subject').replace(/\s+/g, '_')}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBanner({ type: 'success', title: 'DSAR Export Generated', message: `NPC-compliant archive downloaded for ${dsarUser.full_name}.` });
        setDsarAction(null);
      } else {
        setBanner({ type: 'destructive', title: 'Export Error', message: data.error || 'Export failed.' });
      }
    } finally {
      setDsarLoading(false);
    }
  };

  // DSAR erasure
  const handleErasure = async () => {
    if (!dsarUser) return;
    setDsarLoading(true);
    try {
      const res = await fetch('/api/admin/patients/dsar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ERASURE', id: dsarUser.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({
          type: 'destructive',
          title: 'RA 10173 Sec 16 Erasure Executed',
          message: `${dsarUser.full_name} anonymized. ${data.walkInAnonymizedCount} walk-in record(s) also cleared. Audit log written.`,
        });
        setDsarAction(null);
        setDsarUser(null);
        fetchProfiles(pagination.page);
      } else {
        setBanner({ type: 'destructive', title: 'Erasure Error', message: data.error || 'Erasure failed.' });
        setDsarAction(null);
      }
    } finally {
      setDsarLoading(false);
    }
  };

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  const priorityBadge = (cat: string) => {
    if (cat === 'SENIOR') return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold gap-1"><Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Senior (RA 9994)</Badge>;
    if (cat === 'PWD') return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold gap-1"><Accessibility className="h-2.5 w-2.5" /> PWD (RA 7277)</Badge>;
    if (cat === 'PREGNANT') return <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold gap-1"><Baby className="h-2.5 w-2.5" /> Maternal</Badge>;
    return <span className="text-[11px] text-slate-400">Regular</span>;
  };

  const roleBadge = (role: string) => {
    const cls = role === 'ADMIN' ? 'bg-purple-50 text-purple-800 border-purple-200' : role === 'DOCTOR' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : role === 'SECRETARY' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-slate-700';
    return <Badge variant="outline" className={`text-[10px] font-bold ${cls}`}>{role}</Badge>;
  };

  const statusBadge = (s: string) => {
    if (s === 'ACTIVE') return <Badge className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">ACTIVE</Badge>;
    if (s === 'SUSPENDED') return <Badge className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">SUSPENDED</Badge>;
    return <Badge className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">ANONYMIZED</Badge>;
  };

  // Drawer tabs — conditionally add Professional for doctor/secretary
  const drawerTabs: DrawerTab[] = drawerProfile && (drawerProfile.role === 'DOCTOR' || drawerProfile.role === 'SECRETARY')
    ? [...BASE_DRAWER_TABS, 'Professional']
    : [...BASE_DRAWER_TABS];

  const isAnonymized = drawerProfile?.account_status === 'ANONYMIZED';
  const isSuspended = drawerProfile?.account_status === 'SUSPENDED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-700" />
            Patient &amp; User Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live Supabase registry — RBAC management, priority classifications, and RA 10173 DSAR compliance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchProfiles(pagination.page)} disabled={refreshing} className="h-9 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50">
          <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Banner */}
      {banner && (
        <Alert variant={banner.type === 'destructive' ? 'destructive' : banner.type === 'warning' ? 'warning' : 'success'} className="shadow-xs">
          <div className="flex items-start justify-between w-full">
            <div>
              <AlertTitle className="font-bold">{banner.title}</AlertTitle>
              <AlertDescription className="text-xs">{banner.message}</AlertDescription>
            </div>
            <button type="button" onClick={() => setBanner(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 ml-4">Dismiss</button>
          </div>
        </Alert>
      )}

      {/* KPI Bar */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total Accounts', value: kpis.totalAll, color: 'text-slate-900' },
            { label: 'Patients', value: kpis.totalPatients, color: 'text-brand-700' },
            { label: 'Senior Citizens', value: kpis.seniorCount, color: 'text-amber-700' },
            { label: 'PWD', value: kpis.pwdCount, color: 'text-blue-700' },
            { label: 'Maternal Priority', value: kpis.pregnantCount, color: 'text-rose-700' },
            { label: 'Pending Onboarding', value: kpis.incompleteOnboarding, color: 'text-amber-600' },
            { label: 'Suspended', value: kpis.suspendedCount, color: 'text-orange-600' },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-white border-slate-200 shadow-xs">
              <CardContent className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{kpi.label}</p>
                <p className={`text-2xl font-black ${kpi.color} mt-1`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input type="text" placeholder="Search by name, email, or mobile number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 text-xs bg-white" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role:</span>
              <div className="flex gap-1 flex-wrap">
                {ROLES.map((r) => (
                  <button key={r} type="button" onClick={() => setRoleFilter(r)} className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${roleFilter === r ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority:</span>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-brand-700">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p === 'ALL' ? 'All Priorities' : p}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-800 focus:outline-none focus:border-brand-700">
                {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-700" />
            User Directory ({filteredProfiles.length} shown{pagination.total > filteredProfiles.length ? ` of ${pagination.total}` : ''})
          </h2>
          <span className="text-[11px] text-slate-400">Page {pagination.page} of {pagination.totalPages}</span>
        </div>

        <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-6 w-6 text-brand-700 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading from Supabase…</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No records match your filters</p>
              <p className="text-xs text-slate-400 mt-1">Adjust the role, priority, or status filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient / User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((p) => (
                  <TableRow key={p.id} className={p.account_status === 'ANONYMIZED' ? 'opacity-60 italic' : p.account_status === 'SUSPENDED' ? 'bg-amber-50/40' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full border flex items-center justify-center font-black text-xs shrink-0 ${p.account_status === 'SUSPENDED' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-brand-50 border-brand-200 text-brand-700'}`}>
                          {p.account_status === 'ANONYMIZED' ? '—' : avatarInitials(p.full_name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{p.full_name}</p>
                          <p className="text-[11px] text-slate-400">{p.email || '—'}</p>
                          <p className="text-[11px] font-mono text-slate-400">{p.phone_number || '—'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{roleBadge(p.role)}</TableCell>
                    <TableCell>{priorityBadge(p.priority_category)}</TableCell>
                    <TableCell>
                      {p.account_status !== 'ANONYMIZED' && (p.is_onboarding_completed
                        ? <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold"><CheckCircle2 className="h-3 w-3" />Complete</span>
                        : <span className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold"><AlertTriangle className="h-3 w-3" />Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-700">{p.lifetime_appointments}</span>
                      <span className="text-[10px] text-slate-400 ml-1">appts</span>
                    </TableCell>
                    <TableCell>{statusBadge(p.account_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDrawer(p)} className="h-7 px-2 text-[10px] border-slate-300 font-semibold hover:bg-slate-50 gap-1">
                          <Eye className="h-3 w-3 text-slate-500" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setDsarUser(p); setDsarAction('EXPORT'); }} className="h-7 px-2 text-[10px] border-slate-300 font-semibold hover:bg-slate-50 gap-1" disabled={p.account_status === 'ANONYMIZED'}>
                          <Download className="h-3 w-3 text-slate-500" /> Export
                        </Button>
                        {p.role === 'PATIENT' && p.account_status !== 'ANONYMIZED' && (
                          <Button size="sm" variant="ghost" onClick={() => { setDsarUser(p); setDsarAction('ERASURE'); }} className="h-7 px-2 text-[10px] text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="RA 10173 Sec 16 Erasure">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Numbered Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => fetchProfiles(pagination.page - 1)} disabled={pagination.page <= 1 || refreshing} className="h-7 px-2 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                const pg = i + 1;
                return (
                  <Button key={pg} size="sm" variant={pagination.page === pg ? 'brand' : 'outline'} onClick={() => fetchProfiles(pg)} disabled={refreshing} className="h-7 w-7 p-0 text-xs font-bold">{pg}</Button>
                );
              })}
              {pagination.totalPages > 7 && <span className="text-xs text-slate-400 px-1">…</span>}
              <Button size="sm" variant="outline" onClick={() => fetchProfiles(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || refreshing} className="h-7 px-2 text-xs">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Patient Detail Drawer ─────────────────────────────────────────────── */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-slate-200 p-0">
          {/* Drawer Header */}
          <div className="p-5 pb-3 border-b border-slate-100 shrink-0">
            {drawerProfile ? (
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${isSuspended ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-brand-50 border-brand-200 text-brand-700'}`}>
                  {avatarInitials(drawerProfile.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">{drawerProfile.full_name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {roleBadge(drawerProfile.role)}
                    {priorityBadge(drawerProfile.priority_category)}
                    {statusBadge(drawerProfile.account_status)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-11 flex items-center"><RefreshCw className="h-4 w-4 text-brand-700 animate-spin" /></div>
            )}
          </div>
          <DialogHeader className="sr-only"><DialogTitle>Patient Profile</DialogTitle><DialogDescription>Detailed patient information</DialogDescription></DialogHeader>

          {/* Tab Bar */}
          <div className="flex gap-0.5 bg-slate-50 rounded-xl p-1 mx-4 mt-3 shrink-0 overflow-x-auto">
            {drawerTabs.map((tab) => (
              <button key={tab} type="button" onClick={() => setDrawerTab(tab)} className={`flex-shrink-0 flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ${drawerTab === tab ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto flex-1 px-5 py-3">
            {drawerLoading ? (
              <div className="flex items-center justify-center h-40"><RefreshCw className="h-5 w-5 text-brand-700 animate-spin" /></div>
            ) : drawerProfile ? (
              <>
                {/* ── Demographics ─────────────────────────────────────── */}
                {drawerTab === 'Demographics' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { icon: Calendar, label: 'Date of Birth', value: `${formatDate(drawerProfile.date_of_birth)} (${ageFromDob(drawerProfile.date_of_birth)})` },
                        { icon: Users, label: 'Gender', value: drawerProfile.gender || '—' },
                        { icon: Droplets, label: 'Blood Type', value: drawerProfile.blood_type || '—' },
                        { icon: Activity, label: 'Weight / Height', value: drawerProfile.weight_kg ? `${drawerProfile.weight_kg} kg / ${drawerProfile.height_cm} cm` : '—' },
                        { icon: Mail, label: 'Email', value: drawerProfile.email || '—' },
                        { icon: Phone, label: 'Mobile', value: drawerProfile.phone_number || '—' },
                        { icon: CreditCard, label: 'HMO', value: drawerProfile.hmo_provider || 'None' },
                        { icon: ShieldCheck, label: 'PhilHealth No.', value: drawerProfile.philhealth_number || '—' },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <Icon className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                            <p className="font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Priority Edit */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Statutory Priority</p>
                        {!editingPriority ? (
                          <button type="button" onClick={() => { setEditingPriority(true); setNewPriority(drawerProfile.priority_category); }} className="text-[10px] text-brand-700 font-bold hover:underline" disabled={isAnonymized}>Edit</button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => setEditingPriority(false)} className="text-[10px] text-slate-500 font-semibold hover:underline">Cancel</button>
                            <Button size="sm" variant="brand" onClick={handleSavePriority} disabled={savingPriority} className="h-6 px-2 text-[10px] font-bold">{savingPriority ? 'Saving…' : 'Save'}</Button>
                          </div>
                        )}
                      </div>
                      {editingPriority ? (
                        <div className="flex flex-wrap gap-1.5">
                          {PRIORITY_CATEGORIES.map((cat) => (
                            <button key={cat} type="button" onClick={() => setNewPriority(cat)} className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${newPriority === cat ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          {priorityBadge(drawerProfile.priority_category)}
                          {drawerProfile.priority_id_number && <span className="text-[11px] text-slate-500">ID: {drawerProfile.priority_id_number}</span>}
                        </div>
                      )}
                    </div>

                    {/* Gap #1 — Role Change */}
                    {!isAnonymized && (
                      <div className="p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <UserCog className="h-3 w-3" /> Account Role
                          </p>
                          {!editingRole ? (
                            <button type="button" onClick={() => { setEditingRole(true); setNewRole(drawerProfile.role); }} className="text-[10px] text-brand-700 font-bold hover:underline" disabled={isSuspended}>Edit</button>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => setEditingRole(false)} className="text-[10px] text-slate-500 font-semibold hover:underline">Cancel</button>
                              <Button size="sm" variant="brand" onClick={() => setRoleConfirmOpen(true)} disabled={savingRole || newRole === drawerProfile.role} className="h-6 px-2 text-[10px] font-bold">{savingRole ? 'Saving…' : 'Confirm'}</Button>
                            </div>
                          )}
                        </div>
                        {editingRole ? (
                          <div className="flex flex-wrap gap-1.5">
                            {ALL_ROLES.map((r) => (
                              <button key={r} type="button" onClick={() => setNewRole(r)} className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${newRole === r ? 'bg-brand-700 text-white border-brand-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{r}</button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            {roleBadge(drawerProfile.role)}
                          </div>
                        )}
                        {editingRole && newRole === 'DOCTOR' && (
                          <p className="text-[10px] text-amber-700 mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Requires an existing doctors record for this profile.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Gap #2 — Suspension */}
                    {!isAnonymized && (
                      <div className={`p-3 rounded-xl border ${isSuspended ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-2">
                          <PauseCircle className="h-3 w-3" /> Account Status
                        </p>
                        {isSuspended ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
                              <PauseCircle className="h-3.5 w-3.5" />
                              Suspended on {formatDate(drawerProfile.suspended_at)}
                            </div>
                            {drawerProfile.suspension_reason && (
                              <p className="text-[11px] text-slate-600 bg-white border border-amber-100 rounded-lg px-2.5 py-1.5">
                                <span className="font-semibold text-slate-500">Reason:</span> {drawerProfile.suspension_reason}
                              </p>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setReactivateConfirmOpen(true)} disabled={savingSuspend} className="h-7 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1">
                              <PlayCircle className="h-3.5 w-3.5" /> Reactivate Account
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active — no restrictions
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => setSuspendOpen(true)} className="h-7 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 gap-1">
                              <PauseCircle className="h-3.5 w-3.5" /> Suspend
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Registered: {formatDate(drawerProfile.created_at)}</p>
                  </div>
                )}

                {/* ── Health ───────────────────────────────────────────── */}
                {drawerTab === 'Health' && (
                  <div className="space-y-3 text-xs">
                    {[
                      { icon: AlertTriangle, label: 'Known Allergies', items: drawerProfile.allergies || [], color: 'rose' },
                      { icon: Heart, label: 'Comorbidities / Chronic Conditions', items: drawerProfile.comorbidities || [], color: 'amber' },
                      { icon: Pill, label: 'Maintenance Medications', items: drawerProfile.maintenance_meds || [], color: 'blue' },
                    ].map(({ icon: Icon, label, items, color }) => (
                      <div key={label} className={`p-3 rounded-xl border border-${color}-100 bg-${color}-50/40`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Icon className={`h-3.5 w-3.5 text-${color}-600`} />
                          <p className="font-bold text-slate-800">{label}</p>
                        </div>
                        {items.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((item) => <span key={item} className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-${color}-100 text-${color}-800`}>{item}</span>)}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">None on record</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Emergency ────────────────────────────────────────── */}
                {drawerTab === 'Emergency' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-rose-600" /> Emergency Contact</p>
                      {[
                        { label: 'Full Name', value: drawerProfile.emergency_contact_name || '—' },
                        { label: 'Mobile Number', value: drawerProfile.emergency_contact_phone || '—' },
                        { label: 'Relationship', value: drawerProfile.emergency_contact_relationship || '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                          <p className="font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>
                    {!drawerProfile.emergency_contact_name && (
                      <Alert variant="warning" className="py-2">
                        <AlertTitle className="text-xs font-bold">No Emergency Contact on File</AlertTitle>
                        <AlertDescription className="text-[11px]">This patient has not completed emergency contact information.</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* ── Appointments ─────────────────────────────────────── */}
                {drawerTab === 'Appointments' && (
                  <div className="space-y-2 text-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last {drawerAppointments.length} Appointments</p>
                    {drawerAppointments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No appointment history found.</p>
                    ) : drawerAppointments.map((appt) => (
                      <div key={appt.id} className="flex items-start justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-slate-900 text-[11px]">{appt.token_code} · #{appt.queue_number}</p>
                          <p className="text-[10px] text-brand-700 font-semibold truncate">
                            {appt.queue_sessions?.doctors ? `${appt.queue_sessions.doctors.title} ${appt.queue_sessions.doctors.profiles?.full_name} — ${appt.queue_sessions.doctors.specialty}` : 'Walk-in'}
                          </p>
                          <p className="text-[10px] text-slate-500">{appt.queue_sessions?.clinics?.hospital_name} · {appt.queue_sessions?.clinics?.room_number}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(appt.queue_sessions?.session_date)} · {appt.booking_channel}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge className={`text-[10px] font-bold ${appt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : appt.status === 'CANCELLED_NO_SHOW' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>{appt.status}</Badge>
                          {appt.consultation_fee > 0 && <p className="text-[10px] text-slate-500 mt-1">₱{appt.consultation_fee.toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Privacy ──────────────────────────────────────────── */}
                {drawerTab === 'Privacy' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-2"><Lock className="h-3.5 w-3.5 text-emerald-700" /> RA 10173 Consent Record</p>
                      <p className="text-[11px] text-slate-700">
                        <strong>Confidentiality agreed:</strong>{' '}
                        {drawerProfile.confidentiality_agreed_at ? formatDate(drawerProfile.confidentiality_agreed_at) : <span className="text-rose-600 font-bold">⚠️ Not yet consented</span>}
                      </p>
                    </div>

                    {/* DSAR Actions */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <p className="font-bold text-slate-900">DSAR Actions</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">All actions are written to the Supabase <code className="bg-slate-200 px-1 rounded text-[10px]">audit_logs</code> table.</p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => { setDsarUser(drawerProfile as any); setDsarAction('EXPORT'); }} disabled={isAnonymized} className="text-[11px] font-bold gap-1">
                          <Download className="h-3 w-3" /> Sec 18 Export
                        </Button>
                        {drawerProfile.role === 'PATIENT' && !isAnonymized && (
                          <Button size="sm" variant="ghost" onClick={() => { setDsarUser(drawerProfile as any); setDsarAction('ERASURE'); }} className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 gap-1">
                            <Trash2 className="h-3 w-3" /> Sec 16 Erasure
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Gap #5 — Audit Log History */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-500" /> Admin Action History
                      </p>
                      {drawerAuditLogs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2 text-center">No admin actions recorded for this account.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {drawerAuditLogs.map((log) => (
                            <div key={log.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${log.action === 'DELETE' ? 'bg-rose-100' : log.action === 'INSERT' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                                <History className={`h-2.5 w-2.5 ${log.action === 'DELETE' ? 'text-rose-600' : log.action === 'INSERT' ? 'text-emerald-600' : 'text-blue-600'}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-slate-800 leading-tight">{auditSummary(log)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(log.timestamp)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-1 pt-1">
                      <p>Profile ID: <code className="bg-slate-100 px-1 rounded text-[9px]">{drawerProfile.id}</code></p>
                      <p>Last Updated: {formatDate(drawerProfile.updated_at)}</p>
                    </div>
                  </div>
                )}

                {/* ── Professional (Gap #6) ─────────────────────────────── */}
                {drawerTab === 'Professional' && (
                  <div className="space-y-3 text-xs">
                    {drawerProfile.role === 'DOCTOR' && drawerDoctorMeta ? (
                      <>
                        {/* Verification Status */}
                        <div className={`p-3 rounded-xl border ${drawerDoctorMeta.is_verified ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {drawerDoctorMeta.is_verified
                                ? <BadgeCheck className="h-5 w-5 text-emerald-600" />
                                : <BadgeX className="h-5 w-5 text-rose-500" />
                              }
                              <div>
                                <p className="font-bold text-slate-900 text-[12px]">
                                  {drawerDoctorMeta.is_verified ? 'Verified Doctor' : 'Unverified — Hidden from patients'}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {drawerDoctorMeta.is_verified
                                    ? 'Visible in patient discovery and booking.'
                                    : 'Doctor is not shown in patient-facing search.'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={drawerDoctorMeta.is_verified ? 'ghost' : 'outline'}
                              onClick={() => { setVerifyTarget(!drawerDoctorMeta.is_verified); setVerifyConfirmOpen(true); }}
                              disabled={savingVerify}
                              className={`h-7 px-2.5 text-[10px] font-bold gap-1 ${drawerDoctorMeta.is_verified ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
                            >
                              {drawerDoctorMeta.is_verified
                                ? <><ShieldOff className="h-3 w-3" /> Revoke</>
                                : <><ShieldCheck className="h-3 w-3" /> Verify</>
                              }
                            </Button>
                          </div>
                        </div>

                        {/* Doctor Details */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            { icon: Briefcase, label: 'Specialty', value: drawerDoctorMeta.specialty },
                            { icon: Briefcase, label: 'Subspecialty', value: drawerDoctorMeta.subspecialty || '—' },
                            { icon: ShieldCheck, label: 'PRC License', value: drawerDoctorMeta.prc_license || '—' },
                            { icon: ShieldCheck, label: 'PTR Number', value: drawerDoctorMeta.ptr_number || '—' },
                            { icon: ShieldCheck, label: 'S2 License', value: drawerDoctorMeta.s2_license || '—' },
                            { icon: CreditCard, label: 'Consult Fee Default', value: drawerDoctorMeta.consultation_fee_default ? `₱${drawerDoctorMeta.consultation_fee_default.toLocaleString()}` : '—' },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <Icon className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                                <p className="font-semibold text-slate-800 mt-0.5 break-words">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Subscription */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subscription Tier</p>
                            <p className="font-bold text-slate-900 mt-0.5 capitalize">{drawerDoctorMeta.subscription_tier}</p>
                          </div>
                          <Badge className={`text-[10px] font-bold ${drawerDoctorMeta.pro_tier_active ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            {drawerDoctorMeta.pro_tier_active ? 'PRO ACTIVE' : 'FREE'}
                          </Badge>
                        </div>
                      </>
                    ) : drawerProfile.role === 'SECRETARY' && drawerSecretaryMeta ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-slate-500" /> Secretary Assignment
                          </p>
                          {drawerSecretaryMeta.doctors && (
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Assigned Doctor</p>
                              <p className="font-semibold text-slate-800 mt-0.5">
                                {drawerSecretaryMeta.doctors.title} {drawerSecretaryMeta.doctors.profiles?.full_name}
                              </p>
                              <p className="text-[11px] text-slate-500">{drawerSecretaryMeta.doctors.specialty}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status</p>
                              <Badge className={`text-[10px] font-bold mt-0.5 ${drawerSecretaryMeta.is_active ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                                {drawerSecretaryMeta.is_active ? 'ACTIVE' : 'TERMINATED'}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Hired</p>
                              <p className="font-semibold text-slate-800 mt-0.5">{formatDate(drawerSecretaryMeta.hired_at)}</p>
                            </div>
                            {drawerSecretaryMeta.terminated_at && (
                              <div>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Terminated</p>
                                <p className="font-semibold text-rose-700 mt-0.5">{formatDate(drawerSecretaryMeta.terminated_at)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No professional record found for this user.</p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          <div className="p-4 pt-3 border-t border-slate-100 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="text-xs w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Gap #1: Role Change Confirm ──────────────────────────────────────── */}
      <ConfirmDialog
        open={roleConfirmOpen}
        onOpenChange={(open) => { if (!savingRole) setRoleConfirmOpen(open); }}
        title={`Change role to ${newRole}?`}
        description={
          newRole === 'ADMIN'
            ? `This will grant ${drawerProfile?.full_name} full superadmin access to the Clinic Natin administration platform. This action is reversible.`
            : newRole === 'DOCTOR'
            ? `This will promote ${drawerProfile?.full_name} to DOCTOR. A doctors record must already exist for this profile, otherwise the change will be rejected.`
            : `This will change ${drawerProfile?.full_name}'s role from ${drawerProfile?.role} to ${newRole}. All platform access will be updated immediately.`
        }
        confirmLabel={savingRole ? 'Saving…' : `Confirm — Set Role to ${newRole}`}
        cancelLabel="Cancel"
        variant={newRole === 'ADMIN' ? 'destructive' : 'default'}
        isLoading={savingRole}
        onConfirm={handleSaveRole}
      />

      {/* ── Gap #2: Suspend Dialog ───────────────────────────────────────────── */}
      <Dialog open={suspendOpen} onOpenChange={(open) => { if (!savingSuspend) setSuspendOpen(open); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-600" /> Suspend Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              The account will be flagged as suspended. Access is blocked at the application level. This is reversible.
            </DialogDescription>
          </DialogHeader>
          {drawerProfile && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-900">{drawerProfile.full_name}</p>
                <p className="text-slate-500">{drawerProfile.email} · {roleBadge(drawerProfile.role)}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Reason for Suspension <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Reported fraudulent activity, pending investigation..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 resize-none focus:outline-none focus:border-brand-700"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setSuspendOpen(false); setSuspendReason(''); }} disabled={savingSuspend} className="text-xs">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleSuspend} disabled={savingSuspend || !suspendReason.trim()} className="text-xs font-bold gap-1.5">
              <PauseCircle className="h-3.5 w-3.5" />
              {savingSuspend ? 'Suspending…' : 'Confirm Suspension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Gap #2: Reactivate Confirm ───────────────────────────────────────── */}
      <ConfirmDialog
        open={reactivateConfirmOpen}
        onOpenChange={(open) => { if (!savingSuspend) setReactivateConfirmOpen(open); }}
        title="Reactivate this account?"
        description={`${drawerProfile?.full_name}'s account will be restored to ACTIVE status. All platform access will resume immediately.`}
        confirmLabel={savingSuspend ? 'Reactivating…' : 'Confirm Reactivation'}
        cancelLabel="Cancel"
        variant="default"
        isLoading={savingSuspend}
        onConfirm={handleReactivate}
      />

      {/* ── Gap #6: Verify/Revoke Confirm ────────────────────────────────────── */}
      <ConfirmDialog
        open={verifyConfirmOpen}
        onOpenChange={(open) => { if (!savingVerify) setVerifyConfirmOpen(open); }}
        title={verifyTarget ? 'Verify this doctor?' : 'Revoke doctor verification?'}
        description={
          verifyTarget
            ? `${drawerProfile?.full_name} will be marked as a verified doctor and will appear in patient discovery and booking flows.`
            : `${drawerProfile?.full_name} will be marked as unverified and will be hidden from patient-facing search until re-verified.`
        }
        confirmLabel={savingVerify ? 'Saving…' : verifyTarget ? 'Confirm Verification' : 'Revoke Verification'}
        cancelLabel="Cancel"
        variant={verifyTarget ? 'default' : 'destructive'}
        isLoading={savingVerify}
        onConfirm={handleSetDoctorVerified}
      />

      {/* ── DSAR Export Modal ─────────────────────────────────────────────────── */}
      <Dialog open={dsarAction === 'EXPORT'} onOpenChange={() => { if (!dsarLoading) setDsarAction(null); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-700" />RA 10173 Sec 18: Right to Data Portability</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">Generates a standardized, NPC-compliant structured archive of all profile and appointment history.</DialogDescription>
          </DialogHeader>
          {dsarUser && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-900">{dsarUser.full_name}</p>
                <p className="text-slate-600">{dsarUser.email} · {dsarUser.phone_number}</p>
                <p className="text-slate-400 mt-1">{dsarUser.lifetime_appointments} appointment record(s) included</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 text-[11px] leading-relaxed">
                Archive includes: profile demographics, health profile, full appointment history, platform transactions, and SMS notification log. Formatted per NPC Circular 16-01.
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDsarAction(null)} disabled={dsarLoading} className="text-xs">Cancel</Button>
            <Button variant="brand" size="sm" onClick={handleExport} disabled={dsarLoading} className="text-xs font-bold gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {dsarLoading ? 'Generating…' : 'Download Archive (.json)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DSAR Erasure Confirm ─────────────────────────────────────────────── */}
      <ConfirmDialog
        open={dsarAction === 'ERASURE'}
        onOpenChange={(open) => { if (!dsarLoading && !open) setDsarAction(null); }}
        title="Execute RA 10173 Section 16 Account Erasure?"
        description={dsarUser
          ? `Permanently anonymize ${dsarUser.full_name}? Personal identifiers (name, email, phone, HMO, PhilHealth, emergency contact) will be irrevocably replaced with pseudonyms. Walk-in appointment records matching their mobile number will also be anonymized. Clinical encounter data is preserved per DOH 10-year retention rule. This erasure will be recorded in audit_logs with timestamp and legal basis.`
          : ''}
        confirmLabel={dsarLoading ? 'Executing Erasure…' : 'Confirm Permanent Anonymization'}
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={dsarLoading}
        onConfirm={handleErasure}
      />
    </div>
  );
}
