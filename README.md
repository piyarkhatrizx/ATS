# Northstar ATS

An applicant tracking system for a small recruiting team. Resumes arrive by
forwarded email, are stored as originals, parsed into structured candidate
records, and moved through job-specific application pipelines.

## Current Status

**Phase 1: ingest, parse, and candidate list is complete.**

The project is a Next.js 15 App Router application using TypeScript, Tailwind,
Prisma, PostgreSQL/Supabase, Auth.js, S3-compatible storage, Anthropic, and
Vitest.

## Current Capabilities

- Supabase/PostgreSQL connection through Prisma.
- `/api/health` database health check.
- Job dashboard at `/`.
- Job application list at `/jobs/[id]`.
- Candidate detail page at `/candidates/[id]`.
- Postmark inbound webhook at `/api/inbound/postmark`.
- Basic-auth webhook verification and MessageID idempotency.
- Plus-address routing and unrouted-email persistence.
- Gmail forwarding verification-code capture.
- PDF, DOCX, and legacy DOC attachment detection and text extraction.
- Original resume upload to S3-compatible storage.
- Durable parse-job records.
- Anthropic structured parsing with Zod validation and one retry.
- Email-first, phone-second candidate deduplication.
- Application status stored on `Application`, not `Candidate`.
- Activity records for parsed applications.
- Unit, webhook, and Supabase-backed integration tests.

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Set `DATABASE_URL`, `AUTH_SECRET`, S3 credentials, Postmark webhook
credentials, and `ANTHROPIC_API_KEY` in `.env`. Open
<http://localhost:3000> and check <http://localhost:3000/api/health>.

## Testing

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

The integration test loads `.env`, uses the configured PostgreSQL database,
and mocks S3, PDF extraction, and Anthropic:

```bash
npm test -- --run test/inbound.integration.test.ts
```

To manually post the saved fixture, create a job with ingest alias `eng-042`
using `npm run db:studio`, then run:

```bash
curl -X POST http://localhost:3000/api/inbound/postmark \
  -u "$POSTMARK_WEBHOOK_USERNAME:$POSTMARK_WEBHOOK_PASSWORD" \
  -H "Content-Type: application/json" \
  --data-binary @test/fixtures/postmark-resume.json
```

## Remaining Work

1. Add a real background queue or scheduler that calls `processParseJob`.
2. Add job creation and management UI.
3. Add parsed-field editing and human-edit Activities.
4. Add resume viewer and signed document links.
5. Add notes and candidate full-text search.
6. Add the kanban pipeline board and rejection reasons.
7. Add Twilio browser calling and call logging.
8. Add reporting, filters, saved searches, charts, and CSV exports.
9. Add production login and authorization checks.
10. Add monitoring, queue retries, and privacy-safe production logging.

## Data Rules

- Never delete original resume files.
- Never write unvalidated LLM output to the database.
- Every application state change must create an Activity.
- Do not deduplicate on name alone.
- Do not log candidate PII or expose it in client errors.

## Useful Commands

```bash
npm run dev
npm run db:push
npm run db:studio
npm run db:generate
npm test
npm run lint
npm run build
```