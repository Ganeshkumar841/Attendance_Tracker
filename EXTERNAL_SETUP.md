# External Changes Required for AttendX Improvements

## 🔄 Summary of External Dependencies

The code improvements require several external setup and configuration steps outside the codebase. This document outlines **everything that needs to be done externally** for the new security features, UI/UX improvements, and scalability features to work properly.

---

## 1️⃣ ENVIRONMENT CONFIGURATION

### What Needs to be Done Externally

**File to Create**: `.env` (in project root)

```env
# COPY FROM .env.example AND FILL IN YOUR VALUES

# ===== REQUIRED: SUPABASE CREDENTIALS =====
SUPABASE_URL=https://your-project-name.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===== OPTIONAL: CUSTOMIZE SECURITY SETTINGS =====
SESSION_TIMEOUT_MS=1800000          # 30 minutes (in milliseconds)
MAX_LOGIN_ATTEMPTS=5                # Attempts before lockout
LOGIN_ATTEMPT_WINDOW_MS=900000      # Time window in ms (15 min)
MAX_FILE_SIZE_MB=5                  # CSV file upload limit

# ===== OPTIONAL: PAGINATION =====
ATTENDANCE_PAGE_SIZE=50             # Records per page

# ===== OPTIONAL: FEATURES =====
ENABLE_LIVE_SYNC=true               # Real-time sync
ENABLE_AUDIT_LOGGING=true           # Audit trail

# ===== OPTIONAL: DEBUG =====
DEBUG=false                         # Show debug logs
```

### How to Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Go to **Settings → API** in your project dashboard
4. Find:
   - **Project URL** → Use as `SUPABASE_URL`
   - **anon public** key → Use as `SUPABASE_ANON_KEY`
5. Copy these into your `.env` file

**⚠️ IMPORTANT**: 
- `.env` should **NEVER be committed** to git (already in `.gitignore`)
- Each developer/environment needs their own `.env` file
- Keep credentials secure and private

---

## 2️⃣ SUPABASE DATABASE SCHEMA

### What Needs to be Done Externally

You must create 3 tables in your Supabase database. Go to **SQL Editor** in Supabase and run these commands:

### Table 1: Events

```sql
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  venue TEXT,
  password TEXT NOT NULL,
  organization TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(created_by);
```

### Table 2: Attendance

```sql
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  roll_no TEXT NOT NULL,
  year INTEGER,
  year_label TEXT,
  branch TEXT,
  num TEXT,
  status TEXT DEFAULT 'attended' CHECK (status IN ('attended', 'preregistered')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT,
  UNIQUE(event_id, roll_no)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(event_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_rollno ON attendance(roll_no);
```

### Table 3: Audit Logs (NEW - For Security Features)

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  log_type TEXT NOT NULL,
  user_email TEXT,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  url TEXT
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_logs(log_type);
```

### Verification

After running the SQL:
1. Go to **Table Editor** in Supabase
2. You should see: `events`, `attendance`, `audit_logs` tables
3. Click each table to verify columns are correct

---

## 3️⃣ SUPABASE ROW-LEVEL SECURITY (RLS)

### What Needs to be Done Externally

Security policies need to be configured. Go to **SQL Editor** and run:

### Enable RLS on Tables

```sql
-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

### Create Policies

```sql
-- ===== EVENTS TABLE POLICIES =====

-- Everyone can view events (needed for join functionality)
CREATE POLICY "Anyone can view events"
ON events FOR SELECT
USING (true);

-- Users can insert events (created_by set to their email)
CREATE POLICY "Authenticated users can create events"
ON events FOR INSERT
WITH CHECK (auth.role() = 'authenticated_user');

-- Users can update their own events
CREATE POLICY "Users can update their own events"
ON events FOR UPDATE
USING (auth.role() = 'authenticated_user')
WITH CHECK (auth.role() = 'authenticated_user');

-- Users can delete their own events
CREATE POLICY "Users can delete their own events"
ON events FOR DELETE
USING (auth.role() = 'authenticated_user');


-- ===== ATTENDANCE TABLE POLICIES =====

-- Everyone can view attendance (real-time sync)
CREATE POLICY "Anyone can view attendance"
ON attendance FOR SELECT
USING (true);

-- Authenticated users can insert attendance
CREATE POLICY "Users can insert attendance"
ON attendance FOR INSERT
WITH CHECK (auth.role() = 'authenticated_user');

-- Users can update attendance
CREATE POLICY "Users can update attendance"
ON attendance FOR UPDATE
WITH CHECK (auth.role() = 'authenticated_user');

-- Users can delete attendance
CREATE POLICY "Users can delete attendance"
ON attendance FOR DELETE
USING (auth.role() = 'authenticated_user');


-- ===== AUDIT LOGS TABLE POLICIES =====

-- Anyone can insert audit logs
CREATE POLICY "Anyone can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- Only admin can read audit logs (for future)
-- For now, anyone can view
CREATE POLICY "Anyone can view audit logs"
ON audit_logs FOR SELECT
USING (true);
```

