import * as Dialog from "@radix-ui/react-dialog";
import type { PropsWithChildren, ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "./button";
import { cn } from "../../lib/cn";

export function DrawerForm({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
}>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-screen w-full max-w-2xl overflow-y-auto border-l border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:p-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          )}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-extrabold text-[color:var(--dd-text)]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-2 text-sm text-[color:var(--dd-muted)]">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  {title} panel
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded-full border border-[color:var(--dd-border)] p-2 text-[color:var(--dd-muted)]"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  busy = false
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  busy?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-6 shadow-2xl">
          <Dialog.Title className="text-xl font-extrabold text-[color:var(--dd-text)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[color:var(--dd-muted)]">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={busy}>
              Delete
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
