"use client";

import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Radix DropdownMenu: roving focus, type-ahead, Escape, arrow keys, correct
 * aria roles and focus restore on close. All the behaviour a hand-rolled menu
 * gets wrong on day two. Motion is in globals.css (.ui-menu), origin-aware so
 * the menu scales out of its trigger rather than its own center.
 */
export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;
export const DropdownMenuGroup = RadixMenu.Group;

const contentClass =
  "ui-menu z-50 min-w-44 border border-[var(--line)] bg-[var(--surface)] p-1 text-[var(--text-sm)] shadow-[var(--shadow-panel)]";

const itemClass =
  "flex cursor-default select-none items-center gap-2 px-2 py-1 outline-none data-[highlighted]:bg-[var(--surface-hover)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export function DropdownMenuContent({
  children,
  className = "",
  sideOffset = 4,
  align = "start",
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={sideOffset}
        align={align}
        className={`${contentClass} ${className}`}
        {...props}
      >
        {children}
      </RadixMenu.Content>
    </RadixMenu.Portal>
  );
}

export function DropdownMenuItem({
  children,
  destructive = false,
  className = "",
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.Item> & { destructive?: boolean }) {
  return (
    <RadixMenu.Item
      className={`${itemClass} ${
        destructive
          ? "text-[var(--danger)] data-[highlighted]:bg-[var(--danger-tint)]"
          : "text-[var(--foreground)]"
      } ${className}`}
      {...props}
    >
      {children}
    </RadixMenu.Item>
  );
}

export function DropdownMenuCheckboxItem({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.CheckboxItem>) {
  return (
    <RadixMenu.CheckboxItem className={`${itemClass} ${className}`} {...props}>
      <span aria-hidden="true" className="w-3 shrink-0 text-[var(--accent-deep)]">
        <RadixMenu.ItemIndicator>✓</RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.CheckboxItem>
  );
}

export function DropdownMenuRadioGroup({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.RadioGroup>) {
  return <RadixMenu.RadioGroup {...props}>{children}</RadixMenu.RadioGroup>;
}

export function DropdownMenuRadioItem({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.RadioItem>) {
  return (
    <RadixMenu.RadioItem className={`${itemClass} ${className}`} {...props}>
      <span aria-hidden="true" className="w-3 shrink-0 text-[var(--accent-deep)]">
        <RadixMenu.ItemIndicator>✓</RadixMenu.ItemIndicator>
      </span>
      {children}
    </RadixMenu.RadioItem>
  );
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <RadixMenu.Label className="px-2 py-1 text-[var(--text-xs)] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
      {children}
    </RadixMenu.Label>
  );
}

export function DropdownMenuSeparator() {
  return <RadixMenu.Separator className="my-1 h-px bg-[var(--line)]" />;
}

/** Right-aligned keyboard hint, so shortcuts are discoverable from the menu. */
export function DropdownMenuShortcut({ children }: { children: ReactNode }) {
  return (
    <span className="ml-auto pl-4 font-[family-name:var(--font-mono-ui)] text-[var(--text-xs)] text-[var(--ink-muted)]">
      {children}
    </span>
  );
}
