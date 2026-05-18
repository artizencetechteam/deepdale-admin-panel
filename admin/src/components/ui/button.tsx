import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--dd-bg)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[linear-gradient(135deg,var(--dd-primary),var(--dd-primary-strong))] text-white shadow-[0_18px_35px_-20px_rgba(15,118,110,0.75)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-22px_rgba(15,118,110,0.8)]",
        secondary:
          "border-white/60 bg-white/70 text-[color:var(--dd-text)] shadow-[0_10px_24px_-20px_rgba(31,45,52,0.55)] backdrop-blur-md hover:-translate-y-0.5 hover:bg-white",
        ghost:
          "border-transparent bg-transparent text-[color:var(--dd-muted)] hover:bg-white/60 hover:text-[color:var(--dd-text)]",
        danger:
          "border-transparent bg-[linear-gradient(135deg,#dc2626,#b91c1c)] text-white shadow-[0_18px_35px_-20px_rgba(185,28,28,0.68)] hover:-translate-y-0.5"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({
  children,
  className,
  variant,
  loading,
  disabled,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
