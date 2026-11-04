# AttendX

Web app for tracking college event attendance with Supabase. Coordinators can create events, mark student attendance, upload pre-registration CSVs, and export branch-wise Excel sheets. Students can log in to check if their roll number has been marked present.

## Setup

1. Copy `config.example.js` to `config.js` and add your Supabase project URL and anon key:
   ```js
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```
2. Run `backend/database/schema.sql` and `backend/database/rls_policies.sql` in the Supabase SQL Editor to create the tables and policies.

## Running Locally

Serve the root folder with any static file server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.
