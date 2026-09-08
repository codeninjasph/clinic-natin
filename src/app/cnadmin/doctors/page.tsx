'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  UserCheck,
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Crown,
  Search,
  Filter,
  Calendar,
  Building2,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  MoreHorizontal,
  Phone,
  Mail,
  Check,
  X,
  Hospital,
  Award,
  Stethoscope,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface DoctorDBRecord {
  id: string;
  profile_id: string;
  title: string;
  specialty: string;
  subspecialty: string | null;
  prc_license: string;
  prc_expiry: string | null;
  ptr_number: string | null;
  s2_license: string | null;
  board_certification: string | null;
  consultation_fee_default: number;
  hmo_accreditations?: string[];
  is_verified: boolean;
  verification_status: 'VERIFIED' | 'PENDING' | 'RE_UPLOAD_REQUESTED' | 'REVOKED';
  subscription_tier: 'free' | 'pro';
  pro_tier_active: boolean;
  hospital_affiliation: string;
  room_assignment: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    avatar_url?: string | null;
  };
}

// Master Lookup Types for Data Integrity
export interface LookupSpecialty {
  id: string;
  code: string;
  name: string;
  category: string;
  display_order: number;
  medical_subspecialties?: {
    id: string;
    code: string;
    name: string;
  }[];
}

export interface LookupHospital {
  id: string;
  code: string;
  name: string;
  short_name: string;
  address: string;
  city: string;
}

export interface LookupBoardCert {
  id: string;
  code: string;
  society_name: string;
  abbreviation: string;
}

export interface LookupHmo {
  id: string;
  code: string;
  name: string;
  short_name: string;
}

