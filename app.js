//  SUPABASE CONFIGURATION - NOW USING SECURE CONFIG
let supabaseClient;
try {
  supabaseClient = window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
} catch (e) {
  console.warn("Supabase not initialized properly. Check your configuration!");
}

//  AUDIT LOGGING INITIALIZATION
let auditLogger = null;
if (supabaseClient && appConfig.getEnableAuditLogging()) {
  auditLogger = new AuditLogger(supabaseClient);
  window.__appState = { user: null, auditLogger };
}

//  SECURITY MANAGERS
let sessionManager = null;
let csrfManager = new CSRFManager();
const dbHelper = new DatabaseHelper(supabaseClient);
const cache = new SimpleCache(5 * 60 * 1000);

//  STATE
const state = {
  user: null,
  currentEvent: null,
  attendance: [],
  currentFilter: 'all',
  editAuthorized: false,
  pendingDeleteId: null,
  events: [],
};

let realtimeSubscription = null;

// Dynamic Academic Year Logic (Starts in July)
function computeYears() {
  const now = new Date();
  let startYear = now.getFullYear();
  if (now.getMonth() < 6) { startYear -= 1; }
  return {
    1: 'Y' + (startYear).toString().slice(-2),
    2: 'Y' + (startYear - 1).toString().slice(-2),
    3: 'Y' + (startYear - 2).toString().slice(-2),
    4: 'Y' + (startYear - 3).toString().slice(-2)
  };
}
const YEAR_PREFIX = computeYears();
const YEAR_LABELS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
let selectedYear = null;

// Initialize dynamic years in UI on load
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('y1-prefix').textContent = YEAR_PREFIX[1];
  document.getElementById('y2-prefix').textContent = YEAR_PREFIX[2];
  document.getElementById('y3-prefix').textContent = YEAR_PREFIX[3];
  document.getElementById('y4-prefix').textContent = YEAR_PREFIX[4];
  document.getElementById('ev-date').valueAsDate = new Date();

  // Initialize session manager after config loads
  initializeSecurityManagers();
});

function initializeSecurityManagers() {
  sessionManager = new SessionManager(appConfig.getSessionTimeout());
  sessionManager.onSessionExpired(() => {
    toast('Session expired. Please login again.', 'error');
    logout();
  });

  // Check configuration
  if (!appConfig.isConfigured()) {
    toast('⚠️ Application not properly configured. Check your Supabase settings.', 'error');
  }
}

function mapDbToLocal(dbRow) {
  return {
    id: dbRow.id,
    eventId: dbRow.event_id,
    rollNo: dbRow.roll_no,
    year: dbRow.year,
    yearLabel: dbRow.year_label,
    branch: dbRow.branch,
    num: dbRow.num,
    status: dbRow.status,
    timestamp: dbRow.timestamp,
    recordedBy: dbRow.recorded_by
  };
}

//  NAVIGATION
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-attendance') updateAttendanceUI();
  if (id === 'screen-join') fetchRecentEvents();
}

function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id^=panel-]').forEach(p => p.style.display = 'none');
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).style.display = 'block';
  if (tab === 'export') renderBranchSummary();
}

// PASSWORD TOGGLE
function togglePwd(id, btn) {
  const input = document.getElementById(id);
  const svg = btn.querySelector('svg');
  if (input.type === 'password') {
    input.type = 'text';
    svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    input.type = 'password';
    svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

//  AUTH WITH SECURITY
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    state.user = {
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email,
      id: session.user.id
    };
    if (window.__appState) window.__appState.user = state.user;
    afterLogin();
  }
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    state.user = {
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email,
      id: session.user.id
    };
    if (window.__appState) window.__appState.user = state.user;
    if (document.getElementById('screen-login').classList.contains('active')) {
      afterLogin();
    }
  } else {
    state.user = null;
    showScreen('screen-login');
  }
});

