import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type KButtonVariant = "accent" | "ghost" | "danger" | "icon";
export type KButtonSize = "sm" | "md" | "lg";

/**
 * Accent is the ONLY purple fill in the product. Everything else is a dark
 * surface with a hairline, so a page never reads as a field of purple.
 *
 * Accent text is --on-accent (near-black) on light purple, which clears 4.5:1
 * comfortably; white on this purple would not.
 */
const variants: Record<KButtonVariant, string> = {
  accent:
    "border-transparent bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-strong)]",
  ghost:
    "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)]",
  danger:
    "border-[var(--line)] bg-[var(--danger-tint)] text-[var(--danger-strong)] hover:border-[var(--danger)] hover:bg-[var(--surface-hover)]",
  icon: "border-transparent bg-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
};

const sizes: Record<KButtonSize, string> = {
  sm: "h-7 gap-[var(--space-1)] px-[var(--space-2)] text-[var(--text-xs)]",
  md: "h-8 gap-[var(--space-2)] px-[var(--space-3)] text-[var(--text-sm)]",
  lg: "h-10 gap-[var(--space-2)] px-[var(--space-4)] text-[var(--text-sm)]",
};

/** Square, so an icon sits centered rather than in a pill. */
const iconSizes: Record<KButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export type KButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: KButtonVariant;
  size?: KButtonSize;
  loading?: boolean;
  /** Render a child <Link>/<a> with button styling instead of a <button>. */
  asChild?: boolean;
  children?: ReactNode;
};

export function KButton({
  variant = "ghost",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  className = "",
  children,
  ...props
}: KButtonProps) {
  const Component = asChild ? Slot : "button";
  const shape = variant === "icon" ? iconSizes[size] : sizes[size];

  return (
    <Component
      className={`ui-button inline-flex shrink-0 items-center justify-center border font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${shape} ${className}`}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <KSpinner />}
          {children}
        </>
      )}
    </Component>
  );
}

/** 600ms per turn: a fast spinner reads as a fast app. Sized in em. */
export function KSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70 [animation-duration:600ms] ${className}`}
    />
  );
}
