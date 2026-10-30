# AttendX — Event Attendance System (Tailwind CSS + Modular Architecture)

AttendX is a real-time college event attendance management web application built for event coordinators. It features a "Luminous Void" dark and Google Workspace light user interface powered by **Tailwind CSS**, instant reactive UI updates, Supabase real-time synchronization, dynamic academic year calculation, and branch-wise Excel exporting.

---

## Project Folder Structure

```text
Attendance_Tracker/
├── index.html                        # Application entry point
├── config.example.js                 # Supabase environment configuration template
├── README.md                         # Project documentation
│
├── frontend/                         # Frontend UI Layer (Tailwind CSS + Modular JS)
│   ├── app.js                        # Main frontend bootstrapper, router & state store
│   ├── components/
│   │   ├── header.js                 # Top navbar with brand & symbol-only theme toggle
│   │   ├── footer.js                 # Global application footer
│   │   ├── modals.js                 # Auth verification & delete confirmation modals
│   │   └── toast.js                  # Toast notification & password eye toggle
│   ├── pages/
│   │   ├── signin.js                 # Sign In, Sign Up, Forgot Password & OTP page
│   │   ├── menu.js                   # Coordinator welcome & action cards menu
│   │   ├── events.js                 # Create Event, Event Summary & Join Event page
│   │   ├── attendance.js             # Attendance Entry, Year Selector & Pre-reg CSV
│   │   ├── viewList.js               # Live View List, Search/Filter & Reactive Delete
│   │   └── exportPage.js             # Branch Summary, Excel Export & Session Actions
│   ├── styles/
│   │   ├── tailwind.config.js        # Tailwind CSS theme mapping to custom palette
│   │   └── theme.css                 # Dark/Light CSS variables & tap-outline reset
│   └── utils/
│       ├── sanitizer.js              # XSS escaping, roll parser & CSV validator
│       ├── theme.js                  # Dark/Light theme switcher (icon-only toggle)
│       └── exporter.js               # SheetJS multi-file branch-wise Excel exporter
│
└── backend/                          # Backend Services, Security & Database Layer
    ├── config/
    │   ├── supabaseClient.js         # Singleton Supabase client initializer
    │   └── securityConfig.js         # Security thresholds & Web Crypto SHA-256 hashing
    ├── middleware/
    │   ├── rateLimiter.js            # Brute-force protection for login & event passwords
    │   └── sessionManager.js         # 30-minute inactivity session timeout tracker
    ├── services/
    │   ├── authService.js            # Supabase Auth wrapper & friendly error sanitizer
    │   ├── eventService.js           # Event CRUD & password verification service
    │   ├── attendanceService.js      # Attendance CRUD & Realtime Postgres Changes channel
    │   └── auditService.js           # Non-blocking security audit logger
    └── database/
        ├── schema.sql                # PostgreSQL schema with REPLICA IDENTITY FULL
        └── rls_policies.sql          # Supabase Row-Level Security (RLS) policies
```

---

## Key Improvements & Fixes

1. **Migrated from CSS3 (`styl.css`) to Tailwind CSS**:
   - Eliminated mobile and browser blue rectangular tap/focus outlines (`-webkit-tap-highlight-color: transparent`, `focus:outline-none`, `select-none`).
   - Preserved the exact Dark ("Luminous Void") and Light color palettes via semantic Tailwind tokens (`bg-surface`, `text-main`, `text-accent`, `border-theme`, `bg-primary`, etc.).
   - Simplified the theme toggle button to display **only the Sun/Moon symbol** without text labels.
2. **Instant Reactive Participant Deletion in View List**:
   - Fixed the bug where deleting a participant in the **View List** tab required a manual page reload.
   - `executeDelete()` now immediately removes the participant from `AttendX.State.attendance` (using normalized string ID comparison) and invokes `updateAttendanceUI()` to refresh the participant list, `Total / Attended / Pre-reg` counters, and `Branch Summary` in real time.
   - Updated the Supabase Realtime `DELETE` subscription and added `ALTER TABLE attendance REPLICA IDENTITY FULL` in `backend/database/schema.sql` so multi-device deletions sync seamlessly.
3. **Security & Edge-Case Hardening**:
   - **DOM XSS Prevention**: Escaped all untrusted strings (`ev.name`, `ev.organization`, `a.rollNo`, `a.branch`) via `escapeHtml()` and replaced inline `onclick` string interpolations with `data-*` event listeners.
   - **Password Exposure Prevention**: `fetchRecentEvents()` no longer selects the `password` column into browser memory, and new event passwords are hashed with SHA-256 (`Web Crypto API`) while maintaining backward compatibility.
   - **Authorization Scope Reset**: Switching or joining a different event automatically resets `state.editAuthorized = false` and `state.pendingDeleteId = null`.
   - **Rate Limiting & Session Timeout**: Added brute-force protection on sign-in and event password checks plus a 30-minute inactivity auto-logout.
   - **CSV Upload Validation**: Added 5 MB file size enforcement, `.csv` extension checking, automatic header row skipping (`Roll No`, `Registration Number`), and intra-file deduplication with `upsert` conflict handling.

---

## Quick Start

1. Copy `config.example.js` to `config.js` and fill in your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Run the SQL scripts in `backend/database/schema.sql` and `backend/database/rls_policies.sql` in your Supabase SQL Editor.
3. Start any local static server in the project root:
   ```bash
   python3 -m http.server 8000
   ```
4. Open `http://localhost:8000` in your browser.