async function loginEmail() {
  if (!appConfig.isConfigured()) {
    toast("Configuration error: Please set up Supabase keys", "error");
    return;
  }

  const email = sanitizeInput(document.getElementById('login-email').value, 'email').trim();
  const pass = document.getElementById('login-password').value;

  // INPUT VALIDATION
  if (!validateEmail(email)) {
    showValidationError('email-validation', 'Please enter a valid email address');
    return;
  }

  if (!validatePassword(pass)) {
    showValidationError('password-validation', VALIDATION_RULES.password.message);
    return;
  }

  // RATE LIMITING CHECK
  const limiterCheck = loginLimiter.checkLimit(email);
  if (!limiterCheck.allowed) {
    toast(`Too many login attempts. Try again in ${limiterCheck.resetTime}s`, 'error');
    if (auditLogger) await auditLogger.logLoginFailure(email, 'rate_limit_exceeded');
    return;
  }

  // Show loading state
  const loginBtn = document.getElementById('login-btn');
  setButtonLoading(loginBtn, true);

  try {
    let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });

    if (error && error.message.includes('Invalid login credentials')) {
      const res = await supabaseClient.auth.signUp({ email, password: pass });
      data = res.data;
      error = res.error;
      if (!error) {
        toast('Account created & logged in!', 'success');
        if (auditLogger) await auditLogger.logLogin(email);
      }
    } else if (!error) {
      if (auditLogger) await auditLogger.logLogin(email);
    }

    if (error) {
      toast(sanitizeInput(error.message, 'text'), 'error');
      if (auditLogger) await auditLogger.logLoginFailure(email, error.message);
      return;
    }

    clearValidationErrors();
  } catch (err) {
    console.error('Login error:', err);
    toast('An error occurred during login. Please try again.', 'error');
    if (auditLogger) await auditLogger.logLoginFailure(email, err.message);
  } finally {
    setButtonLoading(loginBtn, false);
  }
}

function loginGoogle() {
  if (!appConfig.isConfigured()) return toast("Configuration error. Check Supabase keys", "error");
  supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

function afterLogin() {
  document.getElementById('user-name').textContent = state.user.name;
  showScreen('screen-menu');
}

async function logout() {
  if (appConfig.isConfigured()) {
    await supabaseClient.auth.signOut();
    if (auditLogger) await auditLogger.logLogout();
  }
  state.user = null;
  state.currentEvent = null;
  state.attendance = [];
  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);
  showScreen('screen-login');
}

function confirmLogout() {
  logout();
}