### Verification

1. Go to **Authentication → Policies** in Supabase
2. Select each table and verify policies exist
3. Test by logging in and checking if you can create events

---

## 4️⃣ SUPABASE AUTHENTICATION SETUP

### What Needs to be Done Externally

Go to **Authentication** section in Supabase:

#### Step 1: Enable Email Auth

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled (should be by default)
3. Configure email settings if needed

#### Step 2: Optional - Enable Google OAuth

To enable Google login (from index.html button):

1. Go to **Authentication → Providers → Google**
2. Click **Enable**
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Set redirect URI to: `https://your-supabase-url.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

#### Step 3: Configure Redirect URL

1. Go to **Authentication → URL Configuration**
2. Add your redirect URLs:
   - Local: `http://localhost:8000`
   - Production: `https://yourdomain.com`

### Verification

1. Try logging in with email/password
2. Try Google login (if enabled)
3. Check that you can create events after login

---

## 5️⃣ INFRASTRUCTURE & DEPLOYMENT

### What Needs to be Done Externally

#### For Local Development

```bash
# Create .env file with your values
cp .env.example .env
# Edit .env with your Supabase credentials

# Start a local web server
python3 -m http.server 8000
# OR
npx http-server
# OR use any static server

# Visit: http://localhost:8000
```

**Requirements:**
- Python 3 OR Node.js (for local server)
- Modern browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection

#### For Production Deployment

**Required:**

1. **Web Hosting** - Any static file hosting:
   - Vercel
   - Netlify
   - GitHub Pages
   - AWS S3 + CloudFront
   - Self-hosted nginx/Apache

2. **SSL/TLS Certificate** - For HTTPS
   - Let's Encrypt (free)
   - Cloudflare (free)
   - AWS ACM (free)
   - Paid certificates

3. **Domain Name** - Custom domain
   - yourorganization.com
   - attendance.yourorg.com
   - etc.

4. **Environment Variables** - Production `.env`
   - Set via hosting platform (not hardcoded)
   - Different credentials than development

**Example - Vercel Deployment:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Go to Settings → Environment Variables
# Add: SUPABASE_URL, SUPABASE_ANON_KEY

# Update .env.production
SUPABASE_URL=your-production-url
SUPABASE_ANON_KEY=your-production-key
```

---

## 6️⃣ CORS & SECURITY HEADERS

### What Needs to be Done Externally

Configure your hosting/server to send proper headers:

**Headers to Add:**

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;
```

**For Vercel** (create `vercel.json`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**For nginx:**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert;
    ssl_certificate_key /path/to/key;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    location / {
        root /path/to/attendance_tracker;
        try_files $uri $uri/ =404;
    }
}
```

---

## 7️⃣ MONITORING & LOGGING

### What Needs to be Done Externally

#### View Audit Logs

Audit logs are stored in Supabase `audit_logs` table. To view them:

1. Go to **Supabase Dashboard → Table Editor**
2. Click **audit_logs** table
3. View entries showing:
   - `log_type`: What happened (login, event_created, etc.)
   - `user_email`: Who did it
   - `timestamp`: When
   - `details`: Additional info
   - `user_agent`: Browser info

#### Export Audit Logs

```sql
-- Query for compliance/analysis
SELECT * FROM audit_logs 
WHERE timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;

-- Export as CSV
-- (Use Supabase UI export button)
```

#### Set Up Monitoring (Optional)

- **Datadog**: Connect to Supabase for monitoring
- **LogRocket**: Track user sessions and errors
- **Sentry**: Monitor application errors
- **Google Analytics**: Track usage patterns

---

## 8️⃣ SUPABASE REALTIME (for real-time sync)

### What Needs to be Done Externally

Realtime sync should work automatically, but verify:

1. Go to **Supabase Dashboard → Realtime**
2. Click **Realtime** tab
3. Make sure it's **Enabled**
4. Verify replication for:
   - `attendance` table
   - `events` table

If not enabled:

```sql
-- Enable realtime for attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
```

**Test Real-time:**
1. Open same event in 2 browser tabs
2. Mark attendance in Tab 1
3. Tab 2 should update within 1-2 seconds

---

## 9️⃣ BACKUP & DISASTER RECOVERY

### What Needs to be Done Externally

#### Supabase Backup

1. Go to **Settings → Backups**
2. Enable **Backup Schedule**:
   - Recommended: Daily backups
   - Retention: 30 days minimum

#### Manual Backup

```sql
-- Export attendance data
SELECT * FROM attendance;

-- Export events data
SELECT * FROM events;

-- Export audit logs
SELECT * FROM audit_logs;

