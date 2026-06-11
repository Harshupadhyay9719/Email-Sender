import React from 'react';
import { cn } from '@/lib/utils';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({ className, ...props }) => (
  <div
    role="separator"
    className={cn('my-2 h-px bg-border', className)}
    {...props}
  />
);
