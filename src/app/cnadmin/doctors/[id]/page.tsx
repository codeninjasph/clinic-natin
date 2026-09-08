'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Crown,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Edit,
  Trash2,
  RefreshCw,
  XCircle,
  Stethoscope,
  Hospital,
  MapPin,
  FileBadge2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface DoctorDetail {
  id: string;
  profile_id: string;
  title: string | null;
  specialty: string | null;
  subspecialty: string | null;
  prc_license: string | null;
  prc_expiry: string | null;
  ptr_number: string | null;
  s2_license: string | null;
  board_certification: string | null;
  bio: string | null;
  consultation_fee_default: number | null;
  hmo_accreditations: string[] | null;
  is_verified: boolean;
  verification_status: string;
  subscription_tier: string;
  pro_tier_active: boolean;
  hospital_affiliation: string | null;
  room_assignment: string | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
    avatar_url: string | null;
  } | null;
}

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = React.useState<DoctorDetail | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const fetchDoctor = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/admin/doctors?id=${doctorId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load physician profile.');
      }
      setDoctor(data.doctor);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error fetching doctor.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  React.useEffect(() => {
    if (doctorId) {
      fetchDoctor();
    }
  }, [doctorId, fetchDoctor]);

  const handleUpdateStatus = async (newStatus: string, verified: boolean) => {
    if (!doctor) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doctor.id,
          verification_status: newStatus,
          is_verified: verified,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update credentialing status.');

      setSuccessMsg(`Status successfully updated to ${newStatus}.`);
      await fetchDoctor();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update doctor status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleProTier = async () => {
    if (!doctor) return;
    const nextTier = doctor.subscription_tier === 'pro' ? 'free' : 'pro';
    const nextProActive = nextTier === 'pro';

    try {
      setActionLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/admin/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doctor.id,
          subscription_tier: nextTier,
          pro_tier_active: nextProActive,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to toggle tier.');

      setSuccessMsg(`Subscription tier switched to ${nextTier.toUpperCase()}.`);
      await fetchDoctor();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle subscription tier.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!doctor) return;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${doctor.profiles?.full_name || 'this doctor'}? This action deletes credentials and cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/doctors?id=${doctor.id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete doctor.');

      router.push('/cnadmin/doctors');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete physician profile.');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-700 mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Querying physician record from database...</p>
      </div>
    );
  }

  if (errorMsg && !doctor) {
    return (
      <div className="p-8 text-center space-y-4 bg-white border border-rose-200 rounded-xl max-w-lg mx-auto">
        <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
        <p className="text-sm font-bold text-slate-900">Physician Profile Not Found</p>
        <p className="text-xs text-rose-700">{errorMsg}</p>
        <Button variant="outline" asChild size="sm">
          <Link href="/cnadmin/doctors">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  if (!doctor) return null;

  const isVerified = doctor.verification_status === 'VERIFIED' || doctor.is_verified;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Breadcrumb & Notification Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 w-fit">
          <Link href="/cnadmin/doctors">
            <ArrowLeft className="h-4 w-4" />
            Back to Doctor Directory
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDoctor}
            disabled={loading || actionLoading}
            className="text-xs text-slate-700 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Record
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteDoctor}
            disabled={actionLoading}
            className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Doctor
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Header Profile Banner */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
                {(doctor.profiles?.full_name || 'MD')
                  .replace('Dr. ', '')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {doctor.title ? `${doctor.title} ` : ''}{doctor.profiles?.full_name || 'Unnamed Physician'}
                  </h1>
                  <Badge
                    className={`text-[10px] font-bold ${
                      doctor.verification_status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : doctor.verification_status === 'RE_UPLOAD_REQUESTED'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : doctor.verification_status === 'REVOKED'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}
                  >
                    {doctor.verification_status || (isVerified ? 'VERIFIED' : 'PENDING')}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-brand-700 mt-0.5">
                  {doctor.specialty || 'General Practitioner'} {doctor.subspecialty && `• ${doctor.subspecialty}`}
                </p>
                <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Hospital className="h-3.5 w-3.5 text-slate-400" />
                    {doctor.hospital_affiliation || 'Hospital Affiliation Unassigned'}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {doctor.room_assignment || 'Room Unassigned'}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-mono">
                    <FileBadge2 className="h-3.5 w-3.5 text-slate-400" />
                    PRC #{doctor.prc_license || 'None'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleProTier}
                disabled={actionLoading}
                className={`text-xs font-bold gap-1.5 ${
                  doctor.subscription_tier === 'pro'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Crown className={`h-3.5 w-3.5 ${doctor.subscription_tier === 'pro' ? 'text-amber-600' : 'text-slate-400'}`} />
                {doctor.subscription_tier === 'pro' ? 'Pro Tier Active (₱1,499/mo)' : 'Free Tier'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Administrative Action Bar */}
      <Card className="bg-slate-50 border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-700" />
                Administrative Licensing Actions
              </p>
              <p className="text-[11px] text-slate-500">
                Official regulatory controls affecting queue visibility, e-prescriptions, and consultation booking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {doctor.verification_status !== 'VERIFIED' && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus('VERIFIED', true)}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verify & Approve Credentials
                </Button>
              )}

              {doctor.verification_status !== 'RE_UPLOAD_REQUESTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus('RE_UPLOAD_REQUESTED', false)}
                  disabled={actionLoading}
                  className="text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100 text-xs font-semibold gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Request Document Re-upload
                </Button>
              )}

              {doctor.verification_status !== 'REVOKED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus('REVOKED', false)}
                  disabled={actionLoading}
                  className="text-rose-800 bg-rose-50 border-rose-200 hover:bg-rose-100 text-xs font-semibold gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  Revoke / Suspend
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Credentials & Licensing Dossier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-700" />
              PRC & Regulatory Registration
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Official credentials on record in PostgreSQL database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">PRC License Number:</span>
              <strong className="font-mono text-slate-900">#{doctor.prc_license || 'Not Provided'}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">PRC Expiration Date:</span>
              <strong className="text-slate-900">{doctor.prc_expiry || 'Not on file'}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">PDEA Dangerous Drugs S2:</span>
              <strong className="font-mono text-slate-900">{doctor.s2_license || 'Not Provided'}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Professional Tax Receipt (PTR):</span>
              <strong className="font-mono text-slate-900">{doctor.ptr_number || 'Not Provided'}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Board Certification:</span>
              <strong className="text-slate-900 text-right">{doctor.board_certification || 'Not Provided'}</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Default Consultation Fee:</span>
              <strong className="text-emerald-700 font-bold">
                ₱{(doctor.consultation_fee_default || 0).toFixed(2)}
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Clinic Affiliations */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Hospital className="h-4 w-4 text-blue-700" />
              Contact & Hospital Station
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Direct practitioner profile and clinic room assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                Email Address:
              </span>
              <span className="font-mono text-slate-900 font-medium">{doctor.profiles?.email || 'None on file'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                Phone Number:
              </span>
              <span className="font-mono text-slate-900 font-medium">{doctor.profiles?.phone_number || 'None on file'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Hospital Affiliation:
              </span>
              <span className="text-slate-900 font-medium">{doctor.hospital_affiliation || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Room Assignment:
              </span>
              <span className="text-slate-900 font-medium">{doctor.room_assignment || 'Unassigned'}</span>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 block mb-1.5 font-semibold">Accepted HMO Accreditations:</span>
              <div className="flex flex-wrap gap-1.5">
                {(doctor.hmo_accreditations && doctor.hmo_accreditations.length > 0) ? (
                  doctor.hmo_accreditations.map((hmo) => (
                    <Badge key={hmo} variant="outline" className="bg-slate-50 text-slate-700 text-[10px]">
                      {hmo}
                    </Badge>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No HMOs accredited yet</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Biography & Notes */}
      {doctor.bio && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Physician Biography & Practice Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 leading-relaxed">{doctor.bio}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
