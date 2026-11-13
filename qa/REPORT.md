# QA report — Attendance_Tracker (source-only review)

**Review date:** 2026-11-13  
**Repository/ref:** `Ganeshkumar841/Attendance_Tracker`, `main` at `5e81480bd525890d55415ff7c9c8c8c582582984`  
**Target provided later:** `http://attendxtracker.vercel.app/`  
**Review type:** Static source review and QA plan; no runtime validation performed.

> **Scope correction:** The original brief described a portfolio website deployed on Cloudflare Workers. The repository provided is AttendX, an attendance application with a Vercel configuration and Supabase client integration. This report is scoped to the repository. No production request, browser session, scan, build, or test run was executed; findings below are source-based risks, not confirmed production exploitability.

## Executive summary

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 3 |
| Medium | 3 |
| Low | 1 |
| Info | 2 |

**Verdict: Needs security hardening and runtime verification before relying on it for real student attendance data.** Three high-priority source-level concerns require checking against the actual Supabase deployment: the schema disables RLS, the optional RLS policies grant broad permissions based on user-editable metadata, and the email endpoint accepts caller-controlled email content/recipient. These are configuration-dependent where noted. Application security should be enforced in Supabase/server-side policies, not only in browser JavaScript.

## Findings

| ID | Title | Severity | Page or file | Steps to reproduce / evidence | Expected result | Actual result from source review | Suggested fix |
|---|---|---|---|---|---|---|---|
| SEC-01 | Database schema explicitly disables row-level security | High (deployment-dependent) | `backend/database/schema.sql:131-134` | Inspect the schema script. Then, in an authorized staging Supabase project, check RLS flags and test anonymous/authenticated table access using only test data. | RLS is enabled and least-privilege policies prevent unauthorized reads/writes. | The schema explicitly runs `DISABLE ROW LEVEL SECURITY` on events, attendance, and audit_logs. If this schema was applied and the Supabase API grants permit access, client-side role checks do not protect the tables. Actual exposure depends on project grants and deployment state. | Enable RLS by default; apply verified restrictive policies and test with anon, student, and coordinator tokens. Do not treat UI checks as authorization. See FIX-01. |
| SEC-02 | RLS policies use user-editable role metadata and allow broad access | High (if `rls_policies.sql` is deployed) | `backend/database/rls_policies.sql:5-64`; `frontend/pages/menu.js:136-174` | Review policies: rows are available to all authenticated users, while writes are rejected only when `user_metadata.role` equals `student`; role selection is client-side. In staging, test a user with missing or user-controlled role metadata and attempt reads/writes. | Server policies derive authority from trusted claims/ownership and limit records to authorized users/events. | The policies default missing role metadata to `coordinator`; authenticated SELECT policies use `USING (true)`. User metadata is generally user-editable in Supabase, so it is not a suitable authorization source. The policy's real impact depends on Supabase Auth configuration and whether this SQL is deployed. | Use trusted app metadata or server-maintained role/ownership tables, scope access by event ownership, and deny by default. Keep RLS enabled. See FIX-02. |
| SEC-03 | Email API can be used as an unauthenticated arbitrary-content mail sender | High (provider configured) | `api/send-email.js:4-23,26-85` | In a non-production/staging deployment with test provider credentials, send requests with an arbitrary recipient, subject, and HTML; include missing fields and non-POST methods. Do not test a live provider without explicit approval. | The endpoint authenticates and authorizes requests, validates recipient/content, and limits abuse; errors do not reveal provider details. | The handler checks only HTTP method and presence of fields. It accepts caller-supplied `to`, `subject`, and `html` and has no visible auth, recipient allowlist, schema/size checks, or rate limit. If public and provider credentials exist, this can enable spam or reputation/cost abuse. | Restrict the endpoint to an authenticated server-side workflow, validate recipient against event creator, cap body sizes, rate-limit, and return generic errors. See FIX-03. |
| SEC-04 | Event passwords are stored in plaintext and persisted in browser storage | Medium | `backend/database/schema.sql:7-20`; `backend/services/eventService.js:634-659,450-472,876-920`; `frontend/app.js:119-141` | Trace event creation and email record persistence: password is put into the DB payload, local event metadata, and sent-email history; inspect browser storage only in a test account. | Passwords should not be retrievable from the database, client storage, logs, or email history; use a secure reset mechanism. | Source stores password in plaintext in DB and in local/session browser state, and includes it in email payloads/history. A browser XSS or compromised device/account could expose it. | Replace shared event passwords with server-side authorization or store a slow salted password hash; never save secrets to client storage/history. Consider reset tokens instead of emailing the password. |
| SEC-05 | Missing Supabase configuration silently switches to insecure local demo authentication | Medium | `backend/config/supabaseClient.js:394-434` | With `config.js` absent or invalid, attempt sign-in with any syntactically valid email and password in a local test browser. | Authentication failure/configuration error should be explicit; the app must not present local demo auth as a production session. | The client selects `createLocalFallbackClient()`. That fallback accepts new arbitrary credentials and stores user/password/session in localStorage. It is not real authentication, but the UI can proceed as if signed in. | Fail closed outside explicit development mode. Gate fallback behind a build-time development flag and display an unmistakable demo warning. Avoid persisting raw passwords. |
| SEC-06 | Client-side rate limits can be reset or bypassed | Medium | `backend/middleware/rateLimiter.js:5-26,29-71`; `backend/services/eventService.js:538-552,745-754` | In a test account, clear sessionStorage/use a new browser profile and repeat allowed lookup/login attempts. Do not attempt high-volume requests. | Abuse limits should be enforced at the service/API boundary and apply across sessions and clients. | Limits are stored in sessionStorage or memory and are therefore controlled by the browser; clearing storage, opening another context, or calling the database directly avoids them. | Enforce quotas server-side or at Supabase Edge/WAF; retain client throttling only as UX protection. |
| A11Y-01 | Global CSS removes outlines from anchors and most keyboard controls | Low | `frontend/styles/theme.css:44-58` | Use keyboard Tab on the sign-in and role screens; inspect focus visibility on links, buttons, and selects. | Every keyboard-focusable control has a persistent, high-contrast visible focus indicator. | CSS applies `outline: none !important` broadly. A `:focus-visible` shadow restores some button/role-button/select indication, but anchors are not covered by the restoration selector; actual contrast/visibility requires browser testing. | Use `:focus-visible` styles for all interactive controls, including links, without globally suppressing outline; verify contrast. |
| A11Y-02 | Modal dialogs declare modal semantics but lack visible focus-trap/return behavior in reviewed code | Medium | `frontend/components/modals.js:20-30,305-326,329-354` | Open each dialog, press Tab/Shift+Tab repeatedly, and close with Escape; verify focus stays in the dialog while open and returns to the opener. | A modal traps keyboard focus, has accessible names, and returns focus to the trigger when closed. | Dialog role/name and initial focus are present, as is Escape close; no focus-trap or focus-return implementation is visible in this module. Confirm against full browser behavior and other scripts. | Implement focus containment, focus restoration, and background inertness; cover with keyboard and screen-reader testing. |
| SEO-01 | SPA shell has minimal metadata and no tracked crawler files | Info | `index.html:1-31`; repository tree | Inspect `<head>` and root files. | Page has a useful description/social metadata and intentional crawler instructions where appropriate. | Only a short title is evident; no description, Open Graph/Twitter, canonical, robots.txt, or sitemap.xml appears in the tracked tree. For a login-oriented app, indexing may intentionally be disabled; verify desired policy. | Set a descriptive title/description and explicit noindex or suitable robots policy; add social metadata only if public discovery is intended. |
| QA-01 | No reproducible dependency/build/test setup is tracked | Info | Repository root; `README.md`; `vercel.json` | Inspect root tree and README. | Fresh clone has documented dependency installation, build, and test commands. | No package manifest/lockfile, test runner, or build/lint scripts is present in the tracked tree. README only briefly describes AttendX. | Add a documented local setup and automated test workflow; this report adds a Playwright starter under `qa/`. |

