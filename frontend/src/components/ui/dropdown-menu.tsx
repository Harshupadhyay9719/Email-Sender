import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <details className="dropdown relative">{children}</details>;
}

export interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLElement, DropdownMenuTriggerProps>(
  ({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "summary";
    return (
      <Comp
        ref={ref}
        className={cn("dropdown-trigger cursor-pointer list-none [&::-webkit-details-marker]:hidden", className)}
        {...props}
      />
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center";
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ align = "start", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "dropdown-content absolute mt-2 w-48 rounded-md border bg-popover text-popover-foreground shadow-md outline-none z-50",
          align === "end" ? "right-0" : "left-0",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ asChild, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as any}
        type={asChild ? undefined : "button"}
        className={cn(
          "dropdown-item flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left",
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("my-1 h-px bg-border", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
