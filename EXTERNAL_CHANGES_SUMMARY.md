# External Setup Quick Reference

## 📋 EXTERNAL CHANGES AT A GLANCE

### Category 1: Environment & Configuration ⚙️

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Create `.env` file | ❌ TODO | 🔴 CRITICAL | Copy `.env.example` → `.env`, add credentials |
| Supabase project | ❌ TODO | 🔴 CRITICAL | Create at supabase.com |
| Get Supabase URL | ❌ TODO | 🔴 CRITICAL | From Supabase dashboard → Settings → API |
| Get Supabase Key | ❌ TODO | 🔴 CRITICAL | From Supabase dashboard → Settings → API |
| Configure `.env` file | ❌ TODO | 🔴 CRITICAL | Add URL and key to `.env` |

### Category 2: Database Schema 🗄️

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Create `events` table | ❌ TODO | 🔴 CRITICAL | Run SQL from EXTERNAL_SETUP.md |
| Create `attendance` table | ❌ TODO | 🔴 CRITICAL | Run SQL from EXTERNAL_SETUP.md |
| Create `audit_logs` table | ❌ TODO | 🔴 CRITICAL | Run SQL from EXTERNAL_SETUP.md |
| Create indexes | ❌ TODO | 🟠 HIGH | Run index SQL from EXTERNAL_SETUP.md |
| Verify tables created | ❌ TODO | 🟠 HIGH | Check Supabase Table Editor |

### Category 3: Security (RLS) 🔐

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Enable RLS on tables | ❌ TODO | 🔴 CRITICAL | Run SQL from EXTERNAL_SETUP.md |
| Create RLS policies | ❌ TODO | 🔴 CRITICAL | Run policy SQL from EXTERNAL_SETUP.md |
| Test RLS policies | ❌ TODO | 🟠 HIGH | Login and test data access |

### Category 4: Authentication 🔑

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Enable Email Auth | ❌ TODO | 🔴 CRITICAL | Verify in Supabase → Authentication |
| Configure OAuth (Google) | ❌ TODO | 🟡 OPTIONAL | Follow Google Cloud setup in EXTERNAL_SETUP.md |
| Set Redirect URLs | ❌ TODO | 🟠 HIGH | Add localhost & production URLs |
| Test Email Login | ❌ TODO | 🟠 HIGH | Try registering with email |

### Category 5: Infrastructure 🚀

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Select Hosting | ❌ TODO | 🔴 CRITICAL | Choose: Vercel/Netlify/GitHub Pages/Self-hosted |
| Get SSL Certificate | ❌ TODO | 🔴 CRITICAL | Let's Encrypt/Cloudflare (free) |
| Register Domain | ❌ TODO | 🟡 OPTIONAL | Namecheap/GoDaddy (optional but recommended) |
| Deploy Application | ❌ TODO | 🔴 CRITICAL | Push to hosting platform |
| Set Environment Vars | ❌ TODO | 🔴 CRITICAL | Add `.env` vars in hosting dashboard |
| Configure CORS | ❌ TODO | 🟠 HIGH | Add headers (see EXTERNAL_SETUP.md) |

### Category 6: Features 💡

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| Enable Realtime Sync | ❌ TODO | 🟠 HIGH | Check Supabase → Realtime |
| Enable Audit Logging | ✅ DONE | 🟠 HIGH | Already in code (just verify table exists) |
| Enable Backups | ❌ TODO | 🟡 OPTIONAL | Supabase → Settings → Backups |

### Category 7: Monitoring 📊

| Item | Status | Priority | Action |
|------|--------|----------|--------|
| View Audit Logs | ❌ TODO | 🟡 OPTIONAL | Supabase → Table Editor → audit_logs |
| Set Up Alerts | ❌ TODO | 🟡 OPTIONAL | Datadog/Sentry integration |
| Configure Backups | ❌ TODO | 🟡 OPTIONAL | Supabase → Settings → Backups |

---

