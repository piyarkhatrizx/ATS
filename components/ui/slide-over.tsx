"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function SlideOver({ open, onOpenChange, title, eyebrow, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; eyebrow?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  return <dialog ref={ref} className="ui-dialog m-0 ml-auto h-dvh max-h-none w-[min(94vw,32rem)] border-y-0 border-r-0 border-l border-[var(--line)] bg-[#fbfaf6] p-0 text-[var(--foreground)] shadow-[var(--shadow-dialog)]" onCancel={() => onOpenChange(false)} onClose={() => onOpenChange(false)} onClick={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}><div className="ui-slide-over flex h-full flex-col"><header className="flex items-start justify-between border-b border-[var(--line)] p-6"><div>{eyebrow && <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--accent-deep)]">{eyebrow}</p>}<h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{title}</h2></div><button type="button" aria-label="Close panel" className="text-xl leading-none text-[var(--ink-muted)] hover:text-[var(--foreground)]" onClick={() => onOpenChange(false)}>×</button></header><div className="flex-1 overflow-y-auto p-6">{children}</div></div></dialog>;
}