# Musterwerk Facility Maintenance & Inspection Operations Platform

> Personal full-stack portfolio project modeled on the operational needs of a fictional German facilities organization.

Musterwerk Facility Operations is a focused internal maintenance application built to demonstrate production-style React, REST API, relational data, authorization, transactions, testing, and container deployment practices. The organization, accounts, sites, assets, contractors, inspections, and all seeded records are fictional demo data; this repository does not represent employment, client work, a production deployment, or legal certification.

## Demo and reviewer quick start

There is no public hosted demo at present. Run the Docker stack locally and open `http://localhost:5173`.

All fictional demo accounts use `Demo!2026`:

| Role             | Email                     | Suggested use                                 |
| ---------------- | ------------------------- | --------------------------------------------- |
| Facility Manager | `manager@example.com`     | Create, assign, generate, review, and verify  |
| Technician       | `technician@example.com`  | Berlin assigned work and inspection checklist |
| Coordinator      | `coordinator@example.com` | Intake, triage, and scheduling                |
| Auditor          | `auditor@example.com`     | Read-only history and audit review            |
| Administrator    | `admin@example.com`       | All-site administrative view                  |

A useful five-minute path:

1. Open the public Demo Overview and read the fictional-data boundary.
2. Sign in as the manager, review the scoped dashboard, and open `WO-DEMO-1004`.
3. Assign or create a Berlin work order, then sign in as the technician to start and complete it.
4. Return as manager to verify the completed work; inspect status history and audit log.
5. Generate the overdue AHU preventive occurrence twice and observe that only one work order exists for the same plan/date.
6. Complete `INSP-DEMO-001` with a failed item and create traceable corrective work from the resulting finding.

The stack contains no real operational data. The Docker migration service seeds demo data for evaluation; it is not a production bootstrap pattern.

## Screenshots

Screenshots have not been captured or committed. After running the stack, add truthful captures under `docs/screenshots/` using these names:

- `demo-overview.png`
- `manager-dashboard.png`
- `asset-history.png`
- `work-order-transition.png`
- `preventive-plans.png`
- `inspection-checklist.png`
- `audit-log.png`
- `de-dark-theme.png`
- `zh-hk-dashboard.png`
- `mobile-technician.png`

Do not add mockups and label them as application screenshots.

## Implemented features

- Opaque, database-backed HttpOnly sessions with password hashing, expiry, revocation, inactive-user checks, trusted-origin checks, CORS, Helmet headers, login rate limiting, and redacted structured logs.
- Five explainable roles with backend role checks plus user-to-site access. The same site scope is applied to lists, details, mutations, and dashboard aggregates.
- Site → Building → Location → Asset hierarchy with restrictive history relationships and searchable, paginated asset views.
- Work-order intake, technician or eligible contractor assignment, explicit status commands, required completion evidence, manager verification, self-verification prevention, derived overdue state, version-based optimistic concurrency, status history, and audit events.
- Weekly/monthly/quarterly/annual preventive plans with `Europe/Berlin` wall-time recurrence, catch-up limits, transactional generation, and a unique `(planId, scheduledFor)` occurrence key.
- Versioned inspection templates, per-instance checklist JSON snapshots, required and typed responses, immutable completed records, findings, and duplicate-safe corrective work creation.
- Fictional contractor directory with site, active, and demo-approval eligibility checks before assignment.
- Role/site-scoped dashboard aggregates, focused recent work/activity, URL-backed work-order and asset filters, deterministic sorting, and pagination metadata.
- English default, German (`de-DE`), and Traditional Chinese (`zh-HK`) runtime switching; canonical API/database enums; English fallback; locale-aware `Europe/Berlin` date/time display; key consistency tests.
- Material UI System/Light/Dark modes, persisted pre-login and user preferences, responsive navigation, mobile technician flows, keyboard-accessible native/MUI controls, loading/error/empty states, and visible semantic status text.
- Unit, PostgreSQL integration, localization, and Playwright journey tests.
- Versioned PostgreSQL migration, deterministic fictional seed structure, multi-stage Dockerfiles, Compose services, health/readiness probes, and GitHub Actions.

