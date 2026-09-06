import type { TableHTMLAttributes } from "react";
import type { ReactNode } from "react";

export function Table({ children, className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <div className="overflow-x-auto border border-[var(--line)] bg-[#fbfaf6]"><table className={`w-full text-left text-sm ${className}`} {...props}>{children}</table></div>;
}

export function TableHeader({ children }: { children: ReactNode }) { return <thead className="border-b border-[var(--line)] text-[var(--text-xs)] uppercase tracking-[0.16em] text-[var(--ink-muted)]">{children}</thead>; }
export function TableBody({ children }: { children: ReactNode }) { return <tbody>{children}</tbody>; }
export function TableRow({ children }: { children: ReactNode }) { return <tr className="border-b border-[var(--line)] last:border-0">{children}</tr>; }
export function TableCell({ children, header = false }: { children: ReactNode; header?: boolean }) { const Component = header ? "th" : "td"; return <Component className="px-5 py-4">{children}</Component>; }