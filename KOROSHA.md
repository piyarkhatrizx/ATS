# Korosha

## What this is
A lead response system shaped like an ATS. People who submit the apply
form are potential clients, not job candidates. The product goal is speed
to first contact. Every design decision should be judged against: does
this get a human on the phone with a new lead faster?

## Versions
One codebase, one flag. No second repo.
- KOROSHA_TIER=v1 (demo): apply page intake only. No email intake, no
  resume parsing.
- KOROSHA_TIER=v2 (full): everything, plus email intake, resume parsing,
  telephony, AI call notes.
All tier gating goes through lib/features.ts. Never scatter env checks.

## Design
Black, white, light purple #e1b9f0. Dark glassmorphism.
- Panels are dark. Purple appears only in ambient background glows,
  borders, focus rings, and primary buttons. Purple is never a panel fill.
- Body text always sits on a dark surface, never directly on a glow.
- One blur layer per element. Never stack backdrop-filter.
- All colors come from styles/tokens.css. No hardcoded hex anywhere else.

## Core objects
- applicant: a lead. Has a source (apply | email), a status, and a form
  response payload.
- status: user editable, not an enum. Table with label, color, order,
  is_terminal, counts_as (accepted | rejected | open).
- rule: a disqualifier. question_key, operator, value, action, reason,
  active, priority. Runs once at submission. question_key must reference
  a field key from the form definition.
- activity_event: append only log. Stored on the Activity table; type is
  SCREAMING_CASE to match the existing column. The event vocabulary is
  APPLICATION_CREATED, REAPPLIED, CALL_LOGGED, STATUS_CHANGED, EMAIL_SENT,
  EMAIL_RECEIVED, FORWARDED, AUTO_REJECTED, NOTE_ADDED, PARSED,
  DOCUMENT_ATTACHED. EMAIL_SENT and EMAIL_RECEIVED stay distinct; analytics
  counts EMAIL_SENT where this spec previously said "emailed". Every state
  change writes exactly one event. All analytics read from here and nowhere
  else.
- form_definition: JSON array of fields (key, label, type, options,
  required) plus consent text. Powers the builder, the public apply page,
  and the export.

## Rules behavior
Auto rejected leads are never hard deleted and never hidden by default.
The row shows which rule fired and why. Rules are editable in settings
without a deploy. The rule builder populates question_key from the fields
of the selected form definition.

## Analytics
Counts of applications, calls, accepted, rejected across today, 7 days,
30 days, plus source breakdown. Headline metric is median time from
application to first call. Accepted and rejected are derived from
status.counts_as, never from hardcoded status names.

## Candidate row
Primary and always visible: applicant name, source, status, time since
applied, Call button, Notes button. Behind a compact action menu: email,
forward to client list, view application, reject. Row click opens a side
panel, never a page navigation.

## Auth
Auth.js with database sessions, plus an email allowlist enforced as an
authorization check during sign in (KOROSHA_ALLOWED_EMAILS, comma
separated; a leading @ allows a whole domain; an empty list denies
everyone). lib/auth.ts exports getUser() and requireUser() and is the only
API the rest of the app uses. auth() is called in exactly one place,
inside lib/auth.ts. Swapping providers means rewriting those functions and
lib/auth-config.ts, and nothing else.

## Compliance placeholders
Every apply submission stores a snapshot of the exact consent text shown,
not a reference to the current version. Telephony and recording are not
built yet, but the schema should not make them hard to add later.

## Known tradeoffs
- Migrations are generated with `prisma migrate diff --from-schema-datasource`
  and applied with `prisma migrate deploy`, because `prisma migrate dev` needs
  a shadow database and the Supabase session pooler cannot provide one (the
  direct host is IPv6 only and unreachable from most laptops). Consequence: a
  new migration is diffed against the LIVE DATABASE, not replayed from the
  migration history. If the database ever drifts from the migrations, the next
  diff absorbs that drift silently instead of failing. Check `prisma migrate
  status` and read generated SQL before applying it.
- FORWARDED.destination is free text. TODO: it needs a client-list foreign key
  once forwarding is actually built in Phase 5.

## Working rules
- Read this file before starting work.
- Do not start a phase before the previous one is committed.
- Do not invent new components when one exists in components/.
- Do not add dependencies without asking first.
- After each phase, stop and report what changed and what you need decided.