## 🎯 CRITICAL PATH (What MUST be done)

```
1. Create Supabase Project
   └─> Get URL & API Key
2. Create .env File
   └─> Add Supabase Credentials
3. Create Database Tables
   └─> events, attendance, audit_logs
4. Create RLS Policies
   └─> Security configuration
5. Enable Authentication
   └─> Email + Google (optional)
6. Deploy to Hosting
   └─> Vercel/Netlify/etc
7. Test Everything
   └─> Use TESTING.md
```

---

## 📊 EXTERNAL SETUP EFFORT ESTIMATE

| Phase | Time | Difficulty | Who |
|-------|------|-------------|-----|
| Create Supabase account | 10 min | Easy | Developer |
| Create database tables | 15 min | Easy | DBA/Developer |
| Configure RLS policies | 20 min | Medium | Security Lead |
| Setup authentication | 15 min | Easy | Developer |
| Configure hosting | 20 min | Medium | DevOps |
| Deploy application | 10 min | Easy | DevOps |
| Configure SSL/HTTPS | 15 min | Medium | DevOps |
| Test everything | 30 min | Medium | QA/Developer |
| **TOTAL** | **~2 hours** | **Low-Medium** | **Team** |

---

## 🔗 EXTERNAL DEPENDENCIES MAP

```
Supabase Account
├─ Database Project
│  ├─ Tables (events, attendance, audit_logs)
│  ├─ RLS Policies
│  ├─ Authentication (Email + OAuth)
│  └─ Realtime Enabled
├─ API Credentials
│  ├─ SUPABASE_URL
│  └─ SUPABASE_ANON_KEY
└─ Environment Settings
   └─ Session Timeout, Rate Limits, etc.

Hosting Platform (Vercel/Netlify/etc.)
├─ Static Files
│  ├─ index.html
│  ├─ app.js
│  ├─ styl.css
│  └─ utils/*
├─ Environment Variables
│  ├─ .env (production)
│  └─ API Keys
└─ SSL/HTTPS Certificate
   └─ Auto-provisioned or provided

Domain (Optional but Recommended)
├─ DNS Records
│  └─ Point to hosting platform
├─ SSL Certificate
│  └─ Verified for domain
└─ Email Configuration
   └─ Sender address setup

Browser Client
├─ JavaScript Enabled
├─ Cookies Enabled
├─ HTTPS Support
└─ Modern Browser (Chrome 90+, Firefox 88+, Safari 14+)
```

---

## 🚨 COMMON EXTERNAL ISSUES & FIXES

### Issue 1: "Supabase is undefined"
```
❌ Problem: Supabase library not loading
🔍 Debug: Check browser console for 404 errors
✅ Fix: Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env are correct
```

### Issue 2: "RLS policy denied" on database operations
```
❌ Problem: Cannot read/write to database
🔍 Debug: Check Supabase RLS policies
✅ Fix: Ensure RLS policies are created correctly
```

### Issue 3: "Audit logs table doesn't exist"
```
❌ Problem: Audit logging fails silently
🔍 Debug: Check Supabase table list
✅ Fix: Create audit_logs table with provided SQL
```

