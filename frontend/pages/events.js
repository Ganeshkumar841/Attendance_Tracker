(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isCreatingEvent = false;
  let isJoiningEvent = false;
  let isStudentLoadingEvent = false;
  let isSubmittingForgotPwd = false;
  let isSubmittingResetPwd = false;

  function buildHourOptions(defaultHour = 9) {
    let html = '';
    for (let h = 1; h <= 12; h++) {
      const label = String(h).padStart(2, '0');
      const selected = h === defaultHour ? ' selected' : '';
      html += `<option value="${label}"${selected}>${label}</option>`;
    }
    return html;
  }

  function buildMinuteOptions(defaultMinute = 0) {
    let html = '';
    for (let m = 0; m < 60; m++) {
      const label = String(m).padStart(2, '0');
      const selected = m === defaultMinute ? ' selected' : '';
      html += `<option value="${label}"${selected}>${label}</option>`;
    }
    return html;
  }

  function renderEventsPages() {
    const mount = document.getElementById('page-events-mount');
    if (!mount) return;

    mount.innerHTML = `
      <section id="screen-create" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-center py-8 px-4 sm:px-5">
          <div class="max-w-[490px] mx-auto w-full">
            <button
              type="button"
              onclick="showScreen('screen-menu')"
              class="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong text-secondary hover:text-main cursor-pointer text-[0.8rem] font-medium font-sans mb-4 transition-all focus:outline-none select-none"
            >
              ← Back to Menu
            </button>
            <div class="text-[1.6rem] font-semibold mb-5 tracking-[-0.025em] text-main">Create Event</div>

            <div class="bg-surface border border-theme rounded-2xl p-5 sm:p-7 shadow-card flex flex-col gap-4">
              <div>
                <label for="ev-name" class="block text-[0.8rem] font-medium text-secondary mb-1.5">
                  Event Name <span class="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="ev-name"
                  maxlength="120"
                  placeholder="Tech Symposium 2026"
                  class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <label class="inline-flex items-center gap-2.5 text-[0.84rem] font-medium text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="ev-single-day"
                  checked
                  onchange="toggleSingleDayEvent(this.checked)"
                  class="w-4 h-4 rounded border-theme text-primary focus:ring-primary/20 cursor-pointer accent-blue-600"
                >
                <span>Single-day event</span>
              </label>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div id="ev-start-date-wrap" class="sm:col-span-2">
                  <label for="ev-date" id="ev-date-label" class="block text-[0.8rem] font-medium text-secondary mb-1.5">
                    Start Date <span class="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="ev-date"
                    onchange="handleStartDateChange(this.value)"
                    class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-sans text-[0.9rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                </div>

                <div id="ev-end-date-wrap" class="hidden">
                  <label for="ev-end-date" class="block text-[0.8rem] font-medium text-secondary mb-1.5">
                    End Date <span class="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    id="ev-end-date"
                    class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-sans text-[0.9rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label for="ev-start-hour" class="block text-[0.8rem] font-medium text-secondary mb-1.5">
                    Start Time <span class="text-danger">*</span>
                  </label>
                  <input type="hidden" id="ev-time" value="09:00 AM">
                  <div class="flex items-center justify-between bg-input border border-theme rounded-xl px-3 py-2 gap-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <div class="flex items-center gap-1">
                      <select
                        id="ev-start-hour"
                        aria-label="Start Hour"
                        onchange="syncTimePickerValue('start')"
                        class="bg-transparent text-main font-sans text-[0.9rem] font-normal py-0.5 px-1 rounded focus:outline-none cursor-pointer"
                      >
                        ${buildHourOptions(9)}
                      </select>
                      <span class="text-muted font-sans text-[0.9rem]">:</span>
                      <select
                        id="ev-start-min"
                        aria-label="Start Minute"
                        onchange="syncTimePickerValue('start')"
                        class="bg-transparent text-main font-sans text-[0.9rem] font-normal py-0.5 px-1 rounded focus:outline-none cursor-pointer"
                      >
                        ${buildMinuteOptions(0)}
                      </select>
                    </div>
                    <div class="flex items-center bg-surface2 rounded-lg p-0.5 border border-theme">
                      <button
                        type="button"
                        id="ev-start-am"
                        onclick="setTimePeriod('start', 'AM')"
                        class="py-0.5 px-2 rounded-md text-[0.78rem] font-medium font-sans transition-all bg-surface text-main border border-theme"
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        id="ev-start-pm"
                        onclick="setTimePeriod('start', 'PM')"
                        class="py-0.5 px-2 rounded-md text-[0.78rem] font-normal font-sans transition-all bg-transparent text-muted hover:text-main border border-transparent"
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label for="ev-end-hour" class="block text-[0.8rem] font-medium text-secondary mb-1.5">
                    End Time <span class="text-danger">*</span>
                  </label>
                  <input type="hidden" id="ev-end-time" value="11:00 AM">
                  <div class="flex items-center justify-between bg-input border border-theme rounded-xl px-3 py-2 gap-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <div class="flex items-center gap-1">
                      <select
                        id="ev-end-hour"
                        aria-label="End Hour"
                        onchange="syncTimePickerValue('end')"
                        class="bg-transparent text-main font-sans text-[0.9rem] font-normal py-0.5 px-1 rounded focus:outline-none cursor-pointer"
                      >
                        ${buildHourOptions(11)}
                      </select>
                      <span class="text-muted font-sans text-[0.9rem]">:</span>
                      <select
                        id="ev-end-min"
                        aria-label="End Minute"
                        onchange="syncTimePickerValue('end')"
                        class="bg-transparent text-main font-sans text-[0.9rem] font-normal py-0.5 px-1 rounded focus:outline-none cursor-pointer"
                      >
                        ${buildMinuteOptions(0)}
                      </select>
                    </div>
                    <div class="flex items-center bg-surface2 rounded-lg p-0.5 border border-theme">
                      <button
                        type="button"
                        id="ev-end-am"
                        onclick="setTimePeriod('end', 'AM')"
                        class="py-0.5 px-2 rounded-md text-[0.78rem] font-medium font-sans transition-all bg-surface text-main border border-theme"
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        id="ev-end-pm"
                        onclick="setTimePeriod('end', 'PM')"
                        class="py-0.5 px-2 rounded-md text-[0.78rem] font-normal font-sans transition-all bg-transparent text-muted hover:text-main border border-transparent"
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label for="ev-venue" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Venue (optional)</label>
                  <input
                    type="text"
                    id="ev-venue"
                    maxlength="120"
                    placeholder="Auditorium B"
                    class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-sans text-[0.9rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                </div>

                <div>
                  <label for="ev-org" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Organization / Club (optional)</label>
                  <input
                    type="text"
                    id="ev-org"
                    maxlength="120"
                    placeholder="ACM Student Chapter"
                    class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-sans text-[0.9rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                </div>
              </div>

              <div>
                <label for="ev-pass" class="block text-[0.8rem] font-medium text-secondary mb-1.5">
                  Event Password <span class="text-danger">*</span>
                </label>
                <div class="relative w-full">
                  <input
                    type="password"
                    id="ev-pass"
                    placeholder="Min. 4 characters"
                    onkeydown="if(event.key==='Enter') createNewEvent()"
                    class="w-full py-2.5 pl-3.5 pr-11 bg-input border border-theme rounded-xl text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                  <button
                    type="button"
                    onclick="togglePwd('ev-pass', this)"
                    aria-label="Toggle password visibility"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                id="btn-create-event"
                onclick="createNewEvent()"
                class="mt-1 w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-sans text-[0.9rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="screen-event-created" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-center py-8 px-4 sm:px-5">
          <div class="max-w-[480px] mx-auto w-full">
            <div class="text-[1.6rem] font-semibold mb-5 tracking-[-0.025em] text-main text-center">Event Created</div>

            <div class="bg-surface-tint border border-dashed border-strong rounded-2xl p-6 text-center mb-4">
              <div class="text-[0.72rem] text-accent uppercase tracking-[0.08em] mb-1 font-semibold">Event ID</div>
              <div id="display-event-id" class="font-mono text-[2rem] font-semibold text-main tracking-[0.12em]">EV0000</div>
            </div>

            <div class="bg-surface border border-theme rounded-2xl p-5 shadow-card mb-4">
              <div class="text-[0.72rem] text-muted mb-1 uppercase tracking-[0.05em] font-semibold">Event Name</div>
              <div id="display-event-name" class="font-semibold text-[1.04rem] text-main break-words"></div>
              <div class="text-[0.72rem] text-muted mt-3.5 mb-1 uppercase tracking-[0.05em] font-semibold">Schedule</div>
              <div id="display-event-dt" class="text-[0.9rem] text-accent font-medium"></div>
            </div>

            <div id="display-email-confirmation" class="bg-success-bg border border-theme rounded-xl py-3 px-4 mb-5 text-[0.8rem] text-success leading-relaxed">
              Confirmation email sent to <strong id="display-creator-email" class="font-semibold"></strong>.
            </div>

            <div class="flex flex-col gap-2.5">
              <button
                type="button"
                onclick="enterAttendance()"
                class="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-sans text-[0.9rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none"
              >
                Open Event Session
              </button>
              <button
                type="button"
                onclick="copyEventId()"
                class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
              >
                Copy Event ID
              </button>
              <button
                type="button"
                onclick="showScreen('screen-menu')"
                class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="screen-join" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-start py-8 px-4 sm:px-5">
          <div class="max-w-[480px] mx-auto w-full">
            <button
              type="button"
              onclick="showScreen('screen-menu')"
              class="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong text-secondary hover:text-main cursor-pointer text-[0.8rem] font-medium font-sans mb-4 transition-all focus:outline-none select-none"
            >
              ← Back to Menu
            </button>
            <div class="text-[1.6rem] font-semibold mb-5 tracking-[-0.025em] text-main">Join Event</div>

            <div class="bg-surface border border-theme rounded-2xl p-5 sm:p-7 shadow-card flex flex-col gap-4">
              <div>
                <label for="join-id" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Event ID</label>
                <input
                  type="text"
                  id="join-id"
                  placeholder="e.g. EV2405"
                  oninput="this.value=this.value.toUpperCase()"
                  onkeydown="if(event.key==='Enter') joinEvent()"
                  class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-mono text-[0.92rem] tracking-[0.08em] uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label for="join-pass" class="text-[0.8rem] font-medium text-secondary">Event Password</label>
                  <button
                    type="button"
                    id="btn-forgot-event-pwd"
                    onclick="openForgotEventPasswordModal()"
                    class="bg-transparent border-none text-accent text-[0.78rem] font-medium cursor-pointer p-0 font-sans hover:underline focus:outline-none select-none"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div class="relative w-full">
                  <input
                    type="password"
                    id="join-pass"
                    placeholder="••••••••"
                    onkeydown="if(event.key==='Enter') joinEvent()"
                    class="w-full py-2.5 pl-3.5 pr-11 bg-input border border-theme rounded-xl text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                  <button
                    type="button"
                    onclick="togglePwd('join-pass', this)"
                    aria-label="Toggle password visibility"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                id="btn-join-event"
                onclick="joinEvent()"
                class="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-sans text-[0.9rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Join Event
              </button>
            </div>

            <div class="mt-8">
              <div class="text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted mb-3 flex items-center gap-2.5 select-none">
                <span class="flex-1 h-px bg-theme"></span>
                <span>Recent Events</span>
                <span class="flex-1 h-px bg-theme"></span>
              </div>
              <div id="recent-events-list" class="flex flex-col gap-2"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="screen-student-events" class="screen hidden flex-1 flex-col">
        <div class="flex-1 flex flex-col justify-start py-8 px-4 sm:px-5">
          <div class="max-w-[500px] mx-auto w-full">
            <div class="text-[1.6rem] font-semibold mb-5 tracking-[-0.025em] text-main">Check Event Attendance</div>

            <div class="bg-surface border border-theme rounded-2xl p-5 sm:p-7 shadow-card flex flex-col gap-4">
              <div>
                <label for="student-join-id" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Event ID</label>
                <input
                  type="text"
                  id="student-join-id"
                  placeholder="e.g. EV2405"
                  maxlength="20"
                  oninput="this.value=this.value.toUpperCase()"
                  onkeydown="if(event.key==='Enter') joinEventAsStudent()"
                  class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-mono text-[0.92rem] tracking-[0.08em] uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <button
                type="button"
                id="btn-student-view-event"
                onclick="joinEventAsStudent()"
                class="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-sans text-[0.9rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                View Attendance List
              </button>
            </div>

            <div class="mt-8">
              <div class="text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted mb-3 flex items-center gap-2.5 select-none">
                <span class="flex-1 h-px bg-theme"></span>
                <span>Recent Campus Events</span>
                <span class="flex-1 h-px bg-theme"></span>
              </div>
              <div id="student-recent-events-list" class="flex flex-col gap-2"></div>
            </div>

            <div class="mt-8 text-center">
              <button
                type="button"
                onclick="logout()"
                class="inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.82rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  let startPeriodState = 'AM';
  let endPeriodState = 'AM';

  function toggleSingleDayEvent(isSingleDay) {
    const singleDay = Boolean(isSingleDay);
    const startWrap = document.getElementById('ev-start-date-wrap');
    const endWrap = document.getElementById('ev-end-date-wrap');
    const startDateInput = document.getElementById('ev-date');
    const endDateInput = document.getElementById('ev-end-date');

    if (singleDay) {
      if (endWrap) endWrap.classList.add('hidden');
      if (startWrap) startWrap.className = 'sm:col-span-2';
      if (endDateInput && startDateInput) {
        endDateInput.value = startDateInput.value;
      }
    } else {
      if (endWrap) endWrap.classList.remove('hidden');
      if (startWrap) startWrap.className = '';
      if (endDateInput && startDateInput) {
        endDateInput.min = startDateInput.value || '';
        if (!endDateInput.value || endDateInput.value < startDateInput.value) {
          endDateInput.value = startDateInput.value;
        }
      }
    }
  }

  function handleStartDateChange(newStartDate) {
    const singleDayCheckbox = document.getElementById('ev-single-day');
    const endDateInput = document.getElementById('ev-end-date');
    if (!endDateInput) return;

    endDateInput.min = newStartDate || '';
    if (!singleDayCheckbox || singleDayCheckbox.checked) {
      endDateInput.value = newStartDate;
    } else if (endDateInput.value && endDateInput.value < newStartDate) {
      endDateInput.value = newStartDate;
    }
  }

  function setTimePeriod(which, period) {
    const normalized = period === 'PM' ? 'PM' : 'AM';
    if (which === 'start') {
      startPeriodState = normalized;
    } else {
      endPeriodState = normalized;
    }

    const amBtn = document.getElementById(`ev-${which}-am`);
    const pmBtn = document.getElementById(`ev-${which}-pm`);
    const activeCls =
      'py-0.5 px-2 rounded-md text-[0.78rem] font-medium font-sans transition-all bg-surface text-main border border-theme';
    const inactiveCls =
      'py-0.5 px-2 rounded-md text-[0.78rem] font-normal font-sans transition-all bg-transparent text-muted hover:text-main border border-transparent';

    if (amBtn && pmBtn) {
      amBtn.className = normalized === 'AM' ? activeCls : inactiveCls;
      pmBtn.className = normalized === 'PM' ? activeCls : inactiveCls;
    }
    syncTimePickerValue(which);
  }

  function syncTimePickerValue(which) {
    const hourEl = document.getElementById(`ev-${which}-hour`);
    const minEl = document.getElementById(`ev-${which}-min`);
    const hiddenEl = document.getElementById(which === 'start' ? 'ev-time' : 'ev-end-time');
    if (!hourEl || !minEl || !hiddenEl) return;

    const hr = String(hourEl.value || '09').padStart(2, '0');
    const mn = String(minEl.value || '00').padStart(2, '0');
    const period = which === 'start' ? startPeriodState : endPeriodState;
    hiddenEl.value = `${hr}:${mn} ${period}`;
  }

  function applyTimeToPickerUI(which, rawTimeStr) {
    const { parseTimeString } = AttendX.Utils.Sanitizer;
    const parsed = parseTimeString(rawTimeStr);
    if (!parsed) return;

    const hourEl = document.getElementById(`ev-${which}-hour`);
    const minEl = document.getElementById(`ev-${which}-min`);
    if (hourEl) hourEl.value = String(parsed.hours12).padStart(2, '0');
    if (minEl) minEl.value = String(parsed.minutes).padStart(2, '0');
    setTimePeriod(which, parsed.period);
  }

  async function fetchRecentEvents() {
    const { Supabase, EventService } = AttendX.Backend;
    if (!Supabase.isConfigured()) return;

    const { data, error } = await EventService.fetchRecentEvents(8);
    if (!error && data) {
      AttendX.State.events = data;
      renderRecentEvents();
      renderStudentRecentEvents();
    }
  }

  function formatEventScheduleSnippet(ev) {
    const { escapeHtml, formatTime12h } = AttendX.Utils.Sanitizer;
    const safeStartDate = escapeHtml(ev.date || '');
    const safeEndDate = escapeHtml(ev.end_date || ev.date || '');
    const start12 = ev.time ? formatTime12h(ev.time) : '';
    const end12 = ev.end_time ? formatTime12h(ev.end_time) : '';

    if (safeEndDate && safeEndDate !== safeStartDate) {
      return `${safeStartDate} (${escapeHtml(start12)}) – ${safeEndDate} (${escapeHtml(end12)})`;
    }
    if (start12 && end12 && end12 !== '-') {
      return `${safeStartDate} · ${escapeHtml(start12)} – ${escapeHtml(end12)}`;
    }
    if (start12 && start12 !== '-') {
      return `${safeStartDate} · ${escapeHtml(start12)}`;
    }
    return safeStartDate;
  }

  function renderRecentEvents() {
    const container = document.getElementById('recent-events-list');
    if (!container) return;

    const events = AttendX.State.events || [];
    const { escapeHtml } = AttendX.Utils.Sanitizer;
    const { isEventExpired } = AttendX.Backend.EventService;

    if (events.length === 0) {
      container.innerHTML =
        '<p class="text-muted text-[0.85rem] text-center p-5 bg-surface border border-theme rounded-xl">No recent events found</p>';
      return;
    }

    container.innerHTML = events
      .slice(0, 5)
      .map(ev => {
        const safeId = escapeHtml(ev.id);
        const safeName = escapeHtml(ev.name);
        const scheduleStr = formatEventScheduleSnippet(ev);
        const expired = isEventExpired(ev);
        const statusBadge = expired
          ? '<span class="text-[0.68rem] py-0.5 px-2 rounded-md font-medium bg-warning-bg text-warning border border-theme shrink-0">Closed</span>'
          : '<span class="text-[0.68rem] py-0.5 px-2 rounded-md font-medium bg-success-bg text-success border border-theme shrink-0">Active</span>';
        return `
          <button
            type="button"
            data-event-id="${safeId}"
            class="recent-event-item w-full text-left flex items-center justify-between py-3.5 px-4 bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-xl gap-3 transition-all cursor-pointer animate-slide-in focus:outline-none select-none active:scale-[0.99]"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-sans text-[0.92rem] font-semibold text-main truncate">${safeName}</span>
                ${statusBadge}
              </div>
              <div class="text-[0.76rem] text-muted mt-0.5 truncate"><span class="font-mono text-secondary">${safeId}</span> · ${scheduleStr}</div>
            </div>
            <div class="text-[0.72rem] py-1 px-2.5 rounded-lg font-medium bg-surface-tint text-accent border border-theme shrink-0">
              Select →
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

  function renderStudentRecentEvents() {
    const container = document.getElementById('student-recent-events-list');
    if (!container) return;

    const events = AttendX.State.events || [];
    const { escapeHtml } = AttendX.Utils.Sanitizer;
    const { isEventExpired } = AttendX.Backend.EventService;

    if (events.length === 0) {
      container.innerHTML =
        '<p class="text-muted text-[0.85rem] text-center p-5 bg-surface border border-theme rounded-xl">No recent events found</p>';
      return;
    }

    container.innerHTML = events
      .map(ev => {
        const safeId = escapeHtml(ev.id);
        const safeName = escapeHtml(ev.name);
        const scheduleStr = formatEventScheduleSnippet(ev);
        const safeVenue = ev.venue ? ' · ' + escapeHtml(ev.venue) : '';
        const expired = isEventExpired(ev);
        const statusBadge = expired
          ? '<span class="text-[0.68rem] py-0.5 px-2 rounded-md font-medium bg-warning-bg text-warning border border-theme shrink-0">Closed</span>'
          : '<span class="text-[0.68rem] py-0.5 px-2 rounded-md font-medium bg-success-bg text-success border border-theme shrink-0">Active</span>';
        return `
          <button
            type="button"
            data-student-event-id="${safeId}"
            class="student-recent-event-item w-full text-left flex items-center justify-between py-3.5 px-4 bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-xl gap-3 transition-all cursor-pointer animate-slide-in focus:outline-none select-none active:scale-[0.99]"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-sans text-[0.92rem] font-semibold text-main truncate">${safeName}</span>
                ${statusBadge}
              </div>
              <div class="text-[0.76rem] text-muted mt-0.5 truncate"><span class="font-mono text-secondary">${safeId}</span> · ${scheduleStr}${safeVenue}</div>
            </div>
            <div class="text-[0.72rem] py-1 px-2.5 rounded-lg font-medium bg-surface-tint text-accent border border-theme shrink-0">
              View List →
            </div>
          </button>
        `;
      })
      .join('');

    container.querySelectorAll('.student-recent-event-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const evId = btn.getAttribute('data-student-event-id');
        if (evId) {
          const idInput = document.getElementById('student-join-id');
          if (idInput) idInput.value = evId;
          joinEventAsStudent(evId);
        }
      });
    });
  }

  async function createNewEvent() {
    if (isCreatingEvent) return;
    const { Supabase, EventService, SecurityConfig } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const { formatEventDateTime, escapeHtml } = AttendX.Utils.Sanitizer;
    const state = AttendX.State;

    if (!SecurityConfig.isCoordinator()) {
      toast('Access denied: Student accounts cannot create events.', 'error');
      return;
    }

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing. Check config.js.', 'error');
      return;
    }

    const name = document.getElementById('ev-name')?.value.trim() || '';
    const date = document.getElementById('ev-date')?.value || '';
    const singleDayEl = document.getElementById('ev-single-day');
    const isSingleDay = singleDayEl ? Boolean(singleDayEl.checked) : true;
    const endDate = isSingleDay
      ? date
      : (document.getElementById('ev-end-date')?.value || '');
    const time = document.getElementById('ev-time')?.value.trim() || '';
    const endTime = document.getElementById('ev-end-time')?.value.trim() || '';
    const venue = document.getElementById('ev-venue')?.value.trim() || null;
    const org = document.getElementById('ev-org')?.value.trim() || null;
    const pass = document.getElementById('ev-pass')?.value || '';

    if (!name || !date || (!isSingleDay && !endDate) || !time || !endTime || !pass) {
      toast('Fill in all required fields', 'error');
      return;
    }

    const scheduleCheck = EventService.validateEventSchedule({
      date,
      endDate,
      isSingleDay,
      startTimeRaw: time,
      endTimeRaw: endTime,
      checkNotPast: true
    });

    if (!scheduleCheck.valid) {
      toast(scheduleCheck.error, 'error');
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
      const { data, emailResult, error } = await EventService.createEvent({
        name,
        date: scheduleCheck.date,
        endDate: scheduleCheck.endDate,
        isSingleDay: scheduleCheck.isSingleDay,
        time: scheduleCheck.startTime24,
        endTime: scheduleCheck.endTime24,
        venue,
        organization: org,
        password: pass,
        createdBy: state.user?.name,
        creatorEmail: state.user?.email
      });

      if (error || !data) {
        toast(error?.message || 'Unable to create event right now. Please try again.', 'error');
        return;
      }

      state.currentEvent = data;
      state.events = [data, ...(state.events || []).filter(e => e.id !== data.id)];
      state.attendance = [];
      state.editAuthorized = true;
      state.pendingDeleteId = null;

      document.getElementById('display-event-id').textContent = data.id;
      document.getElementById('display-event-name').textContent = data.name;
      document.getElementById('display-event-dt').textContent = formatEventDateTime(
        data.date,
        data.time,
        data.end_time,
        data.end_date,
        data.is_single_day
      );

      const emailBox = document.getElementById('display-email-confirmation');
      const targetEmail = escapeHtml(data.creator_email || state.user?.email || 'your registered email');
      if (emailBox) {
        if (emailResult && emailResult.sent) {
          emailBox.className = 'bg-success-bg border border-theme rounded-xl py-3 px-4 mb-5 text-[0.8rem] text-success leading-relaxed';
          emailBox.innerHTML = `Confirmation email sent to <strong id="display-creator-email" class="font-semibold">${targetEmail}</strong>.`;
        } else {
          emailBox.className = 'bg-warning-bg border border-theme rounded-xl py-3 px-4 mb-5 text-[0.8rem] text-warning leading-relaxed';
          emailBox.innerHTML = `Event saved (<strong id="display-creator-email" class="font-semibold">${targetEmail}</strong>). Email delivery notice: ${escapeHtml(emailResult?.error || 'Configure RESEND_API_KEY in Vercel to enable confirmation emails.')}`;
        }
      }

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
    const { Supabase, EventService, AttendanceService, SecurityConfig } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!SecurityConfig.isCoordinator()) {
      toast('Access denied: Please use Student Portal for view-only access.', 'error');
      return;
    }

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing. Check config.js.', 'error');
      return;
    }

    const id = document.getElementById('join-id')?.value.trim().toUpperCase() || '';
    const pass = document.getElementById('join-pass')?.value || '';

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

      state.currentEvent = ev;
      state.editAuthorized = false;
      state.pendingDeleteId = null;
      state.studentSearchQuery = '';

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

  async function joinEventAsStudent(explicitId) {
    if (isStudentLoadingEvent) return;
    const { Supabase, EventService, AttendanceService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing. Check config.js.', 'error');
      return;
    }

    const idInput = document.getElementById('student-join-id');
    const rawId = explicitId || (idInput ? idInput.value : '');
    const cleanId = String(rawId || '').trim().toUpperCase();

    if (!cleanId) {
      toast('Enter an Event ID or select an event from the list below', 'error');
      return;
    }

    const btn = document.getElementById('btn-student-view-event');
    isStudentLoadingEvent = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading Attendance...';
    }

    try {
      const { event: ev, error } = await EventService.getPublicEventById(cleanId);
      if (error || !ev) {
        toast(error || 'Event not found', 'error');
        return;
      }

      state.currentEvent = ev;
      state.editAuthorized = false;
      state.pendingDeleteId = null;
      state.pendingDeleteRoll = null;
      state.studentSearchQuery = '';

      const { data: attList } = await AttendanceService.fetchByEvent(ev.id);
      state.attendance = attList;

      AttendX.Pages.Attendance.enterAttendance();
      toast('Viewing ' + ev.name, 'info');
    } finally {
      isStudentLoadingEvent = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'View Attendance List';
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

  function openForgotEventPasswordModal(prefillEventId) {
    const joinIdVal = prefillEventId || document.getElementById('join-id')?.value.trim().toUpperCase() || '';
    const input = document.getElementById('forgot-ev-id-input');
    const statusBox = document.getElementById('forgot-ev-status-box');

    if (input) input.value = joinIdVal;
    if (statusBox) {
      statusBox.className = 'hidden';
      statusBox.innerHTML = '';
    }

    AttendX.Components.Modals.closeModal('modal-edit-auth');
    AttendX.Components.Modals.openModal('modal-forgot-event-password');
  }

  async function submitForgotEventPassword() {
    if (isSubmittingForgotPwd) return;
    const { EventService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const { escapeHtml } = AttendX.Utils.Sanitizer;

    const input = document.getElementById('forgot-ev-id-input');
    const statusBox = document.getElementById('forgot-ev-status-box');
    const btn = document.getElementById('btn-submit-forgot-ev-pwd');
    const rawId = input ? input.value.trim().toUpperCase() : '';

    if (!rawId) {
      toast('Please enter the Event ID', 'error');
      return;
    }

    isSubmittingForgotPwd = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    try {
      const res = await EventService.requestEventPasswordReset(rawId);
      if (!res.success) {
        if (statusBox) {
          statusBox.className = 'mb-4 py-3 px-3.5 rounded-xl text-[0.8rem] leading-relaxed border border-theme bg-danger-bg text-danger';
          statusBox.textContent = res.error || 'Unable to send reset link.';
        }
        toast(res.error || 'Unable to send reset link', 'error');
        return;
      }

      if (statusBox) {
        const isEmailDelivered = res.emailSent !== false;
        statusBox.className = isEmailDelivered
          ? 'mb-4 py-3 px-3.5 rounded-xl text-[0.8rem] leading-relaxed border border-theme bg-success-bg text-success'
          : 'mb-4 py-3 px-3.5 rounded-xl text-[0.8rem] leading-relaxed border border-theme bg-warning-bg text-warning';

        let html = escapeHtml(res.message);
        if (!isEmailDelivered && res.emailError) {
          html += `<div class="mt-1.5 text-[0.75rem]">Delivery error: ${escapeHtml(res.emailError)}</div>`;
        }
        if (res.isCreatorSession && res.creatorResetLink) {
          const urlObj = new URL(res.creatorResetLink, window.location.origin);
          const evIdParam = escapeHtml(urlObj.searchParams.get('event_id') || rawId);
          const tokenParam = escapeHtml(urlObj.searchParams.get('reset_token') || '');
          html += `<div class="mt-2.5 pt-2.5 border-t border-theme"><button type="button" onclick="openResetEventPasswordModal('${evIdParam}', '${tokenParam}')" class="text-accent font-semibold underline cursor-pointer bg-transparent border-none p-0 text-[0.8rem]">Verified Creator Session: Open Reset Form →</button></div>`;
        }
        statusBox.innerHTML = html;
      }
      toast(
        res.emailSent === false
          ? 'Reset token generated (check email provider settings)'
          : 'Password reset link dispatched to creator email',
        res.emailSent === false ? 'info' : 'success'
      );
    } finally {
      isSubmittingForgotPwd = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
      }
    }
  }

  async function openResetEventPasswordModal(eventId, rawToken) {
    const { EventService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;

    const verifyRes = await EventService.verifyEventResetToken(eventId, rawToken);
    if (!verifyRes.valid) {
      toast(verifyRes.error || 'Invalid or expired reset link', 'error');
      return false;
    }

    AttendX.Components.Modals.closeModal('modal-forgot-event-password');

    const targetLabel = document.getElementById('reset-ev-target-id');
    const hiddenId = document.getElementById('reset-ev-hidden-id');
    const hiddenToken = document.getElementById('reset-ev-hidden-token');

    if (targetLabel) targetLabel.textContent = `${verifyRes.event.name} (${verifyRes.event.id})`;
    if (hiddenId) hiddenId.value = verifyRes.event.id;
    if (hiddenToken) hiddenToken.value = rawToken;

    AttendX.Components.Modals.openModal('modal-reset-event-password');
    return true;
  }

  async function executeResetEventPassword() {
    if (isSubmittingResetPwd) return;
    const { EventService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;

    const eventId = document.getElementById('reset-ev-hidden-id')?.value || '';
    const token = document.getElementById('reset-ev-hidden-token')?.value || '';
    const newPass = document.getElementById('reset-ev-new-pass')?.value || '';
    const confirmPass = document.getElementById('reset-ev-confirm-pass')?.value || '';

    if (!newPass || newPass.length < 4) {
      toast('New event password must be at least 4 characters', 'error');
      return;
    }

    if (newPass !== confirmPass) {
      toast('New password and confirmation do not match', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-reset-ev-pwd');
    isSubmittingResetPwd = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating...';
    }

    try {
      const res = await EventService.resetEventPasswordWithToken(eventId, token, newPass);
      if (!res.success) {
        toast(res.error || 'Failed to reset event password', 'error');
        return;
      }

      AttendX.Components.Modals.closeModal('modal-reset-event-password');
      if (window.history && window.history.replaceState && window.location.search.includes('event_reset=')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const joinIdInput = document.getElementById('join-id');
      if (joinIdInput && eventId) {
        joinIdInput.value = eventId;
      }
      toast('Event password updated! You can now join with the new password.', 'success');
    } finally {
      isSubmittingResetPwd = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save New Password';
      }
    }
  }

  global.toggleSingleDayEvent = toggleSingleDayEvent;
  global.handleStartDateChange = handleStartDateChange;
  global.setTimePeriod = setTimePeriod;
  global.syncTimePickerValue = syncTimePickerValue;
  global.applyTimeToPickerUI = applyTimeToPickerUI;
  global.createNewEvent = createNewEvent;
  global.copyEventId = copyEventId;
  global.joinEvent = joinEvent;
  global.joinEventAsStudent = joinEventAsStudent;
  global.quickJoin = quickJoin;
  global.openForgotEventPasswordModal = openForgotEventPasswordModal;
  global.submitForgotEventPassword = submitForgotEventPassword;
  global.openResetEventPasswordModal = openResetEventPasswordModal;
  global.executeResetEventPassword = executeResetEventPassword;

  AttendX.Pages.Events = {
    renderEventsPages,
    toggleSingleDayEvent,
    handleStartDateChange,
    setTimePeriod,
    syncTimePickerValue,
    applyTimeToPickerUI,
    fetchRecentEvents,
    renderRecentEvents,
    renderStudentRecentEvents,
    createNewEvent,
    copyEventId,
    joinEvent,
    joinEventAsStudent,
    quickJoin,
    openForgotEventPasswordModal,
    submitForgotEventPassword,
    openResetEventPasswordModal,
    executeResetEventPassword
  };
})(window);
