# Implementation checklist

This checklist records the implemented scope selected from the project specification.

## Scope and acceptance criteria

- [x] Reproducible npm workspace with strict TypeScript, linting, formatting, builds, and CI.
- [x] PostgreSQL schema, versioned migration, and deterministic fictional seed structure.
- [x] Opaque, database-backed, HttpOnly session authentication with login, logout, expiry, and inactive-user checks.
- [x] Backend-enforced roles: Administrator, Facility Manager, Coordinator, Technician, and Auditor.
- [x] Backend-enforced site/object scope on detail, list, mutation, and aggregate queries.
- [x] Site → Building → Location → Asset hierarchy and asset history view.
- [x] Work-order create, assign, start, complete, verify, close, hold, cancel, optimistic concurrency, status history, and audit trail.
- [x] Idempotent preventive generation with explicit recurrence and Europe/Berlin timezone handling.
- [x] Versioned inspection templates, checklist snapshots, required responses, findings, and traceable corrective work.
- [x] Contractor directory and backend assignment eligibility rules.
- [x] Server-side filtering, sorting, deterministic pagination, and role-scoped dashboard aggregates.
- [x] React operations UI plus public Demo Overview and responsive technician flow.
- [x] Runtime `en`, `de-DE`, and `zh-HK` i18n with key consistency tests and locale-aware formatting.
- [x] Material UI System/Light/Dark modes with persisted preferences.
- [x] Unit, PostgreSQL integration, localization, and critical Playwright test source.
- [x] Docker development stack, health/readiness checks, migrations, seed, and GitHub Actions.
- [x] README and candidate portfolio guide reference actual implementation and limitations.

## Verification status

- [x] Formatting check, lint, strict TypeScript, unit/localization tests, Prisma schema validation, production API/web builds, Playwright test discovery, and dependency audit.
- [x] Live migration/seed, five PostgreSQL integration tests, Docker image smoke test, authenticated API probe, and two Playwright browser journeys passed on this workstation. GitHub Actions also contains a PostgreSQL integration job for repeatable CI verification.

## Deliberate non-goals

No CAFM/ERP replacement, IoT control, procurement, invoicing, payroll, GPS tracking, legal compliance engine, certified signatures, full document storage, real integrations, microservices, Redis, Kubernetes, event streaming, or AI maintenance diagnosis.

## Decisions

1. **Modular monolith:** npm workspaces split the React client and Express API while preserving one repository and one PostgreSQL transaction boundary.
2. **Database sessions:** opaque random tokens are stored only as SHA-256 hashes; an HttpOnly SameSite cookie avoids exposing credentials to browser JavaScript. This is simpler to revoke than stateless JWTs for an internal tool.
3. **Explicit command endpoints:** assignment and transitions are separate commands because they enforce role, eligibility, history, and concurrency rules.
4. **Derived overdue state:** overdue is calculated from `dueAt` plus non-terminal status, avoiding a second state that can drift.
5. **Simple recurrence:** weekly, monthly, quarterly, and annual intervals are understandable and testable. A full RRULE engine is intentionally out of scope.
6. **Historical snapshots:** inspection instances store the exact checklist snapshot used so template edits cannot rewrite completed history.
7. **No binary upload:** document metadata is modeled; object storage, malware scanning, and download authorization remain production work.
8. **Local/container delivery:** the required Prisma/PostgreSQL runtime uses database TCP connections and is not compatible with the bundled Cloudflare Worker Sites runtime. Deployment guidance targets a conventional container platform.
