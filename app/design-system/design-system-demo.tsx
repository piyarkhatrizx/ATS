"use client";

import { useState } from "react";
import {
  GlassCard,
  GlassCardHeader,
  KButton,
  KEmptyState,
  KTableHead,
  KTableRow,
  SidePanel,
  SidePanelField,
  SidePanelSection,
  StatCard,
  StatGrid,
  StatusDot,
  StatusPill,
  STATUS_COLOR_TOKENS,
} from "@/components/korosha";

/**
 * The Korosha reference. Everything the rest of the build should reach for.
 * If a page needs something that is not here, add it here first.
 */

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-[var(--text-lg)] font-semibold tracking-[-0.02em]">{title}</h2>
      {note && <p className="mt-1 max-w-2xl text-[var(--text-sm)] text-[var(--ink-muted)]">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const SAMPLE_LEADS = [
  { id: "1", name: "Marguerite Delacroix-Whitfield", source: "Apply page", color: "--status-open", status: "New", age: "4m ago" },
  { id: "2", name: "Bo Ng", source: "Apply page", color: "--status-active", status: "Screening", age: "2h ago" },
  { id: "3", name: "Thaddeus Okonjo-Iwuchukwu", source: "Referral", color: "--status-accepted", status: "Accepted", age: "1d ago" },
  { id: "4", name: "Ana Cruz", source: "Apply page", color: "--status-rejected", status: "Rejected", age: "3d ago", muted: true },
];

export function DesignSystemDemo() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-10">
        <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Korosha
        </p>
        <h1 className="mt-2 font-display text-[var(--text-2xl)] font-semibold tracking-[-0.03em]">
          Design system
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--text-sm)] text-[var(--ink-muted)]">
          Dark glassmorphism. Panels are dark; purple appears only in the ambient glow, borders,
          focus rings and primary buttons. Every color here comes from styles/tokens.css.
        </p>
      </header>

      <Section
        title="Glass card"
        note="One blur layer per element. An inner region uses a flat surface rather than a second blur."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <GlassCard>
            <GlassCardHeader title="Standard panel" description="Blurred over the ambient glow." />
            <p className="text-[var(--text-sm)] text-[var(--ink-muted)]">
              Body text always sits on this dark surface, never directly on a glow.
            </p>
          </GlassCard>
          <GlassCard>
            <GlassCardHeader
              title="With actions"
              description="Header actions sit right."
              actions={<KButton size="sm">Edit</KButton>}
            />
            <GlassCard flat padded className="mt-1">
              <p className="text-[var(--text-sm)] text-[var(--ink-muted)]">
                Nested region: flat, so the blur is not stacked.
              </p>
            </GlassCard>
          </GlassCard>
        </div>
      </Section>

      <Section title="Buttons" note="Accent is the only purple fill in the product.">
        <div className="flex flex-wrap items-center gap-2">
          <KButton variant="accent">Call lead</KButton>
          <KButton variant="ghost">Add note</KButton>
          <KButton variant="danger">Reject</KButton>
          <KButton variant="icon" aria-label="More actions">⋯</KButton>
          <KButton variant="accent" loading>Saving</KButton>
          <KButton variant="ghost" disabled>Disabled</KButton>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <KButton size="sm">Small</KButton>
          <KButton size="md">Medium</KButton>
          <KButton size="lg">Large</KButton>
        </div>
      </Section>

      <Section
        title="Status pill"
        note="Colors are token names stored on the Status row, never raw hex, so a recruiter cannot create a status that fails contrast."
      >
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_COLOR_TOKENS.map((token) => (
            <StatusPill key={token} color={token} label={token.replace("--status-", "")} />
          ))}
          <StatusPill color="--not-a-real-token" label="unknown → neutral" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-[var(--text-sm)] text-[var(--ink-muted)]">
            <StatusDot color="--status-accepted" /> dot variant
          </span>
        </div>
      </Section>

      <Section title="Stat card" note="The headline metric takes an accent rule, not a purple fill.">
        <StatGrid>
          <StatCard label="Applications" value="32" hint="Last 7 days" />
          <StatCard label="Calls" value="18" hint="Last 7 days" />
          <StatCard label="Accepted" value="6" hint="Derived from counts_as" />
          <StatCard label="Median to first call" value="14m" hint="Headline metric" emphasis />
        </StatGrid>
      </Section>

      <Section title="Table row" note="Row click opens the side panel. Never a page navigation.">
        <GlassCard padded={false} className="overflow-hidden">
          <KTableHead>
            <span className="flex-1">Lead</span>
            <span className="w-28">Source</span>
            <span className="w-28">Status</span>
            <span className="w-20 text-right">Applied</span>
          </KTableHead>
          {SAMPLE_LEADS.map((lead) => (
            <KTableRow
              key={lead.id}
              selected={selected === lead.id}
              muted={lead.muted}
              onOpen={() => {
                setSelected(lead.id);
                setPanelOpen(true);
              }}
            >
              <span className="min-w-0 flex-1 truncate text-[var(--text-sm)] font-medium">
                {lead.name}
              </span>
              <span className="w-28 text-[var(--text-sm)] text-[var(--ink-muted)]">{lead.source}</span>
              <span className="w-28">
                <StatusPill color={lead.color} label={lead.status} />
              </span>
              <span className="w-20 text-right font-mono text-[var(--text-xs)] text-[var(--ink-muted)]">
                {lead.age}
              </span>
            </KTableRow>
          ))}
        </GlassCard>
      </Section>

      <Section title="Empty state">
        <div className="grid gap-4 sm:grid-cols-2">
          <KEmptyState
            title="No leads yet"
            description="Submissions from the apply page land here the moment they arrive."
            action={{ label: "Open apply page", href: "/apply" }}
          />
          <KEmptyState compact title="Nothing in this view" description="Try clearing the filters." />
        </div>
      </Section>

      <Section title="Side panel" note="Opaque, not glass: it sits above a scrolling list.">
        <KButton variant="accent" onClick={() => setPanelOpen(true)}>
          Open side panel
        </KButton>
      </Section>

      <SidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        eyebrow="Lead"
        title={SAMPLE_LEADS.find((lead) => lead.id === selected)?.name ?? "Marguerite Delacroix-Whitfield"}
        description="Applied 4 minutes ago via the apply page"
        actions={
          <>
            <KButton variant="accent" size="sm">Call</KButton>
            <KButton size="sm">Note</KButton>
            <KButton variant="icon" size="sm" aria-label="More">⋯</KButton>
          </>
        }
      >
        <SidePanelSection title="Contact">
          <dl>
            <SidePanelField label="Phone">(216) 555-0142</SidePanelField>
            <SidePanelField label="Email">marguerite.delacroix@example.com</SidePanelField>
            <SidePanelField label="Location">Cleveland, OH</SidePanelField>
          </dl>
        </SidePanelSection>
        <SidePanelSection title="Application">
          <dl>
            <SidePanelField label="18 or older">Yes</SidePanelField>
            <SidePanelField label="Medicaid patient">No</SidePanelField>
          </dl>
        </SidePanelSection>
      </SidePanel>
    </div>
  );
}

export default DesignSystemDemo;
