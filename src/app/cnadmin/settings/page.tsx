'use client';

import * as React from 'react';
import {
  Settings,
  Sliders,
  Database,
  Pill,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Search,
  Plus,
  HeartHandshake,
  Star,
  Accessibility,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  INITIAL_FEATURE_FLAGS,
  INITIAL_ICD10,
  INITIAL_PNDF,
  INITIAL_HMOS,
  type FeatureFlags,
  type ICD10Item,
  type PNDFItem,
  type HMOProvider,
} from '@/lib/admin/data';

export default function SettingsAndDictionariesPage() {
  const [activeTab, setActiveTab] = React.useState<'FLAGS' | 'ICD10' | 'PNDF' | 'HMOS' | 'STATUTORY'>('FLAGS');
  const [flags, setFlags] = React.useState<FeatureFlags>(INITIAL_FEATURE_FLAGS);
  const [icd10List, setIcd10List] = React.useState<ICD10Item[]>(INITIAL_ICD10);
  const [pndfList, setPndfList] = React.useState<PNDFItem[]>(INITIAL_PNDF);
  const [hmoList, setHmoList] = React.useState<HMOProvider[]>(INITIAL_HMOS);

  // Search state
  const [dictSearch, setDictSearch] = React.useState('');

  // Add Item Modal
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [newIcdCode, setNewIcdCode] = React.useState('');
  const [newIcdDesc, setNewIcdDesc] = React.useState('');
  const [newIcdCategory, setNewIcdCategory] = React.useState('General');

  const handleToggleFlag = (key: keyof FeatureFlags) => {
    setFlags((prev) => {
      const updated = {
        ...prev,
        [key]: !prev[key],
      };

      // Write to audit log
      const existingAudit = JSON.parse(localStorage.getItem('clinic_natin_audit_logs') || '[]');
      existingAudit.unshift({
        id: `audit-${Date.now()}`,
        actorId: 'admin-super',
        actorName: 'Atty. Rafael Ramos (Admin Ops)',
        actorRole: 'ADMIN',
        action: 'FEATURE_FLAG_TOGGLED',
        resourceTable: 'system_settings',
        recordId: String(key),
        details: `Feature Flag "${key}" changed to ${updated[key]}`,
        ipAddress: '124.106.129.5',
        timestamp: new Date().toLocaleString(),
      });
      localStorage.setItem('clinic_natin_audit_logs', JSON.stringify(existingAudit));

      return updated;
    });
  };

  const handleAddIcd10 = () => {
    if (!newIcdCode.trim() || !newIcdDesc.trim()) {
      alert('Please fill code and description.');
      return;
    }
    const item: ICD10Item = {
      code: newIcdCode.toUpperCase(),
      description: newIcdDesc,
      category: newIcdCategory,
      isCommonCDO: true,
    };
    setIcd10List((prev) => [item, ...prev]);
    setNewIcdCode('');
    setNewIcdDesc('');
    setAddModalOpen(false);
  };

  const filteredIcd = icd10List.filter(
    (item) =>
      item.code.toLowerCase().includes(dictSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(dictSearch.toLowerCase())
  );

  const filteredPndf = pndfList.filter(
    (item) =>
      item.genericName.toLowerCase().includes(dictSearch.toLowerCase()) ||
      item.brandNames.some((b) => b.toLowerCase().includes(dictSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-brand-700" />
            System Configuration & Medical Master Dictionaries
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global module feature flags, ICD-10 clinical coding, Philippine Drug Formulary (PNDF), and statutory discounts.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs flex-wrap">
          <Button
            size="sm"
            variant={activeTab === 'FLAGS' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('FLAGS')}
            className="text-xs font-semibold h-8"
          >
            Feature Flags
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'ICD10' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('ICD10')}
            className="text-xs font-semibold h-8"
          >
            ICD-10 Master
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'PNDF' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('PNDF')}
            className="text-xs font-semibold h-8"
          >
            PNDF Drug Formulary
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'HMOS' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('HMOS')}
            className="text-xs font-semibold h-8"
          >
            HMO Master
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'STATUTORY' ? 'brand' : 'ghost'}
            onClick={() => setActiveTab('STATUTORY')}
            className="text-xs font-semibold h-8"
          >
            Statutory Discounts
          </Button>
        </div>
      </div>

      {/* TAB 1: Global Feature Flags */}
      {activeTab === 'FLAGS' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-brand-700" />
                Live Runtime Feature Toggles
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Instantly enable or disable capabilities in production without triggering code redeployment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 divide-y divide-slate-100">
              {/* Online Payment Deposit */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_online_payment_deposit
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                      PayMongo QRPh
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Requires patients to pay the ₱50 convenience reservation fee upfront via GCash, Maya, or Cards to secure queue tokens.
                  </p>
                </div>
                <Switch
                  checked={flags.enable_online_payment_deposit}
                  onCheckedChange={() => handleToggleFlag('enable_online_payment_deposit')}
                />
              </div>

              {/* Walk-in Kiosk Mode */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_walkin_kiosk_mode
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-800 border-blue-200 font-bold">
                      Reception Tablets
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permits paired reception iPads & Android tablets to issue walk-in tokens (even numbers: CN-WK002, CN-WK004).
                  </p>
                </div>
                <Switch
                  checked={flags.enable_walkin_kiosk_mode}
                  onCheckedChange={() => handleToggleFlag('enable_walkin_kiosk_mode')}
                />
              </div>

              {/* Teleconsultation Beta */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      enable_teleconsultation_beta
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-800 border-purple-200 font-bold">
                      Video Chime Beta
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enables remote video consultation sessions inside the doctor suite for follow-up patients.
                  </p>
                </div>
                <Switch
                  checked={flags.enable_teleconsultation_beta}
                  onCheckedChange={() => handleToggleFlag('enable_teleconsultation_beta')}
                />
              </div>

              {/* Maintenance Mode */}
              <div className="py-4 flex items-center justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      maintenance_mode
                    </p>
                    <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-800 border-rose-200 font-bold">
                      System Lock
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Locks public booking interfaces and displays the scheduled maintenance notice to patients.
                  </p>
                </div>
                <Switch
                  checked={flags.maintenance_mode}
                  onCheckedChange={() => handleToggleFlag('maintenance_mode')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ICD-10 Master Catalog */}
      {activeTab === 'ICD10' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search ICD-10 code (e.g. J06.9, I10) or diagnostic description..."
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                  className="pl-10 text-xs bg-white"
                />
              </div>
              <Button
                size="sm"
                variant="brand"
                onClick={() => setAddModalOpen(true)}
                className="text-xs font-bold gap-1.5 h-9"
              >
                <Plus className="h-4 w-4" />
                Add ICD-10 Code
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ICD-10 Code</TableHead>
                  <TableHead>Diagnostic Term / Description</TableHead>
                  <TableHead>Clinical Category</TableHead>
                  <TableHead className="text-right">CDO Outpatient Prevalence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIcd.map((item) => (
                  <TableRow key={item.code}>
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">
                      {item.code}
                    </TableCell>
                    <TableCell className="text-xs text-slate-800 font-medium">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {item.category}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.isCommonCDO ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                          High Prevalence (CDO)
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Standard</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 3: Philippine National Drug Formulary (PNDF) */}
      {activeTab === 'PNDF' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search generic medicine or Philippine brand name (e.g. Biogesic, Norvasc)..."
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                  className="pl-10 text-xs bg-white"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Generic Drug Name</TableHead>
                  <TableHead>Common Brand Equivalents (PH)</TableHead>
                  <TableHead>Standard Dosage & Form</TableHead>
                  <TableHead className="text-right">Therapeutic Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPndf.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {item.genericName}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {item.brandNames.map((b) => (
                          <Badge key={b} variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {item.dosage} &bull; {item.form}
                    </TableCell>
                    <TableCell className="text-right text-xs text-slate-500 font-medium">
                      {item.therapeuticClass}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 4: HMO Master Providers */}
      {activeTab === 'HMOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Accredited Health Maintenance Organizations (HMO)</h2>
            <Badge variant="outline" className="bg-white text-xs font-bold">
              {hmoList.length} Accredited Providers
            </Badge>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HMO Provider Entity</TableHead>
                  <TableHead>Accreditation Status</TableHead>
                  <TableHead>Prior Authorization</TableHead>
                  <TableHead className="text-right">Provider Contact Desk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hmoList.map((hmo) => (
                  <TableRow key={hmo.id}>
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {hmo.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                        {hmo.accreditationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {hmo.requiresPriorAuth ? (
                        <span className="text-amber-700 font-medium">LOA Required (Online / Letter)</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Direct Clinic Swipe</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-slate-600">
                      {hmo.contactDesk}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* TAB 5: Statutory Discounts & Priority Policy */}
      {activeTab === 'STATUTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Republic Act No. 9994 (Expanded Senior Citizens Act)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Statutory priority queue lanes and mandatory 20% professional discount rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span>Statutory Discount Percentage:</span>
                <strong className="text-slate-900 font-bold">20.0% Mandated</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span>VAT Exemption Status:</span>
                <strong className="text-emerald-700 font-bold">12% VAT Exempted</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span>Required Validation Document:</span>
                <strong className="text-slate-900">OSCA Identification Card</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>Interleaved Buffer Priority Lane:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                  Active (Max 3 Wait Spread)
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <Accessibility className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Republic Act No. 7277 (Magna Carta for PWDs)
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Priority outpatient queuing and consultation fee reductions for persons with disability.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3 text-xs text-slate-600">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span>Statutory Discount Percentage:</span>
                <strong className="text-slate-900 font-bold">20.0% Mandated</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span>Required Validation Document:</span>
                <strong className="text-slate-900">LGU / PDAO Registered Card</strong>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span>Grace Period Deadline:</span>
                <strong className="text-slate-900 font-bold">45 Minutes Grace Buffer</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>Automated SMS Notice:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                  Priority Lane Advance Call
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add ICD-10 Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Add ICD-10 Diagnostic Code</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Expands the physician diagnosis auto-complete database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">ICD-10 Code (e.g. E10.9)</label>
              <Input
                value={newIcdCode}
                onChange={(e) => setNewIcdCode(e.target.value)}
                placeholder="Code"
                className="text-xs bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Diagnostic Term / Narrative</label>
              <Input
                value={newIcdDesc}
                onChange={(e) => setNewIcdDesc(e.target.value)}
                placeholder="Description"
                className="text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clinical Specialty Category</label>
              <Input
                value={newIcdCategory}
                onChange={(e) => setNewIcdCategory(e.target.value)}
                placeholder="e.g. Cardiovascular, Respiratory"
                className="text-xs bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleAddIcd10}
              className="text-xs font-bold"
            >
              Add to Catalog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
