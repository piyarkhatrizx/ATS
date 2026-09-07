import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[var(--accent-deep)] text-[var(--on-accent)] hover:bg-[var(--accent-strong)]",
  secondary:
    "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]",
  ghost:
    "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
  destructive:
    "border-transparent bg-[var(--danger)] text-[var(--on-accent)] hover:bg-[var(--danger-strong)]",
};

// Dense tool: md is 32px, not the 40px a marketing site would use.
const sizes: Record<ButtonSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-[var(--text-xs)]",
  md: "h-8 gap-2 px-3 text-[var(--text-sm)]",
  lg: "h-10 gap-2 px-4 text-[var(--text-sm)]",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /**
   * Render the child element (a <Link> or <a>) with button styling instead of
   * a <button>. Without this, pages copy-paste the class string onto anchors
   * and the two drift apart.
   */
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={`ui-button inline-flex shrink-0 items-center justify-center border font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner />}
          {children}
        </>
      )}
    </Component>
  );
}

/**
 * A fast spinner reads as a fast app. 600ms per turn, not the 1s default.
 * Sized in em so it tracks the button's own text size.
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70 [animation-duration:600ms] ${className}`}
    />
  );
}