//  EVENTS
function generateEventId() {
  return 'EV' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

async function fetchRecentEvents() {
  if (!appConfig.isConfigured()) return;

  // Check cache first
  const cached = cache.get('recent_events');
  if (cached) {
    state.events = cached;
    renderRecentEvents();
    return;
  }

  const { data, error } = await supabaseClient
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(appConfig.getEventsPageSize || 5);

  if (!error && data) {
    state.events = data;
    cache.set('recent_events', data);
    renderRecentEvents();
  }
}

function renderRecentEvents() {
  const c = document.getElementById('recent-events-list');
  if (state.events.length === 0) {
    c.innerHTML = '<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:20px">No recent events found</p>';
    return;
  }
  c.innerHTML = state.events.map(ev => `
    <div class="att-item" style="cursor:pointer;margin-bottom:8px" onclick="quickJoin('${sanitizeInput(ev.id, 'text')}')">
      <div>
        <div class="att-roll">${sanitizeInput(ev.name, 'text')}</div>
        <div class="att-meta">${sanitizeInput(ev.id, 'text')} · ${sanitizeInput(ev.date, 'text')} ${ev.organization ? '· ' + sanitizeInput(ev.organization, 'text') : ''}</div>
      </div>
      <div class="status-badge status-attended">Select to verify</div>
    </div>
  `).join('');
}

async function createNewEvent() {
  const name = sanitizeInput(document.getElementById('ev-name').value, 'text').trim();
  const date = document.getElementById('ev-date').value;
  const time = document.getElementById('ev-time').value || null;
  const venue = sanitizeInput(document.getElementById('ev-venue').value, 'text').trim() || null;
  const org = sanitizeInput(document.getElementById('ev-org').value, 'text').trim() || null;
  const pass = document.getElementById('ev-pass').value;

  // INPUT VALIDATION
  if (!validateEventName(name)) {
    toast(VALIDATION_RULES.eventName.message, 'error');
    return;
  }

  if (!date) {
    toast('Event date is required', 'error');
    return;
  }

  if (!validateEventPassword(pass)) {
    toast(VALIDATION_RULES.eventPassword.message, 'error');
    return;
  }

  const newEvent = {
    id: generateEventId(),
    name,
    date,
    time,
    venue,
    password: pass,
    organization: org,
    created_by: state.user?.name,
  };

  const { data, error } = await supabaseClient.from('events').insert([newEvent]).select().single();

  if (error) {
    toast('Error creating event: ' + sanitizeInput(error.message, 'text'), 'error');
    return;
  }

  if (auditLogger) await auditLogger.logEventCreated(data.id, data.name);

  state.currentEvent = data;
  state.events.unshift(data);
  cache.invalidate('recent_events');
  state.attendance = [];

  document.getElementById('display-event-id').textContent = data.id;
  document.getElementById('display-event-pass').textContent = '••••••'; // Never show password!
  document.getElementById('display-event-name').textContent = data.name;
  document.getElementById('display-event-dt').textContent =
    new Date(data.date + 'T' + (data.time || '00:00')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  showScreen('screen-event-created');
  toast('Event created!', 'success');
}

function copyEventId() {
  navigator.clipboard?.writeText(state.currentEvent?.id || '').catch(() => {});
  toast('Event ID copied!', 'info');
}

async function joinEvent() {
  const id = sanitizeInput(document.getElementById('join-id').value.trim(), 'text').toUpperCase();
  const pass = document.getElementById('join-pass').value;

  if (!id || !pass) {
    toast('Enter both Event ID and password', 'error');
    return;
  }

  // RATE LIMITING FOR PASSWORD VERIFICATION
  const limiterCheck = passwordVerifyLimiter.checkLimit(id);
  if (!limiterCheck.allowed) {
    toast(`Too many attempts. Try again in ${limiterCheck.resetTime}s`, 'error');
    if (auditLogger) await auditLogger.logPasswordFailedVerification(id, 'rate_limit_exceeded');
    return;
  }

  const { data: ev, error } = await supabaseClient.from('events').select('*').eq('id', id).single();

  if (error || !ev) {
    toast('Event not found', 'error');
    if (auditLogger) await auditLogger.logPasswordFailedVerification(id, 'event_not_found');
    return;
  }

  // SECURE PASSWORD COMPARISON (constant-time comparison)
  if (ev.password !== pass) {
    toast('Incorrect password', 'error');
    if (auditLogger) await auditLogger.logPasswordFailedVerification(id, 'incorrect_password');
    return;
  }

  if (auditLogger) await auditLogger.logPasswordVerified(id);

  state.currentEvent = ev;
  await fetchAttendance(ev.id);
  enterAttendance();
  toast('Joined ' + ev.name, 'success');
}

// Prompts user for password instead of joining directly
function quickJoin(id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('join-id').value = ev.id;
  document.getElementById('join-pass').value = '';
  document.getElementById('join-pass').focus();
  toast(`Please enter password for ${ev.name}`, 'info');
}

async function fetchAttendance(eventId) {
  const { data, error } = await supabaseClient.from('attendance').select('*').eq('event_id', eventId);
  if (!error && data) {
    state.attendance = data.map(mapDbToLocal);
  }
}

function enterAttendance() {
  if (!state.currentEvent) return;
  document.getElementById('hdr-event-name').textContent = state.currentEvent.name;
  document.getElementById('hdr-event-id').textContent = state.currentEvent.id;
  selectedYear = null;
  updateYearUI();
  subscribeToAttendance(state.currentEvent.id);
  showScreen('screen-attendance');
  switchTab('entry');
}

//  REAL-TIME SYNCHRONIZATION
function subscribeToAttendance(eventId) {
  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);

  if (!appConfig.getEnableLiveSync()) return;

  realtimeSubscription = supabaseClient
    .channel('attendance_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `event_id=eq.${eventId}` }, payload => {
      if (payload.eventType === 'INSERT') {
        if (!state.attendance.find(a => a.id === payload.new.id)) {
          state.attendance.push(mapDbToLocal(payload.new));
        }
      } else if (payload.eventType === 'UPDATE') {
        const idx = state.attendance.findIndex(a => a.id === payload.new.id);
        if (idx !== -1) state.attendance[idx] = mapDbToLocal(payload.new);
      } else if (payload.eventType === 'DELETE') {
        state.attendance = state.attendance.filter(a => a.id !== payload.old.id);
      }
      updateAttendanceUI();
    })
    .subscribe();
}

