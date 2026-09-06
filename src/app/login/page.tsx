'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Stethoscope,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building2,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const unauthorized = searchParams.get('unauthorized');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClient();

  // Quick Demo Login Handler
  const handleQuickPersonaLogin = (
    role: 'SECRETARY' | 'DOCTOR' | 'PATIENT',
    name: string,
    demoEmail: string
  ) => {
    setLoading(true);
    setErrorMessage('');
    
    // Store demo session in cookie and localStorage for role-based routing
    document.cookie = `clinic_natin_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    localStorage.setItem('clinic_natin_demo_role', role);
    localStorage.setItem('clinic_natin_demo_user', JSON.stringify({ role, name, email: demoEmail }));

    setSuccessMessage(`Signed in as ${name} (${role})`);

    setTimeout(() => {
      if (role === 'SECRETARY') {
        router.push('/secretary/dashboard');
      } else if (role === 'DOCTOR') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/my-queue');
      }
    }, 600);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If sign in fails, offer to create account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          throw signUpError;
        }
        setSuccessMessage('Account created and signed in! Redirecting...');
      } else {
        setSuccessMessage('Welcome back! Loading your dashboard...');
      }

      setTimeout(() => {
        router.push(returnUrl);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-[#F7FCF9] to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-md shadow-brand-700/20">
            <Stethoscope className="h-6 w-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Clinic <span className="text-brand-700">Natin</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to Your Portal
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Seamless queue tracking &amp; medical office administration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {unauthorized && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Please sign in with authorized staff credentials to access that portal.</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-xl">
          {/* Quick Demo Persona Switcher */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Instant Demo Access</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('SECRETARY', 'Elena Bautista', 'secretary@clinicnatin.ph')}
                className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/70 p-3 text-left hover:bg-brand-100 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700">Elena Bautista</p>
                    <p className="text-[11px] text-slate-500">Clinic Secretary &bull; Live Queue Controller</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-brand-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('DOCTOR', 'Dr. Maria Santos, MD', 'doctor@clinicnatin.ph')}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Dr. Maria Santos, MD</p>
                    <p className="text-[11px] text-slate-500">Attending Physician &bull; Doctor Suite</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersonaLogin('PATIENT', 'Andres Bonifacio', 'patient@clinicnatin.ph')}
                className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-left hover:bg-blue-100/70 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">Andres Bonifacio</p>
                    <p className="text-[11px] text-slate-500">Patient &bull; Active Token #7 (CN-A107)</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-600 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          {/* Standard Credentials Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">or email login</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@clinicnatin.ph"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-brand-700 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-700 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-700/90 active:scale-95 transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In with Email'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New patient without an account?{' '}
              <Link href="/signup" className="font-bold text-brand-700 hover:underline">
                Create a free patient account &rarr;
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-700" />
          <span>Compliant with Philippine Data Privacy Act (RA 10173)</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
