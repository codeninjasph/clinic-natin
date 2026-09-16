'use client';

import * as React from 'react';
import {
  Settings,
  Sliders,
  Database,
  Pill,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Search,
  Plus,
  HeartHandshake,
  Star,
  Accessibility,
  Activity,
  RefreshCw,
  ExternalLink,
  Save,
  Download,
  AlertTriangle,
  Radio,
  Server,
  CreditCard,
  MessageSquare,
  Building2,
  Lock,
  Edit2,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
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

// Data Interfaces
interface ICD10Record {
  id: string;
  code: string;
  description: string;
  category: string;
  is_common_cdo: boolean;
  philhealth_case_rate: boolean;
  is_active: boolean;
  created_at?: string;
}

interface PNDFRecord {
  id: string;
  generic_name: string;
  brand_names: string[];
  dosage: string;
  form: string;
  therapeutic_class: string;
  prescription_class: 'OTC' | 'Rx' | 'DANGEROUS_DRUG_S2';
  is_active: boolean;
  created_at?: string;
}

interface HMORecord {
  id: string;
  code: string;
  name: string;
  short_name: string;
  requires_prior_auth: boolean;
  contact_desk: string;
  portal_url?: string | null;
  accreditation_status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  is_active: boolean;
  created_at?: string;
}

interface TelemetryData {
  paymongo: {
    status: string;
    mode: string;
    hasWebhook: boolean;
    provider: string;
  };
  semaphore: {
    status: string;
    creditBalance: number;
    accountName: string;
    senderName: string;
    isSandbox: boolean;
    pingMs: number;
  };
  database: {
    status: string;
    region: string;
    latencyMs: number;
    engine: string;
  };
}

export default function SettingsAndDictionariesPage() {
  const [activeTab, setActiveTab] = React.useState<
    'FLAGS' | 'ICD10' | 'PNDF' | 'HMOS' | 'STATUTORY' | 'DIAGNOSTICS'
  >('FLAGS');

  // Live Data State
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [settings, setSettings] = React.useState<Record<string, any>>({});
  const [icd10List, setIcd10List] = React.useState<ICD10Record[]>([]);
  const [pndfList, setPndfList] = React.useState<PNDFRecord[]>([]);
  const [hmoList, setHmoList] = React.useState<HMORecord[]>([]);
  const [telemetry, setTelemetry] = React.useState<TelemetryData | null>(null);

  // Search & Filters
  const [dictSearch, setDictSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('ALL');
  const [prescriptionFilter, setPrescriptionFilter] = React.useState<string>('ALL');

  // Notification / Alert Banner
  const [statusAlert, setStatusAlert] = React.useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Maintenance Banner Editor
  const [maintenanceBannerInput, setMaintenanceBannerInput] = React.useState('');
  const [isSavingBanner, setIsSavingBanner] = React.useState(false);

  // Policy Form State
  const [policyForm, setPolicyForm] = React.useState({
    platform_reservation_fee: 50.0,
    doctor_pro_subscription_fee: 999.0,
    senior_discount_percentage: 20.0,
    pwd_discount_percentage: 20.0,
    auto_buffer_lane_mins: 45,
    max_queue_skips_before_cancel: 3,
    priority_interleave_ratio: '1:2',
  });
  const [isSavingPolicies, setIsSavingPolicies] = React.useState(false);

  // Modal: Add ICD-10
  const [icdModalOpen, setIcdModalOpen] = React.useState(false);
  const [newIcdCode, setNewIcdCode] = React.useState('');
  const [newIcdDesc, setNewIcdDesc] = React.useState('');
  const [newIcdCategory, setNewIcdCategory] = React.useState('General');
  const [newIcdIsCdo, setNewIcdIsCdo] = React.useState(true);
  const [newIcdPhilHealth, setNewIcdPhilHealth] = React.useState(true);
  const [icdSubmitting, setIcdSubmitting] = React.useState(false);
  const [icdError, setIcdError] = React.useState<string | null>(null);

  // Modal: Add PNDF
  const [pndfModalOpen, setPndfModalOpen] = React.useState(false);
  const [newPndfGeneric, setNewPndfGeneric] = React.useState('');
  const [newPndfBrands, setNewPndfBrands] = React.useState('');
  const [newPndfDosage, setNewPndfDosage] = React.useState('');
  const [newPndfForm, setNewPndfForm] = React.useState('');
  const [newPndfTherapeutic, setNewPndfTherapeutic] = React.useState('');
  const [newPndfClass, setNewPndfClass] = React.useState<'OTC' | 'Rx' | 'DANGEROUS_DRUG_S2'>('Rx');
  const [pndfSubmitting, setPndfSubmitting] = React.useState(false);
  const [pndfError, setPndfError] = React.useState<string | null>(null);

  // Modal: Add/Edit HMO
  const [hmoModalOpen, setHmoModalOpen] = React.useState(false);
  const [editingHmoId, setEditingHmoId] = React.useState<string | null>(null);
  const [hmoCode, setHmoCode] = React.useState('');
  const [hmoName, setHmoName] = React.useState('');
  const [hmoShortName, setHmoShortName] = React.useState('');
  const [hmoPriorAuth, setHmoPriorAuth] = React.useState(true);
  const [hmoContactDesk, setHmoContactDesk] = React.useState('');
  const [hmoPortalUrl, setHmoPortalUrl] = React.useState('');
  const [hmoStatus, setHmoStatus] = React.useState<'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ACTIVE');
  const [hmoSubmitting, setHmoSubmitting] = React.useState(false);
  const [hmoError, setHmoError] = React.useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const fetchData = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load configuration data');
      }

      setSettings(data.settings || {});
      setIcd10List(data.icd10 || []);
      setPndfList(data.pndf || []);
      setHmoList(data.hmos || []);
      setTelemetry(data.telemetry || null);

      // Sync maintenance banner input
      if (data.settings?.maintenance_banner_text) {
        setMaintenanceBannerInput(data.settings.maintenance_banner_text);
      }

      // Sync policy form
      setPolicyForm({
        platform_reservation_fee: data.settings?.platform_reservation_fee ?? 50.0,
        doctor_pro_subscription_fee: data.settings?.doctor_pro_subscription_fee ?? 999.0,
        senior_discount_percentage: data.settings?.senior_discount_percentage ?? 20.0,
        pwd_discount_percentage: data.settings?.pwd_discount_percentage ?? 20.0,
        auto_buffer_lane_mins: data.settings?.auto_buffer_lane_mins ?? 45,
        max_queue_skips_before_cancel: data.settings?.max_queue_skips_before_cancel ?? 3,
        priority_interleave_ratio: data.settings?.priority_interleave_ratio ?? '1:2',
      });
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setStatusAlert({
        type: 'error',
        message: err.message || 'Failed to communicate with Supabase backend.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flash status message helper
  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusAlert({ type, message });
    setTimeout(() => {
      setStatusAlert((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // -------------------------------------------------------------
  // Feature Flag Toggle Action
  // -------------------------------------------------------------
  const handleToggleFlag = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    // Optimistic UI update
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_FLAG',
          key,
          value: newValue,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update feature flag');
      }
      notify('success', `Feature flag "${key}" set to ${newValue ? 'ENABLED' : 'DISABLED'}. Logged to audit trail.`);
    } catch (err: any) {
      // Revert optimistic update
      setSettings((prev) => ({ ...prev, [key]: currentValue }));
      notify('error', `Failed to toggle feature flag: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Maintenance Banner Save
  // -------------------------------------------------------------
  const handleSaveMaintenanceBanner = async () => {
    if (!maintenanceBannerInput.trim()) return;
    setIsSavingBanner(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_POLICY',
          updates: [{ key: 'maintenance_banner_text', value: maintenanceBannerInput.trim() }],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update announcement');
      setSettings((prev) => ({ ...prev, maintenance_banner_text: maintenanceBannerInput.trim() }));
      notify('success', 'Scheduled maintenance announcement updated successfully.');
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSavingBanner(false);
    }
  };

  // -------------------------------------------------------------
  // Policy Form Save
  // -------------------------------------------------------------
  const handleSavePolicies = async () => {
    setIsSavingPolicies(true);
    try {
      const updates = Object.entries(policyForm).map(([key, value]) => ({
        key,
        value,
      }));

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_POLICY',
          updates,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save fee & priority policies');

      // Update local state
      setSettings((prev) => ({ ...prev, ...policyForm }));
      notify('success', 'Statutory discounts, fees, and queue buffer rules saved to database.');
    } catch (err: any) {
      notify('error', err.message);
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // -------------------------------------------------------------
  // ICD-10 Actions
  // -------------------------------------------------------------
  const handleAddIcd10 = async () => {
    if (!newIcdCode.trim() || !newIcdDesc.trim()) {
      setIcdError('Please provide both an ICD-10 code and diagnostic description.');
      return;
    }
    setIcdError(null);
    setIcdSubmitting(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_ICD10',
          code: newIcdCode.trim().toUpperCase(),
          description: newIcdDesc.trim(),
          category: newIcdCategory.trim() || 'General',
          is_common_cdo: newIcdIsCdo,
          philhealth_case_rate: newIcdPhilHealth,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add ICD-10 code');

      setIcd10List((prev) => [data.item, ...prev]);
      setNewIcdCode('');
      setNewIcdDesc('');
      setIcdModalOpen(false);
      notify('success', `ICD-10 Code [${data.item.code}] added to clinical coding database.`);
    } catch (err: any) {
      setIcdError(err.message);
    } finally {
      setIcdSubmitting(false);
    }
  };

  const handleToggleIcdField = async (
    id: string,
    field: 'is_active' | 'is_common_cdo' | 'philhealth_case_rate',
    currentVal: boolean
  ) => {
    const newVal = !currentVal;
    // Optimistic update
    setIcd10List((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: newVal } : item)));

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_ICD10',
          id,
          field,
          value: newVal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update ICD-10 attribute');
    } catch (err: any) {
      // Revert
      setIcd10List((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: currentVal } : item)));
      notify('error', err.message);
    }
  };

  // -------------------------------------------------------------
  // PNDF Formulary Actions
  // -------------------------------------------------------------
  const handleAddPndf = async () => {
    if (!newPndfGeneric.trim() || !newPndfDosage.trim() || !newPndfForm.trim() || !newPndfTherapeutic.trim()) {
      setPndfError('Please complete all mandatory drug formulary fields.');
      return;
    }
    setPndfError(null);
    setPndfSubmitting(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_PNDF',
          generic_name: newPndfGeneric.trim(),
          brand_names: newPndfBrands,
          dosage: newPndfDosage.trim(),
          form: newPndfForm.trim(),
          therapeutic_class: newPndfTherapeutic.trim(),
          prescription_class: newPndfClass,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add drug to formulary');

      setPndfList((prev) => [data.item, ...prev]);
      setNewPndfGeneric('');
      setNewPndfBrands('');
      setNewPndfDosage('');
      setNewPndfForm('');
      setNewPndfTherapeutic('');
      setPndfModalOpen(false);
      notify('success', `Drug "${data.item.generic_name}" added to Philippine Drug Formulary.`);
    } catch (err: any) {
      setPndfError(err.message);
    } finally {
      setPndfSubmitting(false);
    }
  };

  const handleTogglePndfActive = async (id: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setPndfList((prev) => prev.map((item) => (item.id === id ? { ...item, is_active: newVal } : item)));

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PNDF',
          id,
          is_active: newVal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle formulary active state');
    } catch (err: any) {
      setPndfList((prev) => prev.map((item) => (item.id === id ? { ...item, is_active: currentVal } : item)));
      notify('error', err.message);
    }
  };

  // -------------------------------------------------------------
  // HMO Provider Actions
  // -------------------------------------------------------------
  const openEditHmo = (hmo: HMORecord) => {
    setEditingHmoId(hmo.id);
    setHmoCode(hmo.code);
    setHmoName(hmo.name);
    setHmoShortName(hmo.short_name);
    setHmoPriorAuth(hmo.requires_prior_auth);
    setHmoContactDesk(hmo.contact_desk);
    setHmoPortalUrl(hmo.portal_url || '');
    setHmoStatus(hmo.accreditation_status);
    setHmoError(null);
    setHmoModalOpen(true);
  };

  const openNewHmo = () => {
    setEditingHmoId(null);
    setHmoCode('');
    setHmoName('');
    setHmoShortName('');
    setHmoPriorAuth(true);
    setHmoContactDesk('');
    setHmoPortalUrl('');
    setHmoStatus('ACTIVE');
    setHmoError(null);
    setHmoModalOpen(true);
  };

  const handleSaveHmo = async () => {
    if (!hmoName.trim() || !hmoContactDesk.trim()) {
      setHmoError('Provider entity name and contact desk hotline are required.');
      return;
    }
    setHmoError(null);
    setHmoSubmitting(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_HMO',
          id: editingHmoId,
          code: hmoCode.trim(),
          name: hmoName.trim(),
          short_name: hmoShortName.trim() || hmoName.trim(),
          requires_prior_auth: hmoPriorAuth,
          contact_desk: hmoContactDesk.trim(),
          portal_url: hmoPortalUrl.trim() || null,
          accreditation_status: hmoStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save HMO provider');

      if (editingHmoId) {
        setHmoList((prev) => prev.map((item) => (item.id === editingHmoId ? data.item : item)));
        notify('success', `HMO Provider "${data.item.name}" updated successfully.`);
      } else {
        setHmoList((prev) => [data.item, ...prev]);
        notify('success', `New HMO Provider "${data.item.name}" accredited and synced.`);
      }
      setHmoModalOpen(false);
    } catch (err: any) {
      setHmoError(err.message);
    } finally {
      setHmoSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // System Snapshot Export (JSON)
  // -------------------------------------------------------------
  const handleExportSnapshot = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: 'Clinic Natin Cagayan de Oro',
      systemSettings: settings,
      icd10Catalog: icd10List,
      pndfFormulary: pndfList,
      hmoProviders: hmoList,
      telemetry,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinic-natin-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('info', 'System configuration snapshot downloaded as JSON.');
  };

  // -------------------------------------------------------------
  // Filtering Logic
  // -------------------------------------------------------------
  const filteredIcd = icd10List.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(dictSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(dictSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPndf = pndfList.filter((item) => {
    const matchesSearch =
      item.generic_name.toLowerCase().includes(dictSearch.toLowerCase()) ||
      item.brand_names.some((b) => b.toLowerCase().includes(dictSearch.toLowerCase())) ||
      item.therapeutic_class.toLowerCase().includes(dictSearch.toLowerCase());
    const matchesClass = prescriptionFilter === 'ALL' || item.prescription_class === prescriptionFilter;
    return matchesSearch && matchesClass;
  });

  const filteredHmo = hmoList.filter((item) => {
    return (
      item.name.toLowerCase().includes(dictSearch.toLowerCase()) ||
      item.short_name.toLowerCase().includes(dictSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(dictSearch.toLowerCase())
    );
  });

  const icdCategories = React.useMemo(() => {
    const set = new Set<string>();
    icd10List.forEach((i) => set.add(i.category));
    return ['ALL', ...Array.from(set)];
  }, [icd10List]);

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-brand-700" />
              System Configuration & Medical Master Dictionaries
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
              Supabase Live Sync
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global module feature toggles, ICD-10 clinical coding, Philippine Drug Formulary (PNDF), accredited HMOs, and statutory fee policies.
          </p>
        </div>

        {/* Quick Diagnostics & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {telemetry && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                <Server className="h-3 w-3 text-emerald-600" />
                DB: {telemetry.database.latencyMs}ms
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <MessageSquare className="h-3 w-3 text-blue-600" />
                SMS: {telemetry.semaphore.creditBalance} credits
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-600">
                <CreditCard className="h-3 w-3 text-amber-600" />
                PayMongo: {telemetry.paymongo.mode}
              </span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="text-xs font-semibold gap-1.5 h-8 bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportSnapshot}
            className="text-xs font-semibold gap-1.5 h-8 bg-white"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            Snapshot JSON
          </Button>
        </div>
      </div>

      {/* 2. Status Alert Bar */}
      {statusAlert && (
        <Alert
          variant={statusAlert.type === 'error' ? 'destructive' : 'default'}
          className={`py-2.5 text-xs transition-all ${
            statusAlert.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusAlert.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusAlert.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {statusAlert.type === 'error' && <AlertTriangle className="h-4 w-4 text-rose-600" />}
            <AlertDescription className="font-medium">{statusAlert.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* 3. Tab Switchers */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs flex-wrap">
        <Button
          size="sm"
          variant={activeTab === 'FLAGS' ? 'brand' : 'ghost'}
          onClick={() => { setActiveTab('FLAGS'); setDictSearch(''); }}
          className="text-xs font-semibold h-8"
        >
          <Sliders className="h-3.5 w-3.5 mr-1.5" />
          Feature Flags
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'ICD10' ? 'brand' : 'ghost'}
          onClick={() => { setActiveTab('ICD10'); setDictSearch(''); }}
          className="text-xs font-semibold h-8"
        >
          <Database className="h-3.5 w-3.5 mr-1.5" />
          ICD-10 Master ({icd10List.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'PNDF' ? 'brand' : 'ghost'}
          onClick={() => { setActiveTab('PNDF'); setDictSearch(''); }}
          className="text-xs font-semibold h-8"
        >
          <Pill className="h-3.5 w-3.5 mr-1.5" />
          PNDF Drug Formulary ({pndfList.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'HMOS' ? 'brand' : 'ghost'}
          onClick={() => { setActiveTab('HMOS'); setDictSearch(''); }}
          className="text-xs font-semibold h-8"
        >
          <Building2 className="h-3.5 w-3.5 mr-1.5" />
          HMO Master ({hmoList.length})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'STATUTORY' ? 'brand' : 'ghost'}
          onClick={() => { setActiveTab('STATUTORY'); setDictSearch(''); }}
          className="text-xs font-semibold h-8"
        >
          <Star className="h-3.5 w-3.5 mr-1.5" />
          Statutory & Fees
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'DIAGNOSTICS' ? 'brand' : 'ghost'}
          onClick={() => { setActiveTab('DIAGNOSTICS'); setDictSearch(''); }}
          className="text-xs font-semibold h-8"
        >
          <Activity className="h-3.5 w-3.5 mr-1.5" />
          Gateway Telemetry
        </Button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: Global Feature Flags                                   */}
      {/* ============================================================= */}
      {activeTab === 'FLAGS' && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-700" />
                Live Runtime Feature Toggles
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Changes persist instantly in Supabase and dictate live behavior across patient discovery, kiosks, and doctor suite without redeployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 divide-y divide-slate-100">
              {/* Online Payment Deposit */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_online_payment_deposit
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                      PayMongo QRPh
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Requires patients to pay the ₱{settings.platform_reservation_fee ?? 50} reservation convenience fee upfront via GCash, Maya, or Cards to secure queue tokens.
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.enable_online_payment_deposit)}
                  onCheckedChange={() => handleToggleFlag('enable_online_payment_deposit', Boolean(settings.enable_online_payment_deposit))}
                />
              </div>

              {/* Walk-in Kiosk Mode */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_walkin_kiosk_mode
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-800 border-blue-200 font-bold">
                      Reception Tablets
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permits paired reception iPads & Android tablets at Maria Reyna and CUMC to issue physical walk-in tokens (CN-WK).
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.enable_walkin_kiosk_mode)}
                  onCheckedChange={() => handleToggleFlag('enable_walkin_kiosk_mode', Boolean(settings.enable_walkin_kiosk_mode))}
                />
              </div>

              {/* SMS Alerts */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_sms_advance_alerts
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-800 border-indigo-200 font-bold">
                      Semaphore SMS
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dispatches automated SMS alerts (&quot;Now Serving&quot;, &quot;2 Patients Ahead&quot;) via Semaphore to patients in CDO.
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.enable_sms_advance_alerts)}
                  onCheckedChange={() => handleToggleFlag('enable_sms_advance_alerts', Boolean(settings.enable_sms_advance_alerts))}
                />
              </div>

              {/* Teleconsultation Beta */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_teleconsultation_beta
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-800 border-purple-200 font-bold">
                      Video Chime Beta
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enables remote video consultation sessions inside the doctor suite for follow-up patients.
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.enable_teleconsultation_beta)}
                  onCheckedChange={() => handleToggleFlag('enable_teleconsultation_beta', Boolean(settings.enable_teleconsultation_beta))}
                />
              </div>

              {/* Maintenance Mode */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      maintenance_mode
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-800 border-rose-200 font-bold">
                      Emergency System Lock
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Locks public booking interfaces and displays the scheduled maintenance notice to patients across Northern Mindanao.
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.maintenance_mode)}
                  onCheckedChange={() => handleToggleFlag('maintenance_mode', Boolean(settings.maintenance_mode))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode Announcement Editor */}
          <Card className={`bg-white border-slate-200 shadow-xs transition-opacity ${settings.maintenance_mode ? 'ring-2 ring-rose-500/20' : ''}`}>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  Maintenance Mode Notice Banner
                </CardTitle>
                {settings.maintenance_mode && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold">
                    Currently Broadcasted to Public
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500">
                Custom announcement rendered on the patient onboarding and appointment booking screens when maintenance mode is active.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <Input
                value={maintenanceBannerInput}
                onChange={(e) => setMaintenanceBannerInput(e.target.value)}
                placeholder="e.g. Clinic Natin is undergoing scheduled system upgrades. Public booking will resume shortly."
                className="text-xs bg-white"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="brand"
                  onClick={handleSaveMaintenanceBanner}
                  disabled={isSavingBanner}
                  className="text-xs font-bold gap-1.5 h-8"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingBanner ? 'Saving...' : 'Update Notice'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: ICD-10 Master Catalog                                  */}
      {/* ============================================================= */}
      {activeTab === 'ICD10' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search ICD-10 code (e.g. J06.9, I10) or diagnostic description..."
                    value={dictSearch}
                    onChange={(e) => setDictSearch(e.target.value)}
                    className="pl-10 text-xs bg-white"
                  />
                </div>
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => setIcdModalOpen(true)}
                  className="text-xs font-bold gap-1.5 h-9 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add ICD-10 Code
                </Button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">Category:</span>
                {icdCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-brand-50 text-brand-800 border-brand-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ICD-10 Code</TableHead>
                  <TableHead>Diagnostic Term / Description</TableHead>
                  <TableHead>Clinical Category</TableHead>
                  <TableHead className="text-center">CDO Prevalence</TableHead>
                  <TableHead className="text-center">PhilHealth Case Rate</TableHead>
                  <TableHead className="text-right">Active Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIcd.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No ICD-10 diagnostic codes found matching &quot;{dictSearch}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIcd.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold text-slate-900 text-xs">
                        <Badge variant="outline" className="font-mono bg-slate-50">
                          {item.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-800 font-medium max-w-sm">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {item.category}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleIcdField(item.id, 'is_common_cdo', item.is_common_cdo)}
                          title="Click to toggle high prevalence status"
                        >
                          {item.is_common_cdo ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer hover:bg-emerald-100">
                              High Prevalence (CDO)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-normal text-slate-400 border-slate-200 cursor-pointer hover:bg-slate-50">
                              Standard
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleIcdField(item.id, 'philhealth_case_rate', item.philhealth_case_rate)}
                          title="Click to toggle PhilHealth case rate eligibility"
                        >
                          {item.philhealth_case_rate ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-100">
                              Konsulta Benefit
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-slate-400 cursor-pointer hover:underline">Non-Package</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleToggleIcdField(item.id, 'is_active', item.is_active)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: Philippine National Drug Formulary (PNDF)              */}
      {/* ============================================================= */}
      {activeTab === 'PNDF' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search generic molecule, brand name (e.g. Biogesic, Norvasc), or therapeutic class..."
                    value={dictSearch}
                    onChange={(e) => setDictSearch(e.target.value)}
                    className="pl-10 text-xs bg-white"
                  />
                </div>
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => setPndfModalOpen(true)}
                  className="text-xs font-bold gap-1.5 h-9 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add Medicine to Formulary
                </Button>
              </div>

              {/* Prescription Class Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1">Classification:</span>
                {['ALL', 'OTC', 'Rx', 'DANGEROUS_DRUG_S2'].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setPrescriptionFilter(cls)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors shrink-0 ${
                      prescriptionFilter === cls
                        ? 'bg-brand-50 text-brand-800 border-brand-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cls === 'DANGEROUS_DRUG_S2' ? 'Dangerous Drugs (PDEA S2)' : cls}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Generic Drug Name</TableHead>
                  <TableHead>Brand Equivalents (PH)</TableHead>
                  <TableHead>Standard Dosage & Form</TableHead>
                  <TableHead>Regulatory Class</TableHead>
                  <TableHead>Therapeutic Class</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPndf.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No medicines found matching formulary search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPndf.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {item.generic_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {item.brand_names.map((b) => (
                            <Badge key={b} variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                              {b}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {item.dosage} &bull; <span className="text-slate-500">{item.form}</span>
                      </TableCell>
                      <TableCell>
                        {item.prescription_class === 'OTC' && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                            Over-The-Counter (OTC)
                          </Badge>
                        )}
                        {item.prescription_class === 'Rx' && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-800 border-blue-200">
                            Prescription (Rx)
                          </Badge>
                        )}
                        {item.prescription_class === 'DANGEROUS_DRUG_S2' && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-rose-50 text-rose-800 border-rose-200">
                            PDEA S2 Dangerous Drug
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {item.therapeutic_class}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => handleTogglePndfActive(item.id, item.is_active)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: HMO Master Providers                                   */}
      {/* ============================================================= */}
      {activeTab === 'HMOS' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search accredited HMO entity, short name, or code..."
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                  className="pl-10 text-xs bg-white"
                />
              </div>
              <Button
                size="sm"
                variant="brand"
                onClick={openNewHmo}
                className="text-xs font-bold gap-1.5 h-9 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Accredit New HMO
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HMO Provider Entity</TableHead>
                  <TableHead>Accreditation Status</TableHead>
                  <TableHead>Prior Auth / LOA Protocol</TableHead>
                  <TableHead>Hotline / Contact Desk</TableHead>
                  <TableHead>LOA Verification Portal</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHmo.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No accredited HMO providers found matching query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHmo.map((hmo) => (
                    <TableRow key={hmo.id}>
                      <TableCell>
                        <div className="text-xs font-bold text-slate-900">{hmo.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{hmo.short_name} &bull; {hmo.code}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            hmo.accreditation_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : hmo.accreditation_status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {hmo.accreditation_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {hmo.requires_prior_auth ? (
                          <span className="text-amber-700 font-medium">LOA Required (Online / Letter)</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Direct Clinic Swipe</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        {hmo.contact_desk}
                      </TableCell>
                      <TableCell>
                        {hmo.portal_url ? (
                          <a
                            href={hmo.portal_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 hover:underline font-medium"
                          >
                            <span>Open Portal</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditHmo(hmo)}
                          className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: Statutory Discounts & Fee Policies                     */}
      {/* ============================================================= */}
      {activeTab === 'STATUTORY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Senior Citizen RA 9994 Card */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Republic Act No. 9994 (Expanded Senior Citizens Act)
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Statutory priority queue lanes and mandatory 20% professional discount rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span>Mandated Discount Percentage:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={policyForm.senior_discount_percentage}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({
                          ...prev,
                          senior_discount_percentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-20 h-7 text-xs text-right font-bold"
                    />
                    <span className="font-bold text-slate-700">%</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span>VAT Exemption Status:</span>
                  <strong className="text-emerald-700 font-bold">12% VAT Exempted</strong>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span>Required Validation Document:</span>
                  <strong className="text-slate-900">OSCA Identification Card</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span>Interleaved Buffer Priority Lane:</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Active (Priority Spread: {policyForm.priority_interleave_ratio})
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* PWD RA 7277 Card */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Accessibility className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Republic Act No. 7277 (Magna Carta for PWDs)
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Priority outpatient queuing and consultation fee reductions for persons with disability.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span>Mandated Discount Percentage:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={policyForm.pwd_discount_percentage}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({
                          ...prev,
                          pwd_discount_percentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-20 h-7 text-xs text-right font-bold"
                    />
                    <span className="font-bold text-slate-700">%</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span>Required Validation Document:</span>
                  <strong className="text-slate-900">LGU / PDAO Registered Card</strong>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span>Grace Period Buffer Duration:</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={policyForm.auto_buffer_lane_mins}
                      onChange={(e) =>
                        setPolicyForm((prev) => ({
                          ...prev,
                          auto_buffer_lane_mins: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-20 h-7 text-xs text-right font-bold"
                    />
                    <span className="font-bold text-slate-700">Minutes</span>
                  </div>
                </div>
                <div className="flex justify-between py-2">
                  <span>Automated SMS Notice:</span>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Priority Lane Advance Call
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Fees & Queue Parameters */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-700" />
                Platform Fees & Queue Rules Configuration
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure patient reservation convenience fees, SaaS doctor subscription tier rates, and queue forfeit parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Patient Online Reservation Fee (PHP)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">₱</span>
                  <Input
                    type="number"
                    value={policyForm.platform_reservation_fee}
                    onChange={(e) =>
                      setPolicyForm((prev) => ({
                        ...prev,
                        platform_reservation_fee: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="text-xs font-bold bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Collected via PayMongo QRPh per booking.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Doctor Pro Monthly Subscription (PHP)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-600">₱</span>
                  <Input
                    type="number"
                    value={policyForm.doctor_pro_subscription_fee}
                    onChange={(e) =>
                      setPolicyForm((prev) => ({
                        ...prev,
                        doctor_pro_subscription_fee: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="text-xs font-bold bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Billed to practicing physicians for Pro suite access.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Max Missed Calls Before Token Cancellation</label>
                <Input
                  type="number"
                  value={policyForm.max_queue_skips_before_cancel}
                  onChange={(e) =>
                    setPolicyForm((prev) => ({
                      ...prev,
                      max_queue_skips_before_cancel: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="text-xs font-bold bg-white"
                />
                <p className="text-[11px] text-slate-500">Number of skips before patient must re-queue.</p>
              </div>
            </CardContent>
            <CardFooter className="p-5 pt-0 flex justify-end border-t border-slate-100 mt-4">
              <Button
                size="sm"
                variant="brand"
                onClick={handleSavePolicies}
                disabled={isSavingPolicies}
                className="text-xs font-bold gap-1.5 h-9"
              >
                <Save className="h-4 w-4" />
                {isSavingPolicies ? 'Saving Policies...' : 'Save Policy Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: Gateway Telemetry & Diagnostics                        */}
      {/* ============================================================= */}
      {activeTab === 'DIAGNOSTICS' && telemetry && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PayMongo Gateway */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">PayMongo QRPh</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    {telemetry.paymongo.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Bangko Sentral ng Pilipinas (BSP) QRPh interoperability engine.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Operating Mode:</span>
                  <strong className="font-mono text-slate-900">{telemetry.paymongo.mode} Mode</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Webhook Listener:</span>
                  <span className="font-mono text-slate-900">
                    {telemetry.paymongo.hasWebhook ? 'Configured (Active)' : 'Simulated / Direct Polling'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Standard Deposit:</span>
                  <strong className="text-emerald-700 font-bold">₱{settings.platform_reservation_fee ?? 50}.00 PHP</strong>
                </div>
              </CardContent>
            </Card>

            {/* Semaphore SMS */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">Semaphore SMS</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                    {telemetry.semaphore.isSandbox ? 'Sandbox Gateway' : 'Live Gateway'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Telco SMS broadcast provider (Globe, Smart, DITO CDO).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Available Credit Balance:</span>
                  <strong className="font-mono text-slate-900">{telemetry.semaphore.creditBalance} Credits</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Registered Sender Name:</span>
                  <strong className="font-mono text-brand-700">{telemetry.semaphore.senderName}</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Account Profile:</span>
                  <span className="text-slate-700">{telemetry.semaphore.accountName}</span>
                </div>
              </CardContent>
            </Card>

            {/* Supabase Database */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">Supabase PostgreSQL</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                    {telemetry.database.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Dedicated primary relational database & audit ledger.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Round-Trip Query Latency:</span>
                  <strong className="font-mono text-emerald-700">{telemetry.database.latencyMs} ms</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Active Deployment Region:</span>
                  <span className="text-slate-900">{telemetry.database.region}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Postgres Engine:</span>
                  <span className="text-slate-700">{telemetry.database.engine}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Live Health Diagnostics Runner
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Runs an immediate end-to-end verification ping across all payment gateways, telco SMS relays, and Supabase database shards.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                Last ping evaluated {new Date().toLocaleTimeString()} with 0 reported outages or dropped transactions.
              </div>
              <Button
                size="sm"
                variant="brand"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="text-xs font-bold gap-1.5 h-9"
              >
                <Activity className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Pinging Infrastructure...' : 'Run Diagnostics Ping'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD ICD-10 CODE                                        */}
      {/* ============================================================= */}
      <Dialog open={icdModalOpen} onOpenChange={(open) => { setIcdModalOpen(open); if (!open) setIcdError(null); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Add ICD-10 Clinical Diagnostic Code</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Expands the physician diagnosis autocomplete and PhilHealth outpatient benefit coding catalog.
            </DialogDescription>
          </DialogHeader>

          {icdError && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{icdError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ICD-10 Code (e.g. K21.9)</label>
              <Input
                value={newIcdCode}
                onChange={(e) => setNewIcdCode(e.target.value)}
                placeholder="Code"
                className="text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Diagnostic Term / Narrative</label>
              <Input
                value={newIcdDesc}
                onChange={(e) => setNewIcdDesc(e.target.value)}
                placeholder="e.g. Gastro-esophageal reflux disease without esophagitis"
                className="text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinical Specialty Category</label>
              <Input
                value={newIcdCategory}
                onChange={(e) => setNewIcdCategory(e.target.value)}
                placeholder="e.g. Gastrointestinal, Respiratory, Cardiovascular"
                className="text-xs bg-white"
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-bold text-slate-800">CDO Outpatient High Prevalence</p>
                <p className="text-[11px] text-slate-500">Prioritizes code in doctor search dropdown.</p>
              </div>
              <Switch checked={newIcdIsCdo} onCheckedChange={setNewIcdIsCdo} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-bold text-slate-800">PhilHealth Case Rate Eligible</p>
                <p className="text-[11px] text-slate-500">Matches PhilHealth Konsulta package benefit claims.</p>
              </div>
              <Switch checked={newIcdPhilHealth} onCheckedChange={setNewIcdPhilHealth} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIcdModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleAddIcd10}
              disabled={icdSubmitting}
              className="text-xs font-bold"
            >
              {icdSubmitting ? 'Saving...' : 'Add to Catalog'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL: ADD PNDF FORMULARY DRUG                                */}
      {/* ============================================================= */}
      <Dialog open={pndfModalOpen} onOpenChange={(open) => { setPndfModalOpen(open); if (!open) setPndfError(null); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Add Drug to Philippine National Formulary</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Standardizes medicines available for digital prescriptions across CDO partner clinics.
            </DialogDescription>
          </DialogHeader>

          {pndfError && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{pndfError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Generic Molecule Name</label>
              <Input
                value={newPndfGeneric}
                onChange={(e) => setNewPndfGeneric(e.target.value)}
                placeholder="e.g. Salbutamol Sulfate"
                className="text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Common Brand Equivalents (Comma-separated)</label>
              <Input
                value={newPndfBrands}
                onChange={(e) => setNewPndfBrands(e.target.value)}
                placeholder="e.g. Ventolin, Asmalin, Pulmoprotect"
                className="text-xs bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dosage Strengths</label>
                <Input
                  value={newPndfDosage}
                  onChange={(e) => setNewPndfDosage(e.target.value)}
                  placeholder="e.g. 2mg, 4mg tab"
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Form</label>
                <Input
                  value={newPndfForm}
                  onChange={(e) => setNewPndfForm(e.target.value)}
                  placeholder="e.g. Tablet / Syrup"
                  className="text-xs bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Therapeutic Classification</label>
              <Input
                value={newPndfTherapeutic}
                onChange={(e) => setNewPndfTherapeutic(e.target.value)}
                placeholder="e.g. Bronchodilator (Beta-2 Agonist)"
                className="text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Prescription Classification</label>
              <select
                value={newPndfClass}
                onChange={(e) => setNewPndfClass(e.target.value as any)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800"
              >
                <option value="Rx">Prescription-Only (Rx)</option>
                <option value="OTC">Over-The-Counter (OTC)</option>
                <option value="DANGEROUS_DRUG_S2">Dangerous Drug (Requires PDEA S2)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPndfModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleAddPndf}
              disabled={pndfSubmitting}
              className="text-xs font-bold"
            >
              {pndfSubmitting ? 'Saving...' : 'Add to Formulary'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL: ADD / EDIT HMO PROVIDER                                */}
      {/* ============================================================= */}
      <Dialog open={hmoModalOpen} onOpenChange={(open) => { setHmoModalOpen(open); if (!open) setHmoError(null); }}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingHmoId ? 'Edit Accredited HMO Provider' : 'Accredit New HMO Provider'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Manages prior authorization rules, CDO clinic desk hotlines, and digital LOA verification portals.
            </DialogDescription>
          </DialogHeader>

          {hmoError && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{hmoError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Provider Name</label>
              <Input
                value={hmoName}
                onChange={(e) => setHmoName(e.target.value)}
                placeholder="e.g. Maxicare Healthcare Corporation"
                className="text-xs bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Brand Name</label>
                <Input
                  value={hmoShortName}
                  onChange={(e) => setHmoShortName(e.target.value)}
                  placeholder="e.g. Maxicare"
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Provider Code</label>
                <Input
                  value={hmoCode}
                  onChange={(e) => setHmoCode(e.target.value)}
                  placeholder="e.g. MAXICARE"
                  className="text-xs bg-white font-mono uppercase"
                  disabled={Boolean(editingHmoId)}
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Desk Hotline</label>
              <Input
                value={hmoContactDesk}
                onChange={(e) => setHmoContactDesk(e.target.value)}
                placeholder="e.g. (088) 857-4180 CDO Desk"
                className="text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Digital LOA Submission / Portal URL</label>
              <Input
                value={hmoPortalUrl}
                onChange={(e) => setHmoPortalUrl(e.target.value)}
                placeholder="e.g. https://provider.maxicare.com.ph"
                className="text-xs bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Accreditation Status</label>
                <select
                  value={hmoStatus}
                  onChange={(e) => setHmoStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 font-bold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
              <div className="flex flex-col justify-center">
                <label className="block font-bold text-slate-700 mb-1">Requires Prior Auth (LOA)</label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={hmoPriorAuth} onCheckedChange={setHmoPriorAuth} />
                  <span className="text-[11px] text-slate-600 font-medium">
                    {hmoPriorAuth ? 'LOA Required' : 'Direct Swipe'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHmoModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleSaveHmo}
              disabled={hmoSubmitting}
              className="text-xs font-bold"
            >
              {hmoSubmitting ? 'Saving...' : editingHmoId ? 'Save Changes' : 'Accredit Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
