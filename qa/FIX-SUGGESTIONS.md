# Fix suggestions (not applied)

These are suggested changes only. Production source was not modified. The high-severity concerns have configuration and deployment dependencies; test in an isolated Supabase/Vercel project before rollout.

## SEC-01 — Enable RLS by default

**Before — `backend/database/schema.sql` currently disables RLS at the end:**

```sql
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
```

**Suggested direction:** enable RLS in schema provisioning and then apply explicit least-privilege policies. Do not ship an “open until later” default. The exact policy depends on the application's intended event ownership/roles; the example below is only a deny-by-default starting point, and needs service-specific `SELECT`/`INSERT`/`UPDATE` policies before production.

```sql
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Do not create broad USING (true) policies. Add narrowly scoped policies
-- only after deciding how coordinator ownership and student event membership
-- are represented in trusted database claims/tables.
```

## SEC-02 — Do not authorize from editable user metadata

**Before — `backend/database/rls_policies.sql` role check:**

```sql
WITH CHECK (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'coordinator') <> 'student');
```

**Suggested direction:** store the role in trusted server-managed `app_metadata` or a protected role table and make missing/unknown roles deny access. Scope records by verified ownership or membership. Minimal safer predicate shape:

```sql
-- Illustrative only: replace with the actual protected role/ownership model.
WITH CHECK (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'coordinator'
  AND created_by = auth.uid()::text
);
```

Similarly, replace `USING (true)` with a predicate that only permits rows the current user is allowed to see. Confirm user-editable metadata cannot populate `app_metadata` and test policies with anonymous, student, coordinator, and unprivileged tokens.

## SEC-03 — Restrict the email endpoint

**Before — `api/send-email.js` accepts caller-controlled delivery fields:**

```js
const { to, subject, html, text } = req.body || {};
if (!to || !subject || (!html && !text)) {
  return res.status(400).json({ sent: false, error: 'Missing required email fields (to, subject, html/text).' });
}
```

**Suggested direction:** do not accept arbitrary recipient/HTML from an unauthenticated browser. Have a trusted backend derive the approved recipient and message from an authorized event ID, validate a strict schema, limit body size, and apply server-side quotas. Example validation skeleton (authentication/ownership check must be added before dispatch):

```js
const body = req.body;
if (!body || typeof body !== 'object' || Array.isArray(body)) {
  return res.status(400).json({ sent: false, error: 'Invalid request.' });
}

const { eventId } = body;
if (typeof eventId !== 'string' || !/^[A-Z0-9_-]{3,20}$/i.test(eventId)) {
  return res.status(400).json({ sent: false, error: 'Invalid request.' });
}

// TODO: authenticate caller, verify coordinator ownership of eventId,
// rate-limit by account/event/IP, and derive recipient/template on server.
// Never trust client-provided `to`, `subject`, or `html` values.
```

Also return generic provider errors to the client and log only sanitized diagnostics. Use an allowlist for recipients only if the product workflow permits it.

## Follow-up hardening (Medium/Low)

- **SEC-04:** Remove `password` from event rows and local/session storage. Prefer server-side checks or salted password hashes and a one-time reset process; avoid emailing/retrieving existing passwords.
- **SEC-05:** Gate local fallback auth behind an explicit development-only flag; fail closed when production configuration is unavailable and never store plain passwords.
- **SEC-06:** Keep client rate limiting as UX only; add authoritative service-side quotas.
- **A11Y-01:** Remove the global outline reset and add consistent `:focus-visible` styles to `a`, `button`, inputs, and custom controls.
- **A11Y-02:** Add modal focus containment, restore focus to the invoker, and mark the background inert while the modal is open.
