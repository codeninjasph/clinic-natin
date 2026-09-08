'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'brand' | 'default';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md bg-white border border-slate-200">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                variant === 'destructive'
                  ? 'bg-rose-100 text-rose-600'
                  : variant === 'brand'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-blue-100 text-blue-600'
              )}
            >
              {variant === 'destructive' ? (
                <Trash2 className="h-5 w-5" />
              ) : variant === 'brand' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <AlertDialogTitle className="text-base font-bold text-slate-900">{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-xs text-slate-600 mt-2 leading-relaxed pl-13">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
          <AlertDialogCancel disabled={isLoading} className="text-xs">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'text-xs font-bold gap-1.5',
              variant === 'destructive'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-brand-700 hover:bg-brand-800 text-white'
            )}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
