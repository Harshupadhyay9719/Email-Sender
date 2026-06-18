import React from 'react';
import { cn } from '@/lib/utils';

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export const Select: React.FC<SelectProps> = ({ value, onValueChange, className, children, disabled, ...props }) => (
  <select
    value={value}
    onChange={e => onValueChange(e.target.value)}
    className={cn('bg-background border border-input rounded-md p-2', className)}
    disabled={disabled}
    {...props}
  >
    {children}
  </select>
);

export const SelectTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);

export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => (
  placeholder ? <option value="" disabled hidden>{placeholder}</option> : null
);

export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <>{children}</>
);

type SelectItemProps = { value: string; children: React.ReactNode };
export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => (
  <option value={value}>{children}</option>
);
