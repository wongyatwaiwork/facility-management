# REST API reference

All operational routes require the opaque `musterwerk_session` cookie. The browser sends it with credentials. Mutating browser requests must carry the configured trusted `Origin`. Successful list endpoints return `{ data, meta }`; failures return `{ error: { code, message, params? }, requestId }`.

| Group             | Routes                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health            | `GET /api/health`, `GET /api/ready`                                                                                                                                               |
| Authentication    | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/preferences`                                                                                |
| Facilities        | `GET /api/sites`, `GET /api/sites/:id`                                                                                                                                            |
| Assets            | `GET /api/assets`, `POST /api/assets`, `GET /api/assets/:id`                                                                                                                      |
| Work orders       | `GET/POST /api/work-orders`, `GET /api/work-orders/:id`, `POST /api/work-orders/:id/assignments`, `POST /api/work-orders/:id/transitions`                                         |
| Preventive        | `GET/POST /api/preventive-plans`, `POST /api/preventive-plans/generate-due`                                                                                                       |
| Inspections       | `GET/POST /api/inspections`, `POST /api/inspections/templates`, `GET /api/inspections/:id`, `POST /api/inspections/:id/complete`, `POST /api/inspections/findings/:id/work-order` |
| Contractors       | `GET/POST /api/contractors`                                                                                                                                                       |
| Dashboard         | `GET /api/dashboard/summary`                                                                                                                                                      |
| Audit             | `GET /api/audit-logs`                                                                                                                                                             |
| Users/preferences | `GET /api/users`, `PATCH /api/users/me/preferences`                                                                                                                               |

Main asset and work-order lists validate filters, whitelist sorting fields, cap page size at 100, use deterministic ID tie-breakers, and apply site scope before querying PostgreSQL.