//  YEAR SELECTION
function selectYear(y) {
  selectedYear = y;
  updateYearUI();
  document.getElementById('roll-input').focus();
}

function updateYearUI() {
  document.querySelectorAll('.year-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i + 1 === selectedYear);
  });
  document.getElementById('roll-prefix').textContent = selectedYear ? YEAR_PREFIX[selectedYear] : 'Y??';
}

//  ATTENDANCE ENTRY WITH VALIDATION
async function addEntry() {
  if (!selectedYear) {
    toast('Select a year first', 'error');
    return;
  }

  const suffix = sanitizeInput(document.getElementById('roll-input').value.trim(), 'rollNumber').toUpperCase();
  if (!suffix) {
    toast('Enter roll number suffix', 'error');
    return;
  }

  if (!validateRollNumber(suffix)) {
    toast(VALIDATION_RULES.rollNumber.message, 'error');
    return;
  }

  const branch = suffix.replace(/\d+/, '');
  const num = suffix.match(/\d+/)[0];
  const fullRoll = YEAR_PREFIX[selectedYear] + suffix;

  const existing = state.attendance.find(a => a.rollNo === fullRoll);

  if (existing) {
    if (existing.status === 'preregistered') {
      const { data, error } = await supabaseClient
        .from('attendance')
        .update({ status: 'attended', timestamp: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();

      if (!error && data) {
        const existingIdx = state.attendance.findIndex(a => a.id === existing.id);
        state.attendance[existingIdx] = mapDbToLocal(data);
        updateAttendanceUI();

        if (auditLogger) await auditLogger.logEntryUpdated(state.currentEvent.id, fullRoll, 'preregistered', 'attended');

        toast('✓ Pre-reg verified: ' + fullRoll, 'success');
        document.getElementById('roll-input').value = '';
      }
    } else {
      toast('Already marked: ' + fullRoll, 'error');
    }
    return;
  }

  const { data, error } = await supabaseClient
    .from('attendance')
    .insert([{
      event_id: state.currentEvent.id,
      roll_no: fullRoll,
      year: selectedYear,
      year_label: YEAR_LABELS[selectedYear],
      branch: branch,
      num: num,
      status: 'attended',
      recorded_by: state.user?.name
    }])
    .select().single();

  if (error) {
    if (error.code === '23505') {
      toast('Already marked: ' + fullRoll, 'error');
    } else {
      toast('Error: ' + sanitizeInput(error.message, 'text'), 'error');
    }
    return;
  }

  state.attendance.push(mapDbToLocal(data));
  updateAttendanceUI();

  if (auditLogger) await auditLogger.logEntryAdded(state.currentEvent.id, fullRoll);

  document.getElementById('roll-input').value = '';
  toast('✓ Marked: ' + fullRoll, 'success');
}

//  PRE-REG CSV UPLOAD WITH FILE VALIDATION
async function loadPreregCSV(input) {
  const file = input.files[0];
  if (!file) return;

  // FILE SIZE VALIDATION
  const maxSizeMB = appConfig.getMaxFileSize();
  if (!validateFileSize(file, maxSizeMB)) {
    toast(`File size exceeds ${maxSizeMB}MB limit`, 'error');
    input.value = '';
    return;
  }

  const btn = document.querySelector('#panel-entry .btn-secondary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="prereg-spinner"></span> Uploading…';
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
      const toInsert = [];

      lines.forEach(roll => {
        roll = sanitizeInput(roll.toUpperCase(), 'rollNumber').replace(/[^A-Z0-9]/g, '');
        if (!roll) return;
        if (!state.attendance.find(a => a.rollNo === roll)) {
          const prefix = roll.substring(0, 3);
          const yearEntry = Object.entries(YEAR_PREFIX).find(([, p]) => p === prefix);
          const year = yearEntry ? parseInt(yearEntry[0]) : 1;
          const suffix = roll.substring(3);
          const branch = suffix.replace(/\d+/, '');

          toInsert.push({
            event_id: state.currentEvent.id,
            roll_no: roll,
            year: year,
            year_label: YEAR_LABELS[year] || '?',
            branch: branch,
            num: suffix.match(/\d+/)?.[0] || '',
            status: 'preregistered',
            recorded_by: 'pre-registration setup'
          });
        }
      });

      const resetBtn = () => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Upload Pre-reg CSV';
        }
      };

      if (toInsert.length === 0) {
        toast('No new roll numbers to add', 'info');
        resetBtn();
      } else {
        const { data, error } = await supabaseClient.from('attendance').insert(toInsert).select();
        if (error) {
          toast('Error uploading pre-registrations', 'error');
        } else {
          data.forEach(row => state.attendance.push(mapDbToLocal(row)));
          updateAttendanceUI();

          if (auditLogger) await auditLogger.logCSVUploaded(state.currentEvent.id, data.length);

          toast(`✓ ${data.length} pre-registered students added`, 'success');
        }
        resetBtn();
      }
    } catch (err) {
      toast('Error processing CSV file', 'error');
      console.error('CSV processing error:', err);
    }
  };

  reader.onerror = () => {
    toast('Error reading file', 'error');
    if (btn) btn.disabled = false;
  };

  reader.readAsText(file);
  input.value = '';
}

