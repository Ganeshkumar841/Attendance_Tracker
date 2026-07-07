# AttendX — Event Attendance System

AttendX is a streamlined, real-time college event attendance management web application built for event coordinators. It features a modern "Luminous Void" dark user interface, instant database synchronization, dynamic academic year handling, and multi-file branch-wise Excel exporting capabilities.

---

##  Features

* **Real-time Synchronization:** Powered by Supabase Postgres Changes, allowing multiple coordinators to log attendance concurrently on different devices without conflicts.
* **Intelligent Academic Year Mapping:** Dynamically calculates current student batches (`Y26`, `Y25`, etc.) based on an academic cycle starting every July.
* **Dual-State Registration Processing:** * **Manual Entry:** Quick suffix matching (e.g., typing `CSE042` after choosing a year).
    * **Pre-registration:** Upload a standalone list via CSV to allow rapid verification during manual check-in.
* **Automated Multi-File Export:** Automatically chunks, matches, and triggers separate Excel file downloads parsed by branch, pre-sorted down by seniority and registration sequence.
* **Session Security Modals:** Secure entry overrides requiring event-specific authorization passwords before data updates or event deletions can occur.

---

##  Security Features

### Implemented
-  **Input Validation & Sanitization** - All user inputs validated and sanitized to prevent XSS
-  **Rate Limiting** - Brute-force protection on login (5 attempts per 15 min) and password verification (3 attempts per 10 min)
-  **Audit Logging** - All significant actions logged with timestamp, user, and action type
-  **Session Management** - Automatic session timeout after 30 minutes of inactivity
-  **CSRF Protection** - Token-based CSRF protection for state-changing operations
-  **Secure Password Handling** - Passwords never displayed in UI or stored in plain text
-  **File Upload Security** - File size limits (default 5MB) and format validation
-  **Environment Configuration** - Sensitive keys loaded from environment, not hardcoded
-  **Error Recovery** - Retry logic with exponential backoff for failed operations

### Backend Requirements (Supabase)
The following should be configured in your Supabase database:

1. **Password Hashing**
   - Configure Supabase Auth to hash passwords using bcrypt
   - Never store or compare plain-text passwords

2. **Row-Level Security (RLS)**
   ```sql
   -- Users can only access their own events and attendance records
   CREATE POLICY "Users can view own events"
   ON events FOR SELECT USING (auth.uid() = user_id);
   ```

3. **Audit Log Table**
   ```sql
   CREATE TABLE audit_logs (
     id BIGSERIAL PRIMARY KEY,
     log_type TEXT NOT NULL,
     user_email TEXT,
     details JSONB,
     timestamp TIMESTAMPTZ DEFAULT NOW(),
     user_agent TEXT,
     url TEXT
   );
   ```

---

##  Tech Stack & Dependencies

