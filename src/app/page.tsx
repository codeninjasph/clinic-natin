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
  Activity,
  FileText,
  Volume2,
  Zap,
  Building,
  MonitorPlay,
  Heart,
  Shield,
  Layers,
  ArrowUpRight,
  FileCode,
  Info,
  CheckCheck,
} from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ClinicNatinLogo } from '@/components/brand/clinic-natin-logo';

// ---------------------------------------------------------------------------
// Doctor Data Types & Sample Records (Nationwide Scope - CDO Launch Hub)
// ---------------------------------------------------------------------------

interface DoctorListing {
  id: string;
  name: string;
  title: string;
  specialty: string;
  city: 'Cagayan de Oro' | 'Metro Manila' | 'Cebu' | 'Davao';
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
  avatarBg: string;
  experienceYears: number;
}

const DOCTORS_DATA: DoctorListing[] = [
  // Cagayan de Oro (Launch Hub)
  {
    id: 'doc-cdo-1',
    name: 'Dr. Maria Elena Reyes',
    title: 'MD, FPPS',
    specialty: 'Pediatrics',
    city: 'Cagayan de Oro',
    clinicName: 'Maria Reyna Xavier University Hospital',
    clinicAddress: 'Room 304, Medical Arts Bldg, Hayes St, CDO',
    schedule: 'Mon - Fri, 9:00 AM - 1:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth'],
    currentServingNumber: 14,
    totalInQueue: 18,
    isQueueLive: true,
    consultationFee: '₱500',
    avatarBg: 'bg-emerald-600',
    experienceYears: 14,
  },
  {
    id: 'doc-cdo-2',
    name: 'Dr. Juan Carlos Santos',
    title: 'MD, FPCP',
    specialty: 'Internal Medicine',
    city: 'Cagayan de Oro',
    clinicName: 'Capitol University Medical Center',
    clinicAddress: 'Suite 210, Gusa Highway, CDO',
    schedule: 'Mon - Sat, 10:00 AM - 3:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Carehealth Plus', 'PhilHealth'],
    currentServingNumber: 8,
    totalInQueue: 12,
    isQueueLive: true,
    consultationFee: '₱600',
    avatarBg: 'bg-teal-600',
    experienceYears: 16,
  },
  {
    id: 'doc-cdo-3',
    name: 'Dr. Arthur Lim',
    title: 'MD, FPCC',
    specialty: 'Cardiology',
    city: 'Cagayan de Oro',
    clinicName: 'Cagayan de Oro Polymedic Plaza',
    clinicAddress: '4th Floor Heart Center, Kauswagan Highway, CDO',
    schedule: 'Tue, Thu, Sat, 8:30 AM - 12:00 NN',
    acceptsHmo: false,
    currentServingNumber: 5,
    totalInQueue: 9,
    isQueueLive: true,
    consultationFee: '₱800',
    avatarBg: 'bg-brand-700',
    experienceYears: 19,
  },
  {
    id: 'doc-cdo-4',
    name: 'Dr. Carmela Garcia',
    title: 'MD, FPOGS',
    specialty: 'Obstetrics & Gynecology',
    city: 'Cagayan de Oro',
    clinicName: 'Madonna & Child Hospital',
    clinicAddress: 'Room 205, J.V. Seriña St, Carmen, CDO',
    schedule: 'Mon - Fri, 1:00 PM - 5:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Intellicare', 'ValuCare', 'PhilHealth'],
    currentServingNumber: 0,
    totalInQueue: 6,
    isQueueLive: false,
    nextStartTime: 'Today at 1:00 PM',
    consultationFee: '₱550',
    avatarBg: 'bg-rose-600',
    experienceYears: 10,
  },
  {
    id: 'doc-cdo-5',
    name: 'Dr. Patricia Tan',
    title: 'MD, FPDS',
    specialty: 'Dermatology',
    city: 'Cagayan de Oro',
    clinicName: 'Polymedic General Hospital',
    clinicAddress: 'Room 108, Don Apolinar Velez St, CDO',
    schedule: 'Mon, Wed, Fri, 10:00 AM - 2:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Medicard'],
    currentServingNumber: 11,
    totalInQueue: 14,
    isQueueLive: true,
    consultationFee: '₱600',
    avatarBg: 'bg-indigo-600',
    experienceYears: 9,
  },
  {
    id: 'doc-cdo-6',
    name: 'Dr. Vicente Villanueva',
    title: 'MD, FPOA',
    specialty: 'Orthopedics',
    city: 'Cagayan de Oro',
    clinicName: 'Northern Mindanao Medical Center (NMMC)',
    clinicAddress: 'Outpatient Specialty Clinic, Capitol Compound, CDO',
    schedule: 'Mon - Thu, 8:00 AM - 12:00 NN',
    acceptsHmo: false,
    currentServingNumber: 22,
    totalInQueue: 26,
    isQueueLive: true,
    consultationFee: '₱500',
    avatarBg: 'bg-cyan-700',
    experienceYears: 15,
  },
  // Metro Manila
  {
    id: 'doc-mnl-1',
    name: 'Dr. Beatrice Mendoza',
    title: 'MD, FPCP, FPSEM',
    specialty: 'Endocrinology & Diabetes',
    city: 'Metro Manila',
    clinicName: "St. Luke's Medical Center - Global City",
    clinicAddress: 'Suite 718, Medical Arts Bldg, 32nd St, BGC, Taguig',
    schedule: 'Mon, Wed, Fri, 9:00 AM - 2:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Intellicare', 'Medicard', 'PhilHealth'],
    currentServingNumber: 7,
    totalInQueue: 11,
    isQueueLive: true,
    consultationFee: '₱1,000',
    avatarBg: 'bg-purple-700',
    experienceYears: 13,
  },
  {
    id: 'doc-mnl-2',
    name: 'Dr. Gabriel Alcantara',
    title: 'MD, FPCC',
    specialty: 'Cardiology',
    city: 'Metro Manila',
    clinicName: 'Makati Medical Center',
    clinicAddress: 'Room 502, Tower 2, Amorsolo St, Legaspi Village, Makati',
    schedule: 'Tue, Thu, Sat, 10:00 AM - 3:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Cigna', 'PhilHealth'],
    currentServingNumber: 12,
    totalInQueue: 15,
    isQueueLive: true,
    consultationFee: '₱1,200',
    avatarBg: 'bg-blue-700',
    experienceYears: 20,
  },
  // Cebu
  {
    id: 'doc-ceb-1',
    name: 'Dr. Roberto Sy',
    title: 'MD, FPPS',
    specialty: 'Pediatrics',
    city: 'Cebu',
    clinicName: 'Chong Hua Hospital Medical Arts',
    clinicAddress: 'Suite 408, Fuente Osmeña Cir, Cebu City',
    schedule: 'Mon - Fri, 8:30 AM - 1:30 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Intellicare', 'Medicard', 'Caritas'],
    currentServingNumber: 16,
    totalInQueue: 20,
    isQueueLive: true,
    consultationFee: '₱650',
    avatarBg: 'bg-emerald-700',
    experienceYears: 17,
  },
  {
    id: 'doc-ceb-2',
    name: 'Dr. Maria Theresa Yap',
    title: 'MD, FPSO-HNS',
    specialty: 'ENT - Otolaryngology',
    city: 'Cebu',
    clinicName: "Cebu Doctors' University Hospital",
    clinicAddress: 'Room 312, Medical Arts Bldg 2, Gov. Roa St, Cebu City',
    schedule: 'Mon - Sat, 1:00 PM - 5:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Intellicare', 'PhilHealth'],
    currentServingNumber: 0,
    totalInQueue: 5,
    isQueueLive: false,
    nextStartTime: 'Today at 1:00 PM',
    consultationFee: '₱700',
    avatarBg: 'bg-amber-700',
    experienceYears: 12,
  },
  // Davao
  {
    id: 'doc-dvo-1',
    name: 'Dr. Antonio Dalisay',
    title: 'MD, FPCP, FSN',
    specialty: 'Nephrology',
    city: 'Davao',
    clinicName: 'Davao Doctors Hospital',
    clinicAddress: 'Room 216, Medical Tower, E. Quirino Ave, Davao City',
    schedule: 'Tue, Thu, Sat, 9:00 AM - 2:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Medicard', 'PhilHealth'],
    currentServingNumber: 4,
    totalInQueue: 8,
    isQueueLive: true,
    consultationFee: '₱750',
    avatarBg: 'bg-cyan-800',
    experienceYears: 18,
  },
  {
    id: 'doc-cdo-7',
    name: 'Dr. Sofia Mercado',
    title: 'MD',
    specialty: 'Family Medicine / General Practice',
    city: 'Cagayan de Oro',
    clinicName: 'St. Ignatius Medical Center',
    clinicAddress: 'Corrales Ave, Barangay 29, CDO',
    schedule: 'Mon - Sat, 8:00 AM - 4:00 PM',
    acceptsHmo: true,
    hmoProviders: ['Maxicare', 'Medicard', 'PhilHealth', 'Caritas Health'],
    currentServingNumber: 9,
    totalInQueue: 14,
    isQueueLive: true,
    consultationFee: '₱400',
    avatarBg: 'bg-teal-700',
    experienceYears: 8,
  },
];

