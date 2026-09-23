import React from 'react';
import { PatientNavBar } from '@/components/patient/patient-nav-bar';

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <PatientNavBar />
      <div className="flex-1 pb-20 md:pb-6">
        {children}
      </div>
    </div>
  );
}
