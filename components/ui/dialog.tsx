"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function Dialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  return <dialog ref={ref} className="ui-dialog m-auto w-[min(92vw,32rem)] border border-[var(--line)] bg-[#fbfaf6] p-0 text-[var(--foreground)] shadow-[var(--shadow-dialog)]" onCancel={() => onOpenChange(false)} onClose={() => onOpenChange(false)} onClick={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}><div className="p-6 sm:p-8"><div className="flex items-start justify-between gap-5"><div><h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{description}</p>}</div><button type="button" aria-label="Close dialog" className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--foreground)]" onClick={() => onOpenChange(false)}>×</button></div><div className="mt-6">{children}</div></div></dialog>;
}