'use client';

import * as React from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  Building2,
  Calendar,
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Printer,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { INITIAL_CDO_CLINICS, type CDOClinic } from '@/lib/admin/data';

export default function ClinicsAndRoomsPage() {
  const [clinics] = React.useState<CDOClinic[]>(INITIAL_CDO_CLINICS);

  // Printed QR Standee Dialog State
  const [qrStandeeModalOpen, setQrStandeeModalOpen] = React.useState(false);
  const [selectedClinicForQR, setSelectedClinicForQR] = React.useState<CDOClinic>(INITIAL_CDO_CLINICS[0]);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  // Generate QR code data URL whenever selected clinic changes
  React.useEffect(() => {
    if (selectedClinicForQR) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinicnatin.ph';
      const checkinUrl = `${origin}/c/${selectedClinicForQR.id}`;

      QRCode.toDataURL(checkinUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [selectedClinicForQR]);

  const handleOpenQRStandee = (clinic: CDOClinic) => {
    setSelectedClinicForQR(clinic);
    setQrStandeeModalOpen(true);
  };

  const handlePrintStandee = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clinicnatin.ph';
    const checkinUrl = `${origin}/c/${selectedClinicForQR.id}`;
    navigator.clipboard.writeText(checkinUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-brand-700" />
            Hospital Directory & Clinic Rooms
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Affiliated Cagayan de Oro Medical Arts buildings, room assignments, schedules, and door QR standees.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="brand"
            size="sm"
            onClick={() => handleOpenQRStandee(clinics[0])}
            className="h-9 text-xs font-bold gap-1.5 shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print QR Door Standee
          </Button>
        </div>
      </div>

      {/* 2. Zero-Hardware QR Check-in Explainer Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-brand-700 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                Static Printed QR Door Signage
              </h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                Zero Hardware Required
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Print a laminated poster or acrylic standee and place it outside the clinic door. Arriving patients simply point their smartphone camera at the QR code to confirm arrival or take an interleaved walk-in queue number.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenQRStandee(clinics[0])}
          className="text-xs font-bold shrink-0 border-slate-300 gap-1.5"
        >
          <Printer className="h-3.5 w-3.5 text-slate-600" />
          Generate Standee
        </Button>
      </div>

      {/* 3. Affiliated Hospital Centers Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Affiliated Hospital Complexes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-slate-50">Private Tertiary</Badge>
              <CardTitle className="text-sm font-bold text-slate-900 mt-1">Maria Reyna XU Hospital</CardTitle>
              <CardDescription className="text-xs text-slate-500">Hayes St, Pinikitan, CDO</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
              <p>Medical Arts Bldg &bull; 8 Active Rooms</p>
              <p className="text-[11px] text-slate-500 font-mono">Phone: (088) 857-4000</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-slate-50">Private Tertiary</Badge>
              <CardTitle className="text-sm font-bold text-slate-900 mt-1">Capitol Univ. Medical Center</CardTitle>
              <CardDescription className="text-xs text-slate-500">Gusa Highway, CDO</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
              <p>Doctors Complex &bull; 12 Active Rooms</p>
              <p className="text-[11px] text-slate-500 font-mono">Phone: (088) 856-4422</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-slate-50">Private Tertiary</Badge>
              <CardTitle className="text-sm font-bold text-slate-900 mt-1">Polymedic Medical Plaza</CardTitle>
              <CardDescription className="text-xs text-slate-500">Kauswagan Highway, CDO</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
              <p>Plaza Tower B &bull; 10 Active Rooms</p>
              <p className="text-[11px] text-slate-500 font-mono">Phone: (088) 858-5858</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <Badge variant="outline" className="w-fit text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">DOH Apex Tertiary</Badge>
              <CardTitle className="text-sm font-bold text-slate-900 mt-1">Northern Mindanao Med. Ctr</CardTitle>
              <CardDescription className="text-xs text-slate-500">Capitol Compound, CDO</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
              <p>Outpatient Complex &bull; 16 Active Rooms</p>
              <p className="text-[11px] text-slate-500 font-mono">Phone: (088) 72-6362</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Consultation Rooms & Door Standee Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Active Consultation Rooms & Door Standees</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="bg-white border-slate-200 shadow-xs hover:border-slate-300 transition">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200 mb-1">
                      {clinic.hospital}
                    </Badge>
                    <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                      {clinic.room} &bull; {clinic.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {clinic.building}, {clinic.floor}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                    {clinic.operatingHours}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-brand-700 mt-1">
                  {clinic.activeDoctor} ({clinic.doctorSpecialty})
                </p>
              </CardHeader>

              <CardContent className="p-5 pt-0 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Direct Reception: <strong>{clinic.contactNumber}</strong></span>
                  <span>Currently Serving: <strong className="text-brand-700">#{clinic.servingNumber}</strong></span>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                <Link
                  href={`/c/${clinic.id}`}
                  target="_blank"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Test Check-in URL
                </Link>

                <Button
                  size="sm"
                  variant="brand"
                  onClick={() => handleOpenQRStandee(clinic)}
                  className="h-8 text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print QR Standee
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* 5. REDESIGNED PROFESSIONAL QR STANDEE DIALOG */}
      <Dialog open={qrStandeeModalOpen} onOpenChange={setQrStandeeModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-slate-200 p-6 print:p-0 print:border-0 print:shadow-none print:max-w-none print:h-auto">
          <DialogHeader className="print:hidden pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="h-5 w-5 text-brand-700" />
                  Printable Clinic Door Standee
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  High-contrast clinical signage designed for A4 paper laminating or acrylic desk/wall standees.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Two-Column Layout: Left = Print Sheet Preview, Right = Controls & Print Action */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-start">
            
            {/* ── LEFT COLUMN: The Clean Printable Standee Sheet ── */}
            <div className="md:col-span-7 flex justify-center">
              <div
                id="clinic-printable-standee"
                className="w-full max-w-sm bg-white rounded-2xl border border-slate-300 shadow-md p-6 text-center space-y-4 print:border-0 print:shadow-none print:m-0 print:p-0 print:max-w-none"
              >
                {/* Top Brand Bar */}
                <div className="flex items-center justify-center gap-2 pb-2 border-b border-slate-200">
                  <div className="h-7 w-7 rounded-lg bg-brand-700 text-white flex items-center justify-center font-black text-xs">
                    CN
                  </div>
                  <span className="text-base font-black tracking-tight text-slate-900">
                    CLINIC NATIN
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Patient Check-In
                  </span>
                </div>

                {/* Hospital, Room & Doctor Identity */}
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                    {selectedClinicForQR.hospital}
                  </p>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedClinicForQR.room}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedClinicForQR.building}
                  </p>
                  <p className="text-xs font-bold text-slate-800 pt-1">
                    {selectedClinicForQR.activeDoctor}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedClinicForQR.doctorSpecialty}
                  </p>
                </div>

                {/* High-Resolution Framed QR Code */}
                <div className="flex flex-col items-center justify-center py-1">
                  <div className="rounded-2xl border-2 border-slate-800 p-2.5 bg-white shadow-xs inline-block">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR Check-in for ${selectedClinicForQR.room}`}
                        className="h-44 w-44 sm:h-48 sm:w-48 object-contain"
                      />
                    ) : (
                      <div className="h-44 w-44 flex items-center justify-center text-xs text-slate-400">
                        Generating QR...
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Point Phone Camera Here
                  </span>
                </div>

                {/* Clear Patient Instructions */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left space-y-1.5">
                  <p className="text-xs font-bold text-slate-900 text-center uppercase tracking-wide">
                    Scan to Check In or Get Token
                  </p>
                  <ol className="text-[11px] text-slate-600 space-y-1 list-decimal pl-4 leading-tight">
                    <li>Open your smartphone camera and scan the QR code.</li>
                    <li>Confirm arrival for your online booking, or tap for a walk-in queue number.</li>
                    <li>You will receive an automated SMS when your turn is near.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 text-center pt-1 border-t border-slate-200 italic">
                    Walay kinahanglan nga i-download nga app. Libre ug dali ra.
                  </p>
                </div>

                {/* Regulatory Stamp */}
                <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-700" />
                  <span>Republic Act No. 10173 Compliant &bull; Clinic Natin</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Controls & Print Action (Hidden when printing) ── */}
            <div className="md:col-span-5 space-y-5 print:hidden">
              {/* Clinic Room Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Room to Print</label>
                <select
                  value={selectedClinicForQR.id}
                  onChange={(e) => {
                    const found = clinics.find((c) => c.id === e.target.value);
                    if (found) setSelectedClinicForQR(found);
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white text-slate-800 font-semibold focus:outline-none focus:border-brand-700"
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.hospital} — {c.room} ({c.activeDoctor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Check-In Web Link & Test Action */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                <p className="font-bold text-slate-800">Scannable Mobile Check-in URL</p>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/c/${selectedClinicForQR.id}` : ''}
                    className="text-[11px] font-mono bg-white h-8"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="h-8 px-2.5 text-xs shrink-0"
                    title="Copy URL"
                  >
                    {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 text-xs text-brand-700 font-semibold px-1"
                  >
                    <Link href={`/c/${selectedClinicForQR.id}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Test Mobile Page in New Tab
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Staff Placement Guide */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Clinic Staff Deployment Guide
                </p>
                <ul className="text-[11px] text-emerald-800 space-y-1 list-disc pl-4 leading-normal">
                  <li>Print on regular A4 bond paper or 4x6 photo card.</li>
                  <li>Laminate or insert inside an acrylic desk/wall standee.</li>
                  <li>Tape or mount outside the consultation room door at eye level.</li>
                  <li>No tablet, batteries, or hardware maintenance required.</li>
                </ul>
              </div>

              {/* Big Print Action */}
              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  variant="brand"
                  size="lg"
                  onClick={handlePrintStandee}
                  className="w-full text-xs font-bold gap-2 h-11 shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  Print Standee Poster Now
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQrStandeeModalOpen(false)}
                  className="w-full text-xs border-slate-200 text-slate-600 hover:text-slate-900"
                >
                  Close
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