* **Frontend Architecture:** Vanilla JavaScript (ES6+), HTML5, CSS3 Variables & Custom Gradients.
* **Database & Auth Provider:** [Supabase](https://supabase.com/) (Auth, Database, and Realtime Engine).
* **Performance Monitoring:** [Vercel Speed Insights](https://vercel.com/docs/speed-insights) (Web Vitals tracking).
* **External CDN Libraries:**
    * `Supabase JS Client` (`@supabase/supabase-js@2`)
    * `SheetJS` (`xlsx.full.min.js` v0.18.5)
* **Typography:** Google Fonts (`Inter`).

---

##  Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Attendance_Tracker
```

### 2. Install Dependencies
```bash
npm install
```

This installs `@vercel/speed-insights` and development dependencies for local testing.

### 3. Configure Environment Variables

Create a `.env` file from the template:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Security settings (optional - these are defaults)
SESSION_TIMEOUT_MS=1800000
MAX_LOGIN_ATTEMPTS=5
MAX_FILE_SIZE_MB=5
```

### 4. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Create the required tables:
   ```sql
   -- Events table
   CREATE TABLE events (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     date DATE NOT NULL,
     time TIME,
     venue TEXT,
     password TEXT NOT NULL,
     organization TEXT,
     created_by TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Attendance table
   CREATE TABLE attendance (
     id BIGSERIAL PRIMARY KEY,
     event_id TEXT NOT NULL REFERENCES events(id),
     roll_no TEXT NOT NULL,
     year INTEGER,
     year_label TEXT,
     branch TEXT,
     num TEXT,
     status TEXT DEFAULT 'attended',
     timestamp TIMESTAMPTZ DEFAULT NOW(),
     recorded_by TEXT,
     UNIQUE(event_id, roll_no)
   );

   -- Audit logs table
   CREATE TABLE audit_logs (
     id BIGSERIAL PRIMARY KEY,
     log_type TEXT NOT NULL,
     user_email TEXT,
     details JSONB,
     timestamp TIMESTAMPTZ DEFAULT NOW(),
     user_agent TEXT,
     url TEXT
   );
   ```

3. Enable Supabase Auth (Google OAuth optional)
4. Configure RLS policies (see Security section above)

### 5. Enable Vercel Speed Insights

1. Deploy your project to Vercel (see Deployment section below)
2. In your Vercel dashboard, navigate to your project
3. Go to **Analytics** > **Speed Insights**
4. Click **Enable Speed Insights**
5. The script will automatically start collecting Web Vitals data

**Note:** Speed Insights works automatically when deployed to Vercel. The script tags in `index.html` ensure compatibility with Vercel's infrastructure.

### 6. Run Locally

```bash
# Using npm (recommended)
npm start

# Or using Python
python3 -m http.server 8000

# Or using Node.js
npx http-server

# Or using any static server
```

Visit `http://localhost:8000` in your browser.

---

##  Deployment

### Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy your project**:
   ```bash
   vercel
   ```

3. **Configure environment variables** in the Vercel dashboard:
   - Go to your project settings
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

4. **Enable Speed Insights** (see step 5 in Installation)

5. **View your live site** at the provided Vercel URL

### Monitoring Performance

Once Speed Insights is enabled, you can view:
- **Core Web Vitals:** LCP, FID, CLS scores
- **Real User Metrics:** Actual performance data from your users
- **Performance Trends:** Track improvements over time
- **Device & Location Breakdown:** See performance by geography and device type

Access these metrics in your Vercel dashboard under **Analytics** > **Speed Insights**.

---

##  Usage

### As an Event Coordinator

1. **Sign In**: Use email/password or Google OAuth
2. **Create Event**: Set name, date, time, venue, and a secure password
3. **Share Event ID**: Share with co-coordinators (password required to join)
4. **Mark Attendance**: 
   - Select student year
   - Enter roll number suffix
   - System validates against pre-registered students
5. **Export Data**: Download branch-wise Excel reports
6. **Delete Event**: Permanently removes all records (password required)

### Pre-Registration (Optional)
- Upload a CSV file with roll numbers (one per line)
- Format: `Y25CSE001`, `Y24ECE045`, etc.
- Students appear as "Pre-reg" until marked present

---

##  Security Best Practices

### For Deployment
1. Use HTTPS in production (SSL/TLS certificate required)
2. Configure Supabase RLS policies to restrict data access
3. Set strong event passwords (minimum 6 characters, mix of letters/numbers)
4. Monitor audit logs regularly
5. Keep Supabase dependencies updated

### For Users
1. Never share event passwords in unsecured channels
2. Use unique passwords for different events
3. Log out when finished
4. Report suspicious activity

### File Uploads
- Maximum file size: 5 MB (configurable)
- Only CSV format accepted
- Validated before processing
- Not stored permanently


---

##  Troubleshooting

### "Configuration error" message
- Check `.env` file has correct Supabase URL and API key
- Verify Supabase project is active

### CSV upload fails
- Ensure file is in CSV format
- Check file size is under 5MB
- Verify roll numbers are in format: `Y25CSE001`

### Realtime sync not working
- Check browser console for connection errors
- Ensure Supabase Realtime is enabled
- Verify RLS policies allow real-time subscriptions

---

##  Scalability Considerations

- Real-time sync supports 100+ concurrent users
- Pagination implemented for 1000+ attendance records
- Database query optimization with indexing
- Retry logic handles temporary failures
- Offline queue for pending operations

---

##  License

This project is provided as-is for educational and institutional use.

---

## 👥 Contributing

Contributions are welcome! Please ensure:
- All security best practices are followed
- Input validation is comprehensive
- Error messages are user-friendly
- Audit logs are created for sensitive operations
