'use client';

import * as React from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Building2,
  Calendar,
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Printer,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Sparkles,
  Stethoscope,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Activity,
  Users,
  UserCheck,
  RefreshCw,
  Power,
  Wrench,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface ClinicRecord {
  id: string;
  name: string;
  hospital_name: string;
  hospital_id?: string | null;
  building_name?: string | null;
  floor_number?: string | null;
  room_number: string;
  address: string;
  city: string;
  province: string;
  contact_phone?: string | null;
  is_verified: boolean;
  operating_hours: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  created_at: string;
  hospitals?: {
    id: string;
    code: string;
    name: string;
    short_name: string;
    contact_phone: string;
    has_er: boolean;
  } | null;
  doctor_clinic_schedules?: Array<{
    id: string;
    doctor_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_patients: number;
    is_active: boolean;
    doctors?: {
      id: string;
      title: string;
      specialty: string;
      subspecialty?: string | null;
      profiles?: {
        id: string;
        full_name: string;
        email?: string | null;
        phone_number?: string | null;
        avatar_url?: string | null;
      } | null;
    } | null;
  }>;
  queue_sessions?: Array<{
    id: string;
    status: string;
    current_serving_number: number;
    session_date: string;
    accepting_walkins: boolean;
    accepting_online: boolean;
    announcement_notice?: string | null;
  }>;
}

export interface LookupHospital {
  id: string;
  code: string;
  name: string;
  short_name: string;
  address: string;
  city: string;
  province: string;
  doh_license_number: string;
  contact_phone: string;
  has_er: boolean;
  is_partner: boolean;
}

