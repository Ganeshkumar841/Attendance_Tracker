//  SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://dlycduroumqqaiywwxwm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseWNkdXJvdW1xcWFpeXd3eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDE3MTgsImV4cCI6MjA4Nzg3NzcxOH0.sDjlAAEL6o1lwUHuAs0L4mS7uxU7feIBvYkbIzWNkto';

let supabaseClient;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Supabase not initialized properly. Add your keys!");
}

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
  if (now.getMonth() < 6) { startYear -= 1; } // If before July, academic year started last year
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
});

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
  if (id === 'screen-join') fetchRecentEvents(); // Moved fetch call here
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

//  AUTH
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    state.user = {
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email,
      id: session.user.id
    };
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
    if (document.getElementById('screen-login').classList.contains('active')) {
      afterLogin();
    }
  } else {
    state.user = null;
    showScreen('screen-login');
  }
});

async function loginEmail() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      toast("Please add your Supabase keys to the script first!", "error");
      return;
  }
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  if (!email || !pass) { toast('Enter email and password', 'error'); return; }

  let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
  
  if (error && error.message.includes('Invalid login credentials')) {
      const res = await supabaseClient.auth.signUp({ email, password: pass });
      data = res.data; error = res.error;
      if (!error) toast('Account created & logged in!', 'success');
  }
  if (error) { toast(error.message, 'error'); return; }
}

function loginGoogle() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return toast("Add Supabase keys first!", "error");
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
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') await supabaseClient.auth.signOut();
  state.user = null; state.currentEvent = null; state.attendance = [];
  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);
  showScreen('screen-login');
}
function confirmLogout() { logout(); }

//  EVENTS
function generateEventId() { return 'EV' + Math.random().toString(36).substr(2, 4).toUpperCase(); }

async function fetchRecentEvents() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  const { data, error } = await supabaseClient.from('events').select('*').order('created_at', { ascending: false }).limit(5);
  if (!error && data) {
    state.events = data;
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
    <div class="att-item" style="cursor:pointer;margin-bottom:8px" onclick="quickJoin('${ev.id}')">
      <div>
        <div class="att-roll">${ev.name}</div>
        <div class="att-meta">${ev.id} · ${ev.date} ${ev.organization ? '· ' + ev.organization : ''}</div>
      </div>
      <div class="status-badge status-attended">Resume</div>
    </div>
  `).join('');
}

async function createNewEvent() {
  const name   = document.getElementById('ev-name').value.trim();
  const date   = document.getElementById('ev-date').value;
  const time   = document.getElementById('ev-time').value || null;
  const venue  = document.getElementById('ev-venue').value.trim() || null;
  const org    = document.getElementById('ev-org').value.trim() || null;
  const pass   = document.getElementById('ev-pass').value;

  if (!name || !date || !pass) { toast('Fill in required fields', 'error'); return; }

  const newEvent = {
    id: generateEventId(),
    name, date, time, venue, password: pass, organization: org,
    created_by: state.user?.name,
  };

  const { data, error } = await supabaseClient.from('events').insert([newEvent]).select().single();
  
  if (error) { toast('Error creating event: ' + error.message, 'error'); return; }

  state.currentEvent = data;
  state.events.unshift(data);
  state.attendance = [];

  document.getElementById('display-event-id').textContent = data.id;
  document.getElementById('display-event-pass').textContent = data.password;
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
  const id   = document.getElementById('join-id').value.trim().toUpperCase();
  const pass = document.getElementById('join-pass').value;

  const { data: ev, error } = await supabaseClient.from('events').select('*').eq('id', id).single();

  if (error || !ev) { toast('Event not found', 'error'); return; }
  if (ev.password !== pass) { toast('Incorrect password', 'error'); return; }
  
  state.currentEvent = ev;
  await fetchAttendance(ev.id);
  enterAttendance();
  toast('Joined ' + ev.name, 'success');
}

async function quickJoin(id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  state.currentEvent = ev;
  await fetchAttendance(ev.id);
  enterAttendance();
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

//  REAL-TIME SYNCRONIZATION
function subscribeToAttendance(eventId) {
  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);

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

//  ATTENDANCE ENTRY
async function addEntry() {
  if (!selectedYear) { toast('Select a year first', 'error'); return; }

  const suffix = document.getElementById('roll-input').value.trim().toUpperCase();
  if (!suffix) { toast('Enter roll number suffix', 'error'); return; }

  if (!/^[A-Z]{2,5}\d{3}$/.test(suffix)) {
    toast('Format: BRANCH + 3 digits (e.g. CSE042)', 'error');
    return;
  }

  const branch  = suffix.replace(/\d+/, '');
  const num     = suffix.match(/\d+/)[0];
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
        // Explicitly update local state for immediate UI reflection
        const existingIdx = state.attendance.findIndex(a => a.id === existing.id);
        state.attendance[existingIdx] = mapDbToLocal(data);
        updateAttendanceUI();
        
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
      toast('Error: ' + error.message, 'error');
    }
    return;
  }

  // Explicitly update local state for immediate UI reflection
  state.attendance.push(mapDbToLocal(data));
  updateAttendanceUI();

  document.getElementById('roll-input').value = '';
  toast('✓ Marked: ' + fullRoll, 'success');
}

//  PRE-REG CSV UPLOAD
async function loadPreregCSV(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    const toInsert = [];
    
    lines.forEach(roll => {
      roll = roll.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
    
    if (toInsert.length > 0) {
        const { error } = await supabaseClient.from('attendance').insert(toInsert);
        if (error) { toast("Error uploading pre-registrations", "error"); }
        else { toast(`Uploaded ${toInsert.length} pre-registered students`, 'success'); }
    }
  };
  reader.readAsText(file);
  input.value = '';
}

//  UI UPDATES
function updateAttendanceUI() {
  const all       = state.attendance;
  const attended  = all.filter(a => a.status === 'attended');
  const prereg    = all.filter(a => a.status === 'preregistered');

  document.getElementById('stat-total').textContent    = all.length;
  document.getElementById('stat-attended').textContent  = attended.length;
  document.getElementById('stat-prereg').textContent    = prereg.length;

  renderList();
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
        <div class="att-roll">${a.rollNo}</div>
        <div class="att-meta">${a.yearLabel} Year · ${a.branch} · ${formatTime(a.timestamp)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="status-badge status-${a.status}">${a.status === 'attended' ? '✓ Present' : '○ Pre-reg'}</span>
        <button class="btn btn-danger btn-sm" onclick="requestDelete('${a.id}')" title="Delete Entry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>
  `).join('') + '</div>';
}