Actual binary file upload, user administration screens, inspection review/approval, exports, notifications, public hosting, and screenshot capture are deliberately not implemented.

## Technology stack

| Layer                   | Implementation                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend                | React 18, strict TypeScript, Vite 6, React Router 7, Material UI 6, TanStack Query, React Hook Form, Zod, react-i18next, Luxon             |
| Backend                 | Node.js 22, Express 5, strict TypeScript, Zod validation, Pino structured logging                                                          |
| Database                | PostgreSQL 16, Prisma 6.12, one versioned SQL migration, reproducible fictional seed                                                       |
| Authentication/security | bcrypt, hashed opaque sessions in PostgreSQL, HttpOnly SameSite cookie, origin check, RBAC, site/object scope, Helmet, CORS, rate limiting |
| Testing                 | Vitest 5, Supertest with real PostgreSQL when configured, Testing Library dependencies, Playwright                                         |
| Infrastructure          | npm workspaces, Docker/Compose, Nginx SPA hosting, GitHub Actions                                                                          |

## Architecture

```mermaid
flowchart LR
  B[Browser / React / MUI / i18n] -->|REST + HttpOnly cookie| E[Express]
  E --> H[Authentication session lookup]
  H --> A[Role and site/object authorization]
  A --> V[Zod validation]
  V --> S[Domain/application services]
  S -->|transactions| P[Prisma]
  P --> D[(PostgreSQL)]
  C[Scheduled CLI or protected command] --> G[Preventive generation service]
  G --> P
```

This is a modular monolith. `apps/web` owns presentation and browser state; `apps/api` owns trust boundaries, business rules, transactions, and persistence. Separate deployable processes keep frontend hosting simple without splitting the business domain into services.

## Business workflows

### Work order

```mermaid
stateDiagram-v2
  [*] --> OPEN
  OPEN --> TRIAGED
  TRIAGED --> ASSIGNED
  ASSIGNED --> IN_PROGRESS
  ASSIGNED --> ON_HOLD
  IN_PROGRESS --> ON_HOLD
  ON_HOLD --> IN_PROGRESS
  IN_PROGRESS --> COMPLETED
  COMPLETED --> VERIFIED
  VERIFIED --> CLOSED
  OPEN --> CANCELLED
  TRIAGED --> CANCELLED
  ASSIGNED --> CANCELLED
  ON_HOLD --> CANCELLED
```

`POST /api/work-orders/:id/transitions` validates the edge, actor role, assignment ownership, completion fields, and separation of duties. The version-guarded update, status history, and audit event share one transaction. Assignment has its own command so inactive technicians/contractors and wrong-site relationships cannot be bypassed through a generic patch.

### Preventive generation

`generateDuePreventiveWork` reads active plans due by a cutoff. Each occurrence creates a work order, occurrence, status history, audit event, and next-due update transactionally. The database unique key on `(planId, scheduledFor)` is the final race-safe duplicate barrier; a repeat run reports the occurrence as skipped.

### Inspection to corrective work

Scheduling copies the ordered template items into `Inspection.checklistSnapshot`. Completion validates all required items, records typed responses and failure findings, and makes the instance immutable. Corrective work is created and linked in one transaction; the nullable unique link and conditional update prevent duplicate corrective orders.

### Role and site scope

`authenticate` restores the user and permitted site IDs from the session. `requireRoles` controls command categories. `siteScopeWhere` is merged into list, detail, audit, and aggregate queries; `assertSiteAccess` protects create commands. Objects outside scope return `404` on detail routes to avoid disclosing their existence.

## Database design

