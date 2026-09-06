import type { InputHTMLAttributes } from "react";

export function Input({ label, hint, error, className = "", id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  const inputId = id ?? props.name;
  return <label className="block text-sm font-medium" htmlFor={inputId}>{label}{props.required && <span className="ml-1 text-[var(--accent-deep)]">*</span>}<input id={inputId} className={`mt-2 block h-11 w-full border bg-transparent px-3 text-sm font-normal transition-colors placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)] ${error ? "border-[#a64943]" : "border-[var(--line)]"} ${className}`} {...props} />{error ? <span className="mt-1 block text-xs font-normal text-[#a64943]">{error}</span> : hint ? <span className="mt-1 block text-xs font-normal text-[var(--ink-muted)]">{hint}</span> : null}</label>;
}