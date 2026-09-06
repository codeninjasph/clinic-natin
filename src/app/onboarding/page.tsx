'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Stethoscope,
  User,
  HeartPulse,
  Activity,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Phone,
  QrCode,
  Search,
  Ticket,
  BadgeAlert,
  ChevronRight,
  FileCheck2,
  X,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Common Philippine Clinical Presets
const COMMON_ALLERGIES = [
  'Penicillin',
  'Aspirin / NSAIDs',
  'Amoxicillin',
  'Sulfa Drugs',
  'Paracetamol',
  'Latex',
  'Iodine / Contrast Dye',
  'Shellfish / Seafood',
  'No Known Allergies (NKA)',
];

const COMMON_COMORBIDITIES = [
  'Hypertension (High BP)',
  'Type 2 Diabetes',
  'Asthma / Respiratory',
  'High Cholesterol',
  'Heart Disease',
  'Kidney Disease',
  'Thyroid Disorder',
  'None / Healthy',
];

const HMO_PROVIDERS = [
  'None (Cash Consultation)',
  'Maxicare',
  'Intellicare',
  'Medicard',
  'PhilHealth Only',
  'Carehealth Plus',
  'Pacific Cross',
  'Etiqa',
  'Insular Health Care',
  'Caritas Health Shield',
  'Other Provider',
];