```mermaid
erDiagram
  User ||--o{ Session : owns
  User ||--o{ UserSiteAccess : receives
  Site ||--o{ UserSiteAccess : permits
  Site ||--o{ Building : contains
  Building ||--o{ Location : contains
  Location ||--o{ Asset : hosts
  AssetCategory ||--o{ Asset : classifies
  Asset ||--o{ WorkOrder : concerns
  WorkOrder ||--o{ WorkOrderStatusHistory : records
  PreventiveMaintenancePlan ||--o{ MaintenanceOccurrence : schedules
  MaintenanceOccurrence ||--|| WorkOrder : materializes
  InspectionTemplate ||--o{ InspectionTemplateVersion : versions
  InspectionTemplateVersion ||--o{ InspectionTemplateItem : defines
  InspectionTemplateVersion ||--o{ Inspection : instantiates
  Inspection ||--o{ InspectionResponse : captures
  InspectionResponse ||--o| InspectionFinding : raises
  InspectionFinding ||--o| WorkOrder : corrects
  Contractor }o--o{ Site : eligible_at
  Contractor ||--o{ WorkOrder : assigned
```

Operational IDs use CUIDs while `WorkOrder.number`, `Inspection.number`, site codes, and asset codes are reviewer-friendly business identifiers. History-bearing foreign keys use `RESTRICT`; accounts, sites, assets, plans, contractors, and templates are deactivated instead of destructively cascading history. The schema includes indexes for site/status/due-date lists, technician work, asset history, audit history, and template/occurrence uniqueness.

PostgreSQL was chosen for foreign keys, multi-row ACID transactions, unique race barriers, filtering/aggregation, and explicit migration history. Timestamps are stored as PostgreSQL timestamps represented as UTC instants by Prisma. Each site/plan carries an IANA timezone; recurrence adds calendar intervals in the site zone and converts the result to UTC.

## API conventions

