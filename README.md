# AttendX — Campus Event Attendance System

## Setup Instructions

1. **Database Setup (Supabase)**
   - **Fresh Install (Destructive)**: Open the Supabase SQL Editor and run [`backend/database/schema.sql`](backend/database/schema.sql).
   - **Existing Database Upgrade (Non-Destructive)**: Open the Supabase SQL Editor and run [`backend/database/migration.sql`](backend/database/migration.sql) to add `is_single_day` and `end_date` and update `public.is_event_active()`.

2. **Frontend Configuration**
   - Copy `config.example.js` to `config.js` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY` (already pre-filled in `config.js` for your project).
   - Note: `config.js` is listed in `.gitignore` so your keys are not committed to public repositories.

3. **Transactional Email Setup (Vercel Serverless Function `api/send-email.js`)**
   - Add the following Environment Variables in **Vercel Dashboard → Project Settings → Environment Variables** (for Production, Preview, and Development):
     - `RESEND_API_KEY`: Your Resend API key (`re_...`) — **or** `BREVO_API_KEY` (`xkeysib-...`) if using Brevo.
     - `EMAIL_FROM`: Verified sender address (e.g., `AttendX <onboarding@resend.dev>` or your verified domain address).
   - Redeploy your Vercel project after saving the environment variables so `/api/send-email` is active.
