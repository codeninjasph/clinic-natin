'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Stethoscope,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  Radio,
  ChevronRight,
  Filter,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  Users,
  Smartphone,
  ArrowRight,
  X,
  Phone,
  HelpCircle,
  AlertTriangle,
  BadgePercent,
  Check,
  Ticket,
  UserPlus,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// ---------------------------------------------------------------------------
// Doctor Data Types & Sample Records (Cagayan de Oro focused)
// ---------------------------------------------------------------------------

interface DoctorListing {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  clinicAddress: string;
  schedule: string;
  acceptsHmo: boolean;
  hmoProviders?: string[];
  currentServingNumber: number;
  totalInQueue: number;
  isQueueLive: boolean;
  nextStartTime?: string;
  consultationFee: string;
  convenienceFee: string;
  avatarBg: string;
  experienceYears: number;
}

const DOCTORS_DATA: DoctorListing[] = [
  {
    id: 'doc-1',
    name: 'Dr. Reyes',
    specialty: 'Pediatrics',
    clinicName: 'Maria Reyna Xavier University Hospital',
    clinicAddress: 'Room 304, Medical Arts Bldg, Hayes St, CDO',
    schedule: 'Mon - Fri, 9:00 AM - 1:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth'],
    currentServingNumber: 14,
    totalInQueue: 18,
    isQueueLive: true,
    consultationFee: '₱500',
    convenienceFee: '₱40',
    avatarBg: 'bg-emerald-600',
    experienceYears: 12,
  },
  {
    id: 'doc-2',
    name: 'Dr. Santos',
    specialty: 'Internal Medicine',
    clinicName: 'Capitol University Medical Center',
    clinicAddress: 'Suite 210, Gusa Highway, CDO',
    schedule: 'Mon - Sat, 10:00 AM - 3:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Carehealth Plus', 'PhilHealth'],
    currentServingNumber: 8,
    totalInQueue: 12,
    isQueueLive: true,
    consultationFee: '₱600',
    convenienceFee: '₱40',
    avatarBg: 'bg-teal-600',
    experienceYears: 15,
  },
  {
    id: 'doc-3',
    name: 'Dr. Lim',
    specialty: 'Cardiology',
    clinicName: 'Cagayan de Oro Polymedic Plaza',
    clinicAddress: '4th Floor Heart Center, Kauswagan Highway, CDO',
    schedule: 'Tue, Thu, Sat, 8:30 AM - 12:00 NN',
    acceptsHmo: false,
    currentServingNumber: 5,
    totalInQueue: 9,
    isQueueLive: true,
    consultationFee: '₱800',
    convenienceFee: '₱40',
    avatarBg: 'bg-brand-700',
    experienceYears: 18,
  },
  {
    id: 'doc-4',
    name: 'Dr. Garcia',
    specialty: 'OB-GYN',
    clinicName: 'Madonna & Child Hospital',
    clinicAddress: 'J.V. Seriña St, Carmen, CDO',
    schedule: 'Mon - Fri, 1:00 PM - 5:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Intellicare', 'ValuCare', 'PhilHealth'],
    currentServingNumber: 0,
    totalInQueue: 6,
    isQueueLive: false,
    nextStartTime: 'Today at 1:00 PM',
    consultationFee: '₱550',
    convenienceFee: '₱40',
    avatarBg: 'bg-rose-600',
    experienceYears: 9,
  },
  {
    id: 'doc-5',
    name: 'Dr. Tan',
    specialty: 'Dermatology',
    clinicName: 'Polymedic General Hospital',
    clinicAddress: 'Room 108, Don Apolinar Velez St, CDO',
    schedule: 'Mon, Wed, Fri, 10:00 AM - 2:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Medicard'],
    currentServingNumber: 11,
    totalInQueue: 14,
    isQueueLive: true,
    consultationFee: '₱600',
    convenienceFee: '₱40',
    avatarBg: 'bg-indigo-600',
    experienceYears: 8,
  },
  {
    id: 'doc-6',
    name: 'Dr. Villanueva',
    specialty: 'Orthopedics',
    clinicName: 'Northern Mindanao Medical Center (NMMC)',
    clinicAddress: 'Outpatient Specialty Clinic, Capitol Compound, CDO',
    schedule: 'Mon - Thu, 8:00 AM - 12:00 NN',
    acceptsHmo: false,
    currentServingNumber: 22,
    totalInQueue: 26,
    isQueueLive: true,
    consultationFee: '₱500',
    convenienceFee: '₱40',
    avatarBg: 'bg-cyan-700',
    experienceYears: 14,
  },
  {
    id: 'doc-7',
    name: 'Dr. Yap',
    specialty: 'ENT - Otolaryngology',
    clinicName: 'Maria Reyna Xavier University Hospital',
    clinicAddress: 'Room 412, Medical Arts Bldg, Hayes St, CDO',
    schedule: 'Tue, Thu, Sat, 9:00 AM - 1:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Intellicare', 'PhilHealth'],
    currentServingNumber: 3,
    totalInQueue: 7,
    isQueueLive: true,
    consultationFee: '₱550',
    convenienceFee: '₱40',
    avatarBg: 'bg-emerald-700',
    experienceYears: 11,
  },
  {
    id: 'doc-8',
    name: 'Dr. Mercado',
    specialty: 'General Physician',
    clinicName: 'St. Ignatius Medical Center',
    clinicAddress: 'Corrales Ave, Barangay 29, CDO',
    schedule: 'Mon - Sat, 8:00 AM - 4:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Medicard', 'PhilHealth', 'Caritas Health'],
    currentServingNumber: 0,
    totalInQueue: 4,
    isQueueLive: false,
    nextStartTime: 'Tomorrow at 8:00 AM',
    consultationFee: '₱400',
    convenienceFee: '₱40',
    avatarBg: 'bg-teal-700',
    experienceYears: 7,
  }
];

