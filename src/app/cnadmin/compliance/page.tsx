'use client';

import * as React from 'react';
import {
  ShieldCheck,
  Lock,
  Search,
  Filter,
  Download,
  AlertTriangle,
  FileText,
  Eye,
  KeyRound,
  UserCheck,
  CheckCircle2,
  Calendar,
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
import { INITIAL_AUDIT_LOGS, type AuditLogEntry } from '@/lib/admin/data';

export default function ComplianceAuditPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState<string>('ALL');

  // Selected Log Modal
  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null);

  // Load any runtime audit logs from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('clinic_natin_audit_logs');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs([...parsed, ...INITIAL_AUDIT_LOGS.filter(l => !parsed.some((p: AuditLogEntry) => p.id === l.id))]);
        }
      } catch (e) {
        console.error('Failed to parse audit logs', e);
      }
    }
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceTable.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);

    if (actionFilter === 'ALL') return matchesSearch;
    return matchesSearch && log.action === actionFilter;
  });

  const handleExportComplianceReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['ID,Timestamp,Actor Name,Role,Action,Resource Table,Details,IP Address']
        .concat(
          logs.map(
            (l) =>
              `"${l.id}","${l.timestamp}","${l.actorName}","${l.actorRole}","${l.action}","${l.resourceTable}","${l.details.replace(/"/g, '""')}","${l.ipAddress}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RA10173_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Statutory Certifications */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-700" />
            RA 10173 Data Privacy & Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mandatory National Privacy Commission (NPC) & DOH compliance log tracking every sensitive medical access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportComplianceReport}
            className="h-9 text-xs font-semibold border-slate-300 gap-1.5 bg-white shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Compliance Audit CSV
          </Button>
        </div>
      </div>

      {/* 2. Statutory Legal Shield Information Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
              RA 10173 (DPA 2012)
            </Badge>
            <CardTitle className="text-xs font-bold text-slate-900 mt-1">Non-Deletable Write-Once</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500 leading-normal">
            Append-only audit ledger prevents tampering, unauthorized log truncation, or record tampering by any admin.
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] font-bold bg-blue-50 text-blue-800 border-blue-200">
              DOH Clinical Retention
            </Badge>
            <CardTitle className="text-xs font-bold text-slate-900 mt-1">10-Year Clinical Lock</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500 leading-normal">
            Patient erasure requests anonymize PII while retaining longitudinal clinical vitals for 10 years per health mandates.
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <Badge variant="outline" className="w-fit text-[10px] font-bold bg-purple-50 text-purple-800 border-purple-200">
              Support Impersonation
            </Badge>
            <CardTitle className="text-xs font-bold text-slate-900 mt-1">Ticket-Tied Auditing</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-slate-500 leading-normal">
            Every &quot;Login As&quot; session requires an authorized support ticket reference number and IP-logged verification.
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Action Filter Controls */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search audit trail by actor, IP address, resource, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'VIEWED_MEDICAL_RECORD', label: 'Record Views' },
              { id: 'PRINTED_DIGITAL_RX', label: 'e-Prescriptions' },
              { id: 'CHANGED_PRIORITY_CATEGORY', label: 'Priority / OSCA' },
              { id: 'ADMIN_IMPERSONATION', label: 'Impersonation' },
            ].map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={actionFilter === f.id ? 'brand' : 'outline'}
                onClick={() => setActionFilter(f.id)}
                className="text-xs font-semibold h-8"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Immutable Audit Trail Table */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Actor & System Role</TableHead>
              <TableHead>Sensitive Action</TableHead>
              <TableHead>Target Resource</TableHead>
              <TableHead>Event Narrative</TableHead>
              <TableHead>IP / Network</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{log.actorName}</p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        log.actorRole === 'ADMIN'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : log.actorRole === 'DOCTOR'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : log.actorRole === 'SECRETARY'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {log.actorRole}
                    </Badge>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-bold border-slate-200 bg-slate-50">
                    {log.action}
                  </Badge>
                </TableCell>

                <TableCell className="text-xs font-mono text-slate-600">
                  {log.resourceTable}
                </TableCell>

                <TableCell className="text-xs text-slate-700 max-w-sm">
                  <p className="leading-snug">{log.details}</p>
                </TableCell>

                <TableCell className="text-xs font-mono text-slate-500">
                  {log.ipAddress}
                </TableCell>

                <TableCell className="text-right text-xs font-mono text-slate-500 whitespace-nowrap">
                  {log.timestamp}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
