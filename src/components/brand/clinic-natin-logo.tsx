'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ClinicNatinLogoProps {
  height?: number;
  className?: string;
  href?: string;
  priority?: boolean;
}

/**
 * Reusable official Clinic Natin logo banner (aspect ratio 4.8:1, 1920x400).
 */
export function ClinicNatinLogo({
  height = 36,
  className = '',
  href,
  priority = true,
}: ClinicNatinLogoProps) {
  const [hasError, setHasError] = useState(false);
  const width = Math.round(height * 4.8);

  const content = hasError ? (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
        </svg>
      </div>
      <div className="flex items-baseline">
        <span className="text-base font-black tracking-tight text-slate-900">CLINIC</span>
        <span className="text-base font-black tracking-tight text-teal-600 ml-1">NATIN</span>
      </div>
    </div>
  ) : (
    <div
      className={`relative inline-block shrink-0 select-none ${className}`}
      style={{ height: `${height}px`, width: `${width}px` }}
    >
      <Image
        src="/new-clinic-natin-logo.png"
        alt="Clinic Natin Official Logo"
        width={1920}
        height={400}
        priority={priority}
        className="h-full w-full object-contain object-left"
        onError={() => setHasError(true)}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