const SPECIALTY_OPTIONS = [
  'All Specializations',
  'Family Medicine / General Practice',
  'Pediatrics',
  'Internal Medicine',
  'Obstetrics & Gynecology',
  'Cardiology',
  'General Surgery',
  'Orthopedic Surgery',
  'Dermatology',
  'Ophthalmology',
  'ENT - Otolaryngology',
  'Neurology',
  'Pulmonology',
  'Nephrology',
  'Urology',
  'Psychiatry & Behavioral Health',
];

export default function HomePage() {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specializations');
  const [onlyHmo, setOnlyHmo] = useState(false);
  const [onlyLiveQueue, setOnlyLiveQueue] = useState(false);

  // Modal State for Queue Demonstration
  const [selectedDoctorForQueue, setSelectedDoctorForQueue] = useState<DoctorListing | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [queueSubmitted, setQueueSubmitted] = useState(false);
  const [generatedTicketNumber, setGeneratedTicketNumber] = useState<number | null>(null);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return DOCTORS_DATA.filter((doctor) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.clinicAddress.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialty =
        selectedSpecialty === 'All Specializations' ||
        doctor.specialty.toLowerCase() === selectedSpecialty.toLowerCase();

      const matchesHmo = !onlyHmo || doctor.acceptsHmo;
      const matchesLive = !onlyLiveQueue || doctor.isQueueLive;

      return matchesSearch && matchesSpecialty && matchesHmo && matchesLive;
    });
  }, [searchQuery, selectedSpecialty, onlyHmo, onlyLiveQueue]);

  // Handle queue modal submit
  const handleJoinQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) return;
    const nextNumber = (selectedDoctorForQueue?.totalInQueue || 15) + 1;
    setGeneratedTicketNumber(nextNumber);
    setQueueSubmitted(true);
  };

  const resetQueueModal = () => {
    setSelectedDoctorForQueue(null);
    setPatientName('');
    setPatientPhone('');
    setQueueSubmitted(false);
    setGeneratedTicketNumber(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFCFB] text-slate-900 selection:bg-brand-300 selection:text-slate-900 font-sans">
      {/* ----------------------------------------------------------------- */}
      {/* NAVIGATION BAR */}
      {/* ----------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-brand-100/80 bg-white/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-brand-50 shadow-md shadow-brand-700/20">
              <Stethoscope className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Clinic <span className="text-brand-700">Natin</span>
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  CDO Pilot
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Medical Queue Management
              </p>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="transition hover:text-brand-700">
              How It Works
            </a>
            <a href="#doctor-directory" className="transition hover:text-brand-700">
              Find Doctors
            </a>
            <a href="#benefits" className="transition hover:text-brand-700">
              Why Clinic Natin
            </a>
            <a href="#faq" className="transition hover:text-brand-700">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/my-queue"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300/80 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 hover:border-brand-700/40 active:scale-95"
            >
              <Ticket className="h-4 w-4 text-brand-700" />
              <span>Track Turn</span>
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Patient Sign Up</span>
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 1. HERO SECTION */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-[#F7FCF9] to-[#FAFCFB] pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-brand-100/60">
        {/* Subtle Background Glow Elements */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-brand-100/60 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-brand-300/30 blur-2xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column: Core Value Proposition & CTAs */}
            <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/70 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-xs backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-brand-700 animate-pulse" />
                Ending the 7:00 AM manual queue in Cagayan de Oro
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
                Skip the Waiting Room.{' '}
                <span className="bg-gradient-to-r from-brand-700 to-emerald-600 bg-clip-text text-transparent">
                  Track Your Turn
                </span>{' '}
                from Anywhere.
              </h1>

              {/* Subheadline addressing the 7 AM manual queuing problem */}
              <p className="mx-auto lg:mx-0 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
                No more waking up before dawn just to grab a handwritten clinic number. 
                Secure your consultation spot online, receive live queue updates, and arrive right when the doctor is ready for you.
              </p>

              {/* Primary CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#doctor-directory"
                  className="flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-brand-700 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-brand-700/25 transition-all duration-200 hover:bg-brand-700/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  Find a Doctor
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </a>

                <Link
                  href="/signup"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-emerald-700/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                  Sign Up as Patient
                </Link>

                <Link
                  href="/my-queue"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-brand-700/30 bg-brand-50 px-5 py-3.5 text-sm sm:text-base font-bold text-brand-700 shadow-xs transition-all duration-200 hover:bg-brand-100"
                >
                  <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-brand-700" />
                  Track Turn
                </Link>

                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm sm:text-base font-semibold text-slate-700 shadow-xs transition-all duration-200 hover:bg-slate-50"
                >
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                  Staff
                </Link>
              </div>

              {/* Trust Metric Highlights */}
              <div className="pt-6 border-t border-brand-100 grid grid-cols-3 gap-4 max-w-xl mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-brand-700">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Digital Queue</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">15+ Mins</div>
                  <div className="text-xs text-slate-500 font-medium">Advance Arrival Alert</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900">₱40</div>
                  <div className="text-xs text-slate-500 font-medium">Flat Convenience Fee</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Section Slider (shadcn/ui Carousel) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md px-2 sm:px-0">
                {/* Decorative border backdrop glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-300 to-brand-700/40 opacity-50 blur-lg" />
                
                <Carousel
                  opts={{
                    loop: true,
                    align: 'start',
                  }}
                  className="relative w-full"
                >
                  <CarouselContent>
                    {/* Slide 1: Patient Live Queue Tracker */}
                    <CarouselItem>
                      <div className="rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Live Patient Tracker
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            Maria Reyna XU Hospital
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-3.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-base font-bold text-white shadow-sm">
                            DR
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                              Dr. Reyes, MD
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                              Pediatrics Specialist &bull; Rm 304
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-brand-50 border border-brand-100 p-4 text-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Currently Serving
                          </span>
                          <div className="text-4xl font-extrabold text-brand-700 tracking-tight my-1">
                            #14
                          </div>
                          <p className="text-xs text-slate-600">
                            Patient in Consultation &bull; Est. 8 mins remaining
                          </p>
                        </div>

                        <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Your Booking Token:</span>
                            <span className="font-bold text-slate-900">#18 (4 Ahead of You)</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Recommended Departure:</span>
                            <span className="font-semibold text-emerald-700">Leave home at 10:45 AM</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                            <div className="bg-brand-700 h-full rounded-full w-3/4 animate-pulse" />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-brand-100/60 p-3 text-xs text-slate-700 border border-brand-300/40">
                          <Radio className="h-4 w-4 text-brand-700 shrink-0" />
                          <span>
                            <strong className="text-brand-700">SMS Notification:</strong> We&apos;ll text you when 2 patients remain!
                          </span>
                        </div>
                      </div>
                    </CarouselItem>

                    {/* Slide 2: Secretary Queue Controller */}
                    <CarouselItem>
                      <div className="rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                              Secretary Queue Suite
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            Polymedic Medical Plaza
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-3.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-sm">
                            EB
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                              Elena Bautista
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                              Lead Secretary &bull; Dr. Santos Clinic
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-blue-50/60 border border-blue-200 p-4 text-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Now Calling Next
                          </span>
                          <div className="text-4xl font-extrabold text-blue-700 tracking-tight my-1">
                            #15
                          </div>
                          <div className="flex justify-center gap-2 mt-1">
                            <Badge variant="warning">Senior Citizen Priority</Badge>
                            <Badge variant="secondary">Rm 412</Badge>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Active Queue Status:</span>
                            <span className="font-bold text-slate-800">12 Waiting Outside</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Daily Intake:</span>
                            <span className="font-semibold text-emerald-700">24 Patients Served &bull; 0 Delay</span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                          <div className="rounded-xl bg-brand-700 text-white py-2.5 shadow-sm">
                            &bull; Call Next (#16)
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white py-2.5 text-slate-700">
                            + Walk-In Ticket
                          </div>
                        </div>
                      </div>
                    </CarouselItem>

                    {/* Slide 3: Instant Digital Slot Reservation */}
                    <CarouselItem>
                      <div className="rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                              Digital Token Issued
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            CUMC Medical Arts
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-3.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-base font-bold text-white shadow-sm">
                            JC
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                              Dr. Juan Carlos Dela Cruz
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                              Internal Medicine Specialist
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-purple-50/60 border border-purple-200 p-4 text-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Verified Token Code
                          </span>
                          <div className="text-3xl font-black text-purple-700 tracking-wider font-mono my-1">
                            CN-A109
                          </div>
                          <p className="text-xs text-slate-600">
                            Guaranteed Queue Slot for Today
                          </p>
                        </div>

                        <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Platform Fee:</span>
                            <span className="font-bold text-emerald-700">₱40 Settled via GCash</span>
                          </div>
                          <div className="flex justify-between font-medium items-center">
                            <span className="text-slate-500">HMO Accreditation:</span>
                            <div className="flex gap-1">
                              <Badge variant="brand" className="text-[10px] px-1.5 py-0">Maxicare</Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">PhilHealth</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>Arrival Window:</strong> 11:15 AM &bull; Room 208
                          </span>
                        </div>
                      </div>
                    </CarouselItem>
                  </CarouselContent>

                  {/* Navigation Arrows */}
                  <CarouselPrevious className="left-1 sm:-left-4" />
                  <CarouselNext className="right-1 sm:-right-4" />
                </Carousel>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. HOW IT WORKS (3-STEP PROCESS) */}
      {/* ----------------------------------------------------------------- */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Simple 3-Step Flow
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Healthcare without the Waiting Room Chaos
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              We eliminated long physical queues with a smart, synchronized booking and real-time tracking workflow.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="group relative rounded-3xl border border-slate-200/80 bg-[#FAFCFB] p-8 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-inner group-hover:bg-brand-700 group-hover:text-white transition-colors duration-300">
                  <Search className="h-7 w-7" />
                </div>
                <span className="text-3xl font-black text-brand-300/70 group-hover:text-brand-700/30 transition-colors">
                  01
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                1. Search Local Doctors
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Discover verified doctors in Cagayan de Oro by specialty, clinic location, consultation schedule, and HMO accreditation.
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                <span>Filter by HMO & Clinics</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative rounded-3xl border border-slate-200/80 bg-[#FAFCFB] p-8 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-inner group-hover:bg-brand-700 group-hover:text-white transition-colors duration-300">
                  <CreditCard className="h-7 w-7" />
                </div>
                <span className="text-3xl font-black text-brand-300/70 group-hover:text-brand-700/30 transition-colors">
                  02
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                2. Secure Your Spot
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Pay a small, cashless convenience fee (₱40 via GCash or Maya) to lock in your official queue ticket without standing in line.
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                <span>Instant Digital Token</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative rounded-3xl border border-slate-200/80 bg-[#FAFCFB] p-8 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-lg hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-inner group-hover:bg-brand-700 group-hover:text-white transition-colors duration-300">
                  <Radio className="h-7 w-7" />
                </div>
                <span className="text-3xl font-black text-brand-300/70 group-hover:text-brand-700/30 transition-colors">
                  03
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                3. Monitor the Live Queue
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Rest comfortably at home or a nearby coffee shop. Watch the counter update in real-time and arrive right on schedule.
              </p>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                <span>Live SMS & Web Status</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. INTERACTIVE DOCTOR DIRECTORY (THE CORE UX) */}
      {/* ----------------------------------------------------------------- */}
      <section id="doctor-directory" className="py-20 bg-brand-50/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Directory Title & Intro */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                Verified CDO Specialists
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Find Your Doctor & Join Queue
              </h2>
              <p className="mt-2 text-slate-600 text-sm sm:text-base">
                Browse available clinics in Cagayan de Oro. Check real-time queue states before heading out.
              </p>
            </div>

            <div className="text-sm font-semibold text-slate-600">
              Showing <span className="text-brand-700 font-bold">{filteredDoctors.length}</span> of {DOCTORS_DATA.length} Doctors
            </div>
          </div>

          {/* Patient Registration Callout Banner */}
          <div className="mb-6 rounded-3xl bg-gradient-to-r from-brand-700 to-emerald-700 p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 shadow-inner">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold sm:text-base">First time consulting at a Cagayan de Oro clinic?</p>
                <p className="text-xs text-brand-100 mt-0.5">
                  Create a free patient account to auto-sync your consultation queue tokens, live SMS alerts, and priority lane status.
                </p>
              </div>
            </div>
            <Link
              href="/signup"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-50 transition shadow-xs active:scale-95"
            >
              <span>Sign Up as Patient (Free)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Search & Filter Toolbar with shadcn components */}
          <Card className="rounded-3xl border border-brand-100 bg-white p-5 sm:p-6 shadow-sm mb-10 space-y-5">
            {/* Primary Inputs Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Search Bar using shadcn Input */}
              <div className="md:col-span-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, hospital, or specialty in Cagayan de Oro..."
                  className="pl-11 pr-10 h-12 rounded-2xl border-slate-200 bg-slate-50/70 text-sm font-medium focus:bg-white"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Specialization Dropdown using shadcn Select */}
              <div className="md:col-span-3">
                <Select
                  value={selectedSpecialty}
                  onValueChange={(val) => setSelectedSpecialty(val)}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-800 focus:bg-white">
                    <SelectValue placeholder="All Specializations" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Buttons using shadcn Button */}
              <div className="md:col-span-3 flex items-center justify-between sm:justify-start gap-3">
                {/* HMO Toggle */}
                <Button
                  type="button"
                  variant={onlyHmo ? 'brand' : 'outline'}
                  onClick={() => setOnlyHmo(!onlyHmo)}
                  className="flex-1 h-12 rounded-2xl text-xs sm:text-sm font-bold shadow-xs gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Accepts HMO</span>
                </Button>

                {/* Live Queue Only Toggle */}
                <Button
                  type="button"
                  variant={onlyLiveQueue ? 'default' : 'outline'}
                  onClick={() => setOnlyLiveQueue(!onlyLiveQueue)}
                  className={`flex-1 h-12 rounded-2xl text-xs sm:text-sm font-bold shadow-xs gap-2 ${
                    onlyLiveQueue ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  <span className="hidden sm:inline">Active Queue</span>
                  <span className="sm:hidden">Live</span>
                </Button>
              </div>

            </div>

            {/* Quick Specialty Filter Pills using shadcn Badge */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Quick Select:</span>
              {['Pediatrics', 'Internal Medicine', 'Cardiology', 'OB-GYN', 'Dermatology'].map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedSpecialty === tag ? 'brand' : 'outline'}
                  onClick={() =>
                    setSelectedSpecialty(selectedSpecialty === tag ? 'All Specializations' : tag)
                  }
                  className="cursor-pointer py-1.5 px-3 rounded-xl text-xs font-medium transition-all hover:bg-brand-100 hover:text-brand-700 active:scale-95"
                >
                  {tag}
                </Badge>
              ))}
              {(searchQuery || selectedSpecialty !== 'All Specializations' || onlyHmo || onlyLiveQueue) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty('All Specializations');
                    setOnlyHmo(false);
                    setOnlyLiveQueue(false);
                  }}
                  className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2.5"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>

          {/* Doctor Cards Grid using shadcn Card suite */}
          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor) => (
                <Card
                  key={doctor.id}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md hover:-translate-y-1 overflow-hidden"
                >
                  {/* Top Header Section */}
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-12 w-12 rounded-2xl ${doctor.avatarBg} text-sm font-bold text-white shadow-xs`}>
                          <AvatarFallback className={`${doctor.avatarBg} text-white font-bold`}>
                            {doctor.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                            {doctor.name}
                          </CardTitle>
                          <Badge variant="brand" className="mt-1 text-[11px] px-2 py-0">
                            {doctor.specialty}
                          </Badge>
                        </div>
                      </div>

                      {/* Queue Status Badge */}
                      {doctor.isQueueLive ? (
                        <Badge variant="success" className="gap-1.5 py-1 px-2.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Serving #{doctor.currentServingNumber}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1 py-1 px-2.5 font-medium">
                          <Clock className="h-3 w-3" />
                          Starts {doctor.nextStartTime?.split('at')[1] || 'Soon'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  {/* Clinic Details Content */}
                  <CardContent className="p-6 pt-0 space-y-3 text-xs text-slate-600">
                    <Separator className="my-1 bg-slate-100" />
                    
                    {/* Clinic Name & Location */}
                    <div className="flex items-start gap-2.5">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          {doctor.clinicName}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          {doctor.clinicAddress}
                        </p>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-700" />
                      <span className="font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                        {doctor.schedule}
                      </span>
                    </div>

                    {/* HMO Acceptance */}
                    <div className="pt-2">
                      {doctor.acceptsHmo ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>HMO Accepted</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            ({doctor.hmoProviders?.slice(0, 2).join(', ')}
                            {(doctor.hmoProviders?.length || 0) > 2 ? ' +' : ''})
                          </span>
                        </div>
                      ) : (
                        <div className="text-slate-400 font-medium text-[11px]">
                          Cash Consultation Only
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Card Footer CTA & Fees */}
                  <CardFooter className="p-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                        Doctor Fee
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {doctor.consultationFee}{' '}
                        <span className="text-[11px] font-normal text-slate-500">+ ₱40 booking</span>
                      </div>
                    </div>

                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => setSelectedDoctorForQueue(doctor)}
                      className="rounded-xl px-4 py-2 text-xs font-bold shadow-xs gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Join Queue
                      <ChevronRight className="h-3.5 w-3.5 opacity-80" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 mb-4">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No doctors match your criteria</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                We couldn&apos;t find any doctors matching &quot;{searchQuery}&quot; with the selected filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('All Specializations');
                  setOnlyHmo(false);
                  setOnlyLiveQueue(false);
                }}
                className="mt-6 rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700/90"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. BENEFITS & LOCAL IMPACT (Ending the 7 AM CDO Lines) */}
      {/* ----------------------------------------------------------------- */}
      <section id="benefits" className="py-20 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                Built For Cagayan de Oro
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Why Patients and Doctors Trust Clinic Natin
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Hospital waiting rooms in Northern Mindanao have traditionally forced vulnerable patients to queue outside clinics at dawn. We built a synchronized digital queue bridge to give everyone their time back.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4 rounded-2xl bg-brand-50/60 p-4 border border-brand-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Save 3 to 4 Hours of Idle Waiting</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Arrive only 15 minutes before your turn instead of sitting in crowded hallways for half a day.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl bg-brand-50/60 p-4 border border-brand-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">HMO & PhilHealth Verified</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Clearly see which doctors honor your health card before booking to prevent surprise out-of-pocket charges.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl bg-brand-50/60 p-4 border border-brand-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">SMS & Mobile Notifications</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Get automated SMS alerts when your number is 2 slots away, even if you don&apos;t have active mobile data.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Comparison: Traditional Queue vs Clinic Natin */}
            <div className="rounded-3xl border border-slate-200 bg-[#FAFCFB] p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 text-center">
                The Healthcare Experience Comparison
              </h3>

              <div className="space-y-6">
                {/* Traditional */}
                <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
                  <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Traditional Hospital Queue
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>Arrive at 6:30 AM to secure a paper number.</li>
                    <li>Wait 3-5 hours in congested, germ-prone hallways.</li>
                    <li>No idea if the doctor is delayed in emergency surgery.</li>
                    <li>Risk losing your slot if you step out to eat.</li>
                  </ul>
                </div>

                {/* Clinic Natin */}
                <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 shadow-xs">
                  <div className="flex items-center gap-2 text-brand-700 font-bold text-sm mb-2">
                    <span className="h-2 w-2 rounded-full bg-brand-700" />
                    With Clinic Natin
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                    <li>Book from your bed with a quick GCash payment.</li>
                    <li>Rest at home while monitoring the live serving count.</li>
                    <li>Receive SMS notice when it&apos;s time to travel to clinic.</li>
                    <li>Walk straight into consultation room on time.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. CLINIC PARTNER CTA BANNER */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-16 bg-gradient-to-r from-brand-700 to-emerald-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100/20 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur-sm">
                For Medical Clinics & Secretaries
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">
                Are you a Doctor or Clinic Secretary in CDO?
              </h2>
              <p className="mt-2 text-brand-50/90 text-sm sm:text-base max-w-xl">
                Streamline patient intake, eliminate waiting room congestion, and automate SMS calls in one unified secretary dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand-700 shadow-lg hover:bg-brand-50 transition active:scale-95 text-center"
              >
                Access Secretary Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. FAQ SECTION */}
      {/* ----------------------------------------------------------------- */}
      <section id="faq" className="py-20 bg-[#FAFCFB] border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Frequently Asked Questions
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
              Got Questions? We&apos;ve Got Answers.
            </h2>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  How much does it cost to use Clinic Natin?
                </AccordionTrigger>
                <AccordionContent>
                  Patients pay a nominal <strong>₱40 cashless reservation fee</strong> (settled securely via GCash, Maya, or Card) to reserve a verified digital queue token. The doctor&apos;s regular professional consultation fee is paid directly at the clinic cashier or billed to your HMO provider as usual.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  How does live turn tracking work?
                </AccordionTrigger>
                <AccordionContent>
                  Once you book a slot, you get an official digital token code (e.g., <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-brand-700">CN-A109</code>) and a live countdown showing <strong>Now Serving</strong>. You can rest comfortably at home or a nearby coffee shop. The platform sends you an automated SMS notification when you are 2 numbers away so you arrive right on time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  Can I use my HMO card (Maxicare, Intellicare, Medicard, PhilHealth)?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Use the <strong>&quot;Accepts HMO&quot;</strong> toggle on the doctor directory to filter specialists accredited with major healthcare providers including Maxicare, Intellicare, Medicard, and PhilHealth. Present your physical card or digital Letter of Authorization (LOA) to the secretary upon arrival.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  What happens if the doctor is delayed or on emergency rounds?
                </AccordionTrigger>
                <AccordionContent>
                  Doctors and clinic secretaries update session statuses in real time. If a doctor is delayed due to an emergency surgery or hospital rounds, an announcement banner instantly displays on your live queue tracker and an automated SMS alert is dispatched so you don&apos;t travel prematurely.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>
                  Are there priority lanes for Seniors, PWDs, and Pregnant patients?
                </AccordionTrigger>
                <AccordionContent>
                  Yes. Clinic Natin fully complies with Philippine law (RA 9994 for Senior Citizens and RA 7277 for PWDs). Clinic secretaries have dedicated priority queue controls to route senior, PWD, and pregnant patients smoothly without disrupting the online queue flow.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>
                  How do walk-in patients join the queue?
                </AccordionTrigger>
                <AccordionContent>
                  Walk-in patients without smartphones are registered directly by the clinic secretary at the front desk. They receive a printed ticket that is synchronized into the same live digital sequence, ensuring complete fairness and zero confusion for all patients.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. FOOTER */}
      {/* ----------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-slate-100">
            
            {/* Brand column */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Clinic <span className="text-brand-700">Natin</span>
                </span>
              </div>
              <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
                Empowering Filipino patients and clinics through smart, transparent medical queueing. Ending the dawn waiting room lines in Cagayan de Oro.
              </p>
              <div className="text-xs font-semibold text-brand-700">
                Operated by CodeNinjas Web Development Services
              </div>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                For Patients
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#doctor-directory" className="hover:text-brand-700 transition">
                    Search CDO Doctors
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-brand-700 transition">
                    How Digital Queues Work
                  </a>
                </li>
                <li>
                  <a href="#benefits" className="hover:text-brand-700 transition">
                    HMO & PhilHealth Info
                  </a>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-brand-700 transition font-bold text-brand-700 flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5" />
                    Patient Sign Up (Free) &rarr;
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Clinic Portal */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                For Clinics & Partners
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/secretary/dashboard" className="hover:text-brand-700 transition">
                    Secretary Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/doctor/dashboard" className="hover:text-brand-700 transition">
                    Doctor Suite
                  </Link>
                </li>
                <li>
                  <Link href="/my-queue" className="hover:text-brand-700 transition">
                    Patient Live Turn Tracker
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-brand-700 transition font-semibold text-brand-700">
                    Sign In / Staff Portal &rarr;
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-brand-700 transition">
                    Privacy Policy & Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="mt-8 rounded-2xl bg-amber-50/60 p-4 border border-amber-200/60 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Emergency Medical Disclaimer:</strong> Clinic Natin is an outpatient scheduling and queue tracking service. If you or a family member are experiencing a life-threatening medical emergency, please proceed immediately to the nearest hospital emergency department or call emergency hotline 911.
            </p>
          </div>

          {/* Copyright bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>
              &copy; {new Date().getFullYear()} Clinic Natin. All rights reserved.
            </p>
            <p>
              Operated by{' '}
              <span className="font-semibold text-slate-700">
                CodeNinjas Web Development Services
              </span>
            </p>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------------------- */}
      {/* JOIN QUEUE DEMO MODAL (SHADCN DIALOG) */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={Boolean(selectedDoctorForQueue)}
        onOpenChange={(open) => {
          if (!open) resetQueueModal();
        }}
      >
        {selectedDoctorForQueue && (
          <DialogContent className="sm:max-w-lg p-6 sm:p-8 rounded-3xl border-slate-200">
            {!queueSubmitted ? (
              <div>
                <DialogHeader className="mb-5 text-left">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-12 w-12 rounded-2xl ${selectedDoctorForQueue.avatarBg} text-white font-bold shadow-xs`}>
                      <AvatarFallback className={`${selectedDoctorForQueue.avatarBg} text-white font-bold`}>
                        {selectedDoctorForQueue.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl font-bold text-slate-900">
                        Join {selectedDoctorForQueue.name}&apos;s Queue
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        {selectedDoctorForQueue.clinicName} &bull; {selectedDoctorForQueue.specialty}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Queue Summary Box */}
                <div className="rounded-2xl bg-brand-50 p-4 border border-brand-100 mb-5 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Currently Serving:</span>
                    <Badge variant="brand" className="text-xs">
                      #{selectedDoctorForQueue.currentServingNumber || 'Not Started'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total in Queue:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDoctorForQueue.totalInQueue} patients
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Convenience Fee:</span>
                    <span className="font-bold text-slate-900">
                      ₱40 (GCash / Maya)
                    </span>
                  </div>
                </div>

                {/* Patient Form */}
                <form onSubmit={handleJoinQueueSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Patient Full Name
                    </label>
                    <Input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g., Juan Dela Cruz"
                      className="h-11 rounded-xl border-slate-200 focus:border-brand-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Mobile Number (For SMS Updates)
                    </label>
                    <Input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="e.g., 0917 123 4567"
                      className="h-11 rounded-xl border-slate-200 focus:border-brand-700"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="brand"
                      size="lg"
                      className="w-full h-12 rounded-xl text-sm font-bold shadow-md hover:bg-brand-700/90"
                    >
                      Confirm Spot & Proceed to ₱40 Payment
                    </Button>
                    <p className="mt-2 text-[11px] text-center text-slate-400">
                      Secured with GCash / Maya checkout. No waiting in line required.
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              /* Success Confirmation */
              <div className="text-center py-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700 mb-4">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900 text-center">
                  Spot Confirmed!
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-1 text-center">
                  You are registered in {selectedDoctorForQueue.name}&apos;s queue.
                </DialogDescription>

                <div className="mt-6 rounded-2xl bg-brand-50 border border-brand-100 p-5">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Your Queue Ticket
                  </span>
                  <div className="text-5xl font-black text-brand-700 my-2">
                    #{generatedTicketNumber}
                  </div>
                  <p className="text-xs text-slate-600">
                    Estimated consultation: ~35 mins
                  </p>
                </div>

                <div className="mt-5 text-left rounded-xl bg-slate-50 p-4 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <Smartphone className="h-4 w-4 text-brand-700" />
                    SMS updates will be sent to {patientPhone}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selectedDoctorForQueue.clinicAddress}
                  </div>
                </div>

                <DialogFooter className="mt-6 sm:justify-stretch">
                  <Button
                    type="button"
                    variant="brand"
                    size="lg"
                    onClick={resetQueueModal}
                    className="w-full h-12 rounded-xl text-sm font-bold shadow-sm"
                  >
                    Done & Return to Homepage
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
