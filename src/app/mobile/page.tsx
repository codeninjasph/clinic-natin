'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FastForward,
  Flame,
  HeartPulse,
  Info,
  Layers,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  Phone,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Timer,
  User,
  Volume2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

// ==========================================
// TYPES & DATA
// ==========================================

type TabType = 'queue' | 'doctors' | 'passport' | 'doctor-console';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  room: string;
  schedule: string;
  queueCount: number;
  consultFee: number;
}

const DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Maria Santos, MD',
    specialty: 'Cardiology & Internal Medicine',
    hospital: 'Maria Reyna Xavier University Hospital',
    room: 'Room 304',
    schedule: 'Mon / Wed / Fri • 9:00 AM - 1:00 PM',
    queueCount: 12,
    consultFee: 700,
  },
  {
    id: 'doc-2',
    name: 'Dr. John Michael Reyes, MD',
    specialty: 'Pediatrics',
    hospital: 'Capitol University Medical Center (CUMC)',
    room: 'Room 210',
    schedule: 'Tue / Thu / Sat • 10:00 AM - 3:00 PM',
    queueCount: 8,
    consultFee: 600,
  },
  {
    id: 'doc-3',
    name: 'Dr. Katherine Alcantara, MD',
    specialty: 'Obstetrics & Gynecology (OB-GYN)',
    hospital: 'Polymedic Plaza Medical Arts',
    room: 'Room 502',
    schedule: 'Mon / Tue / Thu • 1:00 PM - 5:00 PM',
    queueCount: 15,
    consultFee: 750,
  },
  {
    id: 'doc-4',
    name: 'Dr. Roberto Mendoza, MD',
    specialty: 'General Surgery & Laparoscopy',
    hospital: 'Northern Mindanao Medical Center (NMMC)',
    room: 'Clinic 12',
    schedule: 'Wed / Sat • 8:00 AM - 12:00 PM',
    queueCount: 6,
    consultFee: 650,
  },
];