const SPECIALTY_OPTIONS = [
  'All Specializations',
  'Family Medicine / General Practice',
  'Pediatrics',
  'Internal Medicine',
  'Obstetrics & Gynecology',
  'Cardiology',
  'General Surgery',
  'Orthopedics',
  'Dermatology',
  'ENT - Otolaryngology',
  'Endocrinology & Diabetes',
  'Nephrology',
  'Neurology',
  'Pulmonology',
];

const CITY_OPTIONS = [
  'All Cities / Nationwide',
  'Cagayan de Oro',
  'Metro Manila',
  'Cebu',
  'Davao',
];

export default function HomePage() {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specializations');
  const [selectedCity, setSelectedCity] = useState('All Cities / Nationwide');
  const [onlyHmo, setOnlyHmo] = useState(false);
  const [onlyLiveQueue, setOnlyLiveQueue] = useState(false);

  // Hero Simulator Perspective State
  const [heroPerspective, setHeroPerspective] = useState<'patient' | 'doctor' | 'tv'>('patient');

  // Modal State for Queue Booking Demonstration
  const [selectedDoctorForQueue, setSelectedDoctorForQueue] = useState<DoctorListing | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientPriority, setPatientPriority] = useState('regular');
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
        doctor.clinicAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialty =
        selectedSpecialty === 'All Specializations' ||
        doctor.specialty.toLowerCase() === selectedSpecialty.toLowerCase();

      const matchesCity =
        selectedCity === 'All Cities / Nationwide' ||
        doctor.city.toLowerCase() === selectedCity.toLowerCase();

      const matchesHmo = !onlyHmo || doctor.acceptsHmo;
      const matchesLive = !onlyLiveQueue || doctor.isQueueLive;

      return matchesSearch && matchesSpecialty && matchesCity && matchesHmo && matchesLive;
    });
  }, [searchQuery, selectedSpecialty, selectedCity, onlyHmo, onlyLiveQueue]);

  // Handle queue modal submit
  const handleJoinQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) return;
    const nextNumber = (selectedDoctorForQueue?.totalInQueue || 14) + 1;
    setGeneratedTicketNumber(nextNumber);
    setQueueSubmitted(true);
  };

  const resetQueueModal = () => {
    setSelectedDoctorForQueue(null);
    setPatientName('');
    setPatientPhone('');
    setPatientPriority('regular');
    setQueueSubmitted(false);
    setGeneratedTicketNumber(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFCFB] text-slate-900 selection:bg-brand-200 selection:text-slate-900 font-sans">
      {/* ----------------------------------------------------------------- */}
      {/* TOP NOTIFICATION BAR - NATIONWIDE EXPANSION & CDO LAUNCH HUB */}
      {/* ----------------------------------------------------------------- */}
      <div className="w-full bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-brand-700/50">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          <strong>Pioneered in Cagayan de Oro:</strong> The modern outpatient operating system built for Philippine private practices, hospitals, and clinics nationwide.
        </span>
        <a href="#how-it-works" className="underline font-bold hover:text-brand-200 ml-1 hidden sm:inline">
          See How It Works &rarr;
        </a>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* NAVIGATION BAR - WIDESCREEN & MOBILE RESPONSIVE */}
      {/* ----------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-brand-100/80 bg-white/95 backdrop-blur-md transition-all shadow-xs">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-10 xl:px-12 h-20">
          {/* Brand Logo & National Expansion Badge */}
          <div className="flex items-center gap-3">
            <ClinicNatinLogo height={38} href="/" priority />
            <Badge variant="outline" className="hidden lg:inline-flex text-[11px] font-semibold border-brand-200 text-brand-700 bg-brand-50/60">
              Philippine Outpatient OS
            </Badge>
          </div>

          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#what-is-clinic-natin" className="transition hover:text-brand-700">
              What is Clinic Natin
            </a>
            <a href="#how-it-works" className="transition hover:text-brand-700">
              How It Works
            </a>
            <a href="#doctor-directory" className="transition hover:text-brand-700">
              Find Doctors & Clinics
            </a>
            <a href="#clinical-engine" className="transition hover:text-brand-700 flex items-center gap-1.5">
              <span>WHO ICD-10 & e-Rx</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2">
                New
              </span>
            </a>
            <a href="#benefits" className="transition hover:text-brand-700">
              Why Clinic Natin
            </a>
            <a href="#faq" className="transition hover:text-brand-700">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/my-queue"
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2 text-xs sm:text-sm font-bold text-brand-800 transition hover:bg-brand-100 hover:border-brand-600 active:scale-95"
            >
              <Ticket className="h-4 w-4 text-brand-700" />
              <span>Track Live Turn</span>
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Patient Sign Up</span>
              <span className="sm:hidden">Sign Up</span>
            </Link>

            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 1. HERO SECTION - EXPANSIVE WIDESCREEN HERO WITH SIMULATOR */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-[#F7FCF9] to-[#FAFCFB] pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-brand-100/60">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[900px] rounded-full bg-brand-100/50 blur-3xl" />
        <div className="pointer-events-none absolute top-1/4 -right-20 h-80 w-80 rounded-full bg-emerald-200/30 blur-2xl" />

        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">

            {/* Left Column: Core Value Proposition, Definitions & CTAs */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-6 text-center lg:text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/80 bg-white/95 px-4 py-1.5 text-xs font-semibold text-brand-800 shadow-xs backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Launched First in Cagayan de Oro &bull; Built for Clinics Across the Philippines</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl xl:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
                End the 5:00 AM Clinic Lines.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-800 to-emerald-600 block sm:inline">
                  Healthcare Without Waiting Room Chaos.
                </span>
              </h1>

              {/* Comprehensive Definition */}
              <p className="mx-auto lg:mx-0 max-w-3xl text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                <strong>Clinic Natin</strong> is the unified outpatient operating system for Philippine medical practices, hospitals, and clinics. 
                Synchronizing real-time mobile queue telemetry, 1-minute digital health passports, WHO ICD-10 clinical diagnosis autocomplete, and BIR statutory discount accounting — so patients never wait hours in congested corridors again.
              </p>

              {/* Main Action CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <a
                  href="#doctor-directory"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand-700 hover:bg-brand-800 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-brand-700/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Find a Doctor & Join Queue</span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </a>

                <Link
                  href="/my-queue"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-brand-300 bg-white hover:bg-brand-50 px-5 py-3.5 text-sm sm:text-base font-bold text-brand-800 shadow-xs transition-all duration-200"
                >
                  <Ticket className="h-4 w-4 text-brand-700" />
                  <span>Track My Live Turn</span>
                </Link>

                <Link
                  href="/signup"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3.5 text-sm sm:text-base font-bold text-white shadow-sm transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Patient Sign Up (Free)</span>
                </Link>
              </div>

              {/* Trust Metric Highlights Bar */}
              <div className="pt-6 border-t border-brand-200/70 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto lg:mx-0">
                <div className="rounded-2xl bg-white/80 p-3 border border-brand-100/80 text-center lg:text-left shadow-2xs">
                  <div className="text-xl sm:text-2xl font-black text-brand-700">0 Dawn Lines</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">Online GCash & Walk-in</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 border border-brand-100/80 text-center lg:text-left shadow-2xs">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">15-Min Buffer</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">Safe-zone traffic protection</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 border border-brand-100/80 text-center lg:text-left shadow-2xs">
                  <div className="text-xl sm:text-2xl font-black text-slate-900">74,800+</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">WHO ICD-10 (2019) codes</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3 border border-brand-100/80 text-center lg:text-left shadow-2xs">
                  <div className="text-xl sm:text-2xl font-black text-emerald-700">RA 9994</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">20% BIR tax discount auto-ledger</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Real-Time Architecture Telemetry Simulator */}
            <div className="lg:col-span-5 xl:col-span-5">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Decorative border backdrop glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-300 via-emerald-400 to-brand-600 opacity-40 blur-xl" />

                <Card className="relative rounded-3xl border border-white/80 bg-white/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
                  {/* Perspective Selector Tabs */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Live System Simulation
                      </span>
                    </div>

                    {/* Role View Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setHeroPerspective('patient')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          heroPerspective === 'patient'
                            ? 'bg-white text-brand-700 shadow-2xs font-bold'
                            : 'hover:text-slate-900'
                        }`}
                      >
                        Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroPerspective('doctor')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          heroPerspective === 'doctor'
                            ? 'bg-white text-brand-700 shadow-2xs font-bold'
                            : 'hover:text-slate-900'
                        }`}
                      >
                        Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeroPerspective('tv')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          heroPerspective === 'tv'
                            ? 'bg-white text-brand-700 shadow-2xs font-bold'
                            : 'hover:text-slate-900'
                        }`}
                      >
                        Lobby TV
                      </button>
                    </div>
                  </div>

                  {/* 1. Patient Perspective */}
                  {heroPerspective === 'patient' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 rounded-2xl bg-emerald-600 text-white font-bold shadow-xs">
                            <AvatarFallback className="bg-emerald-600 text-white font-bold">MR</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              Dr. Maria Elena Reyes, MD, FPPS
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                              Pediatrics Specialist &bull; Maria Reyna XU Hospital
                            </span>
                          </div>
                        </div>
                        <Badge variant="success" className="text-[11px] py-1">
                          Queue Live
                        </Badge>
                      </div>

                      {/* Serving Telemetry Box */}
                      <div className="rounded-2xl bg-gradient-to-b from-brand-50 to-emerald-50/50 border border-brand-100 p-4 text-center">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Now Calling Next
                        </span>
                        <div className="text-4xl font-black text-brand-700 tracking-tight my-1">
                          #14
                        </div>
                        <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-brand-700" />
                          <span>Average Door-to-Doctor Time: <strong>11 mins</strong></span>
                        </p>
                      </div>

                      {/* Patient Status Breakdown */}
                      <div className="rounded-xl bg-slate-50 p-3.5 text-xs border border-slate-100 space-y-2">
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Your Booking Token:</span>
                          <span className="font-bold text-slate-900">#18 (4 Patients Ahead)</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Safe-Zone Departure:</span>
                          <span className="font-bold text-emerald-700">Leave home at 10:45 AM</span>
                        </div>
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Queue Progress</span>
                            <span>78% complete</span>
                          </div>
                          <Progress value={78} className="h-2 bg-slate-200" indicatorClassName="bg-brand-700" />
                        </div>
                      </div>

                      {/* Pre-Consultation Digital Health Passport Banner */}
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCheck className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-emerald-900">
                            <strong>Health Passport:</strong> Pre-consultation chart synced
                          </span>
                        </div>
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-[10px] bg-white">
                          Verified
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Smartphone className="h-3.5 w-3.5 text-brand-700" />
                          SMS alert dispatched at #16
                        </span>
                        <Link href="/my-queue" className="font-bold text-brand-700 hover:underline flex items-center gap-0.5">
                          Open Live View <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* 2. Doctor Perspective */}
                  {heroPerspective === 'doctor' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                            <Stethoscope className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              Doctor Consultation Cockpit
                            </h3>
                            <span className="text-xs text-slate-500">
                              Dr. Santos &bull; Capitol University Medical Center
                            </span>
                          </div>
                        </div>
                        <Badge variant="brand" className="text-[11px]">
                          Consultation Active
                        </Badge>
                      </div>

                      {/* Active Patient Card with WHO ICD-10 Search */}
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">Current Patient: Ramon Cruz (Token #8)</span>
                          <Badge variant="warning" className="text-[10px]">Senior Citizen (RA 9994)</Badge>
                        </div>

                        {/* WHO ICD-10 Autocomplete Tag */}
                        <div className="rounded-xl bg-white p-2.5 border border-slate-200 text-xs space-y-1">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            WHO ICD-10 (2019) Diagnosis Search:
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">
                              J06.9 &bull; Acute upper respiratory infection
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Offline CM-74k
                            </Badge>
                          </div>
                        </div>

                        {/* Statutory Discount Ledger */}
                        <div className="flex items-center justify-between text-xs bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60">
                          <span className="text-emerald-900 font-medium">BIR RR 7-2010 Tax Deduction:</span>
                          <span className="font-extrabold text-emerald-800">₱120.00 (20% Senior Discount)</span>
                        </div>
                      </div>

                      {/* Doctor Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                        <button
                          type="button"
                          className="rounded-xl bg-brand-700 text-white py-2.5 shadow-xs hover:bg-brand-800 transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Complete & Issue e-Rx</span>
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white text-slate-700 py-2.5 hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                        >
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>Call Next (#9)</span>
                        </button>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Patients seen today: <strong>14 / 22</strong></span>
                        <Link href="/doctor/analytics" className="font-bold text-brand-700 hover:underline">
                          View Doctor Analytics &rarr;
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* 3. Lobby TV Perspective */}
                  {heroPerspective === 'tv' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                            <MonitorPlay className="h-6 w-6 text-brand-300" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">
                              Waiting Room TV Display
                            </h3>
                            <span className="text-xs text-slate-500">
                              High-contrast broadcast view for lobby screens
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                          1080p Broadcast
                        </Badge>
                      </div>

                      {/* TV Screen Preview */}
                      <div className="rounded-2xl bg-slate-900 text-white p-5 text-center space-y-3 shadow-inner">
                        <div className="text-xs font-semibold text-brand-300 uppercase tracking-widest">
                          NOW SERVING IN ROOM 304
                        </div>
                        <div className="text-5xl font-black text-emerald-400 tracking-wider font-mono">
                          #14
                        </div>
                        <div className="flex justify-center gap-2 pt-1">
                          <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                            Next: <strong>#15 (Online)</strong>
                          </span>
                          <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                            Upcoming: <strong>#16 (Walk-in)</strong>
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-brand-50 p-3 text-xs text-brand-900 border border-brand-200 flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-brand-700 shrink-0" />
                        <span>
                          <strong>Interleaved Queue Algorithm:</strong> Fairly alternates online GCash reservations and frontdesk walk-in patients.
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-slate-500 pt-1">
                        <Link href="/display/cdo-maria-reyna" className="font-bold text-brand-700 hover:underline">
                          Launch Fullscreen Lobby TV &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. WHAT IS CLINIC NATIN? - CLEAR ARCHITECTURAL BLUEPRINT */}
      {/* ----------------------------------------------------------------- */}
      <section id="what-is-clinic-natin" className="py-20 bg-white border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          {/* Section Header */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              What is Clinic Natin?
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              The Modern Outpatient Operating System Built for the Philippines
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              In traditional Philippine clinics, patients wake up at 5:00 AM to fight over handwritten paper numbers, sitting 4 to 6 hours in congested hospital hallways. 
              <strong>Clinic Natin</strong> replaces that chaotic manual cycle with an integrated digital ecosystem connecting Patients, Doctors, and Clinic Secretaries.
            </p>
          </div>

          {/* 4 Core Pillars Grid (Widescreen 4-Column Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <Card className="rounded-3xl border border-slate-200/90 bg-[#FAFCFB] p-6 transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="h-14 w-14 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mb-6 shadow-inner">
                  <Radio className="h-7 w-7" />
                </div>
                <Badge variant="brand" className="mb-3 text-[11px]">
                  Dual-Queue Engine
                </Badge>
                <h3 className="text-xl font-bold text-slate-900">
                  Interleaved Queue Balancing
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Balances online reservations and on-site walk-ins fairly (odds for online, evens for walk-in tickets). Eliminates physical lines while protecting access for seniors and walk-ins.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-brand-700">
                <Check className="h-4 w-4" />
                <span>Zero Dawn Line Waiting</span>
              </div>
            </Card>

            {/* Pillar 2 */}
            <Card className="rounded-3xl border border-slate-200/90 bg-[#FAFCFB] p-6 transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-6 shadow-inner">
                  <Activity className="h-7 w-7" />
                </div>
                <Badge variant="success" className="mb-3 text-[11px]">
                  Clinical Triage
                </Badge>
                <h3 className="text-xl font-bold text-slate-900">
                  1-Min Digital Health Passport
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Patients complete a 60-second mobile intake covering chief complaints, drug allergies, comorbidities, and PhilHealth/HMO verification so the doctor has a verified chart ready before calling.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Check className="h-4 w-4" />
                <span>Pre-Loaded Patient Chart</span>
              </div>
            </Card>

            {/* Pillar 3 */}
            <Card className="rounded-3xl border border-slate-200/90 bg-[#FAFCFB] p-6 transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="h-14 w-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-6 shadow-inner">
                  <Stethoscope className="h-7 w-7" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] border-blue-300 text-blue-800 bg-blue-50">
                  Clinical Standards
                </Badge>
                <h3 className="text-xl font-bold text-slate-900">
                  WHO ICD-10 (2019) Autocomplete
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Doctors enjoy instant, offline diagnosis autocomplete across 74,800+ standardized ICD-10-CM codes with top Philippine outpatient presets (URTI, Hypertension, Diabetes, Dengue, Pneumonia).
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <Check className="h-4 w-4" />
                <span>WHO Clinical Standard</span>
              </div>
            </Card>

            {/* Pillar 4 */}
            <Card className="rounded-3xl border border-slate-200/90 bg-[#FAFCFB] p-6 transition-all duration-300 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="h-14 w-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-6 shadow-inner">
                  <BadgePercent className="h-7 w-7" />
                </div>
                <Badge variant="outline" className="mb-3 text-[11px] border-purple-300 text-purple-800 bg-purple-50">
                  Tax & Legal
                </Badge>
                <h3 className="text-xl font-bold text-slate-900">
                  BIR Statutory Discount Ledger
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Automates mandatory 20% discounts for Senior Citizens (RA 9994) and PWDs (RA 10754) with itemized BIR Revenue Regulations No. 7-2010 tax deduction reports for doctor annual filing.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-purple-700">
                <Check className="h-4 w-4" />
                <span>BIR RR 7-2010 Tax Compliant</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. HOW IT WORKS - INTERACTIVE ROLE-BASED WORKFLOWS (SHADCN TABS) */}
      {/* ----------------------------------------------------------------- */}
      <section id="how-it-works" className="py-20 bg-brand-50/30 border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Interactive System Architecture
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              How Clinic Natin Works Across All Roles
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600">
              A synchronized 3-sided system engineered for patients, healthcare providers, and clinic secretaries.
            </p>
          </div>

          {/* Interactive Role Tabs */}
          <Tabs defaultValue="patients" className="w-full">
            <div className="flex justify-center mb-10">
              <TabsList className="h-13 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                <TabsTrigger value="patients" className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-brand-700 data-[state=active]:text-white">
                  <Users className="h-4 w-4" />
                  <span>1. For Patients</span>
                </TabsTrigger>
                <TabsTrigger value="doctors" className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-brand-700 data-[state=active]:text-white">
                  <Stethoscope className="h-4 w-4" />
                  <span>2. For Doctors</span>
                </TabsTrigger>
                <TabsTrigger value="clinics" className="rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-brand-700 data-[state=active]:text-white">
                  <Building2 className="h-4 w-4" />
                  <span>3. For Clinics & Secretaries</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: PATIENTS JOURNEY */}
            <TabsContent value="patients">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Step 1 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                      01
                    </div>
                    <Badge variant="brand">Spot Discovery</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Find Doctor & Lock Spot
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Search nationwide specialists by hospital, HMO accreditation, or specialty. Secure your verified queue token online with a ₱50 GCash deposit or on-site walk-in reception.
                  </p>
                </Card>

                {/* Step 2 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      02
                    </div>
                    <Badge variant="success">60-Sec Triage</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Digital Health Passport
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Quickly declare symptoms, drug allergies, comorbidities, and PhilHealth/HMO details before leaving home. No repeated handwritten intake forms at the clinic counter.
                  </p>
                </Card>

                {/* Step 3 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      03
                    </div>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">Live Turn</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Track & 15-Min Safe-Zone
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Watch the counter update live from home or a coffee shop. Receive SMS notifications when 2 patients remain, protected by a 15-minute grace window if held up in traffic.
                  </p>
                </Card>

                {/* Step 4 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      04
                    </div>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">Digital Care</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Consultation & Digital e-Rx
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Walk straight into the doctor&apos;s room when your number is called. Receive verified digital prescriptions and BIR-compliant receipts directly on your phone.
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: DOCTORS JOURNEY */}
            <TabsContent value="doctors">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Step 1 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                      01
                    </div>
                    <Badge variant="brand">Queue Call</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    1-Click Patient Calling
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Call next patient from your desktop, tablet, or phone. The system automatically triggers lobby audio chimes, updates the waiting room TV, and sends SMS notifications.
                  </p>
                </Card>

                {/* Step 2 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      02
                    </div>
                    <Badge variant="success">Allergy Alert</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Pre-Loaded Chart & Vitals
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    View the patient&apos;s chief complaint, secretary-recorded blood pressure, and red-flag drug allergy warnings before they even sit in your consultation chair.
                  </p>
                </Card>

                {/* Step 3 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      03
                    </div>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">ICD-10 (2019)</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    WHO Diagnosis Autocomplete
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Instantly autocomplete clinical diagnoses against 74,800+ WHO ICD-10-CM codes with single-click Philippine outpatient presets and direct WHO browser links.
                  </p>
                </Card>

                {/* Step 4 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      04
                    </div>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">BIR Tax Ready</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    e-Rx & RA 9994 BIR Ledger
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Issue legible electronic prescriptions with dosage guidelines. The system automatically records 20% Senior/PWD discounts under BIR RR 7-2010 for easy annual tax deduction.
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: CLINICS & SECRETARIES */}
            <TabsContent value="clinics">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Step 1 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                      01
                    </div>
                    <Badge variant="brand">Queue Dispatch</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Interleaved Queue Balancing
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Secretaries intake walk-in patients via SMS tickets, which automatically interleave into the sequence with online reservations, preventing walk-in resentment and queue crashes.
                  </p>
                </Card>

                {/* Step 2 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      02
                    </div>
                    <Badge variant="success">Triage Suite</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Vitals & Priority Lanes
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Record patient vitals (BP, temp, weight) with dedicated priority routing for Senior Citizens (RA 9994), PWDs (RA 10754), and pediatric emergency cases.
                  </p>
                </Card>

                {/* Step 3 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      03
                    </div>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">Lobby TV</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Lobby TV Queue Display
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Broadcast real-time serving tokens to smart TVs in the hallway at zero added hardware cost (`/display/[clinicId]`), equipped with high-contrast text and audio dings.
                  </p>
                </Card>

                {/* Step 4 */}
                <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      04
                    </div>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">Clinic Analytics</Badge>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Daily Revenue & Collections
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Generate instant end-of-day cash reconciliation reports, track HMO claim approvals, monitor patient throughput, and optimize clinic consultation hours.
                  </p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. INTERACTIVE DOCTOR & CLINIC DIRECTORY (WIDESCREEN RESPONSIVE) */}
      {/* ----------------------------------------------------------------- */}
      <section id="doctor-directory" className="py-20 bg-white border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">

          {/* Directory Title & Intro */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                Verified Philippine Specialists
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Find Your Doctor & Join Queue
              </h2>
              <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
                Browse certified doctors across Cagayan de Oro, Metro Manila, Cebu, and Davao. Check real-time queue states before traveling to the clinic.
              </p>
            </div>

            <div className="text-sm font-semibold text-slate-600 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
              Showing <span className="text-brand-700 font-bold">{filteredDoctors.length}</span> of {DOCTORS_DATA.length} Verified Doctors
            </div>
          </div>

          {/* Search & Filter Toolbar with shadcn components */}
          <Card className="rounded-3xl border border-brand-100 bg-white p-5 sm:p-6 shadow-sm mb-10 space-y-4">
            {/* Primary Inputs Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">

              {/* Search Bar using shadcn Input */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, hospital, specialty, or city..."
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

              {/* City / Region Selector */}
              <div className="md:col-span-3">
                <Select
                  value={selectedCity}
                  onValueChange={(val) => setSelectedCity(val)}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-800 focus:bg-white">
                    <SelectValue placeholder="All Cities / Nationwide" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_OPTIONS.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specialization Dropdown */}
              <div className="md:col-span-2">
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

              {/* Toggle Buttons */}
              <div className="md:col-span-2 flex items-center gap-2">
                {/* HMO Toggle */}
                <Button
                  type="button"
                  variant={onlyHmo ? 'brand' : 'outline'}
                  onClick={() => setOnlyHmo(!onlyHmo)}
                  className="flex-1 h-12 rounded-2xl text-xs font-bold shadow-xs gap-1.5 px-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>HMO</span>
                </Button>

                {/* Live Queue Only Toggle */}
                <Button
                  type="button"
                  variant={onlyLiveQueue ? 'default' : 'outline'}
                  onClick={() => setOnlyLiveQueue(!onlyLiveQueue)}
                  className={`flex-1 h-12 rounded-2xl text-xs font-bold shadow-xs gap-1.5 px-2 ${
                    onlyLiveQueue ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  <span>Live</span>
                </Button>
              </div>

            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Quick Select:</span>
              {['Cagayan de Oro', 'Metro Manila', 'Cebu', 'Davao'].map((city) => (
                <Badge
                  key={city}
                  variant={selectedCity === city ? 'brand' : 'outline'}
                  onClick={() => setSelectedCity(selectedCity === city ? 'All Cities / Nationwide' : city)}
                  className="cursor-pointer py-1 px-2.5 rounded-xl text-xs font-medium transition hover:bg-brand-100"
                >
                  {city}
                </Badge>
              ))}
              <Separator orientation="vertical" className="h-4 mx-1" />
              {['Pediatrics', 'Internal Medicine', 'Cardiology', 'Obstetrics & Gynecology'].map((spec) => (
                <Badge
                  key={spec}
                  variant={selectedSpecialty === spec ? 'brand' : 'outline'}
                  onClick={() => setSelectedSpecialty(selectedSpecialty === spec ? 'All Specializations' : spec)}
                  className="cursor-pointer py-1 px-2.5 rounded-xl text-xs font-medium transition hover:bg-brand-100"
                >
                  {spec}
                </Badge>
              ))}

              {(searchQuery || selectedSpecialty !== 'All Specializations' || selectedCity !== 'All Cities / Nationwide' || onlyHmo || onlyLiveQueue) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty('All Specializations');
                    setSelectedCity('All Cities / Nationwide');
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

          {/* Doctor Cards Grid (Expands to 4 Columns on Widescreen Displays) */}
          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDoctors.map((doctor) => (
                <Card
                  key={doctor.id}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md hover:-translate-y-1 overflow-hidden"
                >
                  {/* Top Header Section */}
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-12 w-12 rounded-2xl ${doctor.avatarBg} text-sm font-bold text-white shadow-xs`}>
                          <AvatarFallback className={`${doctor.avatarBg} text-white font-bold`}>
                            {doctor.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                            {doctor.name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-500">{doctor.title}</span>
                            <span className="text-slate-300">&bull;</span>
                            <Badge variant="brand" className="text-[10px] px-1.5 py-0">
                              {doctor.specialty}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Queue Status Badge */}
                      {doctor.isQueueLive ? (
                        <Badge variant="success" className="gap-1.5 py-1 px-2.5 shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Serving #{doctor.currentServingNumber}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1 py-1 px-2.5 font-medium shrink-0">
                          <Clock className="h-3 w-3" />
                          Starts {doctor.nextStartTime?.split('at')[1] || 'Soon'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  {/* Clinic Details Content */}
                  <CardContent className="p-5 pt-0 space-y-3 text-xs text-slate-600">
                    <Separator className="my-1 bg-slate-100" />

                    {/* Clinic Name, City & Location */}
                    <div className="flex items-start gap-2.5">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-800 text-sm">
                            {doctor.clinicName}
                          </p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {doctor.city}
                          </Badge>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          {doctor.clinicAddress}
                        </p>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex items-center gap-2.5 pt-0.5">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-700" />
                      <span className="font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                        {doctor.schedule}
                      </span>
                    </div>

                    {/* HMO Acceptance */}
                    <div className="pt-1">
                      {doctor.acceptsHmo ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>HMO Accredited</span>
                          <span className="text-[10px] font-normal text-slate-500">
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
                  <CardFooter className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Consultation Fee
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {doctor.consultationFee}{' '}
                        <span className="text-[10px] font-normal text-slate-500">(RA 9994 20% discount)</span>
                      </div>
                    </div>

                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => setSelectedDoctorForQueue(doctor)}
                      className="rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs gap-1.5"
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
              <Button
                variant="brand"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('All Specializations');
                  setSelectedCity('All Cities / Nationwide');
                  setOnlyHmo(false);
                  setOnlyLiveQueue(false);
                }}
                className="mt-6 rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. CLINICAL ENGINE & COMPLIANCE BAR (WHO ICD-10 & BIR RR 7-2010) */}
      {/* ----------------------------------------------------------------- */}
      <section id="clinical-engine" className="py-16 bg-slate-900 text-white">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-300">
                <Shield className="h-3.5 w-3.5" />
                Philippine Clinical & Statutory Standards
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Engineered for Philippine Medical Practice Compliance
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Clinic Natin is built from the ground up to respect Philippine clinical, tax, and privacy regulations. 
                Doctors maintain complete autonomy while clinical staff gain automated tools for compliance.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80">
                  <div className="flex items-center gap-2 text-brand-300 font-bold text-sm mb-1">
                    <FileCode className="h-4 w-4" />
                    WHO ICD-10 (2019) Standard
                  </div>
                  <p className="text-xs text-slate-300">
                    Offline search across 74,800+ codes with direct reference anchors to the WHO browser for international clinical classification.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                    <BadgePercent className="h-4 w-4" />
                    BIR RR 7-2010 Tax Accounting
                  </div>
                  <p className="text-xs text-slate-300">
                    Automatic 20% Senior Citizen (RA 9994) & PWD (RA 10754) deduction ledger for professional tax filing without paperwork errors.
                  </p>
                </div>
              </div>
            </div>

            {/* Code / Analytics Terminal Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5 sm:p-6 shadow-2xl font-mono text-xs text-slate-300 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-slate-400">clinic-natin-clinical-engine.ts</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-brand-300 border-slate-700 font-mono">
                    ONLINE
                  </Badge>
                </div>

                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <p className="text-slate-500">// Top Philippine Outpatient Clinical Presets</p>
                  <p><span className="text-emerald-400">ICD10_PRESET_1:</span> <span className="text-brand-300">&quot;J06.9&quot;</span> - Acute upper respiratory infection</p>
                  <p><span className="text-emerald-400">ICD10_PRESET_2:</span> <span className="text-brand-300">&quot;I10&quot;</span> - Essential (primary) hypertension</p>
                  <p><span className="text-emerald-400">ICD10_PRESET_3:</span> <span className="text-brand-300">&quot;E11.9&quot;</span> - Type 2 diabetes mellitus</p>
                  <p><span className="text-emerald-400">ICD10_PRESET_4:</span> <span className="text-brand-300">&quot;A09&quot;</span> - Infectious gastroenteritis and colitis</p>
                  <p className="text-slate-500 pt-2">// Statutory Tax Deductions (BIR RR 7-2010)</p>
                  <p><span className="text-purple-400">statutoryDiscount:</span> 0.20 <span className="text-slate-500">/* Senior RA 9994 &amp; PWD RA 10754 */</span></p>
                  <p><span className="text-purple-400">dataPrivacyCompliance:</span> <span className="text-amber-300">&quot;RA 10173 End-to-End Encrypted&quot;</span></p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Doctor Diagnostic Autocomplete Engine: Ready</span>
                  <Link href="/doctor/analytics" className="text-brand-300 hover:underline">
                    View Doctor Analytics &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. COMPARISON MATRIX: TRADITIONAL CLINIC VS CLINIC NATIN */}
      {/* ----------------------------------------------------------------- */}
      <section id="benefits" className="py-20 bg-white border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Clear Value Comparison
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Why Healthcare Leaders Choose Clinic Natin
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              See the measurable difference between standard manual waiting rooms and our digital operating system.
            </p>
          </div>

          <Card className="rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="w-1/3 font-bold text-slate-900 py-4 px-6 text-sm">
                    Outpatient Clinic Dimension
                  </TableHead>
                  <TableHead className="w-1/3 font-bold text-rose-700 py-4 px-6 text-sm">
                    Traditional Manual Clinic Queue
                  </TableHead>
                  <TableHead className="w-1/3 font-bold text-emerald-700 py-4 px-6 text-sm bg-emerald-50/40">
                    Clinic Natin Operating System
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold text-slate-900 px-6 py-4">
                    Patient Arrival & Line Formation
                  </TableCell>
                  <TableCell className="text-slate-600 px-6 py-4">
                    Patients queue outside hospital at 5:00 AM for handwritten numbers.
                  </TableCell>
                  <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                    Book token from bed or quick frontdesk walk-in registration.
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900 px-6 py-4">
                    Hallway Waiting Room Time
                  </TableCell>
                  <TableCell className="text-slate-600 px-6 py-4">
                    3 to 5 hours sitting in crowded, unventilated hallways.
                  </TableCell>
                  <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                    Arrive 15 minutes before your turn with real-time SMS alerts.
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900 px-6 py-4">
                    Pre-Consultation Patient Intake
                  </TableCell>
                  <TableCell className="text-slate-600 px-6 py-4">
                    Repeatedly filling out paper slips with illegible handwriting.
                  </TableCell>
                  <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                    1-minute Digital Health Passport (allergies, symptoms, HMO).
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900 px-6 py-4">
                    Doctor Emergency / Surgical Delays
                  </TableCell>
                  <TableCell className="text-slate-600 px-6 py-4">
                    Patients wait blind with zero notice while doctor is in surgery.
                  </TableCell>
                  <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                    Instant delay broadcast on live mobile tracker and SMS alert.
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900 px-6 py-4">
                    Senior & PWD Statutory Deductions
                  </TableCell>
                  <TableCell className="text-slate-600 px-6 py-4">
                    Manual calculator subtraction prone to BIR audit discrepancies.
                  </TableCell>
                  <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                    Automated 20% BIR RR 7-2010 tax deduction export.
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-semibold text-slate-900 px-6 py-4">
                    Waiting Room Audio/Visual Telemetry
                  </TableCell>
                  <TableCell className="text-slate-600 px-6 py-4">
                    Secretaries shouting names down loud hallways.
                  </TableCell>
                  <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                    Integrated Lobby TV screen (`/display/[clinicId]`) with audio chimes.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. CLINIC PARTNER CTA BANNER - EXPANSIVE */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-16 bg-gradient-to-r from-brand-800 via-brand-700 to-emerald-800 text-white">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur-sm">
                For Philippine Medical Clinics & Outpatient Centers
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold">
                Are you a Doctor or Clinic Secretary?
              </h2>
              <p className="mt-2 text-brand-100 text-sm sm:text-base max-w-2xl">
                Streamline patient intake, eliminate waiting room congestion, automate SMS calls, and access WHO ICD-10 diagnostics in one unified clinical cockpit.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                href="/login"
                className="w-full sm:w-auto rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-brand-800 shadow-lg hover:bg-brand-50 transition active:scale-95 text-center"
              >
                Access Staff Portal
              </Link>
              <Link
                href="/doctor/analytics"
                className="w-full sm:w-auto rounded-2xl border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/20 transition active:scale-95 text-center"
              >
                Explore Doctor Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 8. FREQUENTLY ASKED QUESTIONS (SHADCN ACCORDION) */}
      {/* ----------------------------------------------------------------- */}
      <section id="faq" className="py-20 bg-[#FAFCFB] border-b border-slate-100">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Frequently Asked Questions
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
              Everything You Need to Know About Clinic Natin
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Clear answers for patients, healthcare providers, and clinic secretaries.
            </p>
          </div>

          <Card className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  What exactly is Clinic Natin and how does it work?
                </AccordionTrigger>
                <AccordionContent>
                  Clinic Natin is the modern outpatient operating system built for Philippine private practices, medical arts clinics, and hospitals. 
                  It connects patients, doctors, and clinic secretaries in real time: patients can book guaranteed consultation slots online or at the clinic counter, complete a 1-minute digital health passport, track their live queue position from home via web or SMS, and arrive only 15 minutes before their turn without waiting hours in crowded corridors.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  How much does it cost to use Clinic Natin?
                </AccordionTrigger>
                <AccordionContent>
                  Patients pay a nominal reservation deposit (such as ₱50 settled securely via GCash or Maya) to lock in their verified digital queue token. This commitment deposit significantly reduces no-shows and is deductible from your total consultation billing. The doctor&apos;s regular professional fee is settled at the clinic cashier or billed to your accredited HMO.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  What happens to walk-in patients without smartphones?
                </AccordionTrigger>
                <AccordionContent>
                  Clinic Natin guarantees complete fairness for walk-in patients. The clinic secretary registers walk-ins directly at the front desk triage kiosk. The system uses an <strong>Interleaved Balancing Algorithm</strong> (alternating walk-in and online queue tokens), so senior citizens and walk-in arrivals are never deprioritized or displaced.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>
                  How does the 15-minute safe-zone buffer work if I get stuck in traffic?
                </AccordionTrigger>
                <AccordionContent>
                  If you experience sudden road delays or parking difficulties, your position is protected by our automated 15-minute grace window. The clinic secretary can temporarily hold your turn while calling the next ready patient, allowing you to resume your slot immediately upon arrival without having to re-queue from the beginning.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>
                  Can I use my HMO card (Maxicare, Intellicare, Medicard, PhilHealth)?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! Use the <strong>&quot;HMO Accredited&quot;</strong> filter on the directory to discover specialists accredited with major healthcare providers including Maxicare, Intellicare, Medicard, and PhilHealth. Present your physical card or digital Letter of Authorization (LOA) to the secretary upon arrival.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>
                  How does Clinic Natin handle Senior Citizen &amp; PWD discounts?
                </AccordionTrigger>
                <AccordionContent>
                  Clinic Natin strictly complies with Philippine legislation (RA 9994 for Senior Citizens and RA 10754 for Persons with Disabilities). Secretaries have dedicated priority lane controls, and our clinical engine automatically computes the 20% statutory discount under BIR Revenue Regulations No. 7-2010 for easy professional tax deduction recording.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger>
                  Is Clinic Natin available outside Cagayan de Oro?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! While our pilot was pioneered in Cagayan de Oro across major medical arts centers like Maria Reyna Xavier University Hospital and Capitol University Medical Center, Clinic Natin is designed for healthcare providers nationwide, including clinics in Metro Manila, Cebu, Davao, and regional outpatient centers.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 9. WIDESCREEN FOOTER */}
      {/* ----------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-slate-100">

            {/* Brand Column */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <ClinicNatinLogo height={34} href="/" />
              </div>
              <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
                The modern outpatient operating system for Philippine medical practices. Pioneered in Cagayan de Oro, built for clinics nationwide.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 pt-1">
                <Badge variant="outline" className="text-[10px]">RA 10173 Encrypted</Badge>
                <Badge variant="outline" className="text-[10px]">WHO ICD-10 (2019)</Badge>
                <Badge variant="outline" className="text-[10px]">BIR RR 7-2010</Badge>
              </div>
            </div>

            {/* Patients Directory */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                For Patients
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <a href="#doctor-directory" className="hover:text-brand-700 transition">
                    Find Doctors Nationwide
                  </a>
                </li>
                <li>
                  <Link href="/my-queue" className="hover:text-brand-700 transition">
                    Live Turn Tracker
                  </Link>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-brand-700 transition">
                    Digital Health Passport
                  </a>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-brand-700 transition font-bold text-brand-700 flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5" />
                    Patient Sign Up (Free)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cities / Regional Launch Hubs */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Regional Hubs
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <span className="font-semibold text-brand-800">Cagayan de Oro (Launch Hub)</span>
                </li>
                <li>
                  <span>Metro Manila</span>
                </li>
                <li>
                  <span>Cebu City</span>
                </li>
                <li>
                  <span>Davao City</span>
                </li>
              </ul>
            </div>

            {/* Staff & Portals */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                For Clinics & Doctors
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/secretary/dashboard" className="hover:text-brand-700 transition">
                    Secretary Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/doctor/dashboard" className="hover:text-brand-700 transition">
                    Doctor Consultation Cockpit
                  </Link>
                </li>
                <li>
                  <Link href="/doctor/analytics" className="hover:text-brand-700 transition">
                    Doctor Analytics &amp; BIR Ledger
                  </Link>
                </li>
                <li>
                  <Link href="/display/cdo-maria-reyna" className="hover:text-brand-700 transition">
                    Lobby TV Display Broadcast
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-brand-700 transition font-bold text-brand-700">
                    Sign In / Staff Portal &rarr;
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="mt-8 rounded-2xl bg-amber-50/70 p-4 border border-amber-200/70 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Emergency Medical Disclaimer:</strong> Clinic Natin is an outpatient scheduling and queue tracking operating system. If you or a family member are experiencing a life-threatening medical emergency, please proceed immediately to the nearest hospital emergency room or contact the national emergency hotline 911.
            </p>
          </div>

          {/* Copyright Bar */}
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
      {/* INTERACTIVE QUEUE RESERVATION DIALOG (SHADCN DIALOG) */}
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
                        {selectedDoctorForQueue.clinicName} &bull; {selectedDoctorForQueue.specialty} ({selectedDoctorForQueue.city})
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Queue Summary Box */}
                <div className="rounded-2xl bg-brand-50/80 p-4 border border-brand-100 mb-5 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Currently Serving:</span>
                    <Badge variant="brand" className="text-xs font-bold">
                      #{selectedDoctorForQueue.currentServingNumber || 'Starts at clinic hour'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Total in Queue:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDoctorForQueue.totalInQueue} patients
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Consultation Fee:</span>
                    <span className="font-bold text-slate-900">
                      {selectedDoctorForQueue.consultationFee}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-brand-100/60 text-[11px] text-slate-500">
                    <span>Reservation Deposit:</span>
                    <span className="font-semibold text-emerald-700">₱50 (Deductible via GCash/Maya)</span>
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
                      Mobile Number (For Live SMS Updates)
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

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Priority Lane (Philippine Statutory Law)
                    </label>
                    <Select
                      value={patientPriority}
                      onValueChange={(val) => setPatientPriority(val)}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-slate-200">
                        <SelectValue placeholder="Regular Queue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular Lane</SelectItem>
                        <SelectItem value="senior">Senior Citizen (RA 9994 20% Discount)</SelectItem>
                        <SelectItem value="pwd">Person with Disability (RA 10754 20% Discount)</SelectItem>
                        <SelectItem value="pregnant">Pregnant Patient Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="brand"
                      size="lg"
                      className="w-full h-12 rounded-xl text-sm font-bold shadow-md hover:bg-brand-800"
                    >
                      Confirm Spot &amp; Proceed to ₱50 Deposit
                    </Button>
                    <p className="mt-2 text-[11px] text-center text-slate-400">
                      Secured with GCash / Maya checkout. Zero dawn hallway lines.
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              /* Success Confirmation */
              <div className="text-center py-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-4">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900 text-center">
                  Queue Spot Secured!
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-1 text-center">
                  You are registered in {selectedDoctorForQueue.name}&apos;s consultation queue.
                </DialogDescription>

                <div className="mt-6 rounded-2xl bg-brand-50 border border-brand-100 p-5">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Your Official Queue Token
                  </span>
                  <div className="text-5xl font-black text-brand-700 my-2">
                    #{generatedTicketNumber}
                  </div>
                  <p className="text-xs text-slate-600">
                    Estimated consultation: ~35 mins &bull; 15-min safe-zone buffer active
                  </p>
                </div>

                <div className="mt-5 text-left rounded-xl bg-slate-50 p-4 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <Smartphone className="h-4 w-4 text-brand-700" />
                    SMS telemetry will be sent to {patientPhone}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selectedDoctorForQueue.clinicAddress}
                  </div>
                </div>

                <DialogFooter className="mt-6 sm:justify-stretch flex-col sm:flex-row gap-2">
                  <Link
                    href={`/my-queue?token=CN-${generatedTicketNumber}`}
                    className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-brand-700 text-white text-sm font-bold shadow-xs hover:bg-brand-800"
                  >
                    Track Live Turn Now &rarr;
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={resetQueueModal}
                    className="w-full h-12 rounded-xl text-sm font-bold"
                  >
                    Done
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
