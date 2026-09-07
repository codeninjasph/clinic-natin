'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  DigitalHealthPassportCard, 
  DigitalHealthPassportData 
} from '@/components/patient/DigitalHealthPassportCard';

interface DigitalHealthPassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DigitalHealthPassportData;
  onEdit?: () => void;
}

export function DigitalHealthPassportDialog({
  open,
  onOpenChange,
  data,
  onEdit,
}: DigitalHealthPassportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 max-h-[92vh] overflow-y-auto rounded-3xl border-slate-200">
        <DialogHeader className="text-center sm:text-left pb-1">
          <DialogTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Official Digital Health Passport</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Present this scannable verified pass at clinic reception or kiosk for rapid 1-second check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <DigitalHealthPassportCard
            data={data}
            onEdit={onEdit}
            showPrintButton={true}
            showEditButton={Boolean(onEdit)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