export default function MobileAppSimulator() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [showLiveActivity, setShowLiveActivity] = useState<boolean>(false);

  // Queue State
  const [myQueueNumber, setMyQueueNumber] = useState<number>(17);
  const [myTokenCode, setMyTokenCode] = useState<string>('CN-ON-017');
  const [currentServing, setCurrentServing] = useState<number>(14);
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(
    'Doctor is on hospital rounds (+15m delay)'
  );
  const [isInGracePeriod, setIsInGracePeriod] = useState<boolean>(false);
  const [graceCountdown, setGraceCountdown] = useState<number>(45 * 60);

  // Health Passport & Offline State
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [passportQrDataUrl, setPassportQrDataUrl] = useState<string>('');

  // Doctor Booking & Dynamic QRPH Modal
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showQrphModal, setShowQrphModal] = useState<boolean>(false);
  const [qrphDataUrl, setQrphDataUrl] = useState<string>('');
  const [qrphSecondsLeft, setQrphSecondsLeft] = useState<number>(900); // 15 mins
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [isPriorityBooking, setIsPriorityBooking] = useState<boolean>(false);

  // Discovery Filter
  const [hospitalFilter, setHospitalFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Derived Calculations
  const patientsAhead = Math.max(0, myQueueNumber - currentServing);
  const estimatedWaitMins = patientsAhead * 8;
  const isNowServing = currentServing >= myQueueNumber;

  // Generate Passport QR Code
  useEffect(() => {
    const passportPayload = JSON.stringify({
      id: 'usr_cdo_9981',
      name: 'Kenneth Ramos',
      bloodType: 'O+',
      allergies: ['Penicillin', 'Aspirin'],
      priority: 'SENIOR',
      philHealth: '12-345678901-2',
      hmo: 'Maxicare (MAX-8890)',
      issued: '2026-09-08',
    });

    QRCode.toDataURL(passportPayload, {
      margin: 1,
      width: 240,
      color: {
        dark: '#142417',
        light: '#ffffff',
      },
    }).then(setPassportQrDataUrl);
  }, []);

  // Generate Dynamic QRPH Code when modal opens
  useEffect(() => {
    if (showQrphModal) {
      const qrphString = `00020101021228480015ph.clinicnatin.qrph0111CLINICNATIN520459995303608540550.005802PH5912Clinic Natin6014Cagayan de Oro62230519CN-${Date.now()}`;
      QRCode.toDataURL(qrphString, {
        margin: 1,
        width: 220,
        color: {
          dark: '#568259',
          light: '#ffffff',
        },
      }).then(setQrphDataUrl);

      setQrphSecondsLeft(900);
      setPaymentSuccess(false);
      setIsVerifyingPayment(false);

      const interval = setInterval(() => {
        setQrphSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showQrphModal]);

  // Advance queue simulation
  const handleCallNext = () => {
    const nextNum = currentServing + 1;
    setCurrentServing(nextNum);
  };

  // Trigger Provider Delay
  const handleTriggerDelay = (notice: string) => {
    setActiveBroadcast(notice);
  };

  // Verify QRPH Payment
  const handleSimulatePayment = () => {
    setIsVerifyingPayment(true);
    setTimeout(() => {
      setIsVerifyingPayment(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        // Issue odd queue number
        const newOddToken = currentServing + 5;
        setMyQueueNumber(newOddToken);
        setMyTokenCode(`CN-ON-${newOddToken.toString().padStart(3, '0')}`);
        setShowQrphModal(false);
        setActiveTab('queue');
      }, 1400);
    }, 1500);
  };

  // Filter Doctors
  const filteredDoctors = useMemo(() => {
    return DOCTORS.filter((doc) => {
      const matchHospital =
        hospitalFilter === 'All' || doc.hospital.toLowerCase().includes(hospitalFilter.toLowerCase());
      const matchSearch =
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.hospital.toLowerCase().includes(searchQuery.toLowerCase());
      return matchHospital && matchSearch;
    });
  }, [hospitalFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-2 sm:p-6 font-sans">
      {/* Top Simulation Toolbar */}
      <header className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 mb-4 px-4 py-3 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white">Clinic Natin Mobile App</h1>
              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                Interactive Preview
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Queue • In-App QRPH • Lock Screen Live Activity • Offline Health Passport
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Lock Screen Live Activity Widget */}
          <button
            onClick={() => setShowLiveActivity(!showLiveActivity)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border ${
              showLiveActivity
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/50'
                : 'bg-slate-700/80 text-slate-300 border-slate-600 hover:bg-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            {showLiveActivity ? 'Hide Lock Screen Widget' : 'Show Lock Screen Widget'}
          </button>

          {/* Toggle Phone Frame */}
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="p-2 rounded-lg bg-slate-700/80 text-slate-300 border border-slate-600 hover:bg-slate-700 transition"
            title={isPhoneFrame ? 'Expand to Full Screen' : 'Show Phone Frame'}
          >
            {isPhoneFrame ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 w-full max-w-5xl">
        {/* Device Wrapper */}
        <div
          className={`relative transition-all duration-300 ${
            isPhoneFrame
              ? 'w-[390px] h-[820px] rounded-[52px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-slate-700 overflow-hidden bg-white text-slate-900 flex flex-col'
              : 'w-full max-w-md h-[800px] rounded-3xl border border-slate-700 bg-white text-slate-900 flex flex-col shadow-2xl overflow-hidden'
          }`}
        >
          {/* iOS Dynamic Island & Status Bar */}
          <div className="bg-[#568259] text-white pt-2.5 px-6 pb-2 select-none relative z-20">
            {/* Dynamic Island Pill */}
            {isPhoneFrame && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full flex items-center justify-between px-2.5 text-[10px] text-white">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-semibold text-emerald-300">#14</span>
                </div>
                <span className="text-[9px] text-slate-400">➔ #17</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs font-semibold">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-80">5G</span>
                {isOfflineMode ? (
                  <WifiOff className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <Wifi className="w-3.5 h-3.5" />
                )}
                <div className="w-5 h-2.5 border border-white/80 rounded-sm p-0.5 flex items-center">
                  <div className="w-full h-full bg-white rounded-2xs"></div>
                </div>
              </div>
            </div>
          </div>

          {/* App Header */}
          <div className="bg-[#568259] text-white px-5 pb-4 pt-1 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur">
                <Stethoscope className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight leading-none">Clinic Natin</h2>
                <p className="text-[10px] text-emerald-100/80 font-medium">Cagayan de Oro Outpatient</p>
              </div>
            </div>

            {/* Offline Mode Indicator Badge */}
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${
                isOfflineMode
                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                  : 'bg-emerald-800/60 text-emerald-200 border border-emerald-600/40 hover:bg-emerald-800'
              }`}
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Basement Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-emerald-300" />
                  <span>Online Sync</span>
                </>
              )}
            </button>
          </div>

          {/* Scrollable Screen Body */}
          <div className="flex-1 overflow-y-auto bg-[#F8FBF9]">
            {/* ============================================================ */}
            {/* TAB 1: LIVE QUEUE SCREEN */}
            {/* ============================================================ */}
            {activeTab === 'queue' && (
              <div className="p-4 space-y-4">
                {/* Greeting */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Mabuhay, Kenneth 👋</p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Live Queue Tracker
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('passport')}
                    className="p-2 rounded-xl bg-emerald-50 text-[#568259] border border-emerald-100 hover:bg-emerald-100 transition"
                    title="Open Health Passport"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>

                {/* Hero Queue Card */}
                <div className="rounded-3xl p-5 bg-gradient-to-br from-[#568259] via-[#436b46] to-[#2e4d31] text-white shadow-lg shadow-emerald-950/20 relative overflow-hidden">
                  {/* Decorative background circle */}
                  <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-emerald-400/10 pointer-events-none blur-xl"></div>

                  {/* Doctor & Hospital Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/15 pb-3">
                    <div>
                      <span className="text-[11px] font-medium text-emerald-200 uppercase tracking-wider block">
                        Maria Reyna Xavier University Hospital
                      </span>
                      <p className="font-bold text-sm text-white">Dr. Maria Santos, MD • Room 304</p>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        isNowServing
                          ? 'bg-amber-300 text-amber-950 animate-pulse'
                          : 'bg-emerald-300/20 text-emerald-200 border border-emerald-300/30'
                      }`}
                    >
                      {isNowServing ? 'NOW SERVING YOU' : 'WAITING IN LINE'}
                    </span>
                  </div>

                  {/* Token Number Highlight */}
                  <div className="my-4 bg-[#F1FFFA] text-slate-900 rounded-2xl p-4 shadow-inner border border-emerald-100 text-center">
                    <span className="text-xs font-semibold text-slate-500 block">
                      Your Official Online Token
                    </span>
                    <div className="text-5xl font-black text-[#568259] tracking-tight my-1">
                      #{myQueueNumber}
                    </div>
                    <span className="inline-block px-2.5 py-0.5 bg-emerald-100/70 text-[#568259] font-bold text-xs rounded-md">
                      {myTokenCode}
                    </span>

                    {/* Progress Bar & ETA */}
                    <div className="mt-4 pt-3 border-t border-emerald-100/80">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Now Serving #{currentServing}
                        </span>
                        <span className="text-slate-700">
                          {isNowServing ? 'Enter Room Now!' : `${patientsAhead} patient${patientsAhead > 1 ? 's' : ''} ahead`}
                        </span>
                      </div>

                      {/* Progress Line */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#568259] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(10, (currentServing / myQueueNumber) * 100))}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#568259]" />
                          {isNowServing ? 'Consultation active' : `Est. wait: ~${estimatedWaitMins} mins`}
                        </span>
                        <span>Avg 8 min / consult</span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Delay Notice */}
                  {activeBroadcast && (
                    <div className="mb-4 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2">
                      <Timer className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="font-semibold">{activeBroadcast}</span>
                    </div>
                  )}

                  {/* Quick Action Button */}
                  <button
                    onClick={() => setActiveTab('passport')}
                    className="w-full py-3 px-4 bg-white text-[#568259] rounded-xl font-bold text-sm shadow-md hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Show Check-In QR Pass</span>
                  </button>
                </div>

                {/* Queue Simulation Trigger Bar */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Queue Simulation</span>
                    <span className="text-[11px] text-slate-500">Advance turn to test live reaction</span>
                  </div>
                  <button
                    onClick={handleCallNext}
                    className="px-3 py-1.5 bg-[#568259] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-emerald-800 transition"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Call Next (#{currentServing + 1})</span>
                  </button>
                </div>

                {/* Buffer Lane Grace Period Card (Late Arrival Demo) */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                      Buffer Lane Grace Protection
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200 text-orange-900">
                      45-min timer
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Stuck in CDO traffic or away in the cafeteria? You are never forfeited. Arrive within
                    45 minutes and the desk slots you 2 consultations ahead!
                  </p>
                </div>

                {/* Clinic Directions Pill */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#568259] flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Directions & Parking</p>
                      <p className="text-[11px] text-slate-500">Hayes St, Pinikitan, Cagayan de Oro</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 2: DOCTOR DISCOVERY & ₱50 QRPH BOOKING */}
            {/* ============================================================ */}
            {activeTab === 'doctors' && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Doctors & Clinics
                  </h3>
                  <p className="text-xs text-slate-500">Book queue slot in Northern Mindanao</p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctor, specialty, hospital..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#568259]"
                  />
                </div>

                {/* Hospital Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {['All', 'Maria Reyna', 'Polymedic', 'CUMC', 'NMMC'].map((hosp) => (
                    <button
                      key={hosp}
                      onClick={() => setHospitalFilter(hosp)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                        hospitalFilter === hosp
                          ? 'bg-[#568259] text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {hosp}
                    </button>
                  ))}
                </div>

                {/* Doctor Cards */}
                <div className="space-y-3">
                  {filteredDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-300 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-emerald-100 text-[#568259] font-black flex items-center justify-center text-sm border border-emerald-200">
                            {doc.name.split(' ')[1]?.[0] || 'D'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                {doc.name}
                              </h4>
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-[#568259] text-[9px] font-extrabold rounded border border-emerald-200">
                                Verified
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[#568259]">{doc.specialty}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {doc.hospital} • {doc.room}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{doc.schedule}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          {doc.queueCount} in line
                        </span>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setShowQrphModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-[#568259] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <span>Reserve Token</span>
                          <span className="opacity-90 font-normal">(₱50)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 3: DIGITAL HEALTH PASSPORT (OFFLINE READY) */}
            {/* ============================================================ */}
            {activeTab === 'passport' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Digital Health Passport
                    </h3>
                    <p className="text-xs text-slate-500">Offline check-in pass & medical ID</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Cached Locally
                  </span>
                </div>

                {/* Offline Warning Banner if in offline mode */}
                {isOfflineMode && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Hospital basement offline mode active. QR Code is rendered from AES-encrypted secure
                      cache.
                    </span>
                  </div>
                )}

                {/* QR Code Presentation Card */}
                <div className="bg-white border-2 border-emerald-200 rounded-3xl p-5 text-center shadow-md">
                  {passportQrDataUrl ? (
                    <img
                      src={passportQrDataUrl}
                      alt="Health Passport QR"
                      className="w-48 h-48 mx-auto rounded-xl shadow-inner border border-slate-100"
                    />
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
                      Generating QR...
                    </div>
                  )}

                  <h4 className="mt-3 font-extrabold text-lg text-slate-900">Kenneth Ramos</h4>
                  <p className="text-xs text-slate-500">
                    Scan at front desk for 1-second arrival check-in
                  </p>
                </div>

                {/* Demographics & Vitals */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                    <span className="text-[11px] text-slate-500 block">Blood Type</span>
                    <span className="text-lg font-black text-[#568259]">O Positive (O+)</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl">
                    <span className="text-[11px] text-slate-500 block">BMI Status</span>
                    <span className="text-lg font-black text-slate-800">22.5 (Normal)</span>
                  </div>
                </div>

                {/* Drug Allergy Red Flags */}
                <div className="p-4 bg-white border border-rose-200 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 mb-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Drug Allergy Safety Warnings</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Penicillin', 'Aspirin'].map((alg) => (
                      <span
                        key={alg}
                        className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold"
                      >
                        ⚠️ {alg}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Insurance & Priority Info */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">PhilHealth ID</span>
                    <span className="font-bold text-slate-800">12-345678901-2</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">HMO Provider</span>
                    <span className="font-bold text-slate-800">Maxicare (MAX-8890-4122)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Priority Lane</span>
                    <span className="font-bold text-amber-700">RA 9994 Senior Citizen</span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB 4: DOCTOR POCKET COCKPIT (PROVIDER COMPANION) */}
            {/* ============================================================ */}
            {activeTab === 'doctor-console' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Doctor Pocket Suite
                    </h3>
                    <p className="text-xs text-slate-500">Dr. Maria Santos • Maria Reyna Rm 304</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-[#568259] text-xs font-bold rounded-full border border-emerald-200">
                    Active Session
                  </span>
                </div>

                {/* Currently Serving Box */}
                <div className="p-5 bg-white border-2 border-[#568259] rounded-3xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-[#568259] tracking-wider uppercase">
                      CURRENTLY IN ROOM
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                      CN-WK-014
                    </span>
                  </div>
                  <div className="text-4xl font-black text-slate-900 mb-1">Queue #{currentServing}</div>
                  <p className="text-xs font-semibold text-slate-700">
                    Complaint: Chest tightness on exertion
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Triage Vitals: BP 125/82 mmHg • Pulse 76 bpm • SpO2 98%
                  </p>

                  <button
                    onClick={handleCallNext}
                    className="w-full mt-4 py-3 bg-[#568259] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete & Call Next (#{currentServing + 1})</span>
                  </button>
                </div>

                {/* 1-Tap Delay Broadcast Grid */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">1-Tap Delay Broadcast</h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Instantly notifies all waiting patients via Push & Semaphore SMS.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleTriggerDelay('⏱️ Doctor on hospital rounds (+15m delay)')}
                      className="py-2.5 px-2 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition"
                    >
                      +15m Rounds
                    </button>
                    <button
                      onClick={() => handleTriggerDelay('🚨 Emergency surgery in progress (+30m delay)')}
                      className="py-2.5 px-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition"
                    >
                      +30m Surgery
                    </button>
                    <button
                      onClick={() => handleTriggerDelay('🚗 Doctor stuck in CDO traffic (+45m delay)')}
                      className="py-2.5 px-2 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition"
                    >
                      +45m Traffic
                    </button>
                  </div>
                </div>

                {/* Buffer Lane Management */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Buffer Lane Active</h4>
                  <div className="flex items-center justify-between p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-orange-950">Queue #12 (Late Arrival)</p>
                      <p className="text-[11px] text-orange-800">18 mins left in 45-min grace period</p>
                    </div>
                    <button
                      onClick={() => alert('Restored Queue #12 into active line (+2 slots ahead)')}
                      className="px-2.5 py-1 bg-orange-600 text-white rounded-lg text-xs font-bold"
                    >
                      Check In (+2)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom App Navigation Bar */}
          <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around z-20">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'queue' ? 'text-[#568259]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-full ${
                  activeTab === 'queue' ? 'bg-emerald-100/70 text-[#568259]' : ''
                }`}
              >
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold">My Queue</span>
            </button>

            <button
              onClick={() => setActiveTab('doctors')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'doctors' ? 'text-[#568259]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-full ${
                  activeTab === 'doctors' ? 'bg-emerald-100/70 text-[#568259]' : ''
                }`}
              >
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold">Doctors</span>
            </button>

            <button
              onClick={() => setActiveTab('passport')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'passport' ? 'text-[#568259]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-full ${
                  activeTab === 'passport' ? 'bg-emerald-100/70 text-[#568259]' : ''
                }`}
              >
                <QrCode className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold">Passport</span>
            </button>

            <button
              onClick={() => setActiveTab('doctor-console')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'doctor-console'
                  ? 'text-[#568259]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-full ${
                  activeTab === 'doctor-console' ? 'bg-emerald-100/70 text-[#568259]' : ''
                }`}
              >
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold">Doctor Mode</span>
            </button>
          </div>

          {/* iOS Home Indicator Bar */}
          {isPhoneFrame && (
            <div className="bg-white pb-2 flex justify-center">
              <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
            </div>
          )}

          {/* ============================================================ */}
          {/* IN-APP DYNAMIC QRPH PAYMENT MODAL (REQUIREMENT 2) */}
          {/* ============================================================ */}
          {showQrphModal && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
              <div className="bg-white rounded-t-3xl p-5 text-slate-900 animate-in slide-in-from-bottom duration-200">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <h4 className="font-extrabold text-base text-slate-900">PayMongo QRPH Payment</h4>
                  </div>
                  <button
                    onClick={() => setShowQrphModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {paymentSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-16 h-16 bg-emerald-100 text-[#568259] rounded-full mx-auto flex items-center justify-center">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <h5 className="font-black text-xl text-slate-900">Payment Verified!</h5>
                    <p className="text-xs text-slate-600">
                      You have been assigned Official Online Token <strong>#{currentServing + 5}</strong>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs mb-3">
                      <span className="text-slate-600 font-medium">Convenience Fee</span>
                      <span className="text-lg font-black text-[#568259]">₱50.00</span>
                    </div>

                    {/* QRPH Code Container */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-inner my-2">
                      {qrphDataUrl ? (
                        <img
                          src={qrphDataUrl}
                          alt="Dynamic QRPH Code"
                          className="w-44 h-44 mx-auto"
                        />
                      ) : (
                        <div className="w-44 h-44 mx-auto bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
                          Loading QR...
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-bold text-amber-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Expires in {Math.floor(qrphSecondsLeft / 60)}:
                          {(qrphSecondsLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-center text-slate-500 mb-3">
                      Interoperable: Scan via GCash, Maya, ShopeePay, or any PH Bank
                    </p>

                    <button
                      onClick={handleSimulatePayment}
                      disabled={isVerifyingPayment}
                      className="w-full py-3 bg-[#568259] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      {isVerifyingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Checking Webhook Confirmation...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Simulate Paid (Verify Webhook)</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SIDEBAR: LOCK SCREEN LIVE ACTIVITY SIMULATION (REQUIREMENT 1) */}
        {/* ============================================================ */}
        {showLiveActivity && (
          <div className="w-full max-w-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* iOS Lock Screen Simulated Widget */}
            <div className="bg-slate-950/90 border border-slate-700/80 rounded-3xl p-5 shadow-2xl text-white">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200">iOS Lock Screen Live Activity</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  ActivityKit
                </span>
              </div>

              {/* The Live Activity Card */}
              <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-2xl shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Stethoscope className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-white">Clinic Natin Live Queue</h5>
                      <p className="text-[10px] text-slate-400">Dr. Santos • Maria Reyna Rm 304</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE
                  </span>
                </div>

                {/* Numbers Row */}
                <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Now Serving</span>
                    <span className="text-2xl font-black text-emerald-400">#{currentServing}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Your Token</span>
                    <span className="text-2xl font-black text-white">#{myQueueNumber}</span>
                  </div>
                </div>

                {/* Progress & Delay Alert */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-300 font-semibold">
                    <span>{patientsAhead} patients ahead</span>
                    <span className="text-emerald-300">~{estimatedWaitMins} mins</span>
                  </div>
                  {activeBroadcast && (
                    <div className="p-2 bg-amber-950/60 border border-amber-700/50 rounded-lg text-amber-200 text-[10px] font-medium flex items-center gap-1.5">
                      <Timer className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{activeBroadcast}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Architecture Highlights Note */}
            <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl text-xs space-y-2 text-slate-300">
              <h5 className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All 3 Specifications Active:</span>
              </h5>
              <p>
                <strong>1. Lock Screen Widget:</strong> Updates via Supabase Realtime WebSocket events
                without needing the app to be opened.
              </p>
              <p>
                <strong>2. In-App QRPH View:</strong> Displays dynamic QRPH with countdown and auto-webhook
                verification.
              </p>
              <p>
                <strong>3. Offline Health Passport:</strong> Uses encrypted local store to guarantee QR
                check-in in hospital basements.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
