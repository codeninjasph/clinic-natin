'use client';

import React from 'react';
import { Coffee, Footprints, AlertCircle, BellRing, Sparkles, MapPin, Navigation } from 'lucide-react';

interface SafeZoneRadarProps {
  queueNumber: number;
  currentServingNumber: number;
  hospitalName: string;
  roomNumber: string;
  isServing?: boolean;
}

export function SafeZoneRadar({
  queueNumber,
  currentServingNumber,
  hospitalName,
  roomNumber,
  isServing = false,
}: SafeZoneRadarProps) {
  const patientsAhead = Math.max(0, queueNumber - currentServingNumber);
  const estimatedMins = patientsAhead * 15;

  // CDO Nearby Cafe recommendations based on hospital
  const cafeRecommendation = hospitalName.toLowerCase().includes('maria reyna')
    ? "Bo's Coffee Hayes St or Starbucks Maria Reyna"
    : hospitalName.toLowerCase().includes('cumc')
    ? 'Starbucks Gusa or CUMC Medical Arts Cafe'
    : hospitalName.toLowerCase().includes('polymedic')
    ? 'Starbucks Kauswagan or Polymedic Plaza Atrium'
    : 'Hospital Cafeteria / Nearby Coffee Lounge';

  if (isServing || patientsAhead <= 0) {
    return (
      <div className="rounded-2xl border-2 border-brand bg-gradient-to-r from-brand to-brand-dark p-5 text-white shadow-md animate-pulse">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-dark shadow-sm">
            <BellRing className="h-6 w-6 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              It&apos;s Your Turn Now!
            </span>
            <h3 className="text-base font-extrabold mt-1">
              Please enter Room {roomNumber} immediately
            </h3>
            <p className="text-xs text-brand-50 mt-0.5">
              Doctor is waiting for Token #{queueNumber} at {hospitalName}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (patientsAhead === 1) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                1 Patient Ahead &bull; Standby
              </span>
            </div>
            <h3 className="text-sm font-bold mt-1">
              Proceed to Waiting Lounge outside Room {roomNumber}
            </h3>
            <p className="text-xs text-amber-100 mt-0.5">
              Estimated call time in ~{Math.max(5, estimatedMins)} minutes. Your consultation is next.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (patientsAhead === 2) {
    return (
      <div className="rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-600 to-blue-700 p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm">
            <Footprints className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                Advance Warning &bull; 2 Patients Away
              </span>
            </div>
            <h3 className="text-sm font-bold mt-1">
              Start heading towards Room {roomNumber}
            </h3>
            <p className="text-xs text-sky-100 mt-0.5">
              Estimated call time in ~{estimatedMins} minutes. SMS alert has been queued.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3 or more patients ahead -> Safe Zone Radar
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/40 p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-dark shadow-xs">
            <Coffee className="h-6 w-6 text-brand-dark" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-brand-200/80 text-brand-dark px-2 py-0.5 rounded-full">
                ☕ Safe Zone Proximity Radar
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {patientsAhead} patients ahead (~{estimatedMins} mins)
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">
              Safe to wait at {cafeRecommendation}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Skip the noisy hospital bench. Relax nearby and return when you receive the 2-ahead turn alert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