export default function DoctorCredentialingPage() {
  const [doctors, setDoctors] = React.useState<DoctorDBRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [specialtyFilter, setSpecialtyFilter] = React.useState<string>('ALL');

  // Master Lookups from Database
  const [lookups, setLookups] = React.useState<{
    specialties: LookupSpecialty[];
    hospitals: LookupHospital[];
    boardCertifications: LookupBoardCert[];
    hmoProviders: LookupHmo[];
  }>({
    specialties: [],
    hospitals: [],
    boardCertifications: [],
    hmoProviders: [],
  });

  // Success / Error Feedback Toast
  const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inspect Dossier Modal State
  const [inspectModalOpen, setInspectModalOpen] = React.useState(false);
  const [selectedDoctor, setSelectedDoctor] = React.useState<DoctorDBRecord | null>(null);

  // Add Doctor Modal State
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = React.useState(false);
  const [addFormData, setAddFormData] = React.useState({
    fullName: '',
    email: '',
    phone: '',
    specialty: 'Pediatrics',
    subspecialty: '',
    prcLicense: '',
    prcExpiry: '2028-12-31',
    ptrNumber: '',
    s2License: '',
    boardCertification: 'Philippine Pediatric Society',
    hospitalAffiliation: 'Maria Reyna XU Hospital',
    roomAssignment: 'Room 304, Medical Arts Bldg',
    hmoAccreditations: ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth Konsulta'],
    consultationFee: 700,
    subscriptionTier: 'pro' as 'free' | 'pro',
    verificationStatus: 'VERIFIED' as const,
  });

  // Edit Doctor Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState({
    id: '',
    profileId: '',
    fullName: '',
    email: '',
    phone: '',
    specialty: '',
    subspecialty: '',
    prcLicense: '',
    prcExpiry: '',
    ptrNumber: '',
    s2License: '',
    boardCertification: '',
    hospitalAffiliation: '',
    roomAssignment: '',
    hmoAccreditations: [] as string[],
    consultationFee: 700,
    subscriptionTier: 'pro' as 'free' | 'pro',
    verificationStatus: 'VERIFIED' as 'VERIFIED' | 'PENDING' | 'RE_UPLOAD_REQUESTED' | 'REVOKED',
  });

  // Delete Confirmation Dialog State
  const [doctorToDelete, setDoctorToDelete] = React.useState<DoctorDBRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // In-modal errors
  const [addModalError, setAddModalError] = React.useState<string | null>(null);
  const [editModalError, setEditModalError] = React.useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Fetch Lookups & Doctors from database
  const fetchLookups = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/lookups');
      const data = await res.json();
      if (res.ok && data) {
        setLookups({
          specialties: data.specialties || [],
          hospitals: data.hospitals || [],
          boardCertifications: data.boardCertifications || [],
          hmoProviders: data.hmoProviders || [],
        });
      }
    } catch (err) {
      console.error('Failed to load master lookups:', err);
    }
  }, []);

  const fetchDoctors = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/doctors');
      const json = await res.json();
      if (json.doctors) {
        setDoctors(json.doctors);
      }
    } catch (err) {
      console.error('Failed to load doctors from database', err);
      showFeedback('error', 'Unable to connect to database. Please check your network.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLookups();
    fetchDoctors();
  }, [fetchLookups, fetchDoctors]);

  // Group specialties by category for optgroup rendering
  const specialtyCategories = React.useMemo(() => {
    const map = new Map<string, LookupSpecialty[]>();
    lookups.specialties.forEach((s) => {
      const cat = s.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    });
    return Array.from(map.entries());
  }, [lookups.specialties]);

  // Subspecialties for currently selected specialty in Add modal
  const addSubspecialties = React.useMemo(() => {
    const selected = lookups.specialties.find((s) => s.name === addFormData.specialty);
    return selected?.medical_subspecialties || [];
  }, [lookups.specialties, addFormData.specialty]);

  // Subspecialties for currently selected specialty in Edit modal
  const editSubspecialties = React.useMemo(() => {
    const selected = lookups.specialties.find((s) => s.name === editFormData.specialty);
    return selected?.medical_subspecialties || [];
  }, [lookups.specialties, editFormData.specialty]);

  // 2. Filter doctors
  const filteredDoctors = doctors.filter((doc) => {
    const fullName = doc.profiles?.full_name || '';
    const specialty = doc.specialty || '';
    const prc = doc.prc_license || '';
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prc.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || doc.verification_status === statusFilter;
    const matchesSpecialty = specialtyFilter === 'ALL' || doc.specialty === specialtyFilter;

    return matchesSearch && matchesStatus && matchesSpecialty;
  });

  // 3. Administrative Status Updates (Verify, Re-upload, Revoke)
  const handleUpdateStatus = async (
    doctorId: string,
    newStatus: 'VERIFIED' | 'RE_UPLOAD_REQUESTED' | 'REVOKED',
    isVerified: boolean
  ) => {
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doctorId,
          verificationStatus: newStatus,
          isVerified,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      // Optimistic state update
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctorId ? { ...d, verification_status: newStatus, is_verified: isVerified } : d))
      );

      showFeedback('success', `Physician status successfully updated to ${newStatus}!`);
      setInspectModalOpen(false);
    } catch (err: any) {
      showFeedback('error', err.message || 'Status update failed.');
    }
  };

  // 4. Toggle Subscription Tier
  const handleToggleTier = async (doc: DoctorDBRecord) => {
    const nextTier = doc.subscription_tier === 'pro' ? 'free' : 'pro';
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doc.id,
          subscriptionTier: nextTier,
        }),
      });

      if (!res.ok) throw new Error('Failed to update subscription tier');

      setDoctors((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, subscription_tier: nextTier, pro_tier_active: nextTier === 'pro' } : d))
      );

      showFeedback('success', `Updated ${doc.profiles?.full_name} to ${nextTier === 'pro' ? 'Pro Tier (₱1,499/mo)' : 'Free Basic Tier'}`);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update tier');
    }
  };

  // 5. Create / Onboard New Doctor
  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError(null);
    if (!addFormData.fullName.trim() || !addFormData.specialty.trim() || !addFormData.prcLicense.trim()) {
      setAddModalError('Please fill all required fields: Physician Full Name, Primary Specialty, and PRC License #.');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addFormData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to onboard doctor');

      showFeedback('success', `Dr. ${addFormData.fullName} successfully onboarded to the database!`);
      setAddModalOpen(false);
      // Reset form
      setAddFormData({
        fullName: '',
        email: '',
        phone: '',
        specialty: lookups.specialties[0]?.name || 'Pediatrics',
        subspecialty: '',
        prcLicense: '',
        prcExpiry: '2028-12-31',
        ptrNumber: '',
        s2License: '',
        boardCertification: lookups.boardCertifications[0]?.society_name || 'Philippine Pediatric Society',
        hospitalAffiliation: lookups.hospitals[0]?.name || 'Maria Reyna XU Hospital',
        roomAssignment: 'Room 304, Medical Arts Bldg',
        hmoAccreditations: ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth Konsulta'],
        consultationFee: 700,
        subscriptionTier: 'pro',
        verificationStatus: 'VERIFIED',
      });
      fetchDoctors();
    } catch (err: any) {
      setAddModalError(err.message || 'Failed to create doctor');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // 6. Edit Doctor Record
  const openEditModal = (doc: DoctorDBRecord) => {
    setEditModalError(null);
    setEditFormData({
      id: doc.id,
      profileId: doc.profile_id,
      fullName: doc.profiles?.full_name || '',
      email: doc.profiles?.email || '',
      phone: doc.profiles?.phone_number || '',
      specialty: doc.specialty || (lookups.specialties[0]?.name || 'Internal Medicine'),
      subspecialty: doc.subspecialty || '',
      prcLicense: doc.prc_license || '',
      prcExpiry: doc.prc_expiry || '',
      ptrNumber: doc.ptr_number || '',
      s2License: doc.s2_license || '',
      boardCertification: doc.board_certification || (lookups.boardCertifications[0]?.society_name || ''),
      hospitalAffiliation: doc.hospital_affiliation || (lookups.hospitals[0]?.name || 'Maria Reyna XU Hospital'),
      roomAssignment: doc.room_assignment || 'Room 304',
      hmoAccreditations: doc.hmo_accreditations || ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth Konsulta'],
      consultationFee: Number(doc.consultation_fee_default) || 600,
      subscriptionTier: doc.subscription_tier || 'pro',
      verificationStatus: doc.verification_status || 'PENDING',
    });
    setEditModalOpen(true);
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;
    setEditModalError(null);

    try {
      setIsSubmittingEdit(true);
      const res = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editFormData.id,
          profileId: editFormData.profileId,
          fullName: editFormData.fullName,
          email: editFormData.email,
          phone: editFormData.phone,
          specialty: editFormData.specialty,
          subspecialty: editFormData.subspecialty || null,
          prcLicense: editFormData.prcLicense,
          prcExpiry: editFormData.prcExpiry || null,
          ptrNumber: editFormData.ptrNumber || null,
          s2License: editFormData.s2License || null,
          boardCertification: editFormData.boardCertification || null,
          hospitalAffiliation: editFormData.hospitalAffiliation,
          roomAssignment: editFormData.roomAssignment,
          hmoAccreditations: editFormData.hmoAccreditations,
          consultationFee: editFormData.consultationFee,
          subscriptionTier: editFormData.subscriptionTier,
          verificationStatus: editFormData.verificationStatus,
          isVerified: editFormData.verificationStatus === 'VERIFIED',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update doctor record');

      showFeedback('success', `Successfully updated doctor record for ${editFormData.fullName}!`);
      setEditModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to save changes');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 7. Delete Doctor Record via In-App ConfirmDialog
  const requestDeleteDoctor = (doc: DoctorDBRecord) => {
    setDoctorToDelete(doc);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    const doctorName = doctorToDelete.profiles?.full_name || 'this physician';
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/doctors?id=${doctorToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete doctor');

      showFeedback('success', `Permanently removed ${doctorName} from database.`);
      setDoctors((prev) => prev.filter((d) => d.id !== doctorToDelete.id));
      setDeleteConfirmOpen(false);
      setDoctorToDelete(null);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete doctor');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle HMO in Add form
  const toggleAddHmo = (hmoShort: string) => {
    setAddFormData((prev) => {
      const exists = prev.hmoAccreditations.includes(hmoShort);
      return {
        ...prev,
        hmoAccreditations: exists
          ? prev.hmoAccreditations.filter((h) => h !== hmoShort)
          : [...prev.hmoAccreditations, hmoShort],
      };
    });
  };

  // Toggle HMO in Edit form
  const toggleEditHmo = (hmoShort: string) => {
    setEditFormData((prev) => {
      const exists = prev.hmoAccreditations.includes(hmoShort);
      return {
        ...prev,
        hmoAccreditations: exists
          ? prev.hmoAccreditations.filter((h) => h !== hmoShort)
          : [...prev.hmoAccreditations, hmoShort],
      };
    });
  };

  // Metric counts
  const totalDoctors = doctors.length;
  const verifiedCount = doctors.filter((d) => d.verification_status === 'VERIFIED').length;
  const pendingCount = doctors.filter((d) => d.verification_status === 'PENDING').length;
  const actionRequiredCount = doctors.filter(
    (d) => d.verification_status === 'RE_UPLOAD_REQUESTED' || d.verification_status === 'REVOKED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm transition-all animate-in fade-in-50 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-700" />
            Doctor Credentialing & Licensing Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official PRC licensing verification, controlled medical specialties, CDO hospital station governance, and Pro tier management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchLookups();
              fetchDoctors();
            }}
            disabled={loading}
            className="text-xs text-slate-700 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Database
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add New Doctor
          </Button>
        </div>
      </div>

      {/* 2. Top KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total In Database</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalDoctors}</p>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs font-bold">
            Live Records
          </Badge>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified & Active</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{verifiedCount}</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold">
            PRC-Validated
          </Badge>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Review</p>
            <p className="text-xl font-bold text-purple-800 mt-0.5">{pendingCount}</p>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-xs font-bold">
            Needs Action
          </Badge>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action Required / Revoked</p>
            <p className="text-xl font-bold text-amber-800 mt-0.5">{actionRequiredCount}</p>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-bold">
            Re-upload / Warning
          </Badge>
        </div>
      </div>

      {/* 3. Search & Controlled Filters Card */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search physician name, specialty, or PRC License #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-xs bg-white"
              />
            </div>

            {/* Controlled Database Specialty Filter */}
            <div className="sm:w-60">
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
              >
                <option value="ALL">All Medical Specialties ({lookups.specialties.length})</option>
                {specialtyCategories.map(([category, specs]) => (
                  <optgroup key={category} label={`── ${category} ──`}>
                    {specs.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All Doctors' },
              { id: 'PENDING', label: 'Pending Review' },
              { id: 'VERIFIED', label: 'Verified' },
              { id: 'RE_UPLOAD_REQUESTED', label: 'Re-upload' },
              { id: 'REVOKED', label: 'Revoked' },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={statusFilter === tab.id ? 'brand' : 'outline'}
                onClick={() => setStatusFilter(tab.id)}
                className="text-xs font-semibold h-8"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Doctors Database Table with Full CRUD & Administrative Functions */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="h-6 w-6 animate-spin text-brand-700 mx-auto" />
            <p className="font-semibold">Loading live doctors from database...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <p className="font-semibold text-slate-700">No doctors match your current search or filter criteria.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setSpecialtyFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Physician & Specialty</TableHead>
                <TableHead>PRC License & Expiry</TableHead>
                <TableHead>PDEA S2 & PTR</TableHead>
                <TableHead>Hospital & Room</TableHead>
                <TableHead>Subscription Tier</TableHead>
                <TableHead>Verification Status</TableHead>
                <TableHead className="text-right">Administrative Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDoctors.map((doc) => {
                const isVerified = doc.verification_status === 'VERIFIED';
                const isPending = doc.verification_status === 'PENDING';
                const isReupload = doc.verification_status === 'RE_UPLOAD_REQUESTED';
                const isRevoked = doc.verification_status === 'REVOKED';

                return (
                  <TableRow key={doc.id}>
                    {/* Physician Name & Specialty */}
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/cnadmin/doctors/${doc.id}`}
                            className="font-bold text-slate-900 hover:text-brand-700 hover:underline text-xs"
                          >
                            {doc.profiles?.full_name || 'Physician'}
                          </Link>
                          {isVerified && (
                            <span title="PRC-Validated">
                              <ShieldCheck className="h-3.5 w-3.5 text-brand-700 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-brand-700 font-semibold">
                          {doc.specialty}
                          {doc.subspecialty && (
                            <span className="text-slate-500 font-normal"> &bull; {doc.subspecialty}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">{doc.profiles?.email || 'No email registered'}</p>
                      </div>
                    </TableCell>

                    {/* PRC License & Expiration */}
                    <TableCell>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          #{doc.prc_license}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Expires: {doc.prc_expiry || 'Not set'}
                        </p>
                      </div>
                    </TableCell>

                    {/* PDEA S2 & PTR */}
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-mono text-slate-700 font-semibold">{doc.s2_license || 'No S2 License'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{doc.ptr_number || 'No PTR Number'}</p>
                      </div>
                    </TableCell>

                    {/* Hospital & Room Assignment */}
                    <TableCell>
                      <div className="text-xs text-slate-700">
                        <p className="font-semibold flex items-center gap-1">
                          <Hospital className="h-3 w-3 text-slate-400 shrink-0" />
                          {doc.hospital_affiliation || 'Hospital not assigned'}
                        </p>
                        <p className="text-slate-500 text-[11px]">{doc.room_assignment || 'Room not set'}</p>
                      </div>
                    </TableCell>

                    {/* Subscription Tier Toggle */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            doc.subscription_tier === 'pro'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {doc.subscription_tier === 'pro' ? 'Clinic Natin Pro' : 'Free Basic'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleTier(doc)}
                          className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900"
                          title="Click to toggle between Pro and Free Tier"
                        >
                          Switch
                        </Button>
                      </div>
                    </TableCell>

                    {/* Verification Status */}
                    <TableCell>
                      <Badge
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isVerified
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isPending
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : isReupload
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {doc.verification_status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>

                    {/* Action Buttons: Inspect, Edit, Delete */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setInspectModalOpen(true);
                          }}
                          className="h-7 text-xs font-semibold px-2.5 text-slate-700 hover:text-brand-700"
                          title="Inspect Credentials Dossier & Decision Buttons"
                        >
                          Inspect Dossier
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(doc)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Edit Physician Profile"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => requestDeleteDoctor(doc)}
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Delete Doctor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── MODAL 1: ADD NEW DOCTOR (CONTROLLED SELECTORS) ── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-brand-700" />
              Onboard New Physician to Database
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Registers the physician profile, controlled medical specialty, and hospital credentials directly in Supabase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDoctor} className="space-y-4 py-2 text-xs">
            {addModalError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{addModalError}</AlertDescription>
              </Alert>
            )}
            {/* Full Name & Controlled Specialty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physician Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Dr. Juan Carlos Reyes, MD"
                  value={addFormData.fullName}
                  onChange={(e) => setAddFormData({ ...addFormData, fullName: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Primary Medical Specialty <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={addFormData.specialty}
                  onChange={(e) => {
                    const newSpec = e.target.value;
                    const match = lookups.specialties.find((s) => s.name === newSpec);
                    const defaultSub = match?.medical_subspecialties?.[0]?.name || '';
                    setAddFormData({ ...addFormData, specialty: newSpec, subspecialty: defaultSub });
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  {specialtyCategories.map(([category, specs]) => (
                    <optgroup key={category} label={`── ${category} ──`}>
                      {specs.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading Subspecialty Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Clinical Subspecialty / Focus Area
                </label>
                <select
                  value={addFormData.subspecialty}
                  onChange={(e) => setAddFormData({ ...addFormData, subspecialty: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  <option value="">General Practice (No Subspecialty)</option>
                  {addSubspecialties.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">Cascades dynamically from selected Primary Specialty</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Consultation Fee (₱)</label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={addFormData.consultationFee}
                  onChange={(e) => setAddFormData({ ...addFormData, consultationFee: Number(e.target.value) })}
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="doctor@hospital.ph"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+63 9XXXXXXXXX"
                  value={addFormData.phone}
                  onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* PRC License & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  PRC License Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. 0144921"
                  value={addFormData.prcLicense}
                  onChange={(e) => setAddFormData({ ...addFormData, prcLicense: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PRC License Expiry</label>
                <Input
                  type="date"
                  value={addFormData.prcExpiry}
                  onChange={(e) => setAddFormData({ ...addFormData, prcExpiry: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* PDEA S2 & PTR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PDEA S2 Dangerous Drugs #</label>
                <Input
                  placeholder="e.g. PDEA-S2-81142-R10"
                  value={addFormData.s2License}
                  onChange={(e) => setAddFormData({ ...addFormData, s2License: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PTR Number</label>
                <Input
                  placeholder="e.g. PTR-CDO-2026-9011245"
                  value={addFormData.ptrNumber}
                  onChange={(e) => setAddFormData({ ...addFormData, ptrNumber: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* Hospital Center & Room Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Affiliated Hospital Center</label>
                <select
                  value={addFormData.hospitalAffiliation}
                  onChange={(e) => setAddFormData({ ...addFormData, hospitalAffiliation: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  {lookups.hospitals.map((hosp) => (
                    <option key={hosp.id} value={hosp.name}>
                      {hosp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Consultation Room</label>
                <Input
                  placeholder="e.g. Room 304, Medical Arts Bldg"
                  value={addFormData.roomAssignment}
                  onChange={(e) => setAddFormData({ ...addFormData, roomAssignment: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* Controlled Board Certification & Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PMA Specialty Board Society</label>
                <select
                  value={addFormData.boardCertification}
                  onChange={(e) => setAddFormData({ ...addFormData, boardCertification: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  <option value="">None / General Medical Licensure</option>
                  {lookups.boardCertifications.map((b) => (
                    <option key={b.id} value={b.society_name}>
                      {b.society_name} ({b.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subscription Tier</label>
                <select
                  value={addFormData.subscriptionTier}
                  onChange={(e) => setAddFormData({ ...addFormData, subscriptionTier: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium"
                >
                  <option value="pro">Clinic Natin Pro (₱1,499/mo)</option>
                  <option value="free">Free Basic Tier</option>
                </select>
              </div>
            </div>

            {/* Controlled HMO Accreditations Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Accepted HMO & Insurance Accreditations
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50">
                {lookups.hmoProviders.map((hmo) => {
                  const isChecked = addFormData.hmoAccreditations.includes(hmo.short_name);
                  return (
                    <button
                      key={hmo.id}
                      type="button"
                      onClick={() => toggleAddHmo(hmo.short_name)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        isChecked
                          ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {hmo.short_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                size="sm"
                disabled={isSubmittingAdd}
                className="text-xs font-bold gap-1.5"
              >
                <Check className="h-4 w-4" />
                {isSubmittingAdd ? 'Saving to DB...' : 'Save & Onboard Physician'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: EDIT DOCTOR DETAILS (CONTROLLED SELECTORS) ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-brand-700" />
              Edit Physician Credentials & Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Controlled selectors ensure normalized specialties, hospital centers, and board diplomas in database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateDoctor} className="space-y-4 py-2 text-xs">
            {editModalError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editModalError}</AlertDescription>
              </Alert>
            )}
            {/* Full Name & Controlled Specialty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <Input
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Medical Specialty</label>
                <select
                  required
                  value={editFormData.specialty}
                  onChange={(e) => {
                    const newSpec = e.target.value;
                    const match = lookups.specialties.find((s) => s.name === newSpec);
                    const defaultSub = match?.medical_subspecialties?.[0]?.name || '';
                    setEditFormData({ ...editFormData, specialty: newSpec, subspecialty: defaultSub });
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  {specialtyCategories.map(([category, specs]) => (
                    <optgroup key={category} label={`── ${category} ──`}>
                      {specs.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading Subspecialty & Fee */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Subspecialty</label>
                <select
                  value={editFormData.subspecialty}
                  onChange={(e) => setEditFormData({ ...editFormData, subspecialty: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  <option value="">General Practice (No Subspecialty)</option>
                  {editSubspecialties.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Consultation Fee (₱)</label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={editFormData.consultationFee}
                  onChange={(e) => setEditFormData({ ...editFormData, consultationFee: Number(e.target.value) })}
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                <Input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* PRC License & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PRC License Number</label>
                <Input
                  required
                  value={editFormData.prcLicense}
                  onChange={(e) => setEditFormData({ ...editFormData, prcLicense: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PRC License Expiry Date</label>
                <Input
                  type="date"
                  value={editFormData.prcExpiry}
                  onChange={(e) => setEditFormData({ ...editFormData, prcExpiry: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* PDEA S2 & PTR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PDEA S2 License Number</label>
                <Input
                  value={editFormData.s2License}
                  onChange={(e) => setEditFormData({ ...editFormData, s2License: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PTR Number</label>
                <Input
                  value={editFormData.ptrNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, ptrNumber: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>
            </div>

            {/* Controlled Hospital Center & Room */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Affiliated Hospital Center</label>
                <select
                  value={editFormData.hospitalAffiliation}
                  onChange={(e) => setEditFormData({ ...editFormData, hospitalAffiliation: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  {lookups.hospitals.map((hosp) => (
                    <option key={hosp.id} value={hosp.name}>
                      {hosp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Consultation Room</label>
                <Input
                  value={editFormData.roomAssignment}
                  onChange={(e) => setEditFormData({ ...editFormData, roomAssignment: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* Controlled Board Certification & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">PMA Specialty Board Society</label>
                <select
                  value={editFormData.boardCertification}
                  onChange={(e) => setEditFormData({ ...editFormData, boardCertification: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-700"
                >
                  <option value="">None / General Medical Licensure</option>
                  {lookups.boardCertifications.map((b) => (
                    <option key={b.id} value={b.society_name}>
                      {b.society_name} ({b.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Status</label>
                <select
                  value={editFormData.verificationStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, verificationStatus: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium"
                >
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="RE_UPLOAD_REQUESTED">RE_UPLOAD_REQUESTED</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
              </div>
            </div>

            {/* Subscription Tier & Controlled HMO Accreditations */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Subscription Tier</label>
              <select
                value={editFormData.subscriptionTier}
                onChange={(e) => setEditFormData({ ...editFormData, subscriptionTier: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium"
              >
                <option value="pro">Clinic Natin Pro (₱1,499/mo)</option>
                <option value="free">Free Basic Tier</option>
              </select>
            </div>

            {/* Controlled HMO Badges */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Accepted HMO & Insurance Accreditations
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50">
                {lookups.hmoProviders.map((hmo) => {
                  const isChecked = editFormData.hmoAccreditations.includes(hmo.short_name);
                  return (
                    <button
                      key={hmo.id}
                      type="button"
                      onClick={() => toggleEditHmo(hmo.short_name)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        isChecked
                          ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {hmo.short_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                size="sm"
                disabled={isSubmittingEdit}
                className="text-xs font-bold"
              >
                {isSubmittingEdit ? 'Saving Changes...' : 'Save Updates to DB'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: CREDENTIALS DOSSIER INSPECTION (ADMINISTRATIVE ACTIONS) ── */}
      <Dialog open={inspectModalOpen} onOpenChange={setInspectModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-700" />
              Physician Regulatory Clearance Dossier
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              PRC compliance verification, PDEA S2 authorization, and public badge governance.
            </DialogDescription>
          </DialogHeader>

          {selectedDoctor && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-slate-900">{selectedDoctor.profiles?.full_name}</h3>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white text-brand-700 border-brand-200">
                    {selectedDoctor.specialty}
                  </Badge>
                </div>
                <p className="text-slate-600">
                  {selectedDoctor.hospital_affiliation} &bull; {selectedDoctor.room_assignment}
                </p>
                <p className="text-slate-500 mt-1">
                  Contact: {selectedDoctor.profiles?.email || 'No email'} &bull; {selectedDoctor.profiles?.phone_number || 'No phone'}
                </p>
              </div>

              {/* License Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">PRC Registration</span>
                  <p className="font-mono font-bold text-slate-900 text-xs">#{selectedDoctor.prc_license}</p>
                  <p className="text-[11px] text-slate-500">Expires: {selectedDoctor.prc_expiry || 'Not set'}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">PDEA Dangerous Drugs S2</span>
                  <p className="font-mono font-bold text-slate-900 text-xs">{selectedDoctor.s2_license || 'No S2 on record'}</p>
                  <p className="text-[11px] text-slate-500">PTR: {selectedDoctor.ptr_number || 'No PTR'}</p>
                </div>
              </div>

              {/* Board Society & Subspecialty */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Specialty Board & Focus Area</span>
                <p className="font-semibold text-slate-900">
                  {selectedDoctor.board_certification || 'General Medical Practice'}
                </p>
                {selectedDoctor.subspecialty && (
                  <p className="text-slate-600 text-[11px]">
                    Subspecialty: <strong>{selectedDoctor.subspecialty}</strong>
                  </p>
                )}
              </div>

              {/* Accepted HMOs */}
              {selectedDoctor.hmo_accreditations && selectedDoctor.hmo_accreditations.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Accredited HMO Providers</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedDoctor.hmo_accreditations.map((hmo) => (
                      <Badge key={hmo} variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                        {hmo}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Administrative Action Decision Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="font-bold text-slate-800 text-xs">Administrative Licensing Decision:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedDoctor.id, 'VERIFIED', true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    One-Click Verify
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedDoctor.id, 'RE_UPLOAD_REQUESTED', false)}
                    className="text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 text-xs font-semibold gap-1.5"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    Request Re-upload
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedDoctor.id, 'REVOKED', false)}
                    className="text-rose-800 bg-rose-50 border-rose-200 hover:bg-rose-100 text-xs font-semibold gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirm Physician Record Removal"
        description={`Are you sure you want to permanently remove ${
          doctorToDelete?.profiles?.full_name || 'this physician'
        } from the database? This action deletes all licensing credentials, consultation schedule links, and associated user accounts. This action is irreversible.`}
        confirmLabel="Permanently Delete Physician"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDeleteDoctor}
      />
    </div>
  );
}
