'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Shield, KeyRound, Lock, Phone, Mail, Calendar,
  HeartPulse, ShieldCheck, Download, Trash2, LogOut,
  ArrowLeft, CheckCircle2, AlertTriangle, RefreshCw,
  Clock, Award, HelpCircle, Eye, EyeOff
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// shadcn/ui components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  auth_id: string | null;
  role: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  allergies: string[] | null;
  comorbidities: string[] | null;
  maintenance_meds: string[] | null;
  priority_category: string | null;
  priority_id_number: string | null;
  hmo_provider: string | null;
  hmo_card_number: string | null;
  philhealth_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  is_onboarding_completed: boolean | null;
  created_at: string;
  updated_at?: string;
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function computeAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export default function PatientAccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  // Form States - Personal Profile
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('MALE');

  // Form States - Priority & HMO
  const [priorityCategory, setPriorityCategory] = useState('NONE');
  const [priorityIdNumber, setPriorityIdNumber] = useState('');
  const [hmoProvider, setHmoProvider] = useState('');
  const [hmoCardNumber, setHmoCardNumber] = useState('');
  const [philhealthNumber, setPhilhealthNumber] = useState('');

  // Form States - Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Spouse');

  // Form States - Security & Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status banners
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data privacy consent toggles
  const [consentShareVitals, setConsentShareVitals] = useState(true);
  const [consentSmsAlerts, setConsentSmsAlerts] = useState(true);

  // Deletion modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let p: UserProfile | null = null;

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (!error && data) {
          p = data as UserProfile;
        }
      }

      // Check demo user fallback
      if (!p && typeof window !== 'undefined') {
        const demoUserJson = localStorage.getItem('clinic_natin_demo_user');
        const demoRole = localStorage.getItem('clinic_natin_demo_role');
        if (demoUserJson || demoRole === 'PATIENT') {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', 'fbd0825e-9298-4eb9-b3b7-eca4ec515f14')
            .maybeSingle();

          if (data) {
            p = data as UserProfile;
          }
        }
      }

      if (p) {
        setProfile(p);
        setFullName(p.full_name || '');
        setPhoneNumber(p.phone_number || '');
        setEmail(p.email || '');
        setDateOfBirth(p.date_of_birth || '');
        setGender(p.gender || 'MALE');
        setPriorityCategory(p.priority_category || 'NONE');
        setPriorityIdNumber(p.priority_id_number || '');
        setHmoProvider(p.hmo_provider || '');
        setHmoCardNumber(p.hmo_card_number || '');
        setPhilhealthNumber(p.philhealth_number || '');
        setEmergencyName(p.emergency_contact_name || '');
        setEmergencyPhone(p.emergency_contact_phone || '');
        setEmergencyRelationship(p.emergency_contact_relationship || 'Spouse');
      }
    } catch (e) {
      console.error('Error fetching account profile:', e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  // 1. Save Personal Info
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    if (!fullName.trim()) {
      showNotification('Full name is required.', true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim() || null,
          email: email.trim() || null,
          date_of_birth: dateOfBirth || null,
          gender: gender,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        showNotification(error.message, true);
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                full_name: fullName.trim(),
                phone_number: phoneNumber.trim() || null,
                email: email.trim() || null,
                date_of_birth: dateOfBirth || null,
                gender: gender,
              }
            : null
        );
        showNotification('Personal profile updated successfully!');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to update profile.', true);
    } finally {
      setSaving(false);
    }
  };

  // 2. Save Priority & HMO
  const handleSavePriorityHMO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          priority_category: priorityCategory,
          priority_id_number: priorityIdNumber.trim() || null,
          hmo_provider: hmoProvider.trim() || null,
          hmo_card_number: hmoCardNumber.trim() || null,
          philhealth_number: philhealthNumber.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        showNotification(error.message, true);
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                priority_category: priorityCategory,
                priority_id_number: priorityIdNumber.trim() || null,
                hmo_provider: hmoProvider.trim() || null,
                hmo_card_number: hmoCardNumber.trim() || null,
                philhealth_number: philhealthNumber.trim() || null,
              }
            : null
        );
        showNotification('Priority status and HMO credentials saved!');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to save priority credentials.', true);
    } finally {
      setSaving(false);
    }
  };

  // 3. Save Emergency Contact
  const handleSaveEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          emergency_contact_relationship: emergencyRelationship.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        showNotification(error.message, true);
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                emergency_contact_name: emergencyName.trim() || null,
                emergency_contact_phone: emergencyPhone.trim() || null,
                emergency_contact_relationship: emergencyRelationship.trim() || null,
              }
            : null
        );
        showNotification('Emergency contact updated successfully!');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to update emergency contact.', true);
    } finally {
      setSaving(false);
    }
  };

  // 4. Update Password via Supabase Auth
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showNotification('Password must be at least 6 characters long.', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match.', true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        showNotification(error.message, true);
      } else {
        showNotification('Security credentials updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to update password.', true);
    } finally {
      setSaving(false);
    }
  };

  // 5. Export Patient Clinical Data (RA 10173 Data Portability)
  const handleExportData = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Fetch medical records to include in archive
      const { data: records } = await supabase
        .from('medical_records')
        .select(`
          id, created_at, chief_complaint, diagnosis, vitals,
          prescriptions_lab_requests ( id, item_type, details, instructions, generic_name, dosage, frequency )
        `)
        .eq('patient_id', profile.id);

      const exportPackage = {
        platform: 'Clinic Natin EMR',
        export_date: new Date().toISOString(),
        patient_profile: profile,
        medical_records: records || [],
        compliance_notice: 'Exported under Section 18 (Data Portability) of the Philippine Data Privacy Act of 2012 (RA 10173).',
      };

      const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinic-natin-health-archive-${profile.full_name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Clinical data package downloaded successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Could not export clinical data.', true);
    } finally {
      setSaving(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('clinic_natin_demo_user');
      localStorage.removeItem('clinic_natin_demo_role');
      router.push('/login');
    }
  };

  const patientAge = computeAge(dateOfBirth || profile?.date_of_birth);

  return (
    <main className="min-h-screen bg-slate-50/70 pb-20">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-slate-600">
              <Link href="/my-queue">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Queue
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-4" />
            <div>
              <span className="text-sm font-black text-slate-900 leading-none block">Account Settings</span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">Patient Identity &amp; Security</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="rounded-xl text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {/* Feedback Alert Banners */}
        {successMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 animate-in fade-in duration-200">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Profile Card Header */}
        <Card className="rounded-3xl border-slate-200 bg-white shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="h-16 w-16 ring-4 ring-brand-100 ring-offset-2 shrink-0">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-brand-300 to-brand-700 text-white font-black text-xl">
                    {profile ? getInitials(profile.full_name) : <User className="h-7 w-7" />}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black text-slate-900 truncate">
                      {profile?.full_name || 'Patient Account'}
                    </h1>
                    <Badge variant="brand" className="text-[10px] px-2 py-0 font-bold">
                      Verified Patient
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {profile?.email || 'patient@clinicnatin.ph'} &bull; {profile?.phone_number || '+63 9XX XXX XXXX'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" /> RA 10173 Protected
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" /> Member since {profile ? new Date(profile.created_at).getFullYear() : '2026'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Health Passport Quick Chip */}
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold border-brand-200 bg-brand-50/50 text-brand-700 hover:bg-brand-100">
                  <Link href="/onboarding">
                    <HeartPulse className="h-3.5 w-3.5 mr-1" />
                    Open Health Passport
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 rounded-2xl bg-slate-200/70 gap-1">
            <TabsTrigger value="personal" className="rounded-xl text-xs font-bold py-2">
              <User className="h-3.5 w-3.5 mr-1.5" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl text-xs font-bold py-2">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Security
            </TabsTrigger>
            <TabsTrigger value="hmo" className="rounded-xl text-xs font-bold py-2">
              <Award className="h-3.5 w-3.5 mr-1.5" />
              Priority &amp; HMO
            </TabsTrigger>
            <TabsTrigger value="emergency" className="rounded-xl text-xs font-bold py-2">
              <Phone className="h-3.5 w-3.5 mr-1.5" />
              Emergency
            </TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-xl text-xs font-bold py-2 col-span-2 sm:col-span-1">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Data Privacy
            </TabsTrigger>
          </TabsList>

          {/* ================================================================= */}
          {/* TAB 1: PERSONAL INFORMATION */}
          {/* ================================================================= */}
          <TabsContent value="personal" className="mt-4">
            <Card className="rounded-3xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900">Personal Information</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Your legal identity matched with Philippine civil records for clinic consultations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Full Legal Name (First, Middle, Last)
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Andres C. Bonifacio"
                      className="rounded-xl text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Philippine Mobile Number (SMS Alerts)
                      </label>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Date of Birth {patientAge !== null && `(${patientAge} years old)`}
                      </label>
                      <Input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Biological Sex
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other / Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving}
                      variant="brand"
                      className="rounded-xl text-xs font-bold px-6"
                    >
                      {saving ? 'Saving to Database…' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 2: SECURITY & CREDENTIALS */}
          {/* ================================================================= */}
          <TabsContent value="security" className="mt-4">
            <Card className="rounded-3xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900">Security &amp; Password</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update your authentication credentials and manage session safety
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="rounded-xl text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Confirm New Password
                      </label>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving || !newPassword}
                      variant="brand"
                      className="rounded-xl text-xs font-bold px-6"
                    >
                      {saving ? 'Updating Password…' : 'Update Password'}
                    </Button>
                  </div>
                </form>

                <Separator />

                {/* Session details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Session Information</h4>
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Platform Role:</span>
                      <span className="font-bold text-slate-900">PATIENT (Outpatient Portal)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Internal Patient UUID:</span>
                      <span className="font-mono font-bold text-slate-700">{profile?.id || '\u2014'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supabase Auth State:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated &bull; TLS 1.3 Encrypted
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 3: PRIORITY & HMO ACCREDITATION */}
          {/* ================================================================= */}
          <TabsContent value="hmo" className="mt-4">
            <Card className="rounded-3xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900">Priority Lane &amp; Healthcare Coverage</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Statutory express lanes under Philippine law (RA 9994, RA 7277) and HMO insurance cards
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSavePriorityHMO} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Statutory Priority Category
                    </label>
                    <select
                      value={priorityCategory}
                      onChange={(e) => setPriorityCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
                    >
                      <option value="NONE">Regular Queue (Standard Outpatient)</option>
                      <option value="SENIOR">RA 9994 Senior Citizen (20% Statutory Discount &amp; Express Lane)</option>
                      <option value="PWD">RA 7277 Person With Disability (PWD Express Lane)</option>
                      <option value="PREGNANT">Pregnant / Maternal Care Express Lane</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Senior Citizen OSCA ID or PWD Identification Card Number
                    </label>
                    <Input
                      value={priorityIdNumber}
                      onChange={(e) => setPriorityIdNumber(e.target.value)}
                      placeholder="e.g. OSCA-CDO-2023-8821"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Primary HMO Insurance Provider
                      </label>
                      <Input
                        value={hmoProvider}
                        onChange={(e) => setHmoProvider(e.target.value)}
                        placeholder="e.g. Maxicare / Intellicare / Medicard / PhilHealth Konsulta"
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        HMO Card / Policy Number
                      </label>
                      <Input
                        value={hmoCardNumber}
                        onChange={(e) => setHmoCardNumber(e.target.value)}
                        placeholder="e.g. 1192-8821-4920"
                        className="rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      PhilHealth Identification Number (PIN)
                    </label>
                    <Input
                      value={philhealthNumber}
                      onChange={(e) => setPhilhealthNumber(e.target.value)}
                      placeholder="12-050293819-4"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving}
                      variant="brand"
                      className="rounded-xl text-xs font-bold px-6"
                    >
                      {saving ? 'Saving...' : 'Save Coverage & Priority'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 4: EMERGENCY CONTACT */}
          {/* ================================================================= */}
          <TabsContent value="emergency" className="mt-4">
            <Card className="rounded-3xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900">Emergency Contact Person</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Designated emergency point of contact for clinical emergencies during hospital visits
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveEmergencyContact} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Emergency Contact Full Name
                    </label>
                    <Input
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Gregoria de Jesus"
                      className="rounded-xl text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Relationship to Patient
                      </label>
                      <select
                        value={emergencyRelationship}
                        onChange={(e) => setEmergencyRelationship(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-brand-700 focus:outline-none"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Child">Child (Adult)</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Guardian">Legal Guardian</option>
                        <option value="Relative">Other Relative</option>
                        <option value="Friend">Friend / Caregiver</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Mobile Phone Number
                      </label>
                      <Input
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
                        className="rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving}
                      variant="brand"
                      className="rounded-xl text-xs font-bold px-6"
                    >
                      {saving ? 'Saving...' : 'Save Emergency Contact'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 5: DATA PRIVACY & COMPLIANCE (RA 10173) */}
          {/* ================================================================= */}
          <TabsContent value="privacy" className="mt-4 space-y-4">
            <Card className="rounded-3xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900">
                  Data Privacy (RA 10173) &amp; Consent Management
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Manage your data privacy rights, clinical data sharing, and export your health records
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Consent Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Share Vitals with Attending Doctors</p>
                      <p className="text-[11px] text-slate-500">
                        Permit clinic physicians to view your pre-entered BMI, blood type, and allergies upon queue call
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={consentShareVitals}
                      onChange={(e) => setConsentShareVitals(e.target.checked)}
                      className="h-4 w-4 rounded text-brand-700 focus:ring-brand-700"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Semaphore SMS Queue Notifications</p>
                      <p className="text-[11px] text-slate-500">
                        Receive official SMS notices when 2 patients are ahead of you in line
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={consentSmsAlerts}
                      onChange={(e) => setConsentSmsAlerts(e.target.checked)}
                      className="h-4 w-4 rounded text-brand-700 focus:ring-brand-700"
                    />
                  </div>
                </div>

                <Separator />

                {/* Data Portability (Section 18 RA 10173) */}
                <div className="rounded-2xl bg-brand-50/60 p-4 border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Right to Data Portability (RA 10173)</h4>
                    <p className="text-[11px] text-slate-500">
                      Export your complete digital health record, consultation history, and prescriptions into an encrypted JSON file.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportData}
                    disabled={saving}
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-bold shrink-0 bg-white border-brand-300 text-brand-700 hover:bg-brand-50"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download Health Archive
                  </Button>
                </div>

                <Separator />

                {/* Account Deletion / Danger Zone */}
                <div className="rounded-2xl bg-red-50/50 p-4 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-red-900">Request Account Deletion &amp; Right to Erasure</h4>
                    <p className="text-[11px] text-red-700">
                      Permanently delete your profile and personal identifiable data from Clinic Natin servers.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsDeleteModalOpen(true)}
                    variant="destructive"
                    size="sm"
                    className="rounded-xl text-xs font-bold shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Request Erasure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog for Data Erasure */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md p-6 sm:rounded-3xl">
          <DialogHeader className="text-left">
            <div className="h-10 w-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Confirm Account Erasure Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              In accordance with Section 16 of RA 10173 (Data Privacy Act), your account deactivation will remove all identifiable information. However, clinical consultation summaries will be archived in accordance with Department of Health (DOH) medical retention mandates.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              className="rounded-xl text-xs font-bold"
            >
              Confirm &amp; Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
