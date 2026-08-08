# Authentication and permissions

Production identity is designed around Better Auth backed by the `users`, `accounts`, and `sessions` tables. The current UI includes an explicitly development-only role cookie so the project is usable before SMTP and production credentials exist. It is rejected when `NODE_ENV=production`.

Roles are Visitor, Owner, Assistant Commissioner, Commissioner, and System Administrator. Franchise membership and commissioner authority are scoped through league-season membership records; platform administration is stored separately. `requirePermission` is called inside protected server pages/actions/handlers. UI hiding is never the authorization boundary.

Mutation inputs use Zod, same-site HTTP-only cookies protect the development form flow, security headers are set globally, and sensitive provider credentials stay server-only. Production should add Better Auth request handlers, password reset delivery, persistent rate limiting (Redis), and recovery-code policy before public exposure.

Object-level access must always join the requested league/franchise to the current membership to prevent insecure direct-object references. A future support-session model should use separate time-limited records, explicit consent, and comprehensive audit logs—never commissioner impersonation.
