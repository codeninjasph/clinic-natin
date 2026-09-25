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
  Menu,
  QrCode,
  Wifi,
  WifiOff,
  Bell,
  SlidersHorizontal,
  ChevronDown,
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
import { hospitalChime } from '@/lib/audio/chime';

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
  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Comparison toggle on mobile
  const [mobileComparisonView, setMobileComparisonView] = useState<'clinic-natin' | 'traditional'>('clinic-natin');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specializations');
  const [selectedCity, setSelectedCity] = useState('All Cities / Nationwide');
  const [onlyHmo, setOnlyHmo] = useState(false);
  const [onlyLiveQueue, setOnlyLiveQueue] = useState(false);

  // Hero Simulator Perspective State
  const [heroPerspective, setHeroPerspective] = useState<'patient' | 'doctor' | 'tv'>('patient');

  // Simulated Mobile Phone State
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [chimePlayed, setChimePlayed] = useState<boolean>(false);

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

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCity !== 'All Cities / Nationwide') count++;
    if (selectedSpecialty !== 'All Specializations') count++;
    if (onlyHmo) count++;
    if (onlyLiveQueue) count++;
    return count;
  }, [selectedCity, selectedSpecialty, onlyHmo, onlyLiveQueue]);

  // Handle audio chime test
  const handlePlayChime = () => {
    hospitalChime.playDingDong();
    setChimePlayed(true);
    setTimeout(() => setChimePlayed(false), 2000);
  };

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
    <div className="min-h-screen pb-24 lg:pb-0 bg-[#FAFCFB] text-slate-900 selection:bg-brand-200 selection:text-slate-900 font-sans">
      {/* ----------------------------------------------------------------- */}
      {/* TOP NOTIFICATION BAR - COMPACT ON MOBILE */}
      {/* ----------------------------------------------------------------- */}
      <div className="w-full bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-900 text-white text-[11px] sm:text-xs py-1.5 px-3 text-center font-medium flex items-center justify-center gap-1.5 border-b border-brand-700/50">
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="truncate">
          <strong>Pioneered in CDO:</strong> Outpatient operating system for clinics nationwide.
        </span>
        <a href="#how-it-works" className="underline font-bold hover:text-brand-200 shrink-0 hidden sm:inline ml-1">
          How It Works &rarr;
        </a>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* NAVIGATION BAR - RESPONSIVE HEIGHT (H-16 ON MOBILE, H-20 ON DESKTOP) */}
      {/* ----------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-brand-100/80 bg-white/95 backdrop-blur-md transition-all shadow-xs">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-10 xl:px-12 h-16 lg:h-20">
          {/* Brand Logo & National Expansion Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ClinicNatinLogo height={32} href="/" priority />
            <Badge variant="outline" className="hidden lg:inline-flex text-[11px] font-semibold border-brand-200 text-brand-700 bg-brand-50/60">
              Philippine Outpatient OS
            </Badge>
          </div>

          {/* Desktop Navigation Links */}
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

          {/* Action CTAs & Mobile Hamburger Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/my-queue"
              className="inline-flex items-center gap-1 rounded-xl border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 sm:px-3 sm:py-2 sm:text-sm active:scale-95"
            >
              <Ticket className="h-3.5 w-3.5 text-brand-700" />
              <span>Track Turn</span>
            </Link>

            <Link
              href="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Patient Sign Up</span>
            </Link>

            <Link
              href="/login"
              className="hidden md:inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              Staff Portal
            </Link>

            {/* Mobile Menu Hamburger Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="xl:hidden h-9 w-9 rounded-xl text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer with Backdrop Overlay */}
        {mobileMenuOpen && (
          <div className="xl:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="fixed inset-x-0 top-0 max-h-[85vh] bg-white rounded-b-3xl shadow-2xl p-5 z-50 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <ClinicNatinLogo height={28} href="/" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-slate-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4 pt-3">
                <nav className="flex flex-col space-y-2 text-sm font-bold text-slate-700">
                  <a
                    href="#what-is-clinic-natin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    What is Clinic Natin
                  </a>
                  <a
                    href="#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    How It Works
                  </a>
                  <a
                    href="#doctor-directory"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    Find Doctors &amp; Clinics
                  </a>
                  <a
                    href="#clinical-engine"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-700 transition flex items-center justify-between"
                  >
                    <span>WHO ICD-10 &amp; e-Rx</span>
                    <Badge variant="success" className="text-[10px]">Live</Badge>
                  </a>
                  <a
                    href="#benefits"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    Why Clinic Natin
                  </a>
                  <a
                    href="#faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-brand-50 hover:text-brand-700 transition"
                  >
                    FAQ
                  </a>
                </nav>

                <Separator className="bg-slate-100" />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/my-queue"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 p-2.5 text-xs font-bold text-brand-800"
                  >
                    <Ticket className="h-4 w-4 text-brand-700" />
                    <span>Track Live Turn</span>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 p-2.5 text-xs font-bold text-white shadow-xs"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up (Free)</span>
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-semibold text-slate-700"
                  >
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span>Doctor &amp; Secretary Staff Portal</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 1. HERO SECTION - CLEAN DUAL PRESENTATION (NATIVE CARD ON MOBILE) */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-[#F7FCF9] to-[#FAFCFB] pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-16 lg:pb-24 border-b border-brand-100/60">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[900px] rounded-full bg-brand-100/50 blur-3xl" />
        <div className="pointer-events-none absolute top-1/4 -right-20 h-80 w-80 rounded-full bg-emerald-200/30 blur-2xl" />

        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 relative">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">

            {/* Left Column: Core Value Proposition, Definitions & CTAs */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/80 bg-white/95 px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-brand-800 shadow-xs backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Launched First in CDO &bull; Expanding Nationwide</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-2xl sm:text-5xl xl:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
                End the 7:00 AM Clinic Lines.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-700 via-brand-800 to-emerald-600 block sm:inline">
                  Healthcare Without Chaos.
                </span>
              </h1>

              {/* Concise Definition */}
              <p className="mx-auto lg:mx-0 max-w-2xl text-xs sm:text-base text-slate-600 leading-relaxed font-normal">
                <strong>Clinic Natin</strong> connects patients, doctors, and clinic secretaries. Lock verified queue tokens online, complete a 1-minute digital health passport, and track live turns from home without waiting hours in crowded clinic hallways.
              </p>

              {/* Primary Action Buttons (2 High-Impact Buttons Side-by-Side on Mobile) */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-2.5 pt-1">
                <a
                  href="#doctor-directory"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 hover:bg-brand-800 px-6 py-3 text-sm sm:text-base font-bold text-white shadow-md shadow-brand-700/20 transition active:scale-95"
                >
                  <Search className="h-4 w-4" />
                  <span>Find a Doctor &amp; Join Queue</span>
                  <ArrowRight className="h-4 w-4 opacity-80" />
                </a>

                <Link
                  href="/my-queue"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-300 bg-brand-50/70 hover:bg-brand-100 px-5 py-3 text-sm sm:text-base font-bold text-brand-800 shadow-xs transition active:scale-95"
                >
                  <Ticket className="h-4 w-4 text-brand-700" />
                  <span>Track My Live Turn</span>
                </Link>
              </div>

              {/* Trust Metric Bar (Compact 2x2 on Mobile) */}
              <div className="pt-4 sm:pt-6 border-t border-brand-200/70 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-xl mx-auto lg:mx-0">
                <div className="rounded-xl sm:rounded-2xl bg-white/90 p-2.5 sm:p-3 border border-brand-100 text-center lg:text-left shadow-2xs">
                  <div className="text-base sm:text-2xl font-black text-brand-700">0 Dawn Lines</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Online &amp; Walk-in</div>
                </div>
                <div className="rounded-xl sm:rounded-2xl bg-white/90 p-2.5 sm:p-3 border border-brand-100 text-center lg:text-left shadow-2xs">
                  <div className="text-base sm:text-2xl font-black text-slate-900">15-Min Buffer</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Safe-zone traffic protection</div>
                </div>
                <div className="rounded-xl sm:rounded-2xl bg-white/90 p-2.5 sm:p-3 border border-brand-100 text-center lg:text-left shadow-2xs">
                  <div className="text-base sm:text-2xl font-black text-slate-900">74,800+</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">WHO ICD-10 (2019) codes</div>
                </div>
                <div className="rounded-xl sm:rounded-2xl bg-white/90 p-2.5 sm:p-3 border border-brand-100 text-center lg:text-left shadow-2xs">
                  <div className="text-base sm:text-2xl font-black text-emerald-700">RA 9994</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">20% BIR tax discount ledger</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Telemetry Preview (Native Card on Mobile, Phone Bezel on Desktop) */}
            <div className="lg:col-span-5 xl:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative border backdrop glow */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-brand-300 via-emerald-400 to-brand-600 opacity-30 blur-2xl" />

                {/* Outer Card Controller */}
                <div className="relative rounded-3xl border border-white/80 bg-white/95 p-3.5 sm:p-6 shadow-xl backdrop-blur-xl">
                  {/* Perspective Selector Tabs */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        Live Simulation
                      </span>
                    </div>

                    {/* Role View Toggle */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setHeroPerspective('patient')}
                        className={`px-2 py-1 rounded-md transition ${
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
                        className={`px-2 py-1 rounded-md transition ${
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
                        className={`px-2 py-1 rounded-md transition ${
                          heroPerspective === 'tv'
                            ? 'bg-white text-brand-700 shadow-2xs font-bold'
                            : 'hover:text-slate-900'
                        }`}
                      >
                        Lobby TV
                      </button>
                    </div>
                  </div>

                  {/* 1. PATIENT PERSPECTIVE */}
                  {heroPerspective === 'patient' && (
                    <div>
                      {/* --- DESKTOP VIEW: Sleek Smartphone Mockup (Hidden on Mobile) --- */}
                      <div className="hidden lg:block relative mx-auto w-full max-w-[340px] rounded-[44px] border-[9px] border-slate-900 bg-white text-slate-900 shadow-2xl overflow-hidden ring-1 ring-slate-800">
                        {/* iOS Dynamic Island & Status Bar */}
                        <div className="bg-[#568259] text-white pt-2 px-5 pb-2 select-none relative z-20">
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-26 h-5 bg-black rounded-full flex items-center justify-between px-2 text-[9px] text-white">
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="font-semibold text-emerald-300">#14</span>
                            </div>
                            <span className="text-[9px] text-slate-400">➔ #18</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-semibold">
                            <span>9:41</span>
                            <div className="flex items-center gap-1">
                              <span>5G</span>
                              <Wifi className="w-3 h-3" />
                            </div>
                          </div>
                        </div>

                        {/* Screen Body */}
                        <div className="p-3.5 space-y-3 bg-[#F8FBF9] text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-500 font-medium">Mabuhay, Kenneth 👋</p>
                              <h3 className="text-sm font-black text-slate-900">Dr. Maria Elena Reyes</h3>
                              <span className="text-[10px] text-slate-500">Maria Reyna XU Hospital</span>
                            </div>
                            <Badge variant="success" className="text-[10px] py-0 px-2">Live</Badge>
                          </div>

                          <div className="rounded-2xl bg-gradient-to-b from-brand-50 to-emerald-50/70 border border-brand-200 p-3 text-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Now Calling</span>
                            <div className="text-3xl font-black text-brand-700">#14</div>
                            <p className="text-[10px] text-slate-600">Door-to-Doctor: <strong>11 mins</strong></p>
                          </div>

                          <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-1.5">
                            <div className="flex justify-between font-medium">
                              <span className="text-slate-500">Your Token:</span>
                              <span className="font-extrabold text-slate-900">#18 (4 Ahead)</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span className="text-slate-500">Safe-Zone Departure:</span>
                              <span className="font-bold text-emerald-700">Leave home 10:45 AM</span>
                            </div>
                            <Progress value={78} className="h-1.5 bg-slate-100" indicatorClassName="bg-brand-700" />
                          </div>

                          <div className="flex items-center justify-between rounded-xl bg-brand-50 p-2 border border-brand-200">
                            <span className="text-[11px] text-slate-700 font-medium">Turn Chime</span>
                            <Button size="sm" variant="brand" onClick={handlePlayChime} className="h-6 text-[10px] px-2">
                              <Volume2 className="h-3 w-3 mr-1" />
                              {chimePlayed ? 'Ding-Dong!' : 'Test'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* --- MOBILE NATIVE VIEW: Full-Width Card (Zero Phone Bezel / No Scroll Trap) --- */}
                      <div className="block lg:hidden space-y-3 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold">
                              <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">MR</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">Dr. Maria Elena Reyes</h3>
                              <p className="text-[11px] text-slate-500">Maria Reyna XU Hospital &bull; Pediatrics</p>
                            </div>
                          </div>
                          <Badge variant="success" className="text-[10px] px-2 py-0.5">Live Queue</Badge>
                        </div>

                        {/* Big Telemetry Counter */}
                        <div className="rounded-2xl bg-gradient-to-b from-brand-50 to-emerald-50/60 border border-brand-200/80 p-3.5 text-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Now Calling Next
                          </span>
                          <div className="text-4xl font-black text-brand-700 tracking-tight my-0.5">
                            #14
                          </div>
                          <p className="text-xs text-slate-600">
                            Average Door-to-Doctor wait: <strong>11 mins</strong>
                          </p>
                        </div>

                        {/* Token Status & Departure */}
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Your Booking Token:</span>
                            <span className="font-bold text-slate-900">#18 (4 Patients Ahead)</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Safe-Zone Departure:</span>
                            <span className="font-bold text-emerald-700">Leave home at 10:45 AM</span>
                          </div>
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Queue Progress</span>
                              <span className="font-bold">78%</span>
                            </div>
                            <Progress value={78} className="h-2 bg-slate-200" indicatorClassName="bg-brand-700" />
                          </div>
                        </div>

                        {/* Audio Chime Test & Health Passport Pills */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handlePlayChime}
                            className="flex-1 h-9 rounded-xl text-xs font-bold border-brand-200 bg-brand-50 text-brand-800 gap-1.5"
                          >
                            <Volume2 className="h-3.5 w-3.5 text-brand-700" />
                            <span>{chimePlayed ? 'Ding-Dong Playing!' : 'Test Turn Chime'}</span>
                          </Button>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold">
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Chart Synced</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. DOCTOR PERSPECTIVE */}
                  {heroPerspective === 'doctor' && (
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">Consultation Cockpit</h3>
                            <p className="text-[11px] text-slate-500">Dr. Santos &bull; Capitol University Medical Center</p>
                          </div>
                        </div>
                        <Badge variant="brand" className="text-[10px]">Active</Badge>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">Current: Ramon Cruz (#8)</span>
                          <Badge variant="warning" className="text-[9px]">Senior Citizen RA 9994</Badge>
                        </div>
                        <div className="rounded-lg bg-white p-2 border border-slate-200 text-[11px]">
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">WHO ICD-10 (2019):</span>
                          <span className="font-semibold text-slate-900">J06.9 &bull; Acute upper respiratory infection</span>
                        </div>
                        <div className="flex justify-between text-[11px] bg-emerald-50/70 p-2 rounded-lg text-emerald-900 font-semibold">
                          <span>BIR RR 7-2010 20% Deduction:</span>
                          <span>₱120.00 Saved</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                        <button
                          type="button"
                          className="rounded-xl bg-brand-700 text-white py-2 shadow-xs hover:bg-brand-800 transition"
                        >
                          Complete &amp; e-Rx
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white text-slate-700 py-2 hover:bg-slate-50 transition"
                        >
                          Call Next (#9)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. LOBBY TV PERSPECTIVE */}
                  {heroPerspective === 'tv' && (
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                            <MonitorPlay className="h-5 w-5 text-brand-300" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">Lobby TV Broadcast</h3>
                            <p className="text-[11px] text-slate-500">Waiting room display screen</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">1080p TV</Badge>
                      </div>

                      <div className="rounded-2xl bg-slate-900 text-white p-4 text-center space-y-2">
                        <div className="text-[10px] font-semibold text-brand-300 uppercase tracking-widest">
                          NOW SERVING ROOM 304
                        </div>
                        <div className="text-4xl font-black text-emerald-400 font-mono">
                          #14
                        </div>
                        <div className="flex justify-center gap-2 pt-0.5 text-xs text-slate-300">
                          <span>Next: <strong>#15 (Online)</strong></span>
                          <span>&bull;</span>
                          <span>Upcoming: <strong>#16 (Walk-in)</strong></span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 text-center">
                        Interleaved balancing guarantees fairness between online reservations and walk-in seniors.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. WHAT IS CLINIC NATIN? - HORIZONTAL SWIPEABLE ON MOBILE */}
      {/* ----------------------------------------------------------------- */}
      <section id="what-is-clinic-natin" className="py-12 sm:py-20 bg-white border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              What is Clinic Natin?
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              The Outpatient Operating System Built for the Philippines
            </h2>
            <p className="mt-2.5 text-xs sm:text-base text-slate-600 leading-relaxed">
              In traditional clinics, patients wake up at 7:00 AM for paper numbers and wait 4–6 hours in congested hallways.
              <strong>Clinic Natin</strong> provides an integrated digital ecosystem connecting Patients, Doctors, and Secretaries.
            </p>
          </div>

          {/* 4 Core Pillars: Swipeable snap-scroll on mobile, 4-col grid on desktop */}
          <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto pb-4 lg:pb-0 snap-x snap-mandatory scrollbar-none">
            {/* Pillar 1 */}
            <Card className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-center rounded-2xl sm:rounded-3xl border border-slate-200 bg-[#FAFCFB] p-5 sm:p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                  <Radio className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <Badge variant="brand" className="mb-2 text-[10px] sm:text-[11px]">
                  Dual-Queue Engine
                </Badge>
                <h3 className="text-base sm:text-xl font-bold text-slate-900">
                  Interleaved Queue Balancing
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Balances online reservations and on-site walk-ins fairly (odds for online, evens for walk-in tickets). Eliminates dawn lines while protecting walk-in seniors.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-brand-700">
                <Check className="h-4 w-4" />
                <span>Zero Dawn Line Waiting</span>
              </div>
            </Card>

            {/* Pillar 2 */}
            <Card className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-center rounded-2xl sm:rounded-3xl border border-slate-200 bg-[#FAFCFB] p-5 sm:p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                  <Activity className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <Badge variant="success" className="mb-2 text-[10px] sm:text-[11px]">
                  Clinical Triage
                </Badge>
                <h3 className="text-base sm:text-xl font-bold text-slate-900">
                  1-Min Digital Health Passport
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Patients complete a 60-second mobile intake covering symptoms, drug allergies, comorbidities, and PhilHealth/HMO verification before stepping into the room.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Check className="h-4 w-4" />
                <span>Pre-Loaded Patient Chart</span>
              </div>
            </Card>

            {/* Pillar 3 */}
            <Card className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-center rounded-2xl sm:rounded-3xl border border-slate-200 bg-[#FAFCFB] p-5 sm:p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                  <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <Badge variant="outline" className="mb-2 text-[10px] sm:text-[11px] border-blue-300 text-blue-800 bg-blue-50">
                  Clinical Standards
                </Badge>
                <h3 className="text-base sm:text-xl font-bold text-slate-900">
                  WHO ICD-10 (2019) Autocomplete
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Doctors enjoy instant offline diagnosis autocomplete across 74,800+ standardized ICD-10 codes with top Philippine outpatient clinical presets.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <Check className="h-4 w-4" />
                <span>WHO Clinical Standard</span>
              </div>
            </Card>

            {/* Pillar 4 */}
            <Card className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-center rounded-2xl sm:rounded-3xl border border-slate-200 bg-[#FAFCFB] p-5 sm:p-6 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 sm:mb-6 shadow-inner">
                  <BadgePercent className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <Badge variant="outline" className="mb-2 text-[10px] sm:text-[11px] border-purple-300 text-purple-800 bg-purple-50">
                  Tax &amp; Legal
                </Badge>
                <h3 className="text-base sm:text-xl font-bold text-slate-900">
                  BIR Statutory Discount Ledger
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Automates mandatory 20% discounts for Senior Citizens (RA 9994) and PWDs (RA 10754) with itemized BIR RR 7-2010 tax deduction reports for doctor annual filing.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold text-purple-700">
                <Check className="h-4 w-4" />
                <span>BIR RR 7-2010 Compliant</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. HOW IT WORKS - COMPACT MOBILE TABS & STREAMLINED STEPS */}
      {/* ----------------------------------------------------------------- */}
      <section id="how-it-works" className="py-12 sm:py-20 bg-brand-50/30 border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Interactive Workflow
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              How Clinic Natin Works Across All Roles
            </h2>
            <p className="mt-2 text-xs sm:text-base text-slate-600">
              A synchronized 3-sided system engineered for patients, healthcare providers, and clinic secretaries.
            </p>
          </div>

          {/* Role Tabs */}
          <Tabs defaultValue="patients" className="w-full">
            <div className="flex justify-center mb-6 sm:mb-10">
              <TabsList className="h-11 sm:h-13 bg-white p-1 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm w-full max-w-md">
                <TabsTrigger value="patients" className="flex-1 rounded-lg sm:rounded-xl px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-brand-700 data-[state=active]:text-white">
                  <Users className="h-3.5 w-3.5" />
                  <span>Patients</span>
                </TabsTrigger>
                <TabsTrigger value="doctors" className="flex-1 rounded-lg sm:rounded-xl px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-brand-700 data-[state=active]:text-white">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>Doctors</span>
                </TabsTrigger>
                <TabsTrigger value="clinics" className="flex-1 rounded-lg sm:rounded-xl px-2 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-brand-700 data-[state=active]:text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Clinics</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: PATIENTS JOURNEY */}
            <TabsContent value="patients">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">01</span>
                    <Badge variant="brand" className="text-[10px]">Lock Spot</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Find Doctor &amp; Spot</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Search doctors by HMO and location. Reserve with a ₱50 GCash deposit or on-site walk-in reception.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">02</span>
                    <Badge variant="success" className="text-[10px]">60-Sec Triage</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Digital Health Passport</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Declare symptoms, drug allergies, and HMO details before arriving. No paper intake slips at the counter.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">03</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-[10px]">Safe-Zone</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Track &amp; 15-Min Buffer</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Watch live counter from home. Receive SMS alerts when 2 patients remain, protected by a 15-minute traffic grace buffer.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">04</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700 text-[10px]">Digital Care</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Consultation &amp; e-Rx</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Walk straight into the clinic when called. Receive verified digital prescriptions directly on your phone.
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: DOCTORS JOURNEY */}
            <TabsContent value="doctors">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">01</span>
                    <Badge variant="brand" className="text-[10px]">Queue Call</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">1-Click Patient Call</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Call next patient from your tablet or laptop. Automatically rings lobby chimes and sends SMS alerts.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">02</span>
                    <Badge variant="success" className="text-[10px]">Allergy Alert</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Pre-Loaded Vitals</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    See chief complaint, secretary-recorded blood pressure, and red-flag drug allergy warnings in advance.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">03</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-[10px]">ICD-10</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">WHO Diagnosis Engine</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Autocomplete clinical diagnoses across 74,800+ WHO codes with single-click Philippine outpatient presets.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">04</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700 text-[10px]">BIR Tax</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">e-Rx &amp; BIR Ledger</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Issue legible e-Prescriptions. Automatically logs 20% Senior/PWD discounts under BIR RR 7-2010.
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 3: CLINICS & SECRETARIES */}
            <TabsContent value="clinics">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">01</span>
                    <Badge variant="brand" className="text-[10px]">Interleaved</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Queue Balancing</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Intake walk-in patients via SMS tickets that interleave smoothly with online reservations.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">02</span>
                    <Badge variant="success" className="text-[10px]">Triage</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Vitals &amp; Priority</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Record patient vitals with dedicated priority lane routing for Senior Citizens, PWDs, and pregnant patients.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">03</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-[10px]">Lobby TV</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Waiting Room TV</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Broadcast real-time serving tokens to smart TVs in the hallway with audio dings at zero added hardware cost.
                  </p>
                </Card>

                <Card className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <span className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">04</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700 text-[10px]">Finance</Badge>
                  </div>
                  <h4 className="text-sm sm:text-lg font-bold text-slate-900">Revenue Ledger</h4>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Instant end-of-day cash reconciliation reports, HMO claim tracking, and patient throughput metrics.
                  </p>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. INTERACTIVE DOCTOR DIRECTORY - RESPONSIVE MOBILE FILTER DRAWER */}
      {/* ----------------------------------------------------------------- */}
      <section id="doctor-directory" className="py-12 sm:py-20 bg-white border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">

          {/* Directory Title & Intro */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3.5 w-3.5" />
                Philippine Specialists
              </span>
              <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Find Your Doctor &amp; Join Queue
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Browse verified specialists across CDO, Metro Manila, Cebu, and Davao.
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
              Showing <span className="text-brand-700 font-bold">{filteredDoctors.length}</span> of {DOCTORS_DATA.length} Doctors
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <Card className="rounded-2xl sm:rounded-3xl border border-brand-100 bg-white p-3.5 sm:p-5 shadow-sm mb-6 space-y-3">
            {/* Primary Search Bar Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctor, hospital, specialty..."
                  className="pl-10 pr-9 h-11 rounded-xl border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium focus:bg-white"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-slate-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Mobile Filter Toggle Button (Collapses filters to save screen space) */}
              <Button
                type="button"
                variant={activeFiltersCount > 0 ? 'brand' : 'outline'}
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="lg:hidden h-11 rounded-xl px-3 text-xs font-bold gap-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="brand" className="h-4 w-4 p-0 text-[10px] rounded-full flex items-center justify-center bg-white text-brand-800">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Desktop Filters (Always visible on lg:) & Mobile Filter Collapsible Area */}
            <div className={`space-y-3 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
                {/* City Selector */}
                <div className="lg:col-span-4">
                  <Select value={selectedCity} onValueChange={(val) => setSelectedCity(val)}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold">
                      <SelectValue placeholder="All Cities / Nationwide" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_OPTIONS.map((city) => (
                        <SelectItem key={city} value={city} className="text-xs">
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Specialization Dropdown */}
                <div className="lg:col-span-4">
                  <Select value={selectedSpecialty} onValueChange={(val) => setSelectedSpecialty(val)}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold">
                      <SelectValue placeholder="All Specializations" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTY_OPTIONS.map((spec) => (
                        <SelectItem key={spec} value={spec} className="text-xs">
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggle Buttons */}
                <div className="lg:col-span-4 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={onlyHmo ? 'brand' : 'outline'}
                    onClick={() => setOnlyHmo(!onlyHmo)}
                    className="flex-1 h-10 rounded-xl text-xs font-bold gap-1"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>HMO Only</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={onlyLiveQueue ? 'default' : 'outline'}
                    onClick={() => setOnlyLiveQueue(!onlyLiveQueue)}
                    className={`flex-1 h-10 rounded-xl text-xs font-bold gap-1 ${
                      onlyLiveQueue ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    }`}
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>Live Only</span>
                  </Button>
                </div>
              </div>

              {/* Quick Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
                {['Cagayan de Oro', 'Metro Manila', 'Cebu', 'Davao'].map((city) => (
                  <Badge
                    key={city}
                    variant={selectedCity === city ? 'brand' : 'outline'}
                    onClick={() => setSelectedCity(selectedCity === city ? 'All Cities / Nationwide' : city)}
                    className="cursor-pointer py-0.5 px-2 rounded-lg text-[11px] font-medium"
                  >
                    {city}
                  </Badge>
                ))}
                {(searchQuery || activeFiltersCount > 0) && (
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
                    className="ml-auto text-xs font-semibold text-rose-600 hover:bg-rose-50 h-7 px-2 rounded-lg"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Doctor Cards Grid (Compact on mobile, 4-cols on 2xl displays) */}
          {filteredDoctors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {filteredDoctors.map((doctor) => (
                <Card
                  key={doctor.id}
                  className="group flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xs hover:border-brand-300 hover:shadow-md transition overflow-hidden"
                >
                  <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className={`h-11 w-11 rounded-xl ${doctor.avatarBg} text-xs font-bold text-white shadow-2xs`}>
                          <AvatarFallback className={`${doctor.avatarBg} text-white font-bold`}>
                            {doctor.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-brand-700 transition">
                            {doctor.name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">{doctor.title}</span>
                            <span className="text-slate-300">&bull;</span>
                            <Badge variant="brand" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                              {doctor.specialty}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Live Queue Badge */}
                      {doctor.isQueueLive ? (
                        <Badge variant="success" className="gap-1 py-0.5 px-2 text-[10px] shrink-0 font-bold">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                          </span>
                          #{doctor.currentServingNumber}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1 py-0.5 px-2 text-[10px] shrink-0 font-medium">
                          <Clock className="h-3 w-3" />
                          Starts {doctor.nextStartTime?.split('at')[1] || 'Soon'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0 space-y-2 text-xs text-slate-600">
                    <Separator className="my-1 bg-slate-100" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                          {doctor.clinicName}
                        </p>
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 shrink-0">
                          {doctor.city}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        {doctor.clinicAddress}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-brand-700" />
                        {doctor.schedule}
                      </span>
                      {doctor.acceptsHmo && (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> HMO
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-3 sm:p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Doctor Fee</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {doctor.consultationFee}{' '}
                        <span className="text-[9px] text-slate-500 font-normal">(-20% Senior)</span>
                      </div>
                    </div>

                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => setSelectedDoctorForQueue(doctor)}
                      className="rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs gap-1"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Join Queue</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <Search className="h-8 w-8 text-brand-700 mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-slate-900">No doctors match your criteria</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting the filters or searching for another clinic.</p>
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('All Specializations');
                  setSelectedCity('All Cities / Nationwide');
                  setOnlyHmo(false);
                  setOnlyLiveQueue(false);
                }}
                className="mt-3 text-xs"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. CLINICAL ENGINE & COMPLIANCE BAR (CODE HIDDEN ON MOBILE) */}
      {/* ----------------------------------------------------------------- */}
      <section id="clinical-engine" className="py-12 sm:py-16 bg-slate-900 text-white">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-3 sm:space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-300">
                <Shield className="h-3.5 w-3.5" />
                Clinical &amp; Legal Standards
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Philippine Clinical Practice Compliance
              </h2>
              <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
                Clinic Natin respects Philippine clinical, tax, and privacy regulations. Doctors maintain clinical independence with automated compliance tools.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/80">
                  <div className="flex items-center gap-2 text-brand-300 font-bold text-xs sm:text-sm mb-1">
                    <FileCode className="h-4 w-4" />
                    WHO ICD-10 (2019) Standard
                  </div>
                  <p className="text-xs text-slate-300">
                    Offline search across 74,800+ codes with direct reference anchors to the WHO browser for international clinical classification.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700/80">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm mb-1">
                    <BadgePercent className="h-4 w-4" />
                    BIR RR 7-2010 Tax Accounting
                  </div>
                  <p className="text-xs text-slate-300">
                    Automatic 20% Senior Citizen (RA 9994) &amp; PWD (RA 10754) deduction ledger for annual income tax filing.
                  </p>
                </div>
              </div>
            </div>

            {/* Code Terminal: Shown on Large Monitors, Hidden on Mobile */}
            <div className="hidden lg:block lg:col-span-6">
              <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl font-mono text-xs text-slate-300 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-1 text-[11px] text-slate-400">clinic-natin-clinical-engine.ts</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-brand-300 border-slate-700 font-mono">
                    ONLINE
                  </Badge>
                </div>

                <div className="space-y-1 text-[11px] leading-relaxed">
                  <p className="text-slate-500">// Philippine Outpatient Clinical Presets</p>
                  <p><span className="text-emerald-400">ICD10_1:</span> <span className="text-brand-300">&quot;J06.9&quot;</span> - Acute upper respiratory infection</p>
                  <p><span className="text-emerald-400">ICD10_2:</span> <span className="text-brand-300">&quot;I10&quot;</span> - Essential hypertension</p>
                  <p><span className="text-emerald-400">ICD10_3:</span> <span className="text-brand-300">&quot;E11.9&quot;</span> - Type 2 diabetes mellitus</p>
                  <p className="text-slate-500 pt-1">// Statutory Deductions (BIR RR 7-2010)</p>
                  <p><span className="text-purple-400">statutoryDiscount:</span> 0.20 <span className="text-slate-500">/* Senior &amp; PWD */</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. COMPARISON: RESPONSIVE CARDS ON MOBILE, TABLE ON DESKTOP */}
      {/* ----------------------------------------------------------------- */}
      <section id="benefits" className="py-12 sm:py-20 bg-white border-b border-slate-100">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Clear Value Comparison
            </span>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Traditional Lines vs. Clinic Natin
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Compare the standard manual waiting room against our digital operating system.
            </p>
          </div>

          {/* --- MOBILE COMPARISON: Interactive Toggle Cards (Avoids Squashed Table) --- */}
          <div className="block md:hidden space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileComparisonView('clinic-natin')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  mobileComparisonView === 'clinic-natin'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                ✅ With Clinic Natin
              </button>
              <button
                type="button"
                onClick={() => setMobileComparisonView('traditional')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  mobileComparisonView === 'traditional'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                ❌ Traditional Queue
              </button>
            </div>

            {mobileComparisonView === 'clinic-natin' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 text-xs text-emerald-950">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Book from Bed:</strong> Secure guaranteed queue token online or fast walk-in reception.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Arrive on Time:</strong> Wait at home while live counter updates; arrive only 15 mins before your turn.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>1-Min Digital Passport:</strong> Pre-load symptoms and drug allergies so the doctor has your chart ready.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>15-Min Safe-Zone:</strong> Your spot is protected by a grace buffer if you get stuck in traffic.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-3 text-xs text-rose-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>7:00 AM Dawn Lines:</strong> Patients queue outside the hospital at dawn for handwritten paper slips.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>3 to 5 Hours Hallway Waiting:</strong> Sitting in crowded, poorly ventilated hospital corridors.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Zero Delay Notices:</strong> Patients wait blind with zero communication if the doctor is delayed in surgery.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Forfeited Spot:</strong> Lose your place completely if you step out to eat or find parking.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- DESKTOP COMPARISON: Full 3-Column Table --- */}
          <div className="hidden md:block">
            <Card className="rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-1/3 font-bold text-slate-900 py-4 px-6 text-sm">
                      Clinic Dimension
                    </TableHead>
                    <TableHead className="w-1/3 font-bold text-rose-700 py-4 px-6 text-sm">
                      Traditional Manual Queue
                    </TableHead>
                    <TableHead className="w-1/3 font-bold text-emerald-700 py-4 px-6 text-sm bg-emerald-50/40">
                      Clinic Natin Operating System
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-900 px-6 py-4">
                      Arrival &amp; Spot Formation
                    </TableCell>
                    <TableCell className="text-slate-600 px-6 py-4">
                      Patients queue outside hospital at 7:00 AM for paper slips.
                    </TableCell>
                    <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                      Book token from bed or quick frontdesk walk-in registration.
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-semibold text-slate-900 px-6 py-4">
                      Hallway Waiting Time
                    </TableCell>
                    <TableCell className="text-slate-600 px-6 py-4">
                      3 to 5 hours sitting in crowded hospital hallways.
                    </TableCell>
                    <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                      Arrive 15 minutes before your turn with real-time SMS alerts.
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-semibold text-slate-900 px-6 py-4">
                      Patient Chart &amp; Allergies
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
                      Doctor Surgical Delays
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
                      Senior &amp; PWD Discounts
                    </TableCell>
                    <TableCell className="text-slate-600 px-6 py-4">
                      Manual calculator subtraction prone to BIR audit discrepancies.
                    </TableCell>
                    <TableCell className="text-emerald-900 font-semibold px-6 py-4 bg-emerald-50/20">
                      Automated 20% BIR RR 7-2010 tax deduction export.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. CLINIC PARTNER BANNER */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-brand-800 via-brand-700 to-emerald-800 text-white">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-brand-100">
                For Philippine Medical Clinics
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold">
                Are you a Doctor or Clinic Secretary?
              </h2>
              <p className="mt-1 text-brand-100 text-xs sm:text-base max-w-2xl">
                Streamline patient intake, eliminate waiting room congestion, automate SMS calls, and access WHO ICD-10 diagnostics in one unified clinical cockpit.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto rounded-2xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-brand-800 shadow-md hover:bg-brand-50 transition active:scale-95 text-center"
              >
                Access Staff Portal
              </Link>
              <Link
                href="/doctor/analytics"
                className="w-full sm:w-auto rounded-2xl border border-white/40 bg-white/10 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition active:scale-95 text-center"
              >
                Doctor Analytics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 8. FREQUENTLY ASKED QUESTIONS (SHADCN ACCORDION) */}
      {/* ----------------------------------------------------------------- */}
      <section id="faq" className="py-12 sm:py-20 bg-[#FAFCFB] border-b border-slate-100">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              FAQ
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
              Frequently Asked Questions
            </h2>
          </div>

          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-8 shadow-sm">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-xs sm:text-sm text-left">
                  What exactly is Clinic Natin and how does it work?
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600">
                  Clinic Natin is the modern outpatient operating system built for Philippine private practices, medical arts clinics, and hospitals.
                  It connects patients, doctors, and clinic secretaries in real time: patients can book guaranteed consultation slots online or at the clinic counter, complete a 1-minute digital health passport, track their live queue position from home via web or SMS, and arrive only 15 minutes before their turn without waiting hours in crowded corridors.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-xs sm:text-sm text-left">
                  How much does it cost to use Clinic Natin?
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600">
                  Patients pay a nominal reservation deposit (such as ₱50 settled securely via GCash or Maya) to lock in their verified digital queue token. This commitment deposit significantly reduces no-shows and is deductible from your total consultation billing. The doctor&apos;s regular professional fee is settled at the clinic cashier or billed to your accredited HMO.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-xs sm:text-sm text-left">
                  What happens to walk-in patients without smartphones?
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600">
                  Clinic Natin guarantees complete fairness for walk-in patients. The clinic secretary registers walk-ins directly at the front desk triage kiosk. The system uses an <strong>Interleaved Balancing Algorithm</strong> (alternating walk-in and online queue tokens), so senior citizens and walk-in arrivals are never deprioritized or displaced.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-xs sm:text-sm text-left">
                  How does the 15-minute safe-zone buffer work in traffic?
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600">
                  If you experience sudden road delays or parking difficulties, your position is protected by our automated 15-minute grace window. The clinic secretary can temporarily hold your turn while calling the next ready patient, allowing you to resume your slot immediately upon arrival without having to re-queue from the beginning.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-xs sm:text-sm text-left">
                  Can I use my HMO card (Maxicare, Intellicare, PhilHealth)?
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600">
                  Yes! Use the <strong>&quot;HMO Only&quot;</strong> filter on the directory to discover specialists accredited with major healthcare providers including Maxicare, Intellicare, Medicard, and PhilHealth. Present your physical card or digital Letter of Authorization (LOA) to the secretary upon arrival.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-xs sm:text-sm text-left">
                  How are Senior Citizen &amp; PWD discounts handled?
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-slate-600">
                  Clinic Natin strictly complies with Philippine legislation (RA 9994 for Senior Citizens and RA 10754 for Persons with Disabilities). Secretaries have dedicated priority lane controls, and our clinical engine automatically computes the 20% statutory discount under BIR Revenue Regulations No. 7-2010 for easy professional tax deduction recording.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 9. WIDESCREEN FOOTER */}
      {/* ----------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 pt-12 pb-10 sm:pt-16 sm:pb-12">
        <div className="w-full max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100">

            {/* Brand Column */}
            <div className="md:col-span-5 space-y-3">
              <ClinicNatinLogo height={30} href="/" />
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm leading-relaxed">
                The modern outpatient operating system for Philippine medical practices. Pioneered in Cagayan de Oro, built for clinics nationwide.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 pt-1">
                <Badge variant="outline" className="text-[9px]">RA 10173 Encrypted</Badge>
                <Badge variant="outline" className="text-[9px]">WHO ICD-10 (2019)</Badge>
                <Badge variant="outline" className="text-[9px]">BIR RR 7-2010</Badge>
              </div>
            </div>

            {/* Patients Directory */}
            <div className="md:col-span-2 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                For Patients
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
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
                  <Link href="/signup" className="hover:text-brand-700 transition font-bold text-brand-700">
                    Sign Up (Free) &rarr;
                  </Link>
                </li>
              </ul>
            </div>

            {/* Regional Hubs */}
            <div className="md:col-span-2 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Regional Hubs
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                <li><span className="font-semibold text-brand-800">Cagayan de Oro (Launch)</span></li>
                <li><span>Metro Manila</span></li>
                <li><span>Cebu City</span></li>
                <li><span>Davao City</span></li>
              </ul>
            </div>

            {/* Staff & Portals */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                For Clinics &amp; Doctors
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                <li>
                  <Link href="/secretary/dashboard" className="hover:text-brand-700 transition">
                    Secretary Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/doctor/dashboard" className="hover:text-brand-700 transition">
                    Doctor Cockpit
                  </Link>
                </li>
                <li>
                  <Link href="/doctor/analytics" className="hover:text-brand-700 transition">
                    Doctor Analytics &amp; BIR Ledger
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
          <div className="mt-6 rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs">
              <strong>Emergency Medical Disclaimer:</strong> Clinic Natin is an outpatient scheduling and queue tracking operating system. In a medical emergency, proceed immediately to the nearest hospital ER or call 911.
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>&copy; {new Date().getFullYear()} Clinic Natin. All rights reserved.</p>
            <p>Operated by <span className="font-semibold text-slate-700">CodeNinjas Web Development Services</span></p>
          </div>
        </div>
      </footer>

      {/* ----------------------------------------------------------------- */}
      {/* MOBILE STICKY BOTTOM BAR (LG:HIDDEN) - 4 THUMB-FRIENDLY TARGETS */}
      {/* ----------------------------------------------------------------- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2 px-4 flex items-center justify-around shadow-2xl">
        <a
          href="#doctor-directory"
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-brand-700 active:scale-95 min-w-[64px]"
        >
          <Search className="h-4 w-4" />
          <span>Doctors</span>
        </a>

        <Link
          href="/my-queue"
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-brand-700 active:scale-95 min-w-[64px]"
        >
          <Ticket className="h-4 w-4 text-brand-700" />
          <span>Track Turn</span>
        </Link>

        <Link
          href="/signup"
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-brand-700 active:scale-95 min-w-[64px]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Sign Up</span>
        </Link>

        <Link
          href="/login"
          className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-brand-700 active:scale-95 min-w-[64px]"
        >
          <Building2 className="h-4 w-4" />
          <span>Staff</span>
        </Link>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* QUEUE RESERVATION DIALOG (SHADCN DIALOG) */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={Boolean(selectedDoctorForQueue)}
        onOpenChange={(open) => {
          if (!open) resetQueueModal();
        }}
      >
        {selectedDoctorForQueue && (
          <DialogContent className="sm:max-w-lg p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-slate-200">
            {!queueSubmitted ? (
              <div>
                <DialogHeader className="mb-4 text-left">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-11 w-11 rounded-xl ${selectedDoctorForQueue.avatarBg} text-white font-bold`}>
                      <AvatarFallback className={`${selectedDoctorForQueue.avatarBg} text-white font-bold`}>
                        {selectedDoctorForQueue.name.replace('Dr. ', '').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900">
                        Join {selectedDoctorForQueue.name}&apos;s Queue
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 mt-0.5">
                        {selectedDoctorForQueue.clinicName} &bull; {selectedDoctorForQueue.specialty} ({selectedDoctorForQueue.city})
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Queue Summary Box */}
                <div className="rounded-xl bg-brand-50/80 p-3.5 border border-brand-100 mb-4 space-y-1.5 text-xs">
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
                <form onSubmit={handleJoinQueueSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Patient Full Name
                    </label>
                    <Input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g., Juan Dela Cruz"
                      className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Mobile Number (For Live SMS Updates)
                    </label>
                    <Input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="e.g., 0917 123 4567"
                      className="h-10 rounded-xl border-slate-200 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Priority Lane (Philippine Statutory Law)
                    </label>
                    <Select value={patientPriority} onValueChange={(val) => setPatientPriority(val)}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                        <SelectValue placeholder="Regular Queue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular" className="text-xs">Regular Lane</SelectItem>
                        <SelectItem value="senior" className="text-xs">Senior Citizen (RA 9994 20% Discount)</SelectItem>
                        <SelectItem value="pwd" className="text-xs">Person with Disability (RA 10754 20% Discount)</SelectItem>
                        <SelectItem value="pregnant" className="text-xs">Pregnant Patient Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-1">
                    <Button
                      type="submit"
                      variant="brand"
                      size="lg"
                      className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-brand-800"
                    >
                      Confirm Spot &amp; Proceed to ₱50 Deposit
                    </Button>
                    <p className="mt-1.5 text-[10px] text-center text-slate-400">
                      Secured with GCash / Maya checkout. Zero dawn hallway lines.
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              /* Success Confirmation */
              <div className="text-center py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 text-center">
                  Queue Spot Secured!
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-1 text-center">
                  You are registered in {selectedDoctorForQueue.name}&apos;s consultation queue.
                </DialogDescription>

                <div className="mt-4 rounded-xl bg-brand-50 border border-brand-100 p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Your Official Queue Token
                  </span>
                  <div className="text-4xl font-black text-brand-700 my-1">
                    #{generatedTicketNumber}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Estimated consultation: ~35 mins &bull; 15-min safe-zone buffer active
                  </p>
                </div>

                <div className="mt-3 text-left rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <Smartphone className="h-3.5 w-3.5 text-brand-700" />
                    SMS telemetry will be sent to {patientPhone}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {selectedDoctorForQueue.clinicAddress}
                  </div>
                </div>

                <DialogFooter className="mt-4 sm:justify-stretch flex-col sm:flex-row gap-2">
                  <Link
                    href={`/my-queue?token=CN-${generatedTicketNumber}`}
                    className="w-full inline-flex items-center justify-center h-11 rounded-xl bg-brand-700 text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-brand-800"
                  >
                    Track Live Turn Now &rarr;
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetQueueModal}
                    className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold"
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
