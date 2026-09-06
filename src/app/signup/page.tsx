'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Stethoscope,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  HeartPulse,
  BadgePercent,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SignupFormContent() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [priorityCategory, setPriorityCategory] = useState<string>('NONE');
  const [hmoProvider, setHmoProvider] = useState<string>('NONE');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1-Click Demo Patient Quick Registration
  const handleQuickDemoPatientSignup = async () => {
    setFullName('Juan Dela Cruz');
    setPhone('0917 890 1234');
    setEmail('juan.delacruz@patient.clinicnatin.ph');
    setPassword('Patient123!');
    setPriorityCategory('NONE');
    setHmoProvider('Maxicare');

    setLoading(true);
    setErrorMessage('');

    // Setup role cookies
    document.cookie = `clinic_natin_role=PATIENT; path=/; max-age=86400; SameSite=Lax`;
    localStorage.setItem('clinic_natin_demo_role', 'PATIENT');
    localStorage.setItem(
      'clinic_natin_demo_user',
      JSON.stringify({
        role: 'PATIENT',
        name: 'Juan Dela Cruz',
        email: 'juan.delacruz@patient.clinicnatin.ph',
        phone: '0917 890 1234',
        hmo: 'Maxicare',
      })
    );

    setSuccessMessage('Demo patient profile initialized! Redirecting to live turn tracker...');
    setTimeout(() => {
      router.push('/my-queue');
    }, 800);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setErrorMessage('Please agree to the Terms of Service & Data Privacy Policy to continue.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phone,
            role: 'PATIENT',
            priority_category: priorityCategory,
            hmo_provider: hmoProvider,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // 2. Insert or update user in profiles table if session exists
      if (authData?.user) {
        await supabase.from('profiles').upsert({
          auth_id: authData.user.id,
          full_name: fullName,
          email: email,
          phone_number: phone,
          role: 'PATIENT',
        });
      }

      // 3. Set cookie and local storage session
      document.cookie = `clinic_natin_role=PATIENT; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('clinic_natin_demo_role', 'PATIENT');
      localStorage.setItem(
        'clinic_natin_demo_user',
        JSON.stringify({
          role: 'PATIENT',
          name: fullName,
          email: email,
          phone: phone,
          priority_category: priorityCategory,
          hmo_provider: hmoProvider,
        })
      );

      setSuccessMessage('Account created successfully! Welcome to Clinic Natin.');
      setTimeout(() => {
        router.push('/my-queue');
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-[#F7FCF9] to-white flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center px-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-md shadow-brand-700/20">
            <Stethoscope className="h-6 w-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Clinic <span className="text-brand-700">Natin</span>
          </span>
        </Link>
        
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="brand" className="px-3 py-0.5 text-xs font-semibold">
            Patient Portal Registration
          </Badge>
          <span className="text-xs text-slate-500">&bull; Cagayan de Oro</span>
        </div>

        <h2 className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Create Patient Account
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          Skip the 7:00 AM clinic rush. Book consultation spots, monitor live queues, and receive arrival alerts on your phone.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <Card className="rounded-3xl border-brand-100 bg-white p-6 sm:p-8 shadow-xl">
          {/* Quick 1-Click Patient Demo */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Quick Test
              </span>
              <span className="text-[11px] text-slate-400">Instant registration bypass</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickDemoPatientSignup}
              className="w-full h-12 rounded-xl border-brand-200 bg-brand-50/70 hover:bg-brand-100 text-slate-800 justify-between group px-4"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="h-8 w-8 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold text-xs">
                  JD
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-brand-700">
                    Sign Up as Juan Dela Cruz (Demo Patient)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pre-configures SMS notifications and Maxicare HMO
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-brand-700 group-hover:translate-x-0.5 transition" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Juan Dela Cruz"
                  className="pl-10 h-11 rounded-xl border-slate-200 focus:border-brand-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mobile Number (For Live SMS Queue Alerts) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 0917 123 4567"
                  className="pl-10 h-11 rounded-xl border-slate-200 focus:border-brand-700"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                We will send an automated SMS when only 2 patients are ahead of your turn.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan.delacruz@example.com"
                  className="pl-10 h-11 rounded-xl border-slate-200 focus:border-brand-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-10 h-11 rounded-xl border-slate-200 focus:border-brand-700"
                />
              </div>
            </div>

            {/* Special Patient Lanes & HMO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Priority Lane (Optional)
                </label>
                <Select value={priorityCategory} onValueChange={setPriorityCategory}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="Select lane" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Regular Patient</SelectItem>
                    <SelectItem value="SENIOR">Senior Citizen (RA 9994)</SelectItem>
                    <SelectItem value="PWD">PWD (RA 7277)</SelectItem>
                    <SelectItem value="PREGNANT">Pregnant / Maternal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Primary HMO (Optional)
                </label>
                <Select value={hmoProvider} onValueChange={setHmoProvider}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="Select HMO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None / Self-Pay</SelectItem>
                    <SelectItem value="Maxicare">Maxicare</SelectItem>
                    <SelectItem value="Intellicare">Intellicare</SelectItem>
                    <SelectItem value="Medicard">Medicard</SelectItem>
                    <SelectItem value="PhilHealth">PhilHealth Only</SelectItem>
                    <SelectItem value="Carehealth Plus">Carehealth Plus</SelectItem>
                    <SelectItem value="Other">Other Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-700 mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <span className="font-semibold text-brand-700">Terms of Service</span> and consent to SMS queue updates in accordance with the{' '}
                <span className="font-semibold text-slate-800">Philippine Data Privacy Act of 2012 (RA 10173)</span>.
              </label>
            </div>

            <Button
              type="submit"
              variant="brand"
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-md hover:bg-brand-700/90 mt-2"
            >
              {loading ? 'Registering...' : 'Create Free Patient Account'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account or staff credential?{' '}
              <Link href="/login" className="font-bold text-brand-700 hover:underline">
                Sign in here &rarr;
              </Link>
            </p>
          </div>
        </Card>

        {/* Security badge */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-700" />
          <span>Encrypted patient data &bull; Verified medical clinics only</span>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading registration...</div>}>
      <SignupFormContent />
    </Suspense>
  );
}