-- Save as CSV or JSON backup
```

---

## 🔟 BROWSER & CLIENT REQUIREMENTS

### What Needs to be Done Externally

**Supported Browsers:**
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android)

**Browser Features Required:**
- JavaScript enabled (ES6+)
- Cookies/SessionStorage enabled
- HTTPS support
- localStorage API

**User Requirements:**
- Stable internet connection (for real-time sync)
- Modern device (laptop, desktop, tablet)

**Network Requirements:**
- Download: 100 Kbps minimum
- Upload: 50 Kbps minimum
- Latency: <500ms preferred
- For CSV uploads: Allow 1 Mbps/5MB file

---

## 📋 EXTERNAL SETUP CHECKLIST

### Before Going Live

- [ ] `.env` file created with Supabase credentials
- [ ] 3 database tables created (events, attendance, audit_logs)
- [ ] Indexes created for performance
- [ ] RLS policies configured
- [ ] Email authentication enabled
- [ ] Google OAuth configured (if using)
- [ ] Redirect URLs set in Supabase
- [ ] SSL/TLS certificate obtained
- [ ] Domain name configured
- [ ] Hosting platform selected
- [ ] Environment variables set on hosting
- [ ] CORS headers configured
- [ ] Security headers added
- [ ] Backups enabled
- [ ] Realtime enabled
- [ ] Testing completed (TESTING.md)
- [ ] Audit logging verified
- [ ] Rate limiting tested
- [ ] Error messages reviewed
- [ ] Performance benchmarked
- [ ] Accessibility tested

---

## 🆘 TROUBLESHOOTING EXTERNAL ISSUES

### "Invalid Supabase URL" Error

```
❌ SUPABASE_URL not configured properly
✅ Solution: Add SUPABASE_URL to .env with your project URL
```

### "Unauthorized" When Calling Database

```
❌ RLS policies not configured
✅ Solution: Run the RLS policy SQL commands in Supabase
```

### "Cannot create event" Error

```
❌ Audit logs table doesn't exist
✅ Solution: Create audit_logs table with provided SQL
```

### Real-time Sync Not Working

```
❌ Realtime not enabled
✅ Solution: Go to Supabase Realtime and enable for tables
```

### CSV Upload Fails with "File too large"

```
❌ File exceeds MAX_FILE_SIZE_MB setting
✅ Solution: Increase MAX_FILE_SIZE_MB in .env (or reduce file size)
```

### Session Expires Too Quickly

```
❌ SESSION_TIMEOUT_MS set too low
✅ Solution: Increase value in .env (default 1800000 = 30 min)
```

### Rate Limiting Too Strict

```
❌ MAX_LOGIN_ATTEMPTS too low
✅ Solution: Adjust MAX_LOGIN_ATTEMPTS in .env (default 5)
```

---

## 📞 EXTERNAL SERVICE ACCOUNTS NEEDED

### Create Accounts For:

1. **Supabase** (https://supabase.com)
   - Free tier available
   - Project for databases, auth, realtime

2. **Hosting Service** (pick one)
   - Vercel (free tier)
   - Netlify (free tier)
   - GitHub Pages (free)
   - Self-hosted server

3. **Domain Registrar** (optional but recommended)
   - Namecheap
   - GoDaddy
   - Cloudflare
   - Domain.com

4. **Google Cloud** (if using OAuth)
   - Google Cloud Console
   - OAuth 2.0 credentials

---

## 📊 EXTERNAL DEPENDENCIES SUMMARY

| Component | External? | Responsibility | Required? |
|-----------|-----------|----------------|-----------|
| `.env` file | ✅ Yes | Developer | ✅ Critical |
| Supabase account | ✅ Yes | Organization | ✅ Critical |
| Database tables | ✅ Yes | DBA/Admin | ✅ Critical |
| RLS policies | ✅ Yes | Security team | ✅ Critical |
| HTTPS/SSL | ✅ Yes | DevOps/Admin | ✅ Critical |
| Hosting platform | ✅ Yes | DevOps/Admin | ✅ Critical |
| Domain name | ✅ Yes | Organization | ⚠️ Recommended |
| Google OAuth | ✅ Yes | Google account | ⚠️ Optional |
| Monitoring tools | ✅ Yes | DevOps/Admin | ⚠️ Optional |
| Email service | ✅ Yes | Supabase | ⚠️ Optional |

---

## 🎯 QUICK START EXTERNAL SETUP (5 STEPS)

1. **Create Supabase Project**
   - Go to supabase.com
   - Create new project
   - Get URL and API key

2. **Create `.env` File**
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

3. **Create Database Tables**
   - Copy SQL from section 2️⃣
   - Paste in Supabase SQL Editor
   - Run all commands

4. **Configure RLS Policies**
   - Copy SQL from section 3️⃣
   - Paste in Supabase SQL Editor
   - Run all commands

5. **Test Locally**
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   # Try logging in
   ```

✅ Ready to use!

---

## 📝 EXTERNAL DOCUMENTATION REFERENCES

- **Supabase Setup**: https://supabase.com/docs/guides/getting-started
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **OWASP Security**: https://owasp.org/www-project-top-ten/

---

*Last Updated: 2026-06-18*  
*For technical support, see TESTING.md and IMPROVEMENTS.md*
