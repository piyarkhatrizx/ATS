"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { APPLICATION_STATUSES, statusLabel, statusTone } from "@/lib/application-status";
import { Avatar, AvatarGroup, AvatarWithLabel } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { SlideOver } from "@/components/ui/slide-over";
import { StatusSelect } from "@/components/ui/status-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableLoadingRow,
  TableMessageRow,
  TableRow,
  TableSortHeader,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

/* ------------------------------------------------------------------ layout */

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-[var(--line)] pt-6">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[var(--text-lg)] font-semibold tracking-[-0.02em]">{title}</h2>
        {note && <p className="text-[var(--text-sm)] text-[var(--ink-muted)]">{note}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] py-2 last:border-0">
      <span className="w-32 shrink-0 text-[var(--text-xs)] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------- data */

type DemoCandidate = {
  id: string;
  name: string;
  role: string;
  city: string;
  status: ApplicationStatus;
  applied: string;
};

const FIRST = ["Ada", "Bea", "Cruz", "Dara", "Eli", "Faye", "Gus", "Hana", "Ivo", "Jae"];
const LAST = ["Nguyen", "Okafor", "Rivera", "Sato", "Kaur", "Mbeki", "Silva", "Novak"];
const ROLES = ["Home health aide", "CNA", "Companion caregiver", "Live-in caregiver"];
const CITIES = ["Austin, TX", "Reno, NV", "Akron, OH", "Tampa, FL", "Boise, ID"];

const CANDIDATES: DemoCandidate[] = Array.from({ length: 25 }, (_, index) => ({
  id: `c${index}`,
  name: `${FIRST[index % FIRST.length]} ${LAST[index % LAST.length]}`,
  role: ROLES[index % ROLES.length],
  city: CITIES[index % CITIES.length],
  status: APPLICATION_STATUSES[index % APPLICATION_STATUSES.length],
  applied: `Mar ${(index % 28) + 1}`,
}));

/* -------------------------------------------------------------------- page */

