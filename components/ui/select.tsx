import type { SelectHTMLAttributes } from "react";

export function Select({ label, children, className = "", id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const selectId = id ?? props.name;
  return <label className="block text-sm font-medium" htmlFor={selectId}>{label}{props.required && <span className="ml-1 text-[var(--accent-deep)]">*</span>}<select id={selectId} className={`mt-2 block h-11 w-full border border-[var(--line)] bg-[#fbfaf6] px-3 text-sm font-normal focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)] ${className}`} {...props}>{children}</select></label>;
}