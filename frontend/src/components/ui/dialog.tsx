import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface DialogProps extends React.ComponentPropsWithoutRef<'dialog'> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const Dialog = React.forwardRef<HTMLDialogElement, DialogProps>(
  ({ open, onOpenChange, className, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(!!open);

    React.useEffect(() => {
      setIsOpen(!!open);
    }, [open]);

    const handleOpenChange = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
      const dlg = e.currentTarget;
      const newOpen = dlg.open;
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
    };

    return (
      <dialog
        ref={ref}
        open={isOpen}
        onClose={handleOpenChange}
        className={cn(
          "rounded-lg border bg-popover text-popover-foreground shadow-lg transition-all",
          className
        )}
        {...props}
      >
        {children}
      </dialog>
    );
  }
);
Dialog.displayName = "Dialog";

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { className?: string }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6", className)}
    {...props}
  />
));
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
);
DialogTitle.displayName = "DialogTitle";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, className, ...props }, ref) => {
  const Component = asChild ? Slot : "button";
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const dlg = (e.currentTarget as HTMLElement).closest('dialog');
    if (dlg) dlg.close();
    if (props.onClick) props.onClick(e);
  };
  return (
    <Component
      ref={ref as any}
      type={asChild ? undefined : "button"}
      className={cn(
        "mt-2 rounded-md px-4 py-2 text-sm font-medium",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
      onClick={handleClick}
      {...props}
    />
  );
});
DialogClose.displayName = "DialogClose";
