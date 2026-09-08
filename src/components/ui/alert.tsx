import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-xl border p-4 text-xs [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4',
  {
    variants: {
      variant: {
        default: 'bg-white border-slate-200 text-slate-900 [&>svg]:text-slate-600',
        destructive:
          'border-rose-200 bg-rose-50/90 text-rose-900 [&>svg]:text-rose-600',
        success:
          'border-emerald-200 bg-emerald-50/90 text-emerald-900 [&>svg]:text-emerald-600',
        warning:
          'border-amber-200 bg-amber-50/90 text-amber-900 [&>svg]:text-amber-600',
        brand:
          'border-brand-200 bg-brand-50/90 text-brand-900 [&>svg]:text-brand-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-bold leading-none tracking-tight text-slate-900', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs [&_p]:leading-relaxed text-slate-600', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