export default function DesignSystemDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [stage, setStage] = useState<ApplicationStatus>("SCREENING");
  const [sortDesc, setSortDesc] = useState(false);
  const [opened, setOpened] = useState<DemoCandidate | null>(null);

  const columns = useMemo<ColumnDef<DemoCandidate>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Candidate",
        cell: ({ row }) => (
          <AvatarWithLabel name={row.original.name} size="sm">
            <span className="font-medium">{row.original.name}</span>
          </AvatarWithLabel>
        ),
      },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "city", header: "Location" },
      {
        accessorKey: "status",
        header: "Stage",
        cell: ({ row }) => (
          <Badge tone={statusTone[row.original.status]}>{statusLabel[row.original.status]}</Badge>
        ),
      },
      { accessorKey: "applied", header: "Applied", enableSorting: false },
    ],
    [],
  );

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          eyebrow="Northstar ATS"
          title="Component reference"
          subtitle="Every component in every state. Density first: this is a tool a recruiter keeps open all day, not a landing page."
        />

        <Section id="buttons" title="Button" note="4 variants · 3 sizes · disabled · loading">
          <Row label="Primary">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Saving</Button>
          </Row>
          <Row label="Secondary">
            <Button variant="secondary" size="sm">
              Small
            </Button>
            <Button variant="secondary">Medium</Button>
            <Button variant="secondary" size="lg">
              Large
            </Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
            <Button variant="secondary" loading>
              Loading
            </Button>
          </Row>
          <Row label="Ghost">
            <Button variant="ghost" size="sm">
              Small
            </Button>
            <Button variant="ghost">Medium</Button>
            <Button variant="ghost" size="lg">
              Large
            </Button>
            <Button variant="ghost" disabled>
              Disabled
            </Button>
            <Button variant="ghost" loading>
              Loading
            </Button>
          </Row>
          <Row label="Destructive">
            <Button variant="destructive" size="sm">
              Reject
            </Button>
            <Button variant="destructive">Reject</Button>
            <Button variant="destructive" size="lg">
              Reject
            </Button>
            <Button variant="destructive" disabled>
              Disabled
            </Button>
            <Button variant="destructive" loading>
              Rejecting
            </Button>
          </Row>
        </Section>

        <Section id="inputs" title="Input & Select" note="label · hint · error · required · disabled">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input name="ds-name" label="Full name" placeholder="Ada Nguyen" />
            <Input name="ds-email" label="Email" hint="Used for dedupe before phone." />
            <Input name="ds-phone" label="Phone" error="Enter a 10-digit number." defaultValue="55" />
            <Input name="ds-req" label="Job" required placeholder="Required field" />
            <Input name="ds-off" label="Source" disabled defaultValue="Email forward" />
            <Input name="ds-search" label="Search" type="search" placeholder="Filter candidates" />
            <Select name="ds-stage" label="Stage" defaultValue="SCREENING">
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status]}
                </option>
              ))}
            </Select>
            <Select name="ds-owner" label="Owner" required hint="Who runs the screen.">
              <option>Unassigned</option>
              <option>Priya</option>
            </Select>
            <Select name="ds-locked" label="Job" disabled>
              <option>Home health aide</option>
            </Select>
            <Select name="ds-bad" label="Result" error="Pick an outcome.">
              <option value="">Select…</option>
              <option>Advance</option>
            </Select>
          </div>
        </Section>

        <Section id="badges" title="Badge" note="every tone derives from a --status-* token">
          <Row label="Pipeline">
            {APPLICATION_STATUSES.map((status) => (
              <Badge key={status} tone={statusTone[status]}>
                {statusLabel[status]}
              </Badge>
            ))}
          </Row>
          <Row label="Generic">
            <Badge>Neutral</Badge>
            <Badge tone="success">Complete</Badge>
            <Badge tone="warning">Pending</Badge>
          </Row>
        </Section>

        <Section id="avatar" title="Avatar" note="initials fallback · image · three sizes · stacked">
          <Row label="Fallback">
            <Avatar name="Ada Nguyen" size="sm" />
            <Avatar name="Ada Nguyen" size="md" />
            <Avatar name="Ada Nguyen" size="lg" />
            <Avatar name="" size="md" />
          </Row>
          <Row label="Image">
            <Avatar name="Bea Okafor" size="sm" src="/favicon.ico" />
            <Avatar name="Bea Okafor" size="md" src="/favicon.ico" />
            <Avatar name="Bea Okafor" size="lg" src="/favicon.ico" />
          </Row>
          <Row label="Group">
            <AvatarGroup size="sm" people={CANDIDATES.slice(0, 3)} />
            <AvatarGroup size="md" people={CANDIDATES.slice(0, 7)} />
            <AvatarWithLabel name="Cruz Rivera">Cruz Rivera · screening</AvatarWithLabel>
          </Row>
        </Section>

        <Section
          id="status-select"
          title="StatusSelect"
          note="moves an Application across the eight stages, optimistically"
        >
          <Row label="Interactive">
            <StatusSelect
              value={stage}
              onChange={async (next) => {
                setStage(next);
                toast.success(`Moved to ${statusLabel[next]}`);
              }}
            />
            <StatusSelect value="HIRED" disabled />
          </Row>
        </Section>

        <Section
          id="data-table"
          title="Table"
          note="25 rows on screen · sticky header · j/k to move, Enter to open, x to select"
        >
          <DataTable
            data={CANDIDATES}
            columns={columns}
            getRowId={(row) => row.id}
            onRowActivate={setOpened}
            caption="Demo candidate list"
          />
          <p className="mt-2 text-[var(--text-sm)] text-[var(--ink-muted)]">
            Last opened: {opened ? opened.name : "—"}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[var(--text-xs)] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Primitives: sort, hover, selected, active
              </p>
              <Table>
                <TableHeader>
                  <tr>
                    <TableSortHeader
                      sorted={sortDesc ? "desc" : "asc"}
                      onSort={() => setSortDesc((value) => !value)}
                    >
                      Candidate
                    </TableSortHeader>
                    <TableCell header>Stage</TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Default row</TableCell>
                    <TableCell>
                      <Badge tone="new">New</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow selected>
                    <TableCell>Selected row</TableCell>
                    <TableCell>
                      <Badge tone="interview">Interview</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow active tabIndex={0}>
                    <TableCell>Keyboard cursor row</TableCell>
                    <TableCell>
                      <Badge tone="offer">Offer</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <p className="mb-2 text-[var(--text-xs)] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Loading and empty
              </p>
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell header>Candidate</TableCell>
                    <TableCell header>Stage</TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  <TableLoadingRow colSpan={2} />
                  <TableMessageRow colSpan={2}>
                    <EmptyState
                      size="compact"
                      title="No candidates in this stage"
                      description="Move someone here from the pipeline board."
                    />
                  </TableMessageRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </Section>

        <Section id="empty" title="EmptyState" note="default and compact">
          <div className="grid gap-4 lg:grid-cols-2">
            <EmptyState
              title="No applications yet"
              description="Forward a resume to intake@northstar.example and it will land here within a minute."
              action={{ label: "Copy intake address", onClick: () => toast("Address copied") }}
              secondaryAction={{ label: "Add manually", onClick: () => setDialogOpen(true) }}
            />
            <EmptyState size="compact" title="No notes" description="Notes you write appear here." />
          </div>
        </Section>

        <Section id="overlays" title="Dialog, SlideOver, DropdownMenu, Toast">
          <Row label="Overlays">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setPanelOpen(true)}>
              Open slide-over
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Row actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Candidate</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => toast("Opened resume")}>
                  Open resume
                  <DropdownMenuShortcut>↵</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("Note started")}>
                  Add note
                  <DropdownMenuShortcut>N</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => toast.error("Candidate rejected")}>
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Row>
          <Row label="Toast">
            <Button variant="ghost" onClick={() => toast("Saved")}>
              Default
            </Button>
            <Button variant="ghost" onClick={() => toast.success("Moved to Interview")}>
              Success
            </Button>
            <Button variant="ghost" onClick={() => toast.error("Could not reach Twilio")}>
              Error
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast("Candidate rejected", {
                  action: { label: "Undo", onClick: () => toast.success("Restored") },
                })
              }
            >
              With undo
            </Button>
          </Row>
        </Section>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Add candidate manually"
          description="Use this when a resume arrives outside the intake inbox."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  toast.success("Candidate added");
                }}
              >
                Add candidate
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="dlg-first" label="First name" required />
            <Input name="dlg-last" label="Last name" required />
            <Input name="dlg-email" label="Email" hint="Dedupe runs on email first." />
            <Input name="dlg-phone" label="Phone" />
          </div>
        </Dialog>

        <SlideOver
          open={panelOpen}
          onOpenChange={setPanelOpen}
          eyebrow="Application"
          title="Ada Nguyen"
          description="Home health aide · Austin, TX"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPanelOpen(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={() => toast.error("Candidate rejected")}>
                Reject
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-[var(--text-sm)]">
            <StatusSelect value={stage} onChange={async (next) => setStage(next)} />
            <p className="leading-relaxed text-[var(--ink-muted)]">
              The panel enters from the right edge and leaves along the same path, so the resume
              always returns to where it came from.
            </p>
            <Input name="panel-note" label="Note" placeholder="What did you learn on the call?" />
          </div>
        </SlideOver>
      </div>
    </main>
  );
}
