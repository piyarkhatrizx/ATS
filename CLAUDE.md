# Project

An applicant tracking system for a small recruiting team. Resumes arrive by
forwarded email, get parsed into structured candidate records, and are worked
through a pipeline with notes, status, and calling.

## Stack

Next.js 15 (App Router), TypeScript, Tailwind, Prisma, Postgres, Auth.js,
S3-compatible storage, Twilio Voice, Anthropic API for parsing.

## Rules

- Application status lives on Application, never on Candidate.
- Never delete an original resume file. Parsers improve; re-parse from the stored original.
- Never write unvalidated LLM output to the database. Validate against a Zod schema; on failure mark FAILED and leave for manual entry.
- Every state change writes an Activity row. The activity log is the source of truth for reporting.
- Webhook handlers must be idempotent and return 200 fast. Do work in the background.
- Dedupe on email, then phone. Never on name alone.
- Candidate data is sensitive personal information. No PII in logs, no PII in error messages sent to the client.

## Intake

- `lib/intake.ts` is the only code path that may create a Candidate. Both the
  apply form and the resume parser call `intakeApplication`. Do not create a
  Candidate or Application anywhere else.
- Resume parsing belongs to the email path only. `/apply` submits a structured
  form with no attachment: no Document, no ParseJob, no Anthropic call.
- `Application.source` is an `ApplicationSource` enum. Re-applying never resets
  `status` and never overwrites `source`; it merges `screening` and logs
  `REAPPLIED`.
- `/apply` resolves its requisition by `CAREGIVER_JOB_ALIAS` (default
  `"caregiver"`). Seed it with `npm run seed:caregiver-job`.

## List views

Every list view reads `?source=&status=&sort=&dir=&page=` through
`parseListParams` in `lib/list-params.ts`. Do not read `searchParams` directly
in a page.

- Sort keys are allowlisted per view in `SORT_KEYS`. An unknown key falls back
  to the view's default and is reported in `rejected` — it never reaches Prisma.
- Filtering, sorting and pagination happen in the database. Never fetch a table
  and filter in the component.
- `withParam(query, key, value)` builds links that preserve the other params;
  changing any of them resets `page`.

## A green vitest run does not prove a route loads

Vitest does not use the RSC webpack bundler. `pdf-parse` and `mammoth` were
mangled by that bundler at module load, so `lib/parser.ts` threw on import and
every parse died — while 32 vitest tests stayed green throughout. The fix was
`serverExternalPackages` in `next.config.ts`.

Anything importing a native or CJS-heavy dependency must be exercised through a
running Next server before it is called verified. Unit tests cannot see this
class of failure.

```
npm run dev          # one terminal
npm run check:ingest # another; CHECK_BASE_URL overrides the default origin
```

`scripts/check-ingest.ts` POSTs a real PDF and a real DOCX to
`/api/inbound/postmark` with Basic auth, waits for each ParseJob to reach a
terminal state, asserts the Candidate, Application and Document exist, then
exercises `/api/parse/retry` the same way. Both formats are covered because
pdf-parse and mammoth were mangled independently and either could regress alone.

Nothing in it is mocked, deliberately — mocking S3 or Anthropic would recreate
the false confidence it exists to eliminate. It therefore needs real
`POSTMARK_WEBHOOK_*`, S3 and `ANTHROPIC_API_KEY` values, and reports which are
missing rather than pretending to pass without them.

## Density pass notes

Recorded, not acted on:

- `/applications` renders the three boolean screening columns as `Badge` at
  roughly 110px each, plus an unbadged ~200px Opportunity column — about half of
  the table's 1050px minimum width to carry four yes/no answers. Badges are
  carrying semantic weight disproportionate to the information. Treatment
  decision for the density pass.
- List rows are ~47px, not the ~28px `py-1` implies, because the candidate cell
  stacks name over email. About 12 fit above the fold at an 800px viewport.

## Gotchas that have already cost time

- Non-component exports from a `"use client"` module become client references on
  the server. Constants shared between a client component and a server file go
  in a third neutral module.
- `DATABASE_URL` uses the Supabase **session pooler** (IPv4). `DIRECT_URL` uses
  the direct host, which is IPv6-only and will not resolve from most laptops or
  from CI.
- `revalidatePath` throws outside a request context, and it runs *after* the
  transaction commits. Never let it turn a committed write into a reported
  failure.
- Server actions return a discriminated result. They do not throw for expected
  failures, and a component must not require its caller to translate one into
  the other — that convention gets forgotten exactly once, and a failed write
  then renders as a successful one.
- One agent per working tree. A second agent editing concurrently has already
  caused an orphan branch, an unreviewed commit, and a rename that broke
  callers.

## Testing

Vitest. Every ingest and dedupe change needs a test. Fixtures live in `test/fixtures/`.

Tests in `test/intake/` that touch the database are gated on `DATABASE_URL` and
run against the real dev database; they create their own job with a timestamped
`ingestAlias` and clean up in `afterAll`. `test/intake/list-params.test.ts` is
pure and needs no database.

## Commands

- `npm run dev` - dev server
- `npm run db:push` - push schema
- `npm run db:studio` - Prisma Studio
- `npm test` - tests

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
