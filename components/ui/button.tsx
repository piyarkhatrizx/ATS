import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "solid" | "quiet" | "outline" | "danger";

export function Button({
  variant = "solid",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  const variants: Record<ButtonVariant, string> = {
    solid: "border-transparent bg-[var(--accent-deep)] text-white hover:bg-[#7d3d27]",
    quiet: "border-transparent bg-transparent text-[var(--foreground)] hover:bg-[#e9e6dd]",
    outline: "border-[var(--line)] bg-transparent text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]",
    danger: "border-transparent bg-[#a64943] text-white hover:bg-[#883936]",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-sm" };
  return <button className={`ui-button inline-flex items-center justify-center border font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}