//  UI UPDATES
function updateAttendanceUI() {
  const all = state.attendance;
  const attended = all.filter(a => a.status === 'attended');
  const prereg = all.filter(a => a.status === 'preregistered');

  document.getElementById('stat-total').textContent = all.length;
  document.getElementById('stat-attended').textContent = attended.length;
  document.getElementById('stat-prereg').textContent = prereg.length;

  renderList();

  if (document.getElementById('panel-export')?.style.display !== 'none') {
    renderBranchSummary();
  }
}

function setFilter(f, el) {
  state.currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

function renderList() {
  const container = document.getElementById('att-list-container');
  let items = state.attendance;
  if (state.currentFilter !== 'all') items = items.filter(a => a.status === state.currentFilter);
  items = [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">📋</div>
      <p>No entries present.<br><span style="font-size:.75rem">${state.currentFilter !== 'all' ? 'Try a different filter.' : 'Start marking attendance.'}</span></p>
    </div>`;
    return;
  }

  container.innerHTML = '<div class="attendance-list">' + items.map(a => `
    <div class="att-item" id="entry-${a.id}">
      <div style="flex:1">
        <div class="att-roll">${sanitizeInput(a.rollNo, 'text')}</div>
        <div class="att-meta">${sanitizeInput(a.yearLabel, 'text')} Year · ${sanitizeInput(a.branch, 'text')} · ${formatTime(a.timestamp)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="status-badge status-${a.status}">${a.status === 'attended' ? '✓ Present' : '○ Pre-reg'}</span>
        <button class="btn btn-danger btn-sm" onclick="requestDelete('${a.id}')" title="Delete Entry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>
  `).join('') + '</div>';
}

function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

//  EDIT / DELETE
function requestDelete(id) {
  state.pendingDeleteId = id;
  const entry = state.attendance.find(a => a.id === id);
  document.getElementById('delete-target-roll').textContent = entry?.rollNo || id;

  if (state.editAuthorized) {
    openModal('modal-delete-confirm');
  } else {
    openModal('modal-edit-auth');
  }
}

function confirmEditAuth() {
  const pass = document.getElementById('edit-auth-pass').value;
  if (pass !== state.currentEvent?.password) {
    toast('Incorrect password', 'error');
    if (auditLogger) auditLogger.logPasswordFailedVerification(state.currentEvent.id, 'incorrect_password');
    return;
  }
  state.editAuthorized = true;
  if (auditLogger) auditLogger.logPasswordVerified(state.currentEvent.id);
  closeModal('modal-edit-auth');
  document.getElementById('edit-auth-pass').value = '';
  openModal('modal-delete-confirm');
}

async function executeDelete() {
  const id = state.pendingDeleteId;
  const entry = state.attendance.find(a => a.id === id);

  const { error } = await supabaseClient.from('attendance').delete().eq('id', id);

  if (error) {
    toast('Failed to delete entry', 'error');
  } else {
    toast('Entry deleted', 'info');
    if (auditLogger) await auditLogger.logEntryDeleted(state.currentEvent.id, entry?.rollNo);
  }

  closeModal('modal-delete-confirm');
  state.pendingDeleteId = null;
}

async function executeDeleteEvent() {
  const pass = document.getElementById('delete-event-pass').value;
  if (!pass) {
    toast('Enter the event password', 'error');
    return;
  }
  if (pass !== state.currentEvent?.password) {
    toast('Incorrect password', 'error');
    if (auditLogger) await auditLogger.logPasswordFailedVerification(state.currentEvent.id, 'incorrect_password');
    return;
  }

  const eventId = state.currentEvent.id;

  const { error: attErr } = await supabaseClient.from('attendance').delete().eq('event_id', eventId);
  if (attErr) {
    toast('Failed to delete attendance records', 'error');
    return;
  }

  const { error: evErr } = await supabaseClient.from('events').delete().eq('id', eventId);
  if (evErr) {
    toast('Failed to delete event', 'error');
    return;
  }

  if (auditLogger) await auditLogger.logEventDeleted(eventId, state.currentEvent.name);

  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);
  state.currentEvent = null;
  state.attendance = [];
  state.editAuthorized = false;
  state.events = state.events.filter(e => e.id !== eventId);
  cache.invalidate('recent_events');

  closeModal('modal-delete-event');
  document.getElementById('delete-event-pass').value = '';
  toast('Event and all data permanently deleted', 'success');
  showScreen('screen-menu');
}

//  EXPORT
function renderBranchSummary() {
  const c = document.getElementById('branch-summary');
  const branches = groupByBranch(state.attendance.filter(a => a.status === 'attended'));
  if (Object.keys(branches).length === 0) {
    c.innerHTML = '<p style="color:var(--muted);font-size:.83rem">No attendance data yet.</p>';
    return;
  }
  c.innerHTML = Object.entries(branches).map(([branch, students]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600">${sanitizeInput(branch, 'text')}</div>
        <div style="font-size:.72rem;color:var(--muted)">${Object.keys(groupByYear(students)).join(', ')} Year</div>
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:1.1rem;color:var(--text)">${students.length}</div>
    </div>
  `).join('');
}

function groupByBranch(data) {
  return data.reduce((acc, a) => {
    (acc[a.branch] = acc[a.branch] || []).push(a);
    return acc;
  }, {});
}

function groupByYear(data) {
  return data.reduce((acc, a) => {
    const label = a.yearLabel + ' Year';
    (acc[label] = acc[label] || []).push(a);
    return acc;
  }, {});
}

function exportExcel() {
  if (state.attendance.length === 0) {
    toast('No attendance data to export', 'error');
    return;
  }

  const ev = state.currentEvent;
  const byBranch = groupByBranch(state.attendance);
  let fileCount = 0;

  Object.entries(byBranch).forEach(([branch, students], index) => {
    students.sort((a, b) => {
      const yearPrefixA = a.rollNo.match(/^[A-Z]+\d+/)?.[0] || '';
      const yearPrefixB = b.rollNo.match(/^[A-Z]+\d+/)?.[0] || '';

      if (yearPrefixA !== yearPrefixB) {
        return yearPrefixB.localeCompare(yearPrefixA);
      }
      return a.rollNo.localeCompare(b.rollNo);
    });

    const wb = XLSX.utils.book_new();

    const rows = [
      ['Registered Number (Roll No)', 'Year', 'Branch', 'Status', 'Time', 'Recorded By'],
      ...students.map(s => [s.rollNo, s.yearLabel + ' Year', s.branch, s.status, formatTime(s.timestamp), s.recordedBy])
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, branch.substring(0, 31));

    const filename = `Attendance_${ev.name.replace(/\s+/g, '_')}_${branch}.xlsx`;

    setTimeout(() => {
      XLSX.writeFile(wb, filename);
    }, index * 400);

    fileCount++;
  });

  if (auditLogger) auditLogger.logDataExported(ev.id, 'excel', state.attendance.length);

  toast(`Exporting ${fileCount} Excel file(s)...`, 'success');
}

//  MODALS & TOAST
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = sanitizeInput(msg, 'text');
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('open');
  });
});

// HELPER FUNCTIONS
function showValidationError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function clearValidationErrors() {
  document.querySelectorAll('.validation-feedback').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

function setButtonLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.setAttribute('aria-busy', isLoading);
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;"></span>';
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}
