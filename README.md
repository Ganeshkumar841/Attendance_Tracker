# AttendX — Event Attendance System (Coordinator & Student Portals)

AttendX is a real-time college event attendance management web application built for both **Event Coordinators / Staff** and **Students**. It features a "Luminous Void" dark and Google Workspace light user interface powered by **Tailwind CSS**, synchronized smooth dark/light mode transitions, post-authentication role selection, instant reactive UI updates, Supabase real-time synchronization, dynamic academic year calculation, and branch-wise Excel exporting.

---

## Key Features

1. **Smooth Dark / Light Mode Transitions**:
   - Synchronized CSS color, border, shadow, and radial-glow cross-fading (`340ms cubic-bezier(0.4, 0, 0.2, 1)`) across all surfaces while preserving the exact Luminous Void (Dark) and Google Workspace (Light) color palettes and keeping the header toggle icon clean.
2. **Post-Authentication Role Selection (`Coordinator / Staff` vs. `Student`)**:
   - **Coordinator / Staff Login**: Full access to create events, join existing events using Event ID & Password, mark attendance, bulk-upload Pre-registration CSVs, delete records with password verification, and export branch-wise Excel reports.
   - **Student Login (Read-Only)**: Allows students to look up any active campus event by Event ID (or select from recent events) without exposing event passwords. Directs students exclusively to the **View List** section with an instant **Roll Number Attendance Status Checker** while hiding and blocking the **Entry** and **Export** tabs and disabling all record modifications/deletions.

---

## Project Folder Structure

```text
Attendance_Tracker/
├── index.html                        # Application entry point
├── config.example.js                 # Supabase environment configuration template
├── README.md                         # Project documentation
│
├── frontend/                         # Frontend UI Layer (Tailwind CSS + Modular JS)
│   ├── app.js                        # Main frontend bootstrapper, role-guarded router & state store
│   ├── components/
│   │   ├── header.js                 # Top navbar with brand, role badge & symbol-only theme toggle
│   │   ├── footer.js                 # Global application footer
│   │   ├── modals.js                 # Coordinator-guarded auth verification & delete modals
│   │   └── toast.js                  # Toast notification & password eye toggle
│   ├── pages/
│   │   ├── signin.js                 # Sign In, Sign Up, Forgot Password & OTP page
│   │   ├── menu.js                   # Post-auth Role Selection & Coordinator dashboard menu
│   │   ├── events.js                 # Coordinator Create/Join Event & Student Event Lookup portal
│   │   ├── attendance.js             # Attendance workspace (role-aware tab & panel enforcement)
│   │   ├── viewList.js               # Live View List, Roll Status Checker & Coordinator Delete
│   │   └── exportPage.js             # Coordinator Branch Summary, Excel Export & Session Actions
│   ├── styles/
│   │   ├── tailwind.config.js        # Tailwind CSS theme mapping to custom palette
│   │   └── theme.css                 # Dark/Light CSS variables, smooth transition engine & tap reset
│   └── utils/
│       ├── sanitizer.js              # XSS escaping, roll parser & CSV validator
│       ├── theme.js                  # Smooth Dark/Light theme switcher (icon-only toggle)
│       └── exporter.js               # Coordinator-guarded SheetJS branch-wise Excel exporter
│
└── backend/                          # Backend Services, Security & Database Layer
    ├── config/
    │   ├── supabaseClient.js         # Singleton Supabase client initializer
    │   └── securityConfig.js         # Closure-sealed role guards, rate limits & SHA-256 hashing
    ├── middleware/
    │   ├── rateLimiter.js            # Brute-force protection for login, event passwords & lookups
    │   └── sessionManager.js         # 30-minute inactivity session timeout tracker
    ├── services/
    │   ├── authService.js            # Supabase Auth wrapper & friendly error sanitizer
    │   ├── eventService.js           # Event CRUD, public student lookup & password verification
    │   ├── attendanceService.js      # Attendance CRUD (coordinator-guarded) & Realtime channel
    │   └── auditService.js           # Non-blocking security audit logger
    └── database/
        ├── schema.sql                # PostgreSQL schema with REPLICA IDENTITY FULL
        └── rls_policies.sql          # Supabase Row-Level Security (RLS) policies
```

---

## Quick Start

1. Copy `config.example.js` to `config.js` and fill in your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. Run the SQL scripts in `backend/database/schema.sql` and `backend/database/rls_policies.sql` in your Supabase SQL Editor.
3. Start any local static server in the project root:
   ```bash
   python3 -m http.server 8000
   ```
4. Open `http://localhost:8000` in your browser.
