import * as Dialog from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { X } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "../../lib/cn";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetPortal = Dialog.Portal;

export const SheetOverlay = forwardRef<
  ElementRef<typeof Dialog.Overlay>,
  ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <Dialog.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-40 bg-slate-950/34 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
});

export const SheetContent = forwardRef<
  ElementRef<typeof Dialog.Content>,
  ComponentPropsWithoutRef<typeof Dialog.Content> & {
    side?: "left" | "right";
  }
>(function SheetContent(
  { className, children, side = "right", ...props },
  ref
) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 z-50 w-[min(20rem,calc(100vw-0.75rem))] p-3 lg:hidden",
          side === "left" ? "left-0" : "right-0",
          className
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </SheetPortal>
  );
});

export const SheetTitle = Dialog.Title;
export const SheetDescription = Dialog.Description;

export function SheetCloseButton({
  className,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  return (
    <SheetClose asChild>
      <button
        type="button"
        aria-label="Close panel"
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/18 bg-white/10 text-white transition hover:bg-white/20",
          className
        )}
        {...props}
      >
        <X className="h-4 w-4" />
      </button>
    </SheetClose>
  );
}
