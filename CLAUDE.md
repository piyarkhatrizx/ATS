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

## Testing

Vitest. Every ingest and dedupe change needs a test. Fixtures live in `test/fixtures/`.

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
