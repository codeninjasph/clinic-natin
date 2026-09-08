'use client';

import * as React from 'react';
import {
  Users,
  Search,
  Download,
  Trash2,
  ShieldCheck,
  Star,
  Accessibility,
  Baby,
  UserCheck,
  CheckCircle2,
  Ban,
  Filter,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';
  priorityCategory: 'NONE' | 'SENIOR' | 'PWD' | 'PREGNANT';
  city: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ANONYMIZED';
  joinedAt: string;
  assignedDoctor?: string;
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'user-001',
    fullName: 'Andres Bonifacio',
    email: 'patient@clinicnatin.ph',
    phone: '+63 917 555 1234',
    role: 'PATIENT',
    priorityCategory: 'SENIOR',
    city: 'Cagayan de Oro (Macasandig)',
    status: 'ACTIVE',
    joinedAt: '2026-08-10',
  },
  {
    id: 'user-002',
    fullName: 'Corazon Aquino',
    email: 'corazon.aquino@gmail.com',
    phone: '+63 920 888 4421',
    role: 'PATIENT',
    priorityCategory: 'PWD',
    city: 'Cagayan de Oro (Carmen)',
    status: 'ACTIVE',
    joinedAt: '2026-08-22',
  },
  {
    id: 'user-003',
    fullName: 'Dr. Maria Santos, MD',
    email: 'maria.santos@maria-reyna.ph',
    phone: '+63 917 842 1092',
    role: 'DOCTOR',
    priorityCategory: 'NONE',
    city: 'Cagayan de Oro',
    status: 'ACTIVE',
    joinedAt: '2026-07-01',
  },
  {
    id: 'user-004',
    fullName: 'Elena Bautista',
    email: 'secretary@clinicnatin.ph',
    phone: '+63 918 333 7789',
    role: 'SECRETARY',
    priorityCategory: 'NONE',
    city: 'Cagayan de Oro',
    status: 'ACTIVE',
    joinedAt: '2026-07-15',
    assignedDoctor: 'Dr. Maria Santos, MD',
  },
  {
    id: 'user-005',
    fullName: 'Gabriela Silang',
    email: 'gabriela.silang@yahoo.com',
    phone: '+63 995 221 8890',
    role: 'PATIENT',
    priorityCategory: 'PREGNANT',
    city: 'Cagayan de Oro (Lapasan)',
    status: 'ACTIVE',
    joinedAt: '2026-09-02',
  },
  {
    id: 'user-006',
    fullName: 'Atty. Rafael Ramos',
    email: 'admin@clinicnatin.ph',
    phone: '+63 917 111 0099',
    role: 'ADMIN',
    priorityCategory: 'NONE',
    city: 'Cagayan de Oro',
    status: 'ACTIVE',
    joinedAt: '2026-06-01',
  },
];