### Issue 4: "Google OAuth redirect failed"
```
❌ Problem: OAuth callback fails
🔍 Debug: Check Supabase redirect URLs
✅ Fix: Add `https://your-domain.com/callback` to Supabase
```

### Issue 5: "Real-time sync not working"
```
❌ Problem: Changes not reflected in real-time
🔍 Debug: Check Supabase Realtime status
✅ Fix: Enable Realtime and add tables to publication
```

---

## 🔑 SECRET MANAGEMENT

### Files With Secrets (MUST NOT COMMIT)

```
.env                          ← NEVER commit (already in .gitignore)
SUPABASE_URL                  ← Keep secret
SUPABASE_ANON_KEY             ← Keep secret
```

### How to Handle Secrets

**Local Development:**
```bash
# Create .env (NOT committed)
cp .env.example .env
# Edit with your secrets
# .gitignore protects it
```

**Production Deployment:**

**Vercel:**
```
Dashboard → Settings → Environment Variables
Add:
- SUPABASE_URL
- SUPABASE_ANON_KEY
```

**Netlify:**
```
Dashboard → Settings → Build & Deploy → Environment
Add secrets (same as Vercel)
```

**GitHub Pages:**
```
Settings → Secrets → Add Repository secrets
(then use in .env at build time)
```

**Self-hosted:**
```
Server → .env file (in /var/www/yourapp/)
Restrict file permissions: chmod 600 .env
```

---

## ✅ EXTERNAL SETUP VERIFICATION

After completing all external setup, verify:

### ✓ Test 1: Supabase Connection
```javascript
// Open browser console and run:
fetch('https://your-supabase-url/rest/v1/events?limit=1', {
  headers: {
    'Authorization': 'Bearer your-anon-key',
    'apikey': 'your-anon-key'
  }
})
.then(r => r.json())
.then(d => console.log('✅ Connected:', d))
.catch(e => console.error('❌ Error:', e))
```

### ✓ Test 2: Database Tables Exist
1. Go to Supabase Dashboard
2. Table Editor → Check for:
   - events ✓
   - attendance ✓
   - audit_logs ✓

### ✓ Test 3: RLS Policies Work
1. Login to app
2. Try creating an event
3. Check if it appears in Supabase

### ✓ Test 4: Authentication Works
1. Try email signup
2. Check Supabase Users list
3. Try Google OAuth (if enabled)

### ✓ Test 5: Real-time Sync Works
1. Open app in 2 browser tabs
2. Create event in Tab 1
3. Tab 2 should auto-update

---

## 📞 EXTERNAL SUPPORT RESOURCES

| Need | Resource | Link |
|------|----------|------|
| Supabase Help | Official Docs | https://supabase.com/docs |
| Database SQL | SQL Docs | https://supabase.com/docs/guides/database |
| Authentication | Auth Docs | https://supabase.com/docs/guides/auth |
| RLS Policies | RLS Docs | https://supabase.com/docs/guides/auth/row-level-security |
| Hosting (Vercel) | Vercel Docs | https://vercel.com/docs |
| Hosting (Netlify) | Netlify Docs | https://docs.netlify.com |
| SSL Certificates | Let's Encrypt | https://letsencrypt.org |
| OAuth Setup | Google Cloud | https://console.cloud.google.com |

---

## 🎓 EXTERNAL SETUP TRAINING

### For Developers:
1. Supabase fundamentals (30 min)
2. Database design (30 min)
3. Authentication setup (20 min)
4. Deployment process (20 min)

### For DevOps:
1. Hosting platform setup (30 min)
2. HTTPS/SSL configuration (20 min)
3. Environment management (20 min)
4. Monitoring & alerts (20 min)

### For Security:
1. RLS policy design (30 min)
2. CORS configuration (20 min)
3. Security headers (20 min)
4. Audit log review (20 min)

---

## 📋 PRE-LAUNCH EXTERNAL CHECKLIST

### Week Before Launch
- [ ] Supabase project created and tested
- [ ] All tables created with indexes
- [ ] RLS policies configured
- [ ] Authentication tested
- [ ] Hosting platform selected

### Days Before Launch
- [ ] Domain registered and configured
- [ ] SSL certificate obtained
- [ ] Environment variables set
- [ ] Backups configured
- [ ] Monitoring enabled

### Day of Launch
- [ ] Final testing completed
- [ ] Production `.env` verified
- [ ] Supabase in production mode
- [ ] Hosting deployed
- [ ] DNS propagated
- [ ] Audit logs verified

### After Launch
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Verify real-time sync
- [ ] Monitor rate limiting
- [ ] Review audit logs daily

---

*Last Updated: 2026-06-18*  
*For detailed setup instructions, see EXTERNAL_SETUP.md*
