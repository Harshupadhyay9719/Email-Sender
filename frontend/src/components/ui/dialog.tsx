import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const DialogContext = React.createContext<{ onClose: () => void } | null>(null);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const onClose = React.useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  // Handle escape key to close
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Lock scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <DialogContext.Provider value={{ onClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
          onClick={onClose}
        />
        {/* Dialog content frame */}
        {children}
      </div>
    </DialogContext.Provider>,
    document.body
  );
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { className?: string }
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(DialogContext);
  return (
    <div
      ref={ref}
      className={cn(
        "relative z-10 w-full transform overflow-hidden rounded-xl border bg-background p-6 shadow-2xl transition-all animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
      {...props}
    >
      {/* Top right close button */}
      <button 
        onClick={ctx?.onClose}
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <span className="sr-only">Close</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      {children}
    </div>
  );
});
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
);
DialogTitle.displayName = "DialogTitle";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 gap-2 sm:gap-0", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, className, onClick, ...props }, ref) => {
  const ctx = React.useContext(DialogContext);
  const Component = asChild ? Slot : "button";
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    ctx?.onClose();
    if (onClick) onClick(e);
  };
  
  return (
    <Component
      ref={ref as any}
      type={asChild ? undefined : "button"}
      className={cn(
        "mt-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onClick={handleClick}
      {...props}
    />
  );
});
DialogClose.displayName = "DialogClose";
