"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";

const NAV = [
  { href: "/", label: "Jobs", glyph: "J" },
  { href: "/candidates", label: "Candidates", glyph: "C" },
  { href: "/applications", label: "Applications", glyph: "A" },
  { href: "/design-system", label: "Design system", glyph: "D" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Persistent chrome. `initialCollapsed` comes from a cookie read in the server
 * layout, so the correct width is in the first HTML response — no flash, and
 * the state survives a hard reload, which a useState in here would not.
 *
 * The public /apply page is not part of the recruiting desk, so the shell
 * removes itself there.
 */
export function AppSidebar({ initialCollapsed }: { initialCollapsed: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  if (pathname === "/apply") return null;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <nav
      aria-label="Main"
      data-collapsed={collapsed || undefined}
      className={`sticky top-0 flex h-dvh shrink-0 flex-col gap-[var(--space-1)] border-r border-[var(--line)] bg-[var(--surface-sidebar)] p-[var(--space-2)] ${
        collapsed ? "w-12" : "w-44"
      }`}
    >
      <div className="flex items-center justify-between px-[var(--space-1)] pb-[var(--space-2)]">
        {!collapsed && (
          <span className="truncate text-[length:var(--text-sm)] font-semibold tracking-[-0.01em] text-[var(--foreground)]">
            Korosha
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ui-button flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
        </button>
      </div>

      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={`flex h-7 items-center gap-[var(--space-2)] rounded-[4px] px-[var(--space-1)] text-[length:var(--text-sm)] ${
              active
                ? "bg-[var(--surface-selected)] font-medium text-[var(--foreground)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center text-[length:var(--text-2xs)] font-semibold text-[var(--ink-faint)]"
            >
              {item.glyph}
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
