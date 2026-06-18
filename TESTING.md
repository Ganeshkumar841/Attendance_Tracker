# AttendX Security & UX Improvements - Testing Guide

## 🔍 Testing Checklist

### Phase 1: Security Testing

#### 1.1 Configuration & Secrets
- [ ] Check browser DevTools console - NO hardcoded Supabase keys visible
- [ ] Verify `.env` file is in `.gitignore`
- [ ] Test `.env.example` loads correctly as fallback
- [ ] Verify `config.js` loads environment variables properly

#### 1.2 Input Validation
- [ ] Try logging in with invalid email (e.g., "notanemail") - should show validation error
- [ ] Try password < 8 characters - should reject
- [ ] Try special characters in event name - should either sanitize or reject appropriately
- [ ] Try SQL injection payload in roll number - should be sanitized
- [ ] Try XSS payload (e.g., `<script>alert('xss')</script>`) in inputs - should be escaped

#### 1.3 Rate Limiting
- [ ] Try login 6 times rapidly with same email - 5th attempt should succeed, 6th should be blocked
- [ ] Verify error message shows "retry in Xs"
- [ ] Try password verification 4 times rapidly on join event - 3rd should succeed, 4th should be blocked
- [ ] Wait 15+ minutes and try login again - should reset rate limit

#### 1.4 Password Security
- [ ] Create event with password - password should show as "••••••" in display, NOT plaintext
- [ ] Check HTML modals - event password field should be type="password"
- [ ] Join event - password should not be logged to console or visible in DevTools

#### 1.5 File Upload Security
- [ ] Try uploading file > 5MB - should be rejected with file size error
- [ ] Try uploading non-CSV file (e.g., .txt) - should handle gracefully
- [ ] Upload valid CSV with 10 records - should work
- [ ] Upload CSV with special characters in roll numbers - should sanitize

#### 1.6 Audit Logging
- [ ] Check browser console for audit logger initialization
- [ ] Create event - should log to console if DEBUG=true
- [ ] Login and check Supabase audit_logs table for entry
- [ ] Verify log contains: email, timestamp, action type, user agent

### Phase 2: UI/UX Testing

#### 2.1 Validation Feedback
- [ ] Focus on email field - should show ARIA label in DevTools
- [ ] Blur with invalid email - red validation feedback should appear
- [ ] Fix email - feedback should clear
- [ ] Try create event without name - inline error should appear

#### 2.2 Loading States
- [ ] Click login button - button should show loading spinner
- [ ] Button should be disabled during request
- [ ] After response, button text should return to normal

#### 2.3 Error Handling
- [ ] Disconnect internet and try login - should show connection error with recovery suggestion
- [ ] With bad Supabase URL, try create event - should show specific error message, not generic
- [ ] Delete with wrong password - should show "Incorrect password", not generic error

#### 2.4 Accessibility
- [ ] Tab through login form - all fields should be keyboard navigable
- [ ] Press Tab on buttons - focus outline should be visible
- [ ] Use screen reader (NVDA/JAWS) - all fields should be labeled
- [ ] Check for alt text on icons (DevTools)

#### 2.5 Connection Status
- [ ] Look for connection status indicator in top-right corner
- [ ] Should show "Connected" with green dot
- [ ] Disconnect network - should show "Disconnected" with red dot

### Phase 3: Scalability Testing

#### 3.1 Pagination & Data
- [ ] Create event with 100+ attendance records
- [ ] List should paginate (show Load More or next page)
- [ ] Filtering should still work on paginated data

#### 3.2 Real-time Sync
- [ ] Open same event in two browser tabs
- [ ] Mark attendance in tab 1 - should appear in tab 2 within 2 seconds
- [ ] Delete entry in tab 2 - should disappear from tab 1

#### 3.3 Export Performance
- [ ] With 500+ students, click export - should complete without freezing UI
- [ ] Should download separate Excel files per branch

### Phase 4: Session Management

#### 4.1 Session Timeout
- [ ] Set `SESSION_TIMEOUT_MS=120000` in .env (2 minutes for testing)
- [ ] Login and wait 2+ minutes without interaction
- [ ] System should logout with "Session expired" message
- [ ] Click/interact within 2 minutes - timeout should reset

#### 4.2 Tab Sync
- [ ] Open two tabs of app
- [ ] Login in one tab - other tab should also show authenticated
- [ ] Logout in one tab - other tab should show login screen

### Phase 5: Browser Compatibility

#### 5.1 Modern Browsers
- [ ] Chrome/Edge 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Mobile Safari (iOS 14+)

#### 5.2 Features to Test on Each
- Login with Google OAuth
- CSV file upload
- Realtime sync
- Excel export
- All modals and forms

## 📊 Performance Testing

### Metrics to Monitor

```javascript
// In browser console:
performance.mark('login-start');
// ... perform login ...
performance.mark('login-end');
performance.measure('login', 'login-start', 'login-end');
console.log(performance.getEntriesByName('login')[0].duration);
```

- Login: < 2000ms
- Event creation: < 1500ms
- CSV upload (1000 records): < 3000ms
- Real-time sync: < 500ms latency

## 🔐 Security Penetration Checklist

### OWASP Top 10 Coverage

- [ ] A01:2021 - Broken Access Control: RLS policies configured
- [ ] A02:2021 - Cryptographic Failures: Passwords hashed via Supabase Auth
- [ ] A03:2021 - Injection: Input validation + sanitization implemented
- [ ] A04:2021 - Insecure Design: Security by design principles applied
- [ ] A05:2021 - Security Misconfiguration: Environment variables used
- [ ] A06:2021 - Vulnerable Components: Dependencies from CDN monitored
- [ ] A07:2021 - Authentication Failures: Rate limiting + session timeout
- [ ] A08:2021 - Software & Data Integrity: Code integrity maintained
- [ ] A09:2021 - Logging & Monitoring: Audit logs implemented
- [ ] A10:2021 - SSRF: N/A - client-side application

## ✅ Sign-Off Checklist

- [ ] All security tests passed
- [ ] All UI/UX tests passed
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Audit logs functional
- [ ] Rate limiting working
- [ ] Session timeout working
- [ ] No hardcoded secrets
- [ ] Ready for production

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set all environment variables securely
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up Supabase RLS policies
- [ ] Create audit logs table
- [ ] Test with real Supabase project
- [ ] Configure backups
- [ ] Set up monitoring/alerts
- [ ] Document emergency procedures
- [ ] Review security logs