## Functional

- **Source review:** client route parser and screen map are documented in `00-site-map.md`; app uses hashless history paths and Vercel SPA rewrites.
- **Not executed:** no navigation clicks, route refresh/back-forward, form submissions, event creation, attendance updates, link-status checks, or unknown-route checks were run.
- This app has no portfolio project cards or contact form; the original requested portfolio-specific cases do not map to the repository.

## Responsive

- No viewport rendering or visual comparisons were performed. The Playwright starter checks common viewport widths for horizontal overflow, but screenshots and visual/manual inspection remain outstanding.
- No screenshots were captured; `qa/screenshots/README.md` records this explicitly.

## Accessibility

- Source review found broad outline suppression and no focus containment/return visible in the modal component. These need browser-based verification and severity may change after testing.
- No axe-core scan, keyboard-only run, contrast measurement, screen reader review, or reduced-motion check was executed.

## Performance and SEO

- No Lighthouse run, page-weight/resource timing measurement, HTML validation, or external-resource availability check was executed.
- `index.html` uses CDN dependencies (SheetJS, Supabase JS, Tailwind CDN, Google Fonts); no SRI attributes are visible. No robots/sitemap files or social metadata appear in the tracked tree.
- Performance scores and current deployed metadata are unknown.

## Security

- The key risks are SEC-01 through SEC-06 above. Database RLS state and endpoint deployment/provider configuration are unverified.
- `.gitignore` includes `config.js`, `.env`, `.env.local`, `.env.*.local`; the template contains placeholders only. No secret value is reproduced here. Full history secret scanning was not run.
- `api/send-email.js` checks POST and required fields, but missing server-side authorization and validation remain concerns.
- No live headers, exposed-file paths, TLS/mixed-content, iframe/clickjacking, CSRF, or production API method behavior was checked.

## Edge cases

- Not run: JS-off, offline, blocked CDN, throttled network, authentication/email flows, long inputs, Unicode/XSS/SQL-like inputs, double submits, multi-tab flows, password reset, and runtime exceptions.
- Do not use real student data or live email provider credentials for these tests; create isolated test accounts/data and obtain approval before testing production mutation flows.

## Coverage: reviewed or confirmed from repository source

- Tracked tree and source modules inspected; no package manifest, lockfile, Wrangler config, or existing test suite found.
- Read README, Vercel rewrites, HTML shell, auth, database configuration/schema/policies, event and attendance service logic, sanitizer, rate limiter, sign-in, role menu, modal, toast, theme, and footer modules.
- Confirmed `.env` patterns and `config.js` are in `.gitignore`.
- Drafted a site map and reusable Playwright starter suite.

## Not tested / why

- Build/dependency installation/lint/type-check: no project package manifest/scripts and no shell/runtime access in this review.
- Live application requests and response headers: no browser/HTTP client execution was available. A URL was provided, but no live fetch was done.
- Playwright/axe/Lighthouse/HTML validation/screenshots: not installed or executed in the available environment.
- Database policy exploitability: requires authorized staging project, exact Supabase grants, actual RLS state, and test credentials.
- Email endpoint abuse behavior: depends on deployed serverless function and provider setup; live sends are unsafe without a controlled test provider.
- Complete git-history secret scan: not run; current tracked file review is not a substitute for gitleaks/trufflehog across history.
- Confirmed exploitability, exact severity, browser-specific failures, and all visual/functional outcomes remain open until the suite is run against a controlled deployment.
