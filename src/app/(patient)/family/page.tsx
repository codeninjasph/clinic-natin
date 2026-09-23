'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  HeartPulse,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Pill,
  Ticket,
  ChevronRight,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Baby,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Dependent {
  id: string;
  primary_profile_id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  allergies: string[];
  comorbidities: string[];
  maintenance_meds: string[];
  priority_category: string;
  priority_id_number: string | null;
  hmo_provider: string | null;
  hmo_card_number: string | null;
}

export default function FamilyHubPage() {
  const router = useRouter();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Dependent Form
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('PARENT');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('FEMALE');
  const [bloodType, setBloodType] = useState('O+');
  const [priorityCategory, setPriorityCategory] = useState('SENIOR');
  const [priorityId, setPriorityId] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [comorbiditiesText, setComorbiditiesText] = useState('');
  const [hmoProvider, setHmoProvider] = useState('PhilHealth Konsulta');

  const fetchDependents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patient/dependents?profileId=971463e5-9348-42c0-b759-5b56f9df9e99');
      if (res.ok) {
        const json = await res.json();
        setDependents(json.dependents || []);
      }
    } catch (e) {
      console.error('Failed to load family members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependents();
  }, []);

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Full name is required');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        primaryProfileId: '971463e5-9348-42c0-b759-5b56f9df9e99',
        fullName: fullName.trim(),
        relationship,
        dateOfBirth: dob || null,
        gender,
        bloodType,
        priorityCategory,
        priorityIdNumber: priorityId.trim() || null,
        hmoProvider,
        allergies: allergiesText ? allergiesText.split(',').map((s) => s.trim()) : [],
        comorbidities: comorbiditiesText ? comorbiditiesText.split(',').map((s) => s.trim()) : [],
      };

      const res = await fetch('/api/patient/dependents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add dependent');
      }

      setIsAddOpen(false);
      // reset form
      setFullName('');
      setPriorityId('');
      setAllergiesText('');
      setComorbiditiesText('');
      fetchDependents();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save family member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;
    try {
      await fetch(`/api/patient/dependents?id=${id}`, { method: 'DELETE' });
      fetchDependents();
    } catch (e) {
      console.error('Failed to remove dependent:', e);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/70 pb-20">
      {/* ── Header ── */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-700" />
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Family Health Hub</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage clinical profiles and book hospital queue tokens for your parents &amp; children
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs gap-1.5 h-9 shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Family Member
          </Button>
        </div>
      </header>

      {/* ── Main Content (max-w-7xl 2xl:max-w-[1536px]) ── */}
      <div className="mx-auto max-w-7xl 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Philippine Family Culture Banner */}
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-teal-50/40 to-white p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Care for the Whole Family from One Account
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                In the Philippines, family care comes first. You can attach elderly parents to auto-apply their <strong>RA 9994 20% Senior Citizen discount</strong>, monitor their live queue from home, and keep pediatric immunization and allergy records organized.
              </p>
            </div>
          </div>
        </div>

        {/* ── Primary Account Holder Card ── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Primary Account Holder
          </h2>
          <Card className="rounded-2xl border-brand-200 bg-white shadow-xs overflow-hidden">
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-dark font-black text-sm">
                  DP
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">Dianne Pondoc</h3>
                    <Badge className="bg-brand-50 text-brand-dark border border-brand-200 text-[10px] font-bold">
                      Account Owner
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                      A+ Blood
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    09152796721 &bull; Maxicare &bull; Cagayan de Oro
                  </p>
                </div>
              </div>

              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold px-3.5 py-2 shadow-xs transition"
              >
                <Ticket className="h-3.5 w-3.5" />
                Book Doctor Token
              </Link>
            </div>
          </Card>
        </div>

        {/* ── Dependents Section ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Linked Family Dependents ({dependents.length})
            </h2>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Loading family members...
            </div>
          ) : dependents.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700 mt-2">No dependents linked yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add your parents (with Senior OSCA ID) or your children to book consultations and monitor live hospital queues on their behalf.
              </p>
              <Button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="mt-4 rounded-xl bg-brand-700 text-white text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Family Member
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dependents.map((dep) => (
                <Card key={dep.id} className="rounded-2xl border-slate-200 bg-white shadow-xs hover:border-slate-300 transition">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">
                          {dep.relationship === 'PARENT' ? '👵' : dep.relationship === 'CHILD' ? '👶' : '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">{dep.full_name}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {dep.relationship}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {dep.gender || 'Unknown'} &bull; Blood {dep.blood_type || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(dep.id)}
                        className="text-slate-400 hover:text-red-600 transition p-1"
                        title="Remove dependent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Priority & Statutory Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dep.priority_category === 'SENIOR' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                          RA 9994 Senior ({dep.priority_id_number || 'OSCA Active'})
                        </span>
                      )}
                      {dep.priority_category === 'PWD' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                          ♿ PWD (ID: {dep.priority_id_number})
                        </span>
                      )}
                      {dep.hmo_provider && (
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                          {dep.hmo_provider}
                        </span>
                      )}
                    </div>

                    {/* Allergies & Comorbidities */}
                    {dep.allergies && dep.allergies.length > 0 && (
                      <div className="text-xs text-slate-600 pt-1">
                        <span className="font-semibold text-slate-500 text-[11px]">Allergies: </span>
                        <span className="text-red-700 font-medium">{dep.allergies.join(', ')}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Passport &bull; Active
                      </span>
                      <Link
                        href="/discover"
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-dark px-2.5 py-1 text-xs font-bold transition"
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        Book Token for {dep.full_name.split(' ')[0]}
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ADD DEPENDENT MODAL ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-700" />
              Add Family Member
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a linked health profile for children or elderly parents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDependent} className="space-y-3.5 pt-2">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name</label>
              <Input
                placeholder="e.g. Corazon Pondoc"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => {
                    setRelationship(e.target.value);
                    if (e.target.value === 'PARENT') {
                      setPriorityCategory('SENIOR');
                    }
                  }}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5"
                >
                  <option value="PARENT">Parent (Mother / Father)</option>
                  <option value="CHILD">Child / Dependent</option>
                  <option value="SPOUSE">Spouse / Partner</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="OTHER">Other Relative</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5"
                >
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Blood Type</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'].map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority Lane */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Statutory Priority Lane</label>
              <select
                value={priorityCategory}
                onChange={(e) => setPriorityCategory(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5"
              >
                <option value="NONE">Regular (No Priority)</option>
                <option value="SENIOR">RA 9994 Senior Citizen (20% Statutory Discount)</option>
                <option value="PWD">RA 7277 Person with Disability (PWD)</option>
                <option value="PREGNANT">Maternal / Pregnant</option>
              </select>
            </div>

            {(priorityCategory === 'SENIOR' || priorityCategory === 'PWD') && (
              <div>
                <label className="text-xs font-bold text-amber-900 block mb-1">
                  {priorityCategory === 'SENIOR' ? 'OSCA Senior Citizen ID #' : 'PWD ID Number'}
                </label>
                <Input
                  placeholder={priorityCategory === 'SENIOR' ? 'e.g. OSCA-CDO-194829' : 'e.g. PWD-CDO-2023'}
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  className="text-xs h-9 bg-amber-50/50 border-amber-200"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Known Drug Allergies</label>
              <Input
                placeholder="e.g. Penicillin, Sulfa Drugs (or leave empty)"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">HMO / Health Insurance</label>
              <Input
                placeholder="e.g. PhilHealth Konsulta, Maxicare"
                value={hmoProvider}
                onChange={(e) => setHmoProvider(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs"
              >
                {isSaving ? 'Saving...' : 'Save Dependent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
