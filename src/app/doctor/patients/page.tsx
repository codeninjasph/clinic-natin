'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  Search,
  Users,
  Calendar,
  Phone,
  Shield,
  Pill,
  Activity,
  AlertTriangle,
  History,
  X,
  FileText,
  ChevronRight,
  Stethoscope,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDoctor } from '../doctor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface PatientRecord {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_type: string | null;
  allergies: string[];
  comorbidities: string[];
  maintenance_meds: string[];
  priority_category: string;
  hmo_provider: string | null;
  philhealth_number: string | null;
  created_at: string;
  visitCount: number;
  lastVisitDate: string | null;
}

interface EncounterDetail {
  id: string;
  created_at: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  icd10_code: string | null;
  vitals: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature_c?: number;
    weight_kg?: number;
    oxygen_saturation?: number;
  } | null;
  private_notes: string | null;
  followup_date: string | null;
  prescriptions: {
    id: string;
    item_type: string;
    generic_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    details?: string;
  }[];
}

export default function DoctorPatientsPage() {
  const supabase = createClient();
  const { doctor } = useDoctor();

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'SENIOR' | 'PWD' | 'PREGNANT' | 'REGULAR'>('ALL');
  const [comorbidityFilter, setComorbidityFilter] = useState<string>('ALL');

  // Selected Patient for EMR Drawer
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [encounters, setEncounters] = useState<EncounterDetail[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);

  // ── Fetch Patients ────────────────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles where role = 'PATIENT'
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select(
          'id, full_name, phone_number, email, date_of_birth, gender, blood_type, allergies, comorbidities, maintenance_meds, priority_category, hmo_provider, philhealth_number, created_at'
        )
        .eq('role', 'PATIENT')
        .order('full_name', { ascending: true });

      if (pErr) throw pErr;

      // 2. Fetch medical records for visit stats
      const { data: medRecords } = await supabase
        .from('medical_records')
        .select('patient_id, created_at');

      const visitMap = new Map<string, { count: number; lastDate: string }>();
      if (medRecords) {
        for (const mr of medRecords) {
          const curr = visitMap.get(mr.patient_id) || { count: 0, lastDate: mr.created_at };
          curr.count += 1;
          if (new Date(mr.created_at) > new Date(curr.lastDate)) {
            curr.lastDate = mr.created_at;
          }
          visitMap.set(mr.patient_id, curr);
        }
      }

      const formatted: PatientRecord[] = (profiles || []).map((p) => {
        const stats = visitMap.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          phone_number: p.phone_number,
          email: p.email,
          date_of_birth: p.date_of_birth,
          gender: p.gender,
          blood_type: p.blood_type,
          allergies: p.allergies || [],
          comorbidities: p.comorbidities || [],
          maintenance_meds: p.maintenance_meds || [],
          priority_category: p.priority_category || 'NONE',
          hmo_provider: p.hmo_provider,
          philhealth_number: p.philhealth_number,
          created_at: p.created_at,
          visitCount: stats?.count || 0,
          lastVisitDate: stats?.lastDate || null,
        };
      });

      setPatients(formatted);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ── Fetch Longitudinal Encounters for Selected Patient ────────────────────
  const handleSelectPatient = async (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setEncountersLoading(true);
    try {
      const { data: records, error: rErr } = await supabase
        .from('medical_records')
        .select(
          'id, created_at, chief_complaint, diagnosis, icd10_code, vitals, private_notes, followup_date'
        )
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (rErr) throw rErr;

      const fullEncounters: EncounterDetail[] = [];
      if (records) {
        for (const rec of records) {
          // Fetch prescriptions/lab items for this medical record
          const { data: items } = await supabase
            .from('prescriptions_lab_requests')
            .select('id, item_type, generic_name, dosage, frequency, duration, details')
            .eq('medical_record_id', rec.id);

          fullEncounters.push({
            id: rec.id,
            created_at: rec.created_at,
            chief_complaint: rec.chief_complaint,
            diagnosis: rec.diagnosis,
            icd10_code: rec.icd10_code,
            vitals: rec.vitals,
            private_notes: rec.private_notes,
            followup_date: rec.followup_date,
            prescriptions: items || [],
          });
        }
      }

      setEncounters(fullEncounters);
    } catch (err) {
      console.error('Error fetching encounters:', err);
      setEncounters([]);
    } finally {
      setEncountersLoading(false);
    }
  };

  // ── Filter Patients ───────────────────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const nameMatch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const phoneMatch = p.phone_number?.includes(searchQuery) || false;
      const hmoMatch = p.hmo_provider?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesSearch = !searchQuery || nameMatch || phoneMatch || hmoMatch;

      let matchesPriority = true;
      if (priorityFilter === 'SENIOR') matchesPriority = p.priority_category === 'SENIOR';
      else if (priorityFilter === 'PWD') matchesPriority = p.priority_category === 'PWD';
      else if (priorityFilter === 'PREGNANT') matchesPriority = p.priority_category === 'PREGNANT';
      else if (priorityFilter === 'REGULAR') matchesPriority = p.priority_category === 'NONE';

      let matchesComorbidity = true;
      if (comorbidityFilter !== 'ALL') {
        matchesComorbidity = p.comorbidities.some((c) =>
          c.toLowerCase().includes(comorbidityFilter.toLowerCase())
        );
      }

      return matchesSearch && matchesPriority && matchesComorbidity;
    });
  }, [patients, searchQuery, priorityFilter, comorbidityFilter]);

  // Helper: calculate age
  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-brand-600" />
            Patient Directory &amp; Longitudinal Charts
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full Patient Roster, Chronic Disease Profiles, and Comprehensive EMR Timelines
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPatients}
          disabled={loading}
          className="text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Directory
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Patients</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{patients.length}</p>
        </Card>
        <Card className="p-4 border-amber-200 bg-amber-50/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Senior &amp; PWD</p>
          <p className="text-2xl font-black text-amber-800 mt-1">
            {patients.filter((p) => p.priority_category === 'SENIOR' || p.priority_category === 'PWD').length}
          </p>
        </Card>
        <Card className="p-4 border-blue-200 bg-blue-50/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">With Maintenance Meds</p>
          <p className="text-2xl font-black text-blue-800 mt-1">
            {patients.filter((p) => p.maintenance_meds.length > 0).length}
          </p>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700">Drug Allergy Warnings</p>
          <p className="text-2xl font-black text-red-800 mt-1">
            {patients.filter((p) => p.allergies.length > 0).length}
          </p>
        </Card>
      </div>

      {/* Layout: Main Directory & EMR Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Table */}
        <div className={selectedPatient ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Registered Patients</CardTitle>
                  <CardDescription>Click a patient to open their longitudinal EMR history</CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, HMO..."
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 mt-3">
                {['ALL', 'SENIOR', 'PWD', 'PREGNANT', 'REGULAR'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setPriorityFilter(filter as typeof priorityFilter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      priorityFilter === filter
                        ? 'bg-brand-50 text-brand-900 border border-brand-200'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Priorities' : filter}
                  </button>
                ))}

                <div className="ml-auto flex items-center gap-1 text-xs">
                  <span className="text-slate-400">Condition:</span>
                  <select
                    value={comorbidityFilter}
                    onChange={(e) => setComorbidityFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700"
                  >
                    <option value="ALL">All Conditions</option>
                    <option value="Hypertension">Hypertension</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Asthma">Asthma</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    <p className="font-semibold text-xs">No matching patients found</p>
                  </div>
                ) : (
                  filteredPatients.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    const age = calculateAge(p.date_of_birth);

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-brand-50/70 border-l-4 border-l-brand-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.full_name}</p>
                            {p.priority_category !== 'NONE' && (
                              <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                                {p.priority_category}
                              </Badge>
                            )}
                            {p.allergies.length > 0 && (
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Allergy
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {age !== null && (
                              <span>
                                {age} yrs · {p.gender || '—'}
                              </span>
                            )}
                            {p.phone_number && (
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {p.phone_number}
                              </span>
                            )}
                            {p.hmo_provider && (
                              <span className="flex items-center gap-1 text-[11px] text-blue-700 font-medium">
                                <Shield className="h-3 w-3" />
                                {p.hmo_provider}
                              </span>
                            )}
                          </div>

                          {/* Comorbidities / Maintenance tags */}
                          {(p.comorbidities.length > 0 || p.maintenance_meds.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.comorbidities.map((c) => (
                                <span
                                  key={c}
                                  className="rounded bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 font-medium"
                                >
                                  {c}
                                </span>
                              ))}
                              {p.maintenance_meds.map((m) => (
                                <span
                                  key={m}
                                  className="rounded bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.2 font-medium flex items-center gap-0.5"
                                >
                                  <Pill className="h-2.5 w-2.5" />
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-3">
                          <div>
                            <span className="text-xs font-bold text-brand-700 block">
                              {p.visitCount} {p.visitCount === 1 ? 'consult' : 'consults'}
                            </span>
                            {p.lastVisitDate ? (
                              <span className="text-[10px] text-slate-400">
                                {new Date(p.lastVisitDate).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">No visits yet</span>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Longitudinal EMR Drawer */}
        {selectedPatient && (
          <div className="lg:col-span-5">
            <Card className="sticky top-20 border-brand-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{selectedPatient.full_name}</CardTitle>
                      {selectedPatient.priority_category !== 'NONE' && (
                        <Badge variant="warning" className="text-[10px]">
                          {selectedPatient.priority_category}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      EMR Record · Patient ID: {selectedPatient.id.slice(0, 8)}...
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quick actions for selected patient */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                  <Link
                    href={`/doctor/rx?patientId=${selectedPatient.id}`}
                    target="_blank"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      <Pill className="h-3.5 w-3.5 mr-1 text-brand-600" />
                      Issue Digital Rx
                    </Button>
                  </Link>

                  <Link href="/doctor/dashboard" className="flex-1">
                    <Button variant="brand" size="sm" className="w-full text-xs font-semibold">
                      <Stethoscope className="h-3.5 w-3.5 mr-1" />
                      Open in Cockpit
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4 max-h-[580px] overflow-y-auto">
                {/* Allergy warning if present */}
                {selectedPatient.allergies.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                    <p className="text-xs font-black text-red-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      DOCUMENTED DRUG ALLERGIES:
                    </p>
                    <p className="text-xs text-red-700 font-semibold">
                      {selectedPatient.allergies.join(', ')}
                    </p>
                  </div>
                )}

                {/* Medical History Header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    Consultation History ({encounters.length})
                  </p>
                </div>

                {encountersLoading ? (
                  <div className="py-10 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
                    Loading clinical encounters...
                  </div>
                ) : encounters.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    <p className="font-semibold">No recorded encounters yet</p>
                    <p className="mt-0.5">Encounters will appear when saved from the Cockpit.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {encounters.map((enc) => (
                      <div
                        key={enc.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {new Date(enc.created_at).toLocaleDateString([], {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {enc.icd10_code && (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold">
                              {enc.icd10_code}
                            </Badge>
                          )}
                        </div>

                        {/* Chief Complaint */}
                        {enc.chief_complaint && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Chief Complaint
                            </span>
                            <p className="text-slate-800 font-medium">{enc.chief_complaint}</p>
                          </div>
                        )}

                        {/* Vitals */}
                        {enc.vitals && enc.vitals.blood_pressure && (
                          <div className="flex items-center gap-3 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Activity className="h-3 w-3 text-red-500" /> BP: {enc.vitals.blood_pressure}
                            </span>
                            {enc.vitals.heart_rate && (
                              <span className="text-slate-600">HR: {enc.vitals.heart_rate} bpm</span>
                            )}
                            {enc.vitals.temperature_c && (
                              <span className="text-slate-600">Temp: {enc.vitals.temperature_c}°C</span>
                            )}
                          </div>
                        )}

                        {/* Diagnosis */}
                        {enc.diagnosis && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Diagnosis
                            </span>
                            <p className="text-brand-900 font-bold">{enc.diagnosis}</p>
                          </div>
                        )}

                        {/* Prescribed Items */}
                        {enc.prescriptions.length > 0 && (
                          <div className="pt-1 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                              Prescribed Medications / Labs
                            </span>
                            <div className="space-y-1">
                              {enc.prescriptions.map((rx) => (
                                <div
                                  key={rx.id}
                                  className="text-[11px] font-mono text-slate-700 bg-white px-2 py-1 rounded border border-slate-100"
                                >
                                  <span className="font-bold text-brand-700">℞ {rx.generic_name}</span>{' '}
                                  {rx.dosage} · {rx.frequency} × {rx.duration}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Follow up date */}
                        {enc.followup_date && (
                          <p className="text-[10px] text-amber-800 font-semibold pt-1">
                            📅 Recommended Follow-up: {enc.followup_date}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
