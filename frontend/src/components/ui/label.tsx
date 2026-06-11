import React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({ htmlFor, className, children, ...props }) => (
  <label
    htmlFor={htmlFor}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  >
    {children}
  </label>
);