export interface DoctorOption {
  id: string;
  title: string;
  specialty: string;
  hospital_affiliation: string;
  profiles?: {
    id: string;
    full_name: string;
  } | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function ClinicsAndRoomsPage() {
  const [clinics, setClinics] = React.useState<ClinicRecord[]>([]);
  const [hospitals, setHospitals] = React.useState<LookupHospital[]>([]);
  const [doctors, setDoctors] = React.useState<DoctorOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [hospitalFilter, setHospitalFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  // Notification Banner
  const [bannerAlert, setBannerAlert] = React.useState<{
    type: 'success' | 'destructive' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // 1. Printed QR Standee Dialog State
  const [qrStandeeModalOpen, setQrStandeeModalOpen] = React.useState(false);
  const [selectedClinicForQR, setSelectedClinicForQR] = React.useState<ClinicRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [qrTargetDomain, setQrTargetDomain] = React.useState<'PRODUCTION' | 'LOCAL'>('PRODUCTION');

  // 2. Add Clinic Modal State
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = React.useState(false);
  const [addModalError, setAddModalError] = React.useState<string | null>(null);
  const [addForm, setAddForm] = React.useState({
    name: '',
    hospitalName: '',
    hospitalId: '',
    buildingName: 'Medical Arts Building',
    floorNumber: '2nd Floor',
    roomNumber: '',
    address: '',
    city: 'Cagayan de Oro',
    province: 'Misamis Oriental',
    contactPhone: '',
    operatingHours: 'Mon–Fri 8:00 AM – 5:00 PM',
    status: 'ACTIVE' as 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
    assignedDoctorId: '',
    scheduleDays: [2, 4, 6] as number[],
    startTime: '08:30:00',
    endTime: '13:30:00',
  });

  // 3. Edit Clinic Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [editModalError, setEditModalError] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({
    id: '',
    name: '',
    hospitalName: '',
    hospitalId: '',
    buildingName: '',
    floorNumber: '',
    roomNumber: '',
    address: '',
    city: '',
    province: '',
    contactPhone: '',
    operatingHours: '',
    status: 'ACTIVE' as 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
    assignedDoctorId: '',
    scheduleDays: [2, 4, 6] as number[],
    startTime: '08:30:00',
    endTime: '13:30:00',
  });

  // 4. Decommission / Delete Confirm Dialog State
  const [clinicToDelete, setClinicToDelete] = React.useState<ClinicRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch Clinics from Supabase
  const fetchClinics = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/admin/clinics');
      const data = await res.json();
      if (res.ok && data.clinics) {
        setClinics(data.clinics);
      }
    } catch (err) {
      console.error('Failed to fetch clinics:', err);
      setBannerAlert({
        type: 'destructive',
        title: 'Connection Error',
        message: 'Could not load clinic directory from database. Please check your network connection.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Master Lookups & Doctors
  const fetchSupportingData = React.useCallback(async () => {
    try {
      // 1. Master Hospitals Lookup
      const hospRes = await fetch('/api/admin/lookups?type=hospitals');
      const hospData = await hospRes.json();
      if (hospData.hospitals) {
        setHospitals(hospData.hospitals);
      }

      // 2. Verified Doctors
      const docRes = await fetch('/api/admin/doctors');
      const docData = await docRes.json();
      if (docData.doctors) {
        setDoctors(docData.doctors);
      }
    } catch (err) {
      console.error('Failed to fetch supporting lookups:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchClinics();
    fetchSupportingData();
  }, [fetchClinics, fetchSupportingData]);

  // Generate QR code data URL whenever selected clinic or target domain changes
  const getStandeeCheckinUrl = React.useCallback(
    (clinicId: string) => {
      const origin =
        qrTargetDomain === 'PRODUCTION'
          ? 'https://clinicnatin.ph'
          : typeof window !== 'undefined'
          ? window.location.origin
          : 'https://clinicnatin.ph';
      return `${origin}/c/${clinicId}`;
    },
    [qrTargetDomain]
  );

  React.useEffect(() => {
    if (selectedClinicForQR) {
      const checkinUrl = getStandeeCheckinUrl(selectedClinicForQR.id);

      QRCode.toDataURL(checkinUrl, {
        width: 520,
        margin: 2,
        color: {
          dark: '#091e42',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [selectedClinicForQR, getStandeeCheckinUrl]);

  // When hospital is selected in Add Modal, auto-populate address & contact
  const handleAddHospitalSelect = (hospId: string) => {
    const selected = hospitals.find((h) => h.id === hospId);
    if (selected) {
      setAddForm((prev) => ({
        ...prev,
        hospitalId: selected.id,
        hospitalName: selected.short_name || selected.name,
        address: selected.address,
        city: selected.city || 'Cagayan de Oro',
        province: selected.province || 'Misamis Oriental',
        contactPhone: selected.contact_phone || prev.contactPhone,
      }));
    } else {
      setAddForm((prev) => ({
        ...prev,
        hospitalId: '',
        hospitalName: '',
      }));
    }
  };

  // Open Add Clinic Modal
  const handleOpenAddModal = () => {
    const defaultHosp = hospitals[0];
    setAddForm({
      name: '',
      hospitalName: defaultHosp ? (defaultHosp.short_name || defaultHosp.name) : '',
      hospitalId: defaultHosp ? defaultHosp.id : '',
      buildingName: 'Medical Arts Building',
      floorNumber: '2nd Floor',
      roomNumber: '',
      address: defaultHosp ? defaultHosp.address : 'Cagayan de Oro',
      city: 'Cagayan de Oro',
      province: 'Misamis Oriental',
      contactPhone: defaultHosp ? defaultHosp.contact_phone : '+63 (88) 857-4000',
      operatingHours: 'Mon–Fri 8:00 AM – 5:00 PM',
      status: 'ACTIVE',
      assignedDoctorId: '',
      scheduleDays: [2, 4, 6],
      startTime: '08:30:00',
      endTime: '13:30:00',
    });
    setAddModalError(null);
    setAddModalOpen(true);
  };

  // Submit Add Clinic Form
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError(null);

    if (!addForm.name.trim() || !addForm.hospitalName.trim() || !addForm.roomNumber.trim()) {
      setAddModalError('Clinic Suite Name, Hospital Facility, and Room Number are required.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create consultation room');
      }

      setAddModalOpen(false);
      setBannerAlert({
        type: 'success',
        title: 'Consultation Suite Created',
        message: `${addForm.roomNumber} (${addForm.name}) successfully registered in ${addForm.hospitalName}.`,
      });
      fetchClinics();
    } catch (err: any) {
      setAddModalError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // When hospital is selected in Edit Modal, auto-populate address & contact
  const handleEditHospitalSelect = (hospId: string) => {
    const selected = hospitals.find((h) => h.id === hospId);
    if (selected) {
      setEditForm((prev) => ({
        ...prev,
        hospitalId: selected.id,
        hospitalName: selected.short_name || selected.name,
        address: selected.address,
        city: selected.city || 'Cagayan de Oro',
        province: selected.province || 'Misamis Oriental',
        contactPhone: selected.contact_phone || prev.contactPhone,
      }));
    }
  };

  // Open Edit Clinic Modal
  const handleOpenEditModal = (clinic: ClinicRecord) => {
    const schedules = clinic.doctor_clinic_schedules || [];
    const primarySchedule = schedules[0];
    const assignedDocId = primarySchedule?.doctor_id || '';
    const existingDays = schedules.length > 0
      ? schedules.map((s) => s.day_of_week)
      : [2, 4, 6];

    setEditForm({
      id: clinic.id,
      name: clinic.name,
      hospitalName: clinic.hospital_name,
      hospitalId: clinic.hospital_id || '',
      buildingName: clinic.building_name || '',
      floorNumber: clinic.floor_number || '',
      roomNumber: clinic.room_number,
      address: clinic.address,
      city: clinic.city,
      province: clinic.province,
      contactPhone: clinic.contact_phone || '',
      operatingHours: clinic.operating_hours || 'Mon–Fri 8:00 AM – 5:00 PM',
      status: clinic.status || 'ACTIVE',
      assignedDoctorId: assignedDocId,
      scheduleDays: existingDays,
      startTime: primarySchedule?.start_time ? primarySchedule.start_time.slice(0, 5) : '08:30',
      endTime: primarySchedule?.end_time ? primarySchedule.end_time.slice(0, 5) : '13:30',
    });
    setEditModalError(null);
    setEditModalOpen(true);
  };

  // Submit Edit Clinic Form
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditModalError(null);

    if (!editForm.name.trim() || !editForm.roomNumber.trim()) {
      setEditModalError('Clinic Suite Name and Room Number are required.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update consultation room');
      }

      setEditModalOpen(false);
      setBannerAlert({
        type: 'success',
        title: 'Suite Updated',
        message: `${editForm.roomNumber} (${editForm.name}) details updated in database.`,
      });
      fetchClinics();
    } catch (err: any) {
      setEditModalError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Quick Toggle Active / Maintenance Status
  const handleToggleStatus = async (clinic: ClinicRecord) => {
    const nextStatus = clinic.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/clinics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clinic.id,
          status: nextStatus,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update room status');
      }

      setBannerAlert({
        type: nextStatus === 'ACTIVE' ? 'success' : 'warning',
        title: `Room Status: ${nextStatus}`,
        message: `${clinic.room_number} (${clinic.hospital_name}) is now marked as ${nextStatus}.`,
      });
      fetchClinics();
    } catch (err: any) {
      setBannerAlert({
        type: 'destructive',
        title: 'Status Update Error',
        message: err.message,
      });
    }
  };

  // Open Decommission Confirm Dialog
  const handleOpenDeleteConfirm = (clinic: ClinicRecord) => {
    setClinicToDelete(clinic);
    setDeleteConfirmOpen(true);
  };

  // Execute Decommission Clinic
  const handleConfirmDelete = async () => {
    if (!clinicToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/clinics?id=${clinicToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to decommission room');
      }

      setDeleteConfirmOpen(false);
      setBannerAlert({
        type: 'destructive',
        title: 'Suite Decommissioned',
        message: `${clinicToDelete.room_number} (${clinicToDelete.name}) has been safely removed from the hospital directory.`,
      });
      setClinicToDelete(null);
      fetchClinics();
    } catch (err: any) {
      setBannerAlert({
        type: 'destructive',
        title: 'Decommission Blocked',
        message: err.message,
      });
      setDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenQRStandee = (clinic: ClinicRecord) => {
    setSelectedClinicForQR(clinic);
    setQrStandeeModalOpen(true);
  };

  const handlePrintStandee = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!selectedClinicForQR) return;
    const checkinUrl = getStandeeCheckinUrl(selectedClinicForQR.id);
    navigator.clipboard.writeText(checkinUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Filtered clinics
  const filteredClinics = clinics.filter((c) => {
    const q = searchQuery.toLowerCase();
    const primaryDoctor = c.doctor_clinic_schedules?.[0]?.doctors?.profiles?.full_name?.toLowerCase() || '';
    const matchesSearch =
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(q) ||
      c.hospital_name.toLowerCase().includes(q) ||
      c.room_number.toLowerCase().includes(q) ||
      (c.building_name && c.building_name.toLowerCase().includes(q)) ||
      primaryDoctor.includes(q);

    const matchesHospital =
      hospitalFilter === 'ALL' ||
      c.hospital_name.toLowerCase().includes(hospitalFilter.toLowerCase()) ||
      (c.hospitals?.name && c.hospitals.name.toLowerCase().includes(hospitalFilter.toLowerCase())) ||
      (c.hospitals?.short_name && c.hospitals.short_name.toLowerCase().includes(hospitalFilter.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesHospital && matchesStatus;
  });

  // Calculate Executive Metrics
  const totalClinicsCount = clinics.length;
  const affiliatedHospitalsCount = new Set(clinics.map((c) => c.hospital_name)).size;
  const assignedDoctorsCount = new Set(
    clinics.flatMap((c) => (c.doctor_clinic_schedules || []).map((s) => s.doctor_id))
  ).size;
  const activeQueuingRoomsCount = clinics.filter((c) => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Management Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-700" />
            Hospital Directory & Clinic Rooms Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Supabase management of Cagayan de Oro Medical Arts suites, doctor room allocations, and QR door signage.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchClinics}
            disabled={refreshing}
            className="h-9 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="brand"
            size="sm"
            onClick={handleOpenAddModal}
            className="h-9 text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Consultation Suite
          </Button>
        </div>
      </div>

      {/* Dynamic In-App Status Notification Banner */}
      {bannerAlert && (
        <Alert
          variant={bannerAlert.type === 'destructive' ? 'destructive' : bannerAlert.type === 'warning' ? 'warning' : 'success'}
          className="shadow-xs"
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <AlertTitle className="font-bold">{bannerAlert.title}</AlertTitle>
              <AlertDescription className="text-xs">{bannerAlert.message}</AlertDescription>
            </div>
            <button
              type="button"
              onClick={() => setBannerAlert(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 ml-4"
            >
              Dismiss
            </button>
          </div>
        </Alert>
      )}

      {/* 2. Executive Management KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Consultation Suites</p>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalClinicsCount}</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 border-slate-200">
              Verified Rooms
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Hospital Complexes</p>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-brand-700">{affiliatedHospitalsCount}</span>
            <Badge variant="outline" className="text-[10px] font-bold bg-brand-50 text-brand-800 border-brand-200">
              CDO Regional Network
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Physicians</p>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-700">{assignedDoctorsCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Across All Suites</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Operating Consultation Rooms</p>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{activeQueuingRoomsCount}</span>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Ready
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Zero-Hardware Standee Explainer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-brand-700 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                Static Printed Door QR Signage Engine
              </h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                Zero Hardware Required
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Every room registered in Supabase generates a permanent, high-contrast QR door standee. Arriving patients simply point their smartphone camera at the printed door sign to check in or take a walk-in queue token.
            </p>
          </div>
        </div>

        {clinics.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenQRStandee(clinics[0])}
            className="text-xs font-bold shrink-0 border-slate-300 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            Preview Standee Sheet
          </Button>
        )}
      </div>

      {/* 4. Search & Filter Bar */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by suite name, room #, building, hospital, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hospital:</span>
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-brand-700"
              >
                <option value="ALL">All Hospital Complexes ({hospitals.length || affiliatedHospitalsCount})</option>
                {hospitals.map((h) => {
                  const label = h.short_name || h.name;
                  return (
                    <option key={h.id} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-brand-700"
              >
                <option value="ALL">All Operational Statuses</option>
                <option value="ACTIVE">Active (Live Queuing)</option>
                <option value="MAINTENANCE">Under Maintenance</option>
                <option value="INACTIVE">Decommissioned</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Consultation Suites Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-700" />
            Registered Clinic Suites &amp; Rooms ({filteredClinics.length})
          </h2>
          <span className="text-[11px] text-slate-400">Directly synchronized with Supabase</span>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <RefreshCw className="h-6 w-6 text-brand-700 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Connecting to Supabase clinic repository...</p>
          </div>
        ) : filteredClinics.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No consultation suites match your search</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the hospital or status filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClinics.map((clinic) => {
              const primarySchedule = clinic.doctor_clinic_schedules?.[0];
              const docProfile = primarySchedule?.doctors?.profiles;
              const docSpecialty = primarySchedule?.doctors?.specialty;
              const activeSession = clinic.queue_sessions?.[0];
              const isMaintenance = clinic.status === 'MAINTENANCE';

              return (
                <Card
                  key={clinic.id}
                  className={`bg-white border-slate-200 shadow-xs hover:border-slate-300 transition ${
                    isMaintenance ? 'opacity-75 bg-slate-50/50' : ''
                  }`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200">
                            {clinic.hospital_name}
                          </Badge>
                          <Badge
                            className={`text-[10px] font-bold ${
                              clinic.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {clinic.status}
                          </Badge>
                        </div>

                        <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                          {clinic.room_number} &bull; {clinic.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {clinic.building_name || 'Medical Arts Complex'}, {clinic.floor_number || 'Room Level'}
                        </CardDescription>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200 shrink-0">
                        <Clock className="h-3 w-3 mr-1 text-slate-400" />
                        {clinic.operating_hours || 'Mon–Fri 8:00 AM – 5:00 PM'}
                      </Badge>
                    </div>

                    {/* Practicing Physician Assigned */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-start justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs shrink-0">
                            <Stethoscope className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {docProfile?.full_name ? `${docProfile.full_name}` : 'Open Room (Unassigned)'}
                            </p>
                            <p className="text-[11px] text-brand-700 font-semibold">
                              {docSpecialty || 'General Outpatient Care'}
                            </p>
                          </div>
                        </div>

                        {/* Weekly Schedule Days Badges */}
                        {clinic.doctor_clinic_schedules && clinic.doctor_clinic_schedules.length > 0 && (
                          <div className="pl-9 flex flex-wrap gap-1 mt-1">
                            {clinic.doctor_clinic_schedules.map((s) => {
                              const dayObj = DAYS_OF_WEEK.find((d) => d.value === s.day_of_week);
                              const dayLabel = dayObj ? dayObj.label.slice(0, 3) : `Day ${s.day_of_week}`;
                              return (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200"
                                >
                                  {dayLabel} {s.start_time ? s.start_time.slice(0, 5) : ''}–{s.end_time ? s.end_time.slice(0, 5) : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {activeSession && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Serving</span>
                          <p className="text-sm font-black text-brand-700">#{activeSession.current_serving_number}</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Direct Telephone: <strong>{clinic.contact_phone || 'Reception ext. 101'}</strong></span>
                      <span>City: <strong>{clinic.city}</strong></span>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/c/${clinic.id}`}
                        target="_blank"
                        className="text-xs font-semibold text-slate-600 hover:text-brand-700 flex items-center gap-1 transition"
                      >
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                        Patient Link
                      </Link>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(clinic)}
                        className={`h-7 px-2 text-[11px] font-semibold ${
                          clinic.status === 'ACTIVE'
                            ? 'text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={clinic.status === 'ACTIVE' ? 'Set to Maintenance' : 'Set to Active'}
                      >
                        <Power className="h-3 w-3 mr-1" />
                        {clinic.status === 'ACTIVE' ? 'Maintenance' : 'Activate'}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(clinic)}
                        className="h-8 px-2.5 text-xs font-semibold border-slate-200 hover:bg-white gap-1"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => handleOpenQRStandee(clinic)}
                        className="h-8 px-2.5 text-xs font-bold gap-1 shadow-xs"
                      >
                        <Printer className="h-3 w-3" />
                        Door Standee
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDeleteConfirm(clinic)}
                        className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        title="Decommission Clinic Room"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADD CLINIC SUITE ── */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-brand-700" />
              Register New Consultation Suite
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Adds a clinical consultation room to the official hospital directory with relational doctor scheduling.
            </DialogDescription>
          </DialogHeader>

          {addModalError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{addModalError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmitAdd} className="space-y-4 py-1 text-xs">
            {/* Hospital Master Dropdown */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hospital Facility Complex <span className="text-rose-500">*</span>
              </label>
              <select
                value={addForm.hospitalId}
                onChange={(e) => handleAddHospitalSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-700 font-medium"
                required
              >
                <option value="">Select Official Hospital Facility</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.short_name || h.name} &bull; {h.city}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Linked to the official DOH licensed hospital master catalog.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Suite / Clinic Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Pediatrics & Adolescent Care"
                  className="text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Room / Suite Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={addForm.roomNumber}
                  onChange={(e) => setAddForm({ ...addForm, roomNumber: e.target.value })}
                  placeholder="e.g. Room 304 or Suite 402"
                  className="text-xs bg-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Building Name</label>
                <Input
                  value={addForm.buildingName}
                  onChange={(e) => setAddForm({ ...addForm, buildingName: e.target.value })}
                  placeholder="e.g. Medical Arts Building"
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Floor Level</label>
                <Input
                  value={addForm.floorNumber}
                  onChange={(e) => setAddForm({ ...addForm, floorNumber: e.target.value })}
                  placeholder="e.g. 3rd Floor"
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Direct Reception Contact</label>
                <Input
                  value={addForm.contactPhone}
                  onChange={(e) => setAddForm({ ...addForm, contactPhone: e.target.value })}
                  placeholder="e.g. +63 (88) 857-4000 loc. 304"
                  className="text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
                <Input
                  value={addForm.operatingHours}
                  onChange={(e) => setAddForm({ ...addForm, operatingHours: e.target.value })}
                  placeholder="e.g. MWF 8:30 AM – 1:30 PM"
                  className="text-xs bg-white"
                />
              </div>
            </div>

            {/* Optional Primary Doctor Assignment */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assign Practicing Physician (Optional)
                </label>
                <select
                  value={addForm.assignedDoctorId}
                  onChange={(e) => setAddForm({ ...addForm, assignedDoctorId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-700"
                >
                  <option value="">No Doctor Assigned (Shared Consultation Room)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.profiles?.full_name || 'Physician'} ({d.specialty}) &bull; {d.hospital_affiliation}
                    </option>
                  ))}
                </select>
              </div>

              {addForm.assignedDoctorId && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Consultation Days (Select All That Apply)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = addForm.scheduleDays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => {
                              const newDays = isSelected
                                ? addForm.scheduleDays.filter((val) => val !== d.value)
                                : [...addForm.scheduleDays, d.value].sort();
                              setAddForm({ ...addForm, scheduleDays: newDays });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d.label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                    {addForm.scheduleDays.length === 0 && (
                      <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                        Please select at least one consultation day.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Time</label>
                      <Input
                        type="time"
                        value={addForm.startTime}
                        onChange={(e) => setAddForm({ ...addForm, startTime: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">End Time</label>
                      <Input
                        type="time"
                        value={addForm.endTime}
                        onChange={(e) => setAddForm({ ...addForm, endTime: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                className="text-xs font-bold"
              >
                {isSubmittingAdd ? 'Registering Suite...' : 'Save Consultation Suite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: EDIT CLINIC SUITE ── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-brand-700" />
              Edit Consultation Suite Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Update room allocations, reception contacts, and operating hours.
            </DialogDescription>
          </DialogHeader>

          {editModalError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertTitle className="text-xs font-bold">Validation Error</AlertTitle>
              <AlertDescription className="text-xs">{editModalError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmitEdit} className="space-y-4 py-1 text-xs">
            {/* Hospital Facility Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hospital Facility Complex <span className="text-rose-500">*</span>
              </label>
              <select
                value={editForm.hospitalId}
                onChange={(e) => handleEditHospitalSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-700 font-medium"
                required
              >
                <option value="">Select Official Hospital Facility</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.short_name || h.name} &bull; {h.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Suite Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Room Number</label>
                <Input
                  value={editForm.roomNumber}
                  onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })}
                  className="text-xs bg-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Building</label>
                <Input
                  value={editForm.buildingName}
                  onChange={(e) => setEditForm({ ...editForm, buildingName: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Floor</label>
                <Input
                  value={editForm.floorNumber}
                  onChange={(e) => setEditForm({ ...editForm, floorNumber: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reception Phone</label>
                <Input
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  className="text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
                <Input
                  value={editForm.operatingHours}
                  onChange={(e) => setEditForm({ ...editForm, operatingHours: e.target.value })}
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Operational Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-700"
              >
                <option value="ACTIVE">ACTIVE (Accepting Queues)</option>
                <option value="MAINTENANCE">MAINTENANCE (Temporarily Closed)</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Doctor Assignment & Schedule Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Assigned Practicing Physician
                </label>
                <select
                  value={editForm.assignedDoctorId}
                  onChange={(e) => setEditForm({ ...editForm, assignedDoctorId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-700"
                >
                  <option value="">Unassigned (Shared Consultation Room)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.profiles?.full_name || 'Physician'} ({d.specialty}) &bull; {d.hospital_affiliation}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Select &quot;Unassigned&quot; to clear any active physician schedule for this room.
                </p>
              </div>

              {editForm.assignedDoctorId && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Consultation Days (Select All That Apply)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = editForm.scheduleDays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => {
                              const newDays = isSelected
                                ? editForm.scheduleDays.filter((val) => val !== d.value)
                                : [...editForm.scheduleDays, d.value].sort();
                              setEditForm({ ...editForm, scheduleDays: newDays });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d.label.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                    {editForm.scheduleDays.length === 0 && (
                      <p className="text-[10px] text-rose-600 mt-1 font-semibold">
                        Please select at least one consultation day.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Time</label>
                      <Input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">End Time</label>
                      <Input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                        className="text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
                {isSubmittingEdit ? 'Saving Changes...' : 'Update Suite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: DECOMMISSION CONFIRM DIALOG ── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Decommission Consultation Suite?"
        description={
          clinicToDelete
            ? `Are you sure you want to permanently decommission ${clinicToDelete.room_number} (${clinicToDelete.name}) at ${clinicToDelete.hospital_name}? The system will verify that no active queue session is running before decommissioning. This action is recorded in the RA 10173 audit log.`
            : ''
        }
        confirmLabel="Decommission Suite"
        cancelLabel="Keep Room Active"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* ── MODAL 4: HIGH-CONTRAST A4 DOOR STANDEE SHEET ── */}
      <Dialog open={qrStandeeModalOpen} onOpenChange={setQrStandeeModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-slate-200 p-6 print:p-0 print:border-0 print:shadow-none print:max-w-none print:h-auto">
          <DialogHeader className="print:hidden pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="h-5 w-5 text-brand-700" />
                  Printable Clinic Door Standee
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  High-contrast clinical signage designed for A4 laminating or acrylic desk/door standees.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedClinicForQR && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-start">
              {/* Left: The Printable Standee Sheet */}
              <div className="md:col-span-7 flex justify-center">
                <div
                  id="clinic-printable-standee"
                  className="w-full max-w-sm bg-white rounded-2xl border border-slate-300 shadow-md p-6 text-center space-y-4 print:border-0 print:shadow-none print:m-0 print:p-0 print:max-w-none"
                >
                  {/* Top Brand Bar */}
                  <div className="flex items-center justify-center gap-2 pb-2 border-b border-slate-200">
                    <div className="h-7 w-7 rounded-lg bg-brand-700 text-white flex items-center justify-center font-black text-xs">
                      CN
                    </div>
                    <span className="text-base font-black tracking-tight text-slate-900">
                      CLINIC NATIN
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Patient Check-In
                    </span>
                  </div>

                  {/* Hospital & Room Identity */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                      {selectedClinicForQR.hospital_name}
                    </p>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {selectedClinicForQR.room_number}
                    </h2>
                    <p className="text-xs font-semibold text-slate-600">
                      {selectedClinicForQR.name}
                    </p>
                    {selectedClinicForQR.doctor_clinic_schedules?.[0]?.doctors?.profiles?.full_name ? (
                      <div className="pt-0.5">
                        <p className="text-xs font-bold text-slate-900">
                          {(() => {
                            const raw = selectedClinicForQR.doctor_clinic_schedules[0].doctors.profiles.full_name;
                            const title = selectedClinicForQR.doctor_clinic_schedules[0].doctors.title;
                            if (raw.startsWith('Dr.') || raw.startsWith('Dr ')) return raw;
                            return `${title ? title + ' ' : 'Dr. '}${raw}`;
                          })()}
                        </p>
                        <p className="text-[11px] font-medium text-brand-700">
                          {selectedClinicForQR.doctor_clinic_schedules[0].doctors.specialty}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] font-medium text-slate-500">
                        General &amp; Multi-Specialty Consultation Suite
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      Hours: {selectedClinicForQR.operating_hours || 'Mon–Fri 8:00 AM – 5:00 PM'}
                    </p>
                  </div>

                  {/* Dynamic QR Code Canvas */}
                  <div className="mx-auto w-fit p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-xs">
                    {qrDataUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={qrDataUrl}
                        alt="Door Check-in QR Code"
                        className="w-56 h-56 object-contain"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center bg-slate-50">
                        <QrCode className="h-12 w-12 text-slate-300 animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-left space-y-1.5 text-[11px] text-slate-700">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand-700" />
                      How to Check In:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      <li>Open your smartphone camera &amp; scan the QR code.</li>
                      <li>Tap the link to confirm your arrival or get a walk-in token.</li>
                      <li>Wait comfortably; we will text you when 2 patients are ahead.</li>
                    </ol>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono">
                    Direct Reception: {selectedClinicForQR.contact_phone || '+63 (88) 857-4000'}
                  </p>
                </div>
              </div>

              {/* Right: Controls & Actions */}
              <div className="md:col-span-5 space-y-4 print:hidden">
                {/* Target Domain Selector */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
                  <label className="text-xs font-bold text-slate-900 block">
                    Encoded QR Destination URL
                  </label>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Choose whether this printed standee encodes the real public cloud URL or local development server.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setQrTargetDomain('PRODUCTION')}
                      className={`p-2 rounded-xl text-left border text-xs transition ${
                        qrTargetDomain === 'PRODUCTION'
                          ? 'border-brand-700 bg-brand-50/70 text-brand-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold text-brand-700">Recommended</span>
                      Production
                      <span className="block text-[10px] text-slate-400 font-mono truncate">clinicnatin.ph</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrTargetDomain('LOCAL')}
                      className={`p-2 rounded-xl text-left border text-xs transition ${
                        qrTargetDomain === 'LOCAL'
                          ? 'border-brand-700 bg-brand-50/70 text-brand-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Dev Only</span>
                      Localhost
                      <span className="block text-[10px] text-slate-400 font-mono truncate">localhost:3000</span>
                    </button>
                  </div>
                  <div className="pt-1">
                    <p className="text-[10px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-200 truncate">
                      {getStandeeCheckinUrl(selectedClinicForQR.id)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-brand-700" />
                    Signage Deployment Options
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Designed for standard <strong>A4 Paper Laminate</strong> or <strong>Acrylic Standees</strong> mounted on clinic consultation doors.
                  </p>

                  <div className="space-y-2 pt-1">
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={handlePrintStandee}
                      className="w-full text-xs font-bold gap-2 shadow-xs"
                    >
                      <Printer className="h-4 w-4" />
                      Print Standee (A4 Format)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="w-full text-xs font-semibold gap-2 border-slate-300 bg-white"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                      {copiedUrl ? 'Copied to Clipboard' : 'Copy Direct Check-in URL'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950 text-xs">
                  <p className="font-bold mb-1">Administrative Note</p>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    This QR code is tied permanently to Supabase record <code>{selectedClinicForQR.id.slice(0, 8)}...</code>. Arriving patients automatically load this consultation room.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Global scoped print styles for standee */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #clinic-printable-standee,
              #clinic-printable-standee * {
                visibility: visible !important;
              }
              #clinic-printable-standee {
                position: fixed !important;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%) !important;
                width: 100% !important;
                max-width: 440px !important;
                box-shadow: none !important;
                border: 2px solid #091e42 !important;
                border-radius: 1rem !important;
                padding: 2rem !important;
                margin: 0 !important;
                background: #ffffff !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>
        </DialogContent>
      </Dialog>
    </div>
  );
}
