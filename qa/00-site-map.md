# AttendX site map (source review)

**Scope:** Repository `Ganeshkumar841/Attendance_Tracker`, reviewed at commit `5e81480bd525890d55415ff7c9c8c8c582582984`. This is a source-derived map, not a verified map of the currently deployed instance. The repo is an attendance application, not the portfolio site described in the original task.

## Runtime and routes

`index.html` is a static shell. It loads scripts in order, and `frontend/app.js` renders the screen contents into mount points and manages path history. `vercel.json` rewrites `/api/*` to the serverless function route and all other paths to `index.html`. The client-side path parser handles:

| Path | Intended screen |
|---|---|
| `/`, `/index.html`, `/signin` | Sign in / sign up / password reset |
| `/menu` | Role selector |
| `/coordinator` | Coordinator home |
| `/events/create` | Create event |
| `/events/join` | Join event |
| `/student` | Student events |
| `/events/:eventId/attendance` | Attendance entry |
| `/events/:eventId/prereg` | Pre-registration |
| `/events/:eventId/export` | Export |
| `/events/:eventId/list` | Attendance list |

Unknown paths are not explicitly handled by the client router; Vercel's catch-all rewrite serves the SPA shell, after which `frontend/app.js` falls back to the login flow.

## Screens, sections, and interactive controls

- **Sign in / account:** `frontend/pages/signin.js` renders Google sign-in, Sign In and Sign Up modes, email/password fields, password visibility toggle, forgot-password flow, OTP verification/resend, and password recovery/update. Authentication wrappers are in `backend/services/authService.js` and `backend/config/supabaseClient.js`.
- **Role selection:** `frontend/pages/menu.js` offers Coordinator / Staff and Student Portal choices plus Sign Out.
- **Coordinator home:** Create New Event, Join Existing Event, Sign Out, and role switching. Event creation/join forms and recent-event controls are rendered by `frontend/pages/events.js`.
- **Student events:** recent event lookup/selection; student attendance is read-only in the UI.
- **Attendance:** `frontend/pages/attendance.js` provides attendance entry, list, pre-registration, and export states. `frontend/pages/viewList.js` implements attendance searching, removal/re-add controls, and status messages. `frontend/pages/exportPage.js` provides summaries, export, password-change, and event-discard actions.
- **Dialogs:** `frontend/components/modals.js` renders edit authorization, attendance deletion, event deletion, event password change, and forgotten-event-password dialogs. Escape/backdrop close behavior is installed there.
- **Shared shell:** header/role badge and role switch in `frontend/components/header.js`; toast messages and password visibility in `frontend/components/toast.js`; footer in `frontend/components/footer.js`.
- **Theme:** `frontend/utils/theme.js` currently forces light theme; it does not provide a dark-mode toggle.

## Data and external services

- Supabase Auth/Database/Realtime are accessed from the browser using `backend/config/supabaseClient.js`; URL and public anon key are meant to be provided via the ignored `config.js` (template: `config.example.js`).
- Event, attendance, and audit schemas/policies are in `backend/database/schema.sql`, `migration.sql`, and `rls_policies.sql`.
- Email may be sent via the Vercel `/api/send-email` function in `api/send-email.js` (Resend or Brevo) or a Supabase Edge Function.
- `index.html` loads SheetJS from cdnjs, Supabase JS from jsDelivr, Tailwind from its CDN, and Google Fonts. No integrity hashes are present in the source markup.
- Favicon variants are at the repository root. No project/demo cards, portfolio contact form, robots.txt, or sitemap.xml are in the tracked tree.

## Build and test tooling found

The tracked tree at the reviewed commit contains no `package.json`, lockfile, Wrangler configuration, automated test directory, or declared build/lint/type-check scripts. It includes a Vercel configuration, not a Cloudflare Workers configuration. Dependency installation/build/test execution was not performed in this review environment.