export default function PatientsDirectoryPage() {
  const [users, setUsers] = React.useState<UserRecord[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');

  // DSAR Modal States
  const [dsarUser, setDsarUser] = React.useState<UserRecord | null>(null);
  const [dsarAction, setDsarAction] = React.useState<'PORTABILITY' | 'ERASURE' | null>(null);
  const [dsarExportSuccess, setDsarExportSuccess] = React.useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    if (roleFilter === 'ALL') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  const handleToggleSuspend = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
          };
        }
        return u;
      })
    );
  };

  const handleExecutePortabilityExport = () => {
    if (!dsarUser) return;
    // Simulate RA 10173 Section 18 Data Archive Export
    const exportPayload = {
      compliance: 'Republic Act No. 10173 (Philippine Data Privacy Act)',
      provision: 'Section 18: Right to Data Portability',
      subject: dsarUser,
      medicalHistorySummary: {
        registeredAt: dsarUser.joinedAt,
        demographics: {
          fullName: dsarUser.fullName,
          phone: dsarUser.phone,
          email: dsarUser.email,
          city: dsarUser.city,
          priorityStatus: dsarUser.priorityCategory,
        },
        consultationLogRecordsCount: 3,
        retentionStatus: 'DOH Standard Minimum 10 Years Active',
      },
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DSAR-Portability-${dsarUser.fullName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDsarExportSuccess(true);
    setTimeout(() => {
      setDsarAction(null);
      setDsarExportSuccess(false);
    }, 1500);
  };

  const handleExecuteErasure = () => {
    if (!dsarUser) return;
    if (!confirm('Execute RA 10173 Section 16 Account Erasure? Patient identity will be anonymized while preserving clinical health records under DOH 10-year mandate.')) return;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === dsarUser.id) {
          return {
            ...u,
            fullName: 'Anonymized Subject (RA 10173 Sec 16)',
            email: 'erased@privacy.gov.ph',
            phone: '+63 000 000 0000',
            status: 'ANONYMIZED',
          };
        }
        return u;
      })
    );

    // Audit trail entry
    const existingAudit = JSON.parse(localStorage.getItem('clinic_natin_audit_logs') || '[]');
    existingAudit.unshift({
      id: `audit-${Date.now()}`,
      actorId: 'admin-super',
      actorName: 'Atty. Rafael Ramos (Admin Ops)',
      actorRole: 'ADMIN',
      action: 'CHANGED_PRIORITY_CATEGORY',
      resourceTable: 'profiles',
      recordId: dsarUser.id,
      details: `RA 10173 Section 16 Erasure executed for User ID ${dsarUser.id}. Clinical records preserved per DOH Order.`,
      ipAddress: '124.106.129.5',
      timestamp: new Date().toLocaleString(),
    });
    localStorage.setItem('clinic_natin_audit_logs', JSON.stringify(existingAudit));

    setDsarAction(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-700" />
            User & Tenant Directory (RBAC & DSAR)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of patients, physicians, secretaries, and RA 10173 Data Subject Access Requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-white border-slate-200 text-xs font-bold">
            {users.length} Registered Accounts
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-bold">
            2 Statutory Priority
          </Badge>
        </div>
      </div>

      {/* 2. Search & Role Filter Bar */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, email, or mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN'].map((role) => (
              <Button
                key={role}
                size="sm"
                variant={roleFilter === role ? 'brand' : 'outline'}
                onClick={() => setRoleFilter(role)}
                className="text-xs font-semibold h-8"
              >
                {role}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. User Directory Table */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name & Contact</TableHead>
              <TableHead>System Role</TableHead>
              <TableHead>Statutory Priority</TableHead>
              <TableHead>City / Barangay</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Linkage / Details</TableHead>
              <TableHead className="text-right">DSAR & Governance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{user.fullName}</p>
                      <p className="text-[11px] text-slate-500">{user.email}</p>
                      <p className="text-[11px] font-mono text-slate-400">{user.phone}</p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : user.role === 'DOCTOR'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : user.role === 'SECRETARY'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {user.priorityCategory === 'SENIOR' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold gap-1">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        Senior Citizen (RA 9994)
                      </Badge>
                    )}
                    {user.priorityCategory === 'PWD' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold gap-1">
                        <Accessibility className="h-2.5 w-2.5" />
                        PWD (RA 7277)
                      </Badge>
                    )}
                    {user.priorityCategory === 'PREGNANT' && (
                      <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold gap-1">
                        <Baby className="h-2.5 w-2.5" />
                        Maternal Priority
                      </Badge>
                    )}
                    {user.priorityCategory === 'NONE' && (
                      <span className="text-xs text-slate-400">Regular</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {user.city}
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={`text-[10px] font-bold ${
                        user.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : user.status === 'SUSPENDED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {user.assignedDoctor ? (
                      <span className="font-semibold text-brand-700">
                        Assigned: {user.assignedDoctor}
                      </span>
                    ) : (
                      <span className="text-slate-400">Joined {user.joinedAt}</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDsarUser(user);
                          setDsarAction('PORTABILITY');
                        }}
                        className="h-7 px-2 text-[10px] border-slate-300 font-semibold hover:bg-slate-50 gap-1"
                        title="RA 10173 Sec 18 Export"
                      >
                        <Download className="h-3 w-3 text-slate-500" />
                        Export
                      </Button>

                      {user.role === 'PATIENT' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDsarUser(user);
                            setDsarAction('ERASURE');
                          }}
                          className="h-7 px-2 text-[10px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="RA 10173 Sec 16 Erasure"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={user.status === 'ACTIVE' ? 'ghost' : 'outline'}
                        onClick={() => handleToggleSuspend(user.id)}
                        className="h-7 px-2 text-[10px] text-slate-600 font-medium"
                      >
                        {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* 4. DSAR Portability Modal */}
      <Dialog open={dsarAction === 'PORTABILITY'} onOpenChange={() => setDsarAction(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-700" />
              RA 10173 Sec 18: Right to Data Portability
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Generates a standardized structured electronic copy of the patient&apos;s demographic and clinical appointment history.
            </DialogDescription>
          </DialogHeader>

          {dsarUser && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-900">{dsarUser.fullName}</p>
                <p className="text-slate-600">{dsarUser.email} &bull; {dsarUser.phone}</p>
                <p className="text-slate-500 mt-1">Classification: {dsarUser.priorityCategory}</p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 text-[11px] leading-relaxed">
                The exported archive is formatted in structured JSON compliant with Philippine National Privacy Commission (NPC) circulars.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="brand"
              size="sm"
              onClick={handleExecutePortabilityExport}
              className="w-full text-xs font-bold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download Standardized Archive (.json)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. DSAR Erasure Modal */}
      <Dialog open={dsarAction === 'ERASURE'} onOpenChange={() => setDsarAction(null)}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              RA 10173 Sec 16: Right to Erasure / Blocking
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Account anonymization protocol with statutory DOH 10-year medical record retention protection.
            </DialogDescription>
          </DialogHeader>

          {dsarUser && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-950">
                <p className="font-bold">Subject: {dsarUser.fullName}</p>
                <p className="text-[11px] text-rose-800 mt-1">
                  Personal identifiers (Name, Email, Phone, OSCA ID) will be irrevocably anonymized.
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950 text-[11px] leading-relaxed">
                <strong>Statutory Health Retention Notice:</strong> In accordance with Department of Health (DOH) Administrative Orders, consultation vitals and clinical encounter history must be preserved for a minimum of 10 years and will not be destroyed.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDsarAction(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleExecuteErasure}
              className="text-xs font-bold"
            >
              Confirm Anonymization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
