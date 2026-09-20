'use client';

import type { HTMLAttributes } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: 'bg-brand-50 text-brand-700', icon: Info },
  success: { wrap: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  warning: { wrap: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
  danger: { wrap: 'bg-red-50 text-red-700', icon: XCircle },
};

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

export function Alert({ className, tone = 'info', children, ...props }: AlertProps) {
  const { wrap, icon: Icon } = tones[tone];
  return (
    <div
      role="status"
      className={cn('flex items-start gap-2 rounded-md px-3 py-2.5 text-sm', wrap, className)}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