See [`docs/API.md`](docs/API.md). Main lists validate and whitelist query parameters, cap `pageSize` at 100, add an ID tie-breaker, and return:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
}
```

Errors use stable codes suitable for frontend localization:

```json
{
  "error": {
    "code": "STALE_VERSION",
    "message": "The work order was updated by another user"
  },
  "requestId": "..."
}
```

Prisma records are selected/included deliberately but a separate DTO layer is not yet implemented; adding response schemas is a production hardening improvement.

## Security

- bcrypt hashes passwords; the seed contains only a demo password and generates hashes at seed time.
- Login creates 32 random bytes. Only a SHA-256 hash is stored in `Session`; the raw opaque token is sent in an HttpOnly, SameSite=Lax cookie, marked Secure in production, and expires after eight hours.
- Secure cookies default on whenever `NODE_ENV=production`. Local HTTP Compose explicitly sets `SESSION_COOKIE_SECURE=false`; a TLS deployment must omit that override or set it to `true`.
- Logout revokes the server-side session and clears the cookie. No refresh token is implemented.
- Backend middleware—not hidden buttons—enforces roles. Site scope is part of database queries, including aggregates and detail lookups.
- Zod schemas select allowed fields, preventing mass assignment. Prisma parameterization prevents SQL injection in normal queries.
- Helmet, allowlisted credentialed CORS, trusted-origin checks for unsafe methods, request body limits, login rate limiting, and redacted structured logs are enabled.
- Audit payloads omit passwords, cookies, and tokens. Demo data intentionally avoids real identifiers and personal data.
- `npm audit --omit=dev` and the full audit were clean at final verification; future users must rerun the audit.

Known limits: SameSite/origin checking is appropriate for this same-site demo but a real cross-site deployment should use a dedicated CSRF token strategy. Sessions have no idle renewal, device management, or global revocation UI. Rate limiting is in-memory per API instance. No malware-scanned object storage exists. Audit records are append-oriented through the normal API but the database owner can modify them. There is no MFA, SSO, security-event alerting, or formal penetration test.

## Internationalization, locale, timezone, and themes

`apps/web/src/i18n/resources.ts` contains identical English, German, and Traditional Chinese key sets. `tests/i18n.test.ts` fails if a locale diverges. The database stores canonical values such as `IN_PROGRESS`; `StatusChip` resolves localized labels at render time. User-entered names and notes remain as entered.

The UI uses Luxon/Intl locale formatting and displays operational instants in `Europe/Berlin`. Recurrence calculations preserve local wall time across German DST changes. Calendar widgets are currently native date inputs, so an explicit Monday-first calendar component is not present.

Language and System/Light/Dark settings persist in local storage before login and are synchronized to the user profile after authentication. System mode follows `prefers-color-scheme`; an inline pre-paint script reduces bright-theme flash.

Traditional Chinese supports presentation to Hong Kong interviewers. It does not imply a Hong Kong branch, customer, contract, or production localization review.

## Testing

- `apps/api/tests/unit/work-order-domain.test.ts`: legal/illegal transitions, completion requirements, separation of duties, overdue derivation.
- `apps/api/tests/unit/recurrence.test.ts`: calendar recurrence, German DST wall time, invalid zones.
- `apps/api/tests/unit/session.test.ts`: opaque token hashing property.
- `apps/api/tests/integration/authorization.test.ts`: real PostgreSQL sessions, unauthenticated `401`, role `403`, and cross-site detail isolation.
- `apps/api/tests/integration/query-validation.test.ts`: Express 5 query parsing, Site-model scoping, and empty optional filter normalization.
- `apps/web/tests/i18n.test.ts`: three-locale key equality and canonical status coverage.
- `e2e/manager-technician-workflow.spec.ts`: manager → technician → manager journey plus a mobile navigation check.

Run fast checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

Run PostgreSQL integration tests after starting/migrating `db-test`:

```powershell
docker compose --profile test up -d db-test
$env:DATABASE_URL='postgresql://musterwerk:musterwerk@localhost:5433/musterwerk_test?schema=public'
$env:TEST_DATABASE_URL=$env:DATABASE_URL
npm run db:migrate:test
npm run test:integration
```

Run browser tests against the seeded Compose stack:

```bash
npx playwright install chromium
npm run test:e2e
```

The unit/localization suites do not need PostgreSQL. Database race behavior, migration execution, and object authorization require real PostgreSQL. The Playwright journey mutates demo data and should run after resetting the demo seed. No visual-regression, load, accessibility-engine, backup/restore, or multi-instance rate-limit tests exist.

## Run locally

### Docker quick start

Prerequisites: Docker Desktop/Engine with Compose.

```bash
git clone <repository-url>
cd facility-management
docker compose up --build
```

Open `http://localhost:5173`. API health is `http://localhost:4000/api/health`; readiness checks PostgreSQL at `/api/ready`.

The one-shot `migrate` service applies checked-in migrations and seeds fictional data before the API starts. To deliberately reset demo data, recreate that service:

```bash
docker compose run --rm migrate
```

The seed deletes application records before recreating the fictional dataset. Never point it at a real database.

### Normal developer workflow

Prerequisites: Node.js 22, npm, and PostgreSQL 16 (Docker can provide only the database).

```bash
copy .env.example .env
npm ci
docker compose up -d db
npm run db:generate
npm run db:migrate:test
npm run db:seed
npm run dev
```

On bash, use `cp .env.example .env`. The Vite client runs at `5173` and Express at `4000`.

## Deployment

For the AWS-specific CloudFront, EC2, ECR, SSM, and private RDS deployment path, see [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md). Local Docker development continues to use `docker-compose.yml`, `Dockerfile.web`, and `deploy/nginx.conf`.

The implemented deployment artifacts target a conventional container platform:

