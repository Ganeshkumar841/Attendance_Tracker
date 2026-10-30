/**
 * Frontend Page — Events Page (Create Event, Event Created Summary, Join Event & Recent Events)
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isCreatingEvent = false;
  let isJoiningEvent = false;

  function renderEventsPages() {
    const mount = document.getElementById('page-events-mount');
    if (!mount) return;

    mount.innerHTML = `
      <!-- CREATE EVENT -->
      <section id="screen-create" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-center py-9 px-5">
          <div class="max-w-[460px] mx-auto px-5 w-full">
            <button
              type="button"
              onclick="showScreen('screen-menu')"
              class="bg-transparent border-none text-accent cursor-pointer text-[0.85rem] font-medium inline-flex items-center py-2 px-0 font-sans mb-4 hover:opacity-80 transition-opacity focus:outline-none select-none"
            >
              ← Back to Menu
            </button>
            <div class="text-[1.65rem] font-medium mb-1.5 tracking-[-0.02em] text-main">Create Event</div>
            <div class="text-[0.9rem] text-muted mb-7">Set up your attendance session details</div>

            <div class="bg-surface border border-theme rounded-2xl p-[22px] sm:p-7 shadow-card flex flex-col gap-3">
              <div class="mb-1">
                <label for="ev-name" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Event Name</label>
                <input
                  type="text"
                  id="ev-name"
                  maxlength="120"
                  placeholder="Tech Symposium 2026"
                  class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <div class="flex gap-3 mb-1">
                <div class="flex-1">
                  <label for="ev-date" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Date</label>
                  <input
                    type="date"
                    id="ev-date"
                    class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                </div>
                <div class="flex-1">
                  <label for="ev-time" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Time</label>
                  <input
                    type="time"
                    id="ev-time"
                    class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                </div>
              </div>

              <div class="mb-1">
                <label for="ev-venue" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Venue (optional)</label>
                <input
                  type="text"
                  id="ev-venue"
                  maxlength="120"
                  placeholder="Auditorium B"
                  class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <div class="mb-1">
                <label for="ev-org" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Organization / Club (optional)</label>
                <input
                  type="text"
                  id="ev-org"
                  maxlength="120"
                  placeholder="e.g. ACM Student Chapter"
                  class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <div class="mb-2">
                <label for="ev-pass" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Event Password</label>
                <div class="relative w-full">
                  <input
                    type="password"
                    id="ev-pass"
                    placeholder="Used by coordinators"
                    onkeydown="if(event.key==='Enter') createNewEvent()"
                    class="w-full py-3 pl-[15px] pr-11 bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                  <button
                    type="button"
                    onclick="togglePwd('ev-pass', this)"
                    aria-label="Toggle password visibility"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                id="btn-create-event"
                onclick="createNewEvent()"
                class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- EVENT CREATED SUMMARY -->
      <section id="screen-event-created" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-center py-9 px-5">
          <div class="max-w-[460px] mx-auto px-5 w-full">
            <div class="text-[1.65rem] font-medium mb-1.5 tracking-[-0.02em] text-main text-center">Event Created</div>
            <div class="text-[0.9rem] text-muted mb-7 text-center">Share these details with other coordinators</div>

            <div class="bg-surface-tint border border-dashed border-strong rounded-[14px] p-6 text-center my-6">
              <div class="text-[0.72rem] text-accent uppercase tracking-[0.08em] mb-1.5 font-medium">Event ID</div>
              <div id="display-event-id" class="font-mono text-[2rem] font-medium text-main tracking-[0.12em]">──────</div>
              <div class="text-[0.82rem] text-muted mt-2">
                Password: <span id="display-event-pass" class="text-main font-mono">••••••</span>
              </div>
            </div>

            <div class="mb-5">
              <div class="bg-surface2 border border-theme rounded-2xl p-[18px] shadow-card">
                <div class="text-[0.72rem] text-muted mb-1 uppercase tracking-[0.05em]">Event Name</div>
                <div id="display-event-name" class="font-medium text-[1.05rem] text-main"></div>
                <div class="text-[0.72rem] text-muted mt-3 mb-1 uppercase tracking-[0.05em]">Date &amp; Time</div>
                <div id="display-event-dt" class="text-[0.9rem] text-accent"></div>
              </div>
            </div>

            <div class="flex flex-col gap-3">
              <button
                type="button"
                onclick="enterAttendance()"
                class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none"
              >
                Start Taking Attendance
              </button>
              <button
                type="button"
                onclick="copyEventId()"
                class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
              >
                Copy Event ID
              </button>
              <button
                type="button"
                onclick="showScreen('screen-menu')"
                class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- JOIN EVENT -->
      <section id="screen-join" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-start py-9 px-5">
          <div class="max-w-[460px] mx-auto px-5 w-full">
            <button
              type="button"
              onclick="showScreen('screen-menu')"
              class="bg-transparent border-none text-accent cursor-pointer text-[0.85rem] font-medium inline-flex items-center py-2 px-0 font-sans mb-4 hover:opacity-80 transition-opacity focus:outline-none select-none"
            >
              ← Back to Menu
            </button>
            <div class="text-[1.65rem] font-medium mb-1.5 tracking-[-0.02em] text-main">Join Event</div>
            <div class="text-[0.9rem] text-muted mb-7">Enter credentials from the event organizer</div>

            <div class="bg-surface border border-theme rounded-2xl p-[22px] sm:p-7 shadow-card flex flex-col gap-3">
              <div class="mb-1">
                <label for="join-id" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Event ID</label>
                <input
                  type="text"
                  id="join-id"
                  placeholder="e.g. EV2405"
                  oninput="this.value=this.value.toUpperCase()"
                  onkeydown="if(event.key==='Enter') joinEvent()"
                  class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-mono text-[0.92rem] tracking-[0.1em] uppercase placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <div class="mb-2">
                <label for="join-pass" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Event Password</label>
                <div class="relative w-full">
                  <input
                    type="password"
                    id="join-pass"
                    placeholder="••••••••"
                    onkeydown="if(event.key==='Enter') joinEvent()"
                    class="w-full py-3 pl-[15px] pr-11 bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                  <button
                    type="button"
                    onclick="togglePwd('join-pass', this)"
                    aria-label="Toggle password visibility"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                id="btn-join-event"
                onclick="joinEvent()"
                class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Join Event
              </button>
            </div>

            <!-- RECENT EVENTS -->
            <div class="mt-9">
              <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-3 flex items-center gap-2.5 select-none">
                <span class="flex-1 h-px bg-theme"></span>
                <span>Or select recent event to verify</span>
                <span class="flex-1 h-px bg-theme"></span>
              </div>
              <div id="recent-events-list" class="flex flex-col gap-2"></div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async function fetchRecentEvents() {
    const { Supabase, EventService } = AttendX.Backend;
    if (!Supabase.isConfigured()) return;

    const { data, error } = await EventService.fetchRecentEvents(5);
    if (!error && data) {
      AttendX.State.events = data;
      renderRecentEvents();
    }
  }

  function renderRecentEvents() {
    const container = document.getElementById('recent-events-list');
    if (!container) return;

    const events = AttendX.State.events || [];
    const { escapeHtml } = AttendX.Utils.Sanitizer;

    if (events.length === 0) {
      container.innerHTML =
        '<p class="text-muted text-[0.85rem] text-center p-5">No recent events found</p>';
      return;
    }

    container.innerHTML = events
      .map(ev => {
        const safeId = escapeHtml(ev.id);
        const safeName = escapeHtml(ev.name);
        const safeDate = escapeHtml(ev.date);
        const safeOrg = ev.organization ? ' · ' + escapeHtml(ev.organization) : '';
        return `
          <button
            type="button"
            data-event-id="${safeId}"
            class="recent-event-item w-full text-left flex items-center justify-between py-3.5 px-[18px] bg-surface border border-theme hover:border-strong rounded-xl gap-3 transition-all cursor-pointer animate-slide-in focus:outline-none select-none active:scale-[0.99]"
          >
            <div>
              <div class="font-mono text-[0.92rem] font-medium text-main">${safeName}</div>
              <div class="text-[0.76rem] text-muted mt-0.5">${safeId} · ${safeDate}${safeOrg}</div>
            </div>
            <div class="text-[0.7rem] py-1 px-2.5 rounded-full font-medium bg-success-bg text-success shrink-0">
              Select to verify
            </div>
          </button>
        `;
      })
      .join('');

    container.querySelectorAll('.recent-event-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const evId = btn.getAttribute('data-event-id');
        if (evId) quickJoin(evId);
      });
    });
  }

  async function createNewEvent() {
    if (isCreatingEvent) return;
    const { Supabase, EventService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const { formatEventDateTime } = AttendX.Utils.Sanitizer;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing. Check config.js.', 'error');
      return;
    }

    const name  = document.getElementById('ev-name').value.trim();
    const date  = document.getElementById('ev-date').value;
    const time  = document.getElementById('ev-time').value || null;
    const venue = document.getElementById('ev-venue').value.trim() || null;
    const org   = document.getElementById('ev-org').value.trim() || null;
    const pass  = document.getElementById('ev-pass').value;

    if (!name || !date || !pass) {
      toast('Fill in required fields (Name, Date, Password)', 'error');
      return;
    }

    if (pass.length < 4) {
      toast('Event password must be at least 4 characters', 'error');
      return;
    }

    const btn = document.getElementById('btn-create-event');
    isCreatingEvent = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creating...';
    }

    try {
      const { data, error } = await EventService.createEvent({
        name,
        date,
        time,
        venue,
        organization: org,
        password: pass,
        createdBy: state.user?.name
      });

      if (error || !data) {
        toast('Unable to create event right now. Please try again.', 'error');
        return;
      }

      // Reset session-scoped flags for the new event
      state.currentEvent = data;
      state.events.unshift(data);
      state.attendance = [];
      state.editAuthorized = true; // Creator is authorized for the session they just created
      state.pendingDeleteId = null;

      document.getElementById('display-event-id').textContent = data.id;
      document.getElementById('display-event-pass').textContent = pass;
      document.getElementById('display-event-name').textContent = data.name;
      document.getElementById('display-event-dt').textContent = formatEventDateTime(data.date, data.time);

      // Clear sensitive password field
      document.getElementById('ev-pass').value = '';

      AttendX.App.showScreen('screen-event-created');
      toast('Event created!', 'success');
    } finally {
      isCreatingEvent = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create Event';
      }
    }
  }

  function copyEventId() {
    const { toast } = AttendX.Components.Toast;
    const idText = AttendX.State.currentEvent?.id || '';
    if (!idText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(idText).catch(() => {});
    }
    toast('Event ID copied!', 'info');
  }

  async function joinEvent() {
    if (isJoiningEvent) return;
    const { Supabase, EventService, AttendanceService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing. Check config.js.', 'error');
      return;
    }

    const id   = document.getElementById('join-id').value.trim().toUpperCase();
    const pass = document.getElementById('join-pass').value;

    if (!id || !pass) {
      toast('Enter both Event ID and Event Password', 'error');
      return;
    }

    const btn = document.getElementById('btn-join-event');
    isJoiningEvent = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Verifying...';
    }

    try {
      const { event: ev, error } = await EventService.verifyAndGetEvent(id, pass);
      if (error || !ev) {
        toast(error || 'Unable to join event', 'error');
        return;
      }

      // Reset event-scoped authorization state when switching events
      state.currentEvent = ev;
      state.editAuthorized = false;
      state.pendingDeleteId = null;

      const { data: attList } = await AttendanceService.fetchByEvent(ev.id);
      state.attendance = attList;

      document.getElementById('join-pass').value = '';
      AttendX.Pages.Attendance.enterAttendance();
      toast('Joined ' + ev.name, 'success');
    } finally {
      isJoiningEvent = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Join Event';
      }
    }
  }

  function quickJoin(id) {
    const { toast } = AttendX.Components.Toast;
    const ev = (AttendX.State.events || []).find(e => e.id === id);
    if (!ev) return;
    document.getElementById('join-id').value = ev.id;
    document.getElementById('join-pass').value = '';
    document.getElementById('join-pass').focus();
    toast(`Please enter password for ${ev.name}`, 'info');
  }

  global.createNewEvent = createNewEvent;
  global.copyEventId = copyEventId;
  global.joinEvent = joinEvent;
  global.quickJoin = quickJoin;

  AttendX.Pages.Events = {
    renderEventsPages,
    fetchRecentEvents,
    renderRecentEvents,
    createNewEvent,
    copyEventId,
    joinEvent,
    quickJoin
  };
})(window);