function formatTime(iso) {
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
    toast('Incorrect password', 'error'); return;
  }
  state.editAuthorized = true;
  closeModal('modal-edit-auth');
  document.getElementById('edit-auth-pass').value = '';
  openModal('modal-delete-confirm');
}

async function executeDelete() {
  const id = state.pendingDeleteId;
  const { error } = await supabaseClient.from('attendance').delete().eq('id', id);
  
  if (error) { toast('Failed to delete entry', 'error'); }
  else { toast('Entry deleted', 'info'); }
  
  closeModal('modal-delete-confirm');
  state.pendingDeleteId = null;
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
        <div style="font-weight:600">${branch}</div>
        <div style="font-size:.72rem;color:var(--muted)">${Object.keys(groupByYear(students)).join(', ')} Year</div>
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:1.1rem;color:var(--text)">${students.length}</div>
    </div>
  `).join('');
}

function groupByBranch(data) {
  return data.reduce((acc, a) => { (acc[a.branch] = acc[a.branch] || []).push(a); return acc; }, {});
}

function groupByYear(data) {
  return data.reduce((acc, a) => { 
    const label = a.yearLabel + ' Year'; 
    (acc[label] = acc[label] || []).push(a); return acc; 
  }, {});
}

function exportExcel() {
  if (state.attendance.length === 0) { toast('No attendance data to export', 'error'); return; }

  const wb = XLSX.utils.book_new();
  const ev = state.currentEvent;

  const summaryData = [
    ['AttendX — Attendance Report'],
    ['Event', ev.name],
    ['Date', ev.date],
    ['Organization', ev.organization || 'N/A'],
    ['Venue', ev.venue || 'N/A'],
    ['Generated', new Date().toLocaleString('en-IN')],
    [],
    ['Total Entries', state.attendance.length],
    ['Attended', state.attendance.filter(a => a.status === 'attended').length],
    ['Pre-registered (not attended)', state.attendance.filter(a => a.status === 'preregistered').length],
  ];
  const ws0 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws0, 'Summary');

  const attended = state.attendance.filter(a => a.status === 'attended');
  const byBranch = groupByBranch(attended);

  // Separate sheet based on branches, inside the sheet sorted by year of study
  Object.entries(byBranch).forEach(([branch, students]) => {
    // Sort students array ascending by Year (1st, 2nd, 3rd, 4th)
    students.sort((a, b) => a.year - b.year);
    
    const sheetName = branch.substring(0, 31); // Excel limits sheet names to 31 chars
    const rows = [
      ['Roll No', 'Year', 'Branch', 'Status', 'Time', 'Recorded By'],
      ...students.map(s => [s.rollNo, s.yearLabel + ' Year', s.branch, s.status, formatTime(s.timestamp), s.recordedBy])
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const allRows = [
    ['Roll No', 'Year', 'Branch', 'Status', 'Time', 'Recorded By'],
    ...state.attendance.map(s => [s.rollNo, s.yearLabel + ' Year', s.branch, s.status, formatTime(s.timestamp), s.recordedBy])
  ];
  const wsAll = XLSX.utils.aoa_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'All Entries');

  const filename = `Attendance_${ev.name.replace(/\s+/g,'_')}_${ev.date || 'today'}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast('Excel exported!', 'success');
}

//  MODALS & TOAST
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});