'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldCheck, Stethoscope, Users, Ticket } from 'lucide-react';

export default function DashboardGatewayPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState('Verifying access credentials...');

  useEffect(() => {
    async function resolveRoleAndRoute() {
      const supabase = createClient();
      
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Check if there is an active demo profile stored in localStorage/cookie for frictionless testing
          const localRole = typeof window !== 'undefined' ? localStorage.getItem('clinic_natin_demo_role') : null;
          if (localRole === 'SECRETARY') {
            router.replace('/secretary/dashboard');
            return;
          } else if (localRole === 'DOCTOR') {
            router.replace('/doctor/dashboard');
            return;
          } else if (localRole === 'PATIENT') {
            router.replace('/my-queue');
            return;
          }

          setStatusText('Redirecting to login portal...');
          router.replace('/login?returnUrl=/dashboard');
          return;
        }

        setStatusText('Checking clinical role permissions...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('auth_id', user.id)
          .maybeSingle();

        const role = profile?.role || (user.user_metadata?.role as string) || 'PATIENT';

        if (role === 'SECRETARY' || role === 'ADMIN') {
          setStatusText(`Welcome ${profile?.full_name || 'Staff'}. Loading Queue Controller...`);
          router.replace('/secretary/dashboard');
        } else if (role === 'DOCTOR') {
          setStatusText(`Welcome Dr. ${profile?.full_name || 'Doctor'}. Loading Doctor Suite...`);
          router.replace('/doctor/dashboard');
        } else {
          setStatusText('Redirecting to your active queue tickets...');
          router.replace('/my-queue');
        }
      } catch (err) {
        console.error('Routing error:', err);
        router.replace('/login');
      }
    }

    resolveRoleAndRoute();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-[#F7FCF9] to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-brand-100 bg-white/90 p-8 text-center shadow-xl backdrop-blur-md">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 ring-8 ring-brand-50/50">
          <Stethoscope className="h-10 w-10 text-brand-700 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white shadow-md">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Clinic Natin Gateway
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">{statusText}</p>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-700" /> RA 10173 Encrypted
          </span>
          <span>&bull;</span>
          <span>Cagayan de Oro Network</span>
        </div>
      </div>
    </div>
  );
}
