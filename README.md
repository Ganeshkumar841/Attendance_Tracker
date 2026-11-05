# AttendX

Web application for tracking college event attendance using Supabase. Coordinators can create scheduled events with start and end times, record student attendance, upload pre-registration CSV files, manage event passwords, and export branch-wise Excel sheets. Students can view live event attendance lists and check their status.

## Setup

1. Copy `config.example.js` to `config.js` and configure your Supabase project credentials:
   ```js
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```
   - `SUPABASE_URL`: Your Supabase project endpoint URL.
   - `SUPABASE_ANON_KEY`: Your Supabase public anonymous client key.

2. Run `backend/database/schema.sql` and `backend/database/rls_policies.sql` in the Supabase SQL Editor to create the tables, triggers, and row-level security policies.

## Running the Application

Serve the project root directory with any static HTTP server:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.
