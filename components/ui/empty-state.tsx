import { Button } from "./button";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { label: string; onClick?: () => void } }) {
  return <div className="border border-dashed border-[var(--line)] px-6 py-14 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center border border-[var(--line)] bg-[#eeece5] text-sm text-[var(--ink-muted)]">—</div><h2 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--ink-muted)]">{description}</p>{action && <Button className="mt-6" variant="outline" onClick={action.onClick}>{action.label}</Button>}</div>;
}