- build and publish `Dockerfile.api` and `Dockerfile.web` images;
- provision managed PostgreSQL with TLS, backups, point-in-time recovery, connection pooling, and restricted database roles;
- run `prisma migrate deploy` as a release job before new API instances;
- inject secrets through the platform, never image layers or client build variables;
- terminate TLS at a trusted reverse proxy and set exact production `WEB_ORIGIN`;
- schedule `npm run preventive:generate -w @musterwerk/api` with a single-concurrency scheduler; database uniqueness keeps retries safe;
- ship structured logs to centralized storage and monitor `/api/ready`, latency, error rate, authentication failures, and job outcomes;
- use object storage plus type/size checks, antivirus scanning, and authorization before implementing binary documents;
- use a separate resettable demo environment. Never run `prisma/seed.ts` against production records.

No deployed URL, cloud database, production secrets, backup process, monitoring integration, object storage, or managed scheduler is included. The bundled Sites/Cloudflare Worker runtime was not used because normal Prisma/PostgreSQL TCP connectivity is incompatible with that runtime; replacing PostgreSQL/Prisma merely to obtain a demo URL would weaken the requested portfolio architecture.

## Engineering decisions and trade-offs

| Decision                                | Why                                                                      | Rejected alternative / limit                                                        |
| --------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Modular monolith                        | One transaction boundary and approachable interview walkthrough          | Microservices add failure modes without a product need                              |
| Database opaque sessions                | Immediate revocation and no token exposure to JavaScript                 | Stateless JWTs reduce lookups but complicate revocation; DB lookup costs scale work |
| Explicit transition/assignment commands | Business actions own validation, history, and authorization              | Generic status PATCH would bypass rules                                             |
| Inspection snapshots                    | Historical meaning survives template edits                               | Live template reference would rewrite the apparent past                             |
| Derived overdue                         | Cannot drift from due date and terminal state                            | Stored flag would need background synchronization                                   |
| Simple calendar recurrence              | Explainable DST behavior and tests                                       | RRULE covers more schedules but greatly expands edge cases                          |
| Unique occurrence key + transaction     | Retry-safe and race-safe at the database                                 | Application-only “check then insert” is racy                                        |
| Server pagination                       | Bounds transfer and preserves scope/ordering                             | Downloading everything fails with large history                                     |
| English default + `de-DE` + `zh-HK`     | Broad reviewer access plus German context and Hong Kong presentation     | Not evidence of real customers or professional translation review                   |
| Metadata-only documents                 | Demonstrates relationships without pretending storage security is solved | Binary upload needs object storage/scanning/authorization                           |

## Demo-data, legal, and privacy disclaimer

Musterwerk Facility Operations is fictional. All accounts, people, sites, addresses at city level, assets, serial-like identifiers, contractors, contacts, work, inspections, and documents are demo records. No real employer/client relationship, company registration, VAT number, contract, legal approval, signature, inspection certificate, customer, or production use is represented.

Inspection references are configurable demonstration metadata. The application does not guarantee or certify compliance with German, EU, or other law or standards and does not provide legal advice. A real deployment would require review by qualified facilities, safety, privacy, security, accessibility, and legal stakeholders, plus a data protection impact/retention analysis where applicable.

## Future improvements

- Add admin-managed users, role/site access screens, MFA/SSO, session-device management, and centralized rate limiting.
- Add checked response DTOs/OpenAPI generation and cursor pagination for very large histories.
- Add full template editing/version creation and inspection reviewer workflow.
- Add an outbox/queue-backed scheduler with lease/heartbeat monitoring for multi-instance generation.
- Add object storage, authorization, scanning, retention, and legal-hold design for attachments.
- Add accessible chart components only for questions not already answered by the compact status summaries.
- Add axe/visual regression tests, full mobile checklist coverage, load tests, and migration rollback rehearsals.
- Add a separately resettable hosted demo after selecting a provider that supports PostgreSQL/Prisma safely.

## Interview preparation

Read [`docs/PORTFOLIO_GUIDE.md`](docs/PORTFOLIO_GUIDE.md) before putting this project on a CV. It maps UI actions to actual routes, services, models, transactions, tests, limitations, skeptical questions, and practice exercises.