export default function PatientOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Vitals & Demographics
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('MALE');
  const [bloodType, setBloodType] = useState('O+');
  const [weightKg, setWeightKg] = useState('65');
  
  // Height with Philippine FT/IN vs CM Toggle
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>('ft');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('7');
  const [heightCm, setHeightCm] = useState('170');

  // Step 2: Medical Safety
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [maintenanceMeds, setMaintenanceMeds] = useState<string[]>([]);
  const [customMed, setCustomMed] = useState('');

  // Step 3: Coverage & Priority
  const [priorityCategory, setPriorityCategory] = useState<string>('NONE');
  const [priorityIdNumber, setPriorityIdNumber] = useState('');
  const [hmoProvider, setHmoProvider] = useState<string>('Maxicare');
  const [hmoCardNumber, setHmoCardNumber] = useState('');
  const [philhealthNumber, setPhilhealthNumber] = useState('');

  // Step 4: Emergency Contact & Submission
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');

  // Status & User Metadata
  const [userName, setUserName] = useState('Juan Dela Cruz');
  const [userEmail, setUserEmail] = useState('');
  const [patientIdCode, setPatientIdCode] = useState('CN-P8821');
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load existing session data if available
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        }
        if (user.user_metadata?.phone_number) {
          // Pre-fill if needed
        }
      } else {
        // Check local demo persona
        const demoUser = localStorage.getItem('clinic_natin_demo_user');
        if (demoUser) {
          try {
            const parsed = JSON.parse(demoUser);
            if (parsed.name) setUserName(parsed.name);
            if (parsed.email) setUserEmail(parsed.email);
          } catch {
            // Ignore
          }
        }
      }
    }
    loadUser();
  }, [supabase]);

  // Compute effective height in Centimeters
  const effectiveHeightCm = useMemo(() => {
    if (heightUnit === 'cm') {
      return parseFloat(heightCm) || 0;
    } else {
      const ft = parseFloat(heightFeet) || 0;
      const inch = parseFloat(heightInches) || 0;
      return Math.round((ft * 12 + inch) * 2.54);
    }
  }, [heightUnit, heightCm, heightFeet, heightInches]);

  // Live BMI Calculator
  const bmiData = useMemo(() => {
    const weight = parseFloat(weightKg);
    const heightM = effectiveHeightCm / 100;
    if (!weight || !heightM || heightM <= 0) return null;

    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
    if (bmi < 18.5) {
      return { value: bmi, label: 'Underweight', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    } else if (bmi < 25) {
      return { value: bmi, label: 'Healthy / Normal', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (bmi < 30) {
      return { value: bmi, label: 'Overweight', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else {
      return { value: bmi, label: 'Obese', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  }, [weightKg, effectiveHeightCm]);

  // Calculate age from Date of Birth
  const calculatedAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [dateOfBirth]);

  // 1-Click Demo Fill
  const handleQuickFillDemo = () => {
    setDateOfBirth('1988-06-12');
    setGender('MALE');
    setBloodType('O+');
    setWeightKg('68');
    setHeightUnit('ft');
    setHeightFeet('5');
    setHeightInches('8');
    setSelectedAllergies(['Penicillin', 'Shellfish / Seafood']);
    setSelectedComorbidities(['Hypertension (High BP)']);
    setMaintenanceMeds(['Amlodipine 5mg OD']);
    setPriorityCategory('NONE');
    setHmoProvider('Maxicare');
    setHmoCardNumber('MAX-882190-01');
    setPhilhealthNumber('12-345678901-2');
    setEmergencyName('Maria Dela Cruz');
    setEmergencyRelation('Spouse');
    setEmergencyPhone('0917 999 8888');
  };

  // Toggle Chip Helpers
  const toggleAllergy = (item: string) => {
    if (item === 'No Known Allergies (NKA)') {
      setSelectedAllergies(['No Known Allergies (NKA)']);
      return;
    }
    const filtered = selectedAllergies.filter((a) => a !== 'No Known Allergies (NKA)');
    if (filtered.includes(item)) {
      setSelectedAllergies(filtered.filter((a) => a !== item));
    } else {
      setSelectedAllergies([...filtered, item]);
    }
  };

  const addCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    if (!selectedAllergies.includes(customAllergy.trim())) {
      setSelectedAllergies([
        ...selectedAllergies.filter((a) => a !== 'No Known Allergies (NKA)'),
        customAllergy.trim(),
      ]);
    }
    setCustomAllergy('');
  };

  const toggleComorbidity = (item: string) => {
    if (item === 'None / Healthy') {
      setSelectedComorbidities(['None / Healthy']);
      return;
    }
    const filtered = selectedComorbidities.filter((c) => c !== 'None / Healthy');
    if (filtered.includes(item)) {
      setSelectedComorbidities(filtered.filter((c) => c !== item));
    } else {
      setSelectedComorbidities([...filtered, item]);
    }
  };

  const addMaintenanceMed = () => {
    if (!customMed.trim()) return;
    if (!maintenanceMeds.includes(customMed.trim())) {
      setMaintenanceMeds([...maintenanceMeds, customMed.trim()]);
    }
    setCustomMed('');
  };

  const removeMed = (med: string) => {
    setMaintenanceMeds(maintenanceMeds.filter((m) => m !== med));
  };

  // Submit and save health passport
  const handleFinalSubmit = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const profilePayload = {
        date_of_birth: dateOfBirth || null,
        gender: gender || 'MALE',
        blood_type: bloodType,
        weight_kg: parseFloat(weightKg) || null,
        height_cm: effectiveHeightCm || null,
        allergies: selectedAllergies,
        comorbidities: selectedComorbidities,
        maintenance_meds: maintenanceMeds,
        priority_category: priorityCategory,
        priority_id_number: priorityIdNumber || null,
        hmo_provider: hmoProvider,
        hmo_card_number: hmoCardNumber || null,
        philhealth_number: philhealthNumber || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_relationship: emergencyRelation || null,
        is_onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      if (user) {
        await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('auth_id', user.id);
      }

      // Also save to localStorage for seamless offline resilience & demo flows
      localStorage.setItem(
        'clinic_natin_patient_profile',
        JSON.stringify({
          ...profilePayload,
          full_name: userName,
          email: userEmail,
        })
      );

      // Generate realistic patient code
      const generatedCode = `CN-P${Math.floor(1000 + Math.random() * 9000)}`;
      setPatientIdCode(generatedCode);
      setIsCompleted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save health passport.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-[#F7FCF9] to-white pb-20">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 border-b border-brand-100/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 h-18">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                Clinic <span className="text-brand-700">Natin</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                Digital Health Passport
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleQuickFillDemo}
                className="h-9 rounded-xl border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-bold gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">1-Click Demo Fill</span>
                <span className="sm:hidden">Demo Fill</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/my-queue')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Skip for now &rarr;
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        {!isCompleted ? (
          <div>
            {/* Stepper Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5 text-brand-700">
                  <HeartPulse className="h-4 w-4" />
                  Step {currentStep} of {totalSteps}
                </span>
                <span>
                  {currentStep === 1 && 'Vitals & Demographics'}
                  {currentStep === 2 && 'Allergies & Medical Safety'}
                  {currentStep === 3 && 'Priority & Insurance'}
                  {currentStep === 4 && 'Emergency Contact'}
                </span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2.5 rounded-full" />
            </div>

            {errorMessage && (
              <div className="mb-6 flex items-center gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Stepper Content Cards */}
            <Card className="rounded-3xl border-slate-200/90 bg-white shadow-xl overflow-hidden">
              {/* ============================================================ */}
              {/* STEP 1: VITALS & DEMOGRAPHICS */}
              {/* ============================================================ */}
              {currentStep === 1 && (
                <div>
                  <CardHeader className="p-6 sm:p-8 pb-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                      <User className="h-4 w-4" />
                      Personal Baseline
                    </div>
                    <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
                      Welcome, {userName}! Let&apos;s set up your clinical vitals.
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500">
                      Your attending doctors in Cagayan de Oro will see this data automatically to streamline diagnosis.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-2 space-y-6">
                    {/* Birthday & Biological Sex */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Date of Birth
                        </label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 text-sm font-medium"
                          />
                        </div>
                        {calculatedAge !== null && (
                          <p className="mt-1 text-xs font-semibold text-brand-700">
                            Age: {calculatedAge} years old
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Biological Sex / Gender
                        </label>
                        <Select
                          value={gender}
                          onValueChange={(val) => setGender(val as 'MALE' | 'FEMALE' | 'OTHER')}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 text-sm font-medium">
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other / Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Blood Type, Weight, and Height */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Blood Type */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Blood Type
                        </label>
                        <Select value={bloodType} onValueChange={setBloodType}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 text-sm font-semibold text-slate-800">
                            <SelectValue placeholder="Blood Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'].map((bt) => (
                              <SelectItem key={bt} value={bt}>
                                {bt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Weight (kg) */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Weight (kg)
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.5"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            placeholder="e.g. 65"
                            className="h-12 rounded-xl border-slate-200 pr-10 text-sm font-medium"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            kg
                          </span>
                        </div>
                      </div>

                      {/* Height with FT/IN vs CM Switcher */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Height
                          </label>
                          {/* Unit Switcher Button */}
                          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() => setHeightUnit('ft')}
                              className={`px-2 py-0.5 rounded-md transition ${
                                heightUnit === 'ft'
                                  ? 'bg-brand-700 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              ft / in
                            </button>
                            <button
                              type="button"
                              onClick={() => setHeightUnit('cm')}
                              className={`px-2 py-0.5 rounded-md transition ${
                                heightUnit === 'cm'
                                  ? 'bg-brand-700 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              cm
                            </button>
                          </div>
                        </div>

                        {heightUnit === 'ft' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Input
                                type="number"
                                min="2"
                                max="8"
                                value={heightFeet}
                                onChange={(e) => setHeightFeet(e.target.value)}
                                placeholder="5"
                                className="h-12 rounded-xl border-slate-200 pr-7 text-sm font-medium"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                ft
                              </span>
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="11"
                                value={heightInches}
                                onChange={(e) => setHeightInches(e.target.value)}
                                placeholder="7"
                                className="h-12 rounded-xl border-slate-200 pr-7 text-sm font-medium"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                in
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              type="number"
                              min="80"
                              max="250"
                              value={heightCm}
                              onChange={(e) => setHeightCm(e.target.value)}
                              placeholder="170"
                              className="h-12 rounded-xl border-slate-200 pr-10 text-sm font-medium"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              cm
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live BMI Summary Card */}
                    {bmiData && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Calculated Body Mass Index (BMI)
                            </div>
                            <div className="text-base font-extrabold text-slate-900">
                              {bmiData.value} kg/m² &bull;{' '}
                              <span className="text-xs font-normal text-slate-500">
                                ({effectiveHeightCm} cm)
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`px-3 py-1 font-bold text-xs ${bmiData.color}`}
                        >
                          {bmiData.label}
                        </Badge>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-6 sm:p-8 pt-0 border-t border-slate-100 flex justify-end">
                    <Button
                      type="button"
                      variant="brand"
                      size="lg"
                      onClick={() => setCurrentStep(2)}
                      className="rounded-xl px-7 text-sm font-bold shadow-md hover:bg-brand-700/90 gap-2"
                    >
                      <span>Continue to Medical Safety</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 2: ALLERGIES & MEDICAL SAFETY */}
              {/* ============================================================ */}
              {currentStep === 2 && (
                <div>
                  <CardHeader className="p-6 sm:p-8 pb-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-amber-600">
                      <ShieldCheck className="h-4 w-4" />
                      Patient Safety & Triage
                    </div>
                    <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
                      Drug Allergies & Chronic Conditions
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500">
                      Prevents adverse drug interactions and alerts your doctor before prescribing medication.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-2 space-y-6">
                    {/* Known Allergies Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Known Drug & Substance Allergies
                        </label>
                        <span className="text-[11px] text-slate-400">Select all that apply</span>
                      </div>

                      {/* Allergy Pill Chips */}
                      <div className="flex flex-wrap gap-2">
                        {COMMON_ALLERGIES.map((allergy) => {
                          const isSelected = selectedAllergies.includes(allergy);
                          const isNka = allergy === 'No Known Allergies (NKA)';
                          return (
                            <Badge
                              key={allergy}
                              variant={isSelected ? (isNka ? 'brand' : 'destructive') : 'outline'}
                              onClick={() => toggleAllergy(allergy)}
                              className={`cursor-pointer py-1.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                                isSelected
                                  ? ''
                                  : 'hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                              {allergy}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Custom Allergy Input */}
                      <div className="flex items-center gap-2 mt-3 max-w-md">
                        <Input
                          type="text"
                          value={customAllergy}
                          onChange={(e) => setCustomAllergy(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergy())}
                          placeholder="Add other allergy (e.g. Ciprofloxacin)..."
                          className="h-10 rounded-xl border-slate-200 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCustomAllergy}
                          className="h-10 rounded-xl px-3 text-xs font-bold border-slate-200"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Comorbidities Section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Existing Conditions / Comorbidities
                        </label>
                        <span className="text-[11px] text-slate-400">Chronic medical history</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {COMMON_COMORBIDITIES.map((condition) => {
                          const isSelected = selectedComorbidities.includes(condition);
                          return (
                            <Badge
                              key={condition}
                              variant={isSelected ? 'brand' : 'outline'}
                              onClick={() => toggleComorbidity(condition)}
                              className={`cursor-pointer py-1.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                                isSelected
                                  ? ''
                                  : 'hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                              {condition}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Current Maintenance Medications */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Current Maintenance Medications
                      </label>
                      <p className="text-xs text-slate-500 mb-3">
                        Prescription drugs or vitamins you take daily (e.g., Losartan 50mg, Metformin 500mg).
                      </p>

                      <div className="flex items-center gap-2 max-w-md mb-3">
                        <Input
                          type="text"
                          value={customMed}
                          onChange={(e) => setCustomMed(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaintenanceMed())}
                          placeholder="e.g. Amlodipine 5mg once daily..."
                          className="h-10 rounded-xl border-slate-200 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addMaintenanceMed}
                          className="h-10 rounded-xl px-3 text-xs font-bold border-slate-200"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      </div>

                      {maintenanceMeds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {maintenanceMeds.map((med) => (
                            <span
                              key={med}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-800"
                            >
                              {med}
                              <button
                                type="button"
                                onClick={() => removeMed(med)}
                                className="text-brand-600 hover:text-brand-900 rounded-full"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No maintenance medications added yet.
                        </p>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 sm:p-8 pt-0 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setCurrentStep(1)}
                      className="rounded-xl px-5 text-sm font-semibold border-slate-200"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="brand"
                      size="lg"
                      onClick={() => setCurrentStep(3)}
                      className="rounded-xl px-7 text-sm font-bold shadow-md hover:bg-brand-700/90 gap-2"
                    >
                      <span>Continue to Priority & HMO</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 3: COVERAGE & PRIORITY LANES */}
              {/* ============================================================ */}
              {currentStep === 3 && (
                <div>
                  <CardHeader className="p-6 sm:p-8 pb-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-brand-700">
                      <FileCheck2 className="h-4 w-4" />
                      HMO & Priority Validation
                    </div>
                    <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
                      Priority Lane & Healthcare Coverage
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500">
                      Qualify for expedited queuing under Philippine laws (RA 9994 / RA 7277) and cashless HMO consultation.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-2 space-y-6">
                    {/* Priority Category */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Priority Queueing Category
                      </label>
                      <Select value={priorityCategory} onValueChange={setPriorityCategory}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 text-sm font-semibold">
                          <SelectValue placeholder="Select priority status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Regular Outpatient</SelectItem>
                          <SelectItem value="SENIOR">Senior Citizen (RA 9994 - 20% Off + Express Lane)</SelectItem>
                          <SelectItem value="PWD">Person with Disability (RA 7277 - Express Lane)</SelectItem>
                          <SelectItem value="PREGNANT">Pregnant / Maternal Priority</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Conditional ID Number */}
                      {(priorityCategory === 'SENIOR' || priorityCategory === 'PWD') && (
                        <div className="mt-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 p-4 space-y-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                            {priorityCategory === 'SENIOR' ? 'OSCA Senior Citizen ID Number' : 'PWD ID Card Number'}
                          </label>
                          <Input
                            type="text"
                            value={priorityIdNumber}
                            onChange={(e) => setPriorityIdNumber(e.target.value)}
                            placeholder="e.g. OSCA-CDO-2024-9912"
                            className="h-11 rounded-xl bg-white border-amber-200 text-sm font-medium"
                          />
                          <p className="text-[11px] text-amber-800">
                            Presented during clinic arrival for the statutory 20% consultation discount.
                          </p>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* HMO Provider & Card Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Primary Health Maintenance Organization (HMO)
                        </label>
                        <Select value={hmoProvider} onValueChange={setHmoProvider}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 text-sm font-semibold">
                            <SelectValue placeholder="Select HMO provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {HMO_PROVIDERS.map((hmo) => (
                              <SelectItem key={hmo} value={hmo}>
                                {hmo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          HMO Member / Card Number (Optional)
                        </label>
                        <Input
                          type="text"
                          value={hmoCardNumber}
                          onChange={(e) => setHmoCardNumber(e.target.value)}
                          placeholder="e.g. 1102-8849-0192"
                          className="h-12 rounded-xl border-slate-200 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* PhilHealth PIN */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        PhilHealth Identification Number (PIN)
                      </label>
                      <Input
                        type="text"
                        value={philhealthNumber}
                        onChange={(e) => setPhilhealthNumber(e.target.value)}
                        placeholder="12 digits (e.g. 01-025487963-4)"
                        className="h-12 rounded-xl border-slate-200 text-sm font-medium max-w-md"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Enables seamless accreditation for PhilHealth Konsulta consultations and laboratory tests.
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 sm:p-8 pt-0 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setCurrentStep(2)}
                      className="rounded-xl px-5 text-sm font-semibold border-slate-200"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="brand"
                      size="lg"
                      onClick={() => setCurrentStep(4)}
                      className="rounded-xl px-7 text-sm font-bold shadow-md hover:bg-brand-700/90 gap-2"
                    >
                      <span>Continue to Emergency Contact</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 4: EMERGENCY CONTACT & SUMMARY */}
              {/* ============================================================ */}
              {currentStep === 4 && (
                <div>
                  <CardHeader className="p-6 sm:p-8 pb-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-rose-600">
                      <Phone className="h-4 w-4" />
                      Emergency Preparedness
                    </div>
                    <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
                      Emergency Contact & Profile Verification
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-500">
                      Designate a family member or contact who can be reached if you require medical assistance.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Contact Person Full Name
                        </label>
                        <Input
                          type="text"
                          required
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          placeholder="e.g. Maria Dela Cruz"
                          className="h-12 rounded-xl border-slate-200 text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Relationship
                        </label>
                        <Select value={emergencyRelation} onValueChange={setEmergencyRelation}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 text-sm font-semibold">
                            <SelectValue placeholder="Relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Spouse">Spouse</SelectItem>
                            <SelectItem value="Parent">Parent</SelectItem>
                            <SelectItem value="Child">Son / Daughter</SelectItem>
                            <SelectItem value="Sibling">Brother / Sister</SelectItem>
                            <SelectItem value="Guardian">Guardian / Relative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Philippine Mobile Number
                        </label>
                        <Input
                          type="tel"
                          required
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder="e.g. 0917 123 4567"
                          className="h-12 rounded-xl border-slate-200 text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="rounded-3xl border border-brand-100 bg-brand-50/50 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                          Digital Health Passport Review
                        </span>
                        <Badge variant="brand" className="text-xs">
                          {bloodType} Blood Group
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-slate-500 block">Height & Weight:</span>
                          <span className="font-bold text-slate-800">
                            {weightKg} kg &bull; {heightUnit === 'ft' ? `${heightFeet}'${heightInches}"` : `${heightCm} cm`}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Calculated BMI:</span>
                          <span className="font-bold text-slate-800">
                            {bmiData?.value || 'N/A'} ({bmiData?.label || 'Normal'})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Priority Lane:</span>
                          <span className="font-bold text-brand-700">
                            {priorityCategory === 'NONE' ? 'Regular' : priorityCategory}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">HMO Provider:</span>
                          <span className="font-bold text-slate-800">
                            {hmoProvider}
                          </span>
                        </div>
                      </div>

                      {selectedAllergies.length > 0 && (
                        <div className="pt-2 border-t border-brand-100/80 text-xs">
                          <span className="text-slate-500 block mb-1">Drug Allergies:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAllergies.map((a) => (
                              <Badge key={a} variant="destructive" className="text-[11px] py-0 px-2">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 sm:p-8 pt-0 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setCurrentStep(3)}
                      className="rounded-xl px-5 text-sm font-semibold border-slate-200"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      variant="brand"
                      size="lg"
                      disabled={loading}
                      onClick={handleFinalSubmit}
                      className="rounded-xl px-8 text-sm font-bold shadow-lg shadow-brand-700/20 hover:bg-brand-700/90 gap-2"
                    >
                      {loading ? 'Saving Health Passport...' : 'Save & Issue Digital Clinic Pass'}
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </div>
              )}
            </Card>
          </div>
        ) : (
          /* ============================================================ */
          /* COMPLETION SUCCESS SCREEN WITH DIGITAL CLINIC PASS */
          /* ============================================================ */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Toast */}
            <div className="text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3 shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Health Passport Activated!
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Your clinical vitals and allergy records are synchronized with affiliated medical centers in Cagayan de Oro.
              </p>
            </div>

            {/* Top-Tier Digital Clinic Pass (Physical Card Look) */}
            <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-7 text-white shadow-2xl border border-white/20">
              {/* Background ambient lighting */}
              <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-brand-500/20 blur-2xl" />

              {/* Card Header */}
              <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-inner">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black tracking-wide">
                      CLINIC <span className="text-emerald-400">NATIN</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Verified Patient Pass
                    </div>
                  </div>
                </div>
                <Badge variant="brand" className="text-[11px] px-2.5 py-0.5 font-bold">
                  CDO Outpatient
                </Badge>
              </div>

              {/* Patient Details */}
              <div className="relative my-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Patient Name
                  </div>
                  <div className="text-xl font-black text-white mt-0.5 tracking-tight">
                    {userName}
                  </div>
                  <div className="text-xs text-emerald-400 font-mono mt-0.5">
                    ID: {patientIdCode}
                  </div>
                </div>

                {/* Visual QR Code Display */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-2.5 shadow-md">
                  <QrCode className="h-16 w-16 text-slate-900" />
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5">1-Sec Check-in</span>
                </div>
              </div>

              {/* Medical Specs Grid */}
              <div className="relative grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-3.5 border border-white/10 text-center text-xs">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Blood Group</div>
                  <div className="text-sm font-extrabold text-emerald-400 mt-0.5">{bloodType}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">BMI</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">{bmiData?.value || '22.0'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Priority</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {priorityCategory === 'NONE' ? 'Regular' : priorityCategory}
                  </div>
                </div>
              </div>

              {/* Allergies / HMO Footer bar */}
              <div className="relative mt-4 flex items-center justify-between text-[11px] text-slate-300">
                <span>HMO: <strong className="text-white">{hmoProvider}</strong></span>
                <span>Allergies: <strong className="text-rose-400">{selectedAllergies.length > 0 ? selectedAllergies[0] : 'None'}</strong></span>
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
              <Link
                href="/#doctor-directory"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand-700/90 transition active:scale-95"
              >
                <Search className="h-4 w-4" />
                Find Doctors in CDO
              </Link>
              <Link
                href="/my-queue"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-95"
              >
                <Ticket className="h-4 w-4 text-brand-700" />
                Go to My Queue Tracker
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
