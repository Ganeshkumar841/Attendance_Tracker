/**
 * Frontend Page — View List, Roll Number Status Checker & Coordinator Reactive Participant Deletion Page
 * In Student mode: strictly read-only (no delete/edit buttons, no modifications allowed) with instant roll status lookup.
 * In Coordinator mode: supports instant reactive participant deletion with password verification.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isDeletingParticipant = false;

  function renderViewListTab() {
    const mount = document.getElementById('panel-list');
    if (!mount) return;

    mount.innerHTML = `
      <!-- Roll Number Search & Instant Attendance Status Verification -->
      <div class="bg-surface border border-theme rounded-2xl p-4 mb-4 shadow-card">
        <label for="att-search-input" class="block text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-2 select-none">
          Check Attendance Status by Roll Number
        </label>
        <div class="relative flex items-center">
          <input
            type="text"
            id="att-search-input"
            placeholder="Search roll number (e.g. Y25CSE001 or CSE001)..."
            maxlength="20"
            oninput="handleSearchRollInput(this.value)"
            class="w-full py-2.5 pl-3.5 pr-9 bg-input border border-theme rounded-lg text-main font-mono text-[0.88rem] uppercase placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          >
          <button
            type="button"
            id="att-search-clear-btn"
            onclick="clearSearchRollInput()"
            title="Clear search"
            aria-label="Clear search"
            class="hidden absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-main hover:bg-surface2 cursor-pointer focus:outline-none select-none"
          >
            ✕
          </button>
        </div>
        <div id="student-status-banner" class="hidden mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed"></div>
      </div>

      <!-- Status Filter Chips -->
      <div id="filter-bar" class="flex items-center justify-between gap-2 mb-4 flex-wrap select-none">
        <div class="flex gap-2 flex-wrap">
          <button
            type="button"
            data-filter="all"
            onclick="setFilter('all', this)"
            class="filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all bg-primary border-primary text-white focus:outline-none select-none"
          >
            All
          </button>
          <button
            type="button"
            data-filter="attended"
            onclick="setFilter('attended', this)"
            class="filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-muted hover:text-main focus:outline-none select-none"
          >
            Attended
          </button>
          <button
            type="button"
            data-filter="preregistered"
            onclick="setFilter('preregistered', this)"
            class="filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-muted hover:text-main focus:outline-none select-none"
          >
            Pre-reg
          </button>
        </div>
        <span
          id="viewlist-readonly-notice"
          class="hidden text-[0.74rem] text-muted font-medium"
        >
          Read-only view · Modifications disabled
        </span>
      </div>

      <div id="att-list-container">
        <div class="text-center py-12 px-5 text-muted">
          <div class="text-[2.4rem] mb-3 opacity-35">📋</div>
          <p class="text-[0.88rem]">No entries present yet.</p>
        </div>
      </div>

      <!-- Student Session Navigation Footer (Visible only in Student Mode since Export tab is hidden) -->
      <div id="student-session-actions" class="hidden mt-6 bg-surface border border-theme rounded-2xl p-5 shadow-card">
        <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-3 select-none">
          Student Session Actions
        </div>
        <div class="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onclick="leaveAttendanceScreen()"
            class="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-full font-sans text-[0.82rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
          >
            ← Check Another Event
          </button>
          <button
            type="button"
            onclick="switchRoleScreen()"
            class="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-full font-sans text-[0.82rem] font-medium text-secondary hover:text-main bg-surface2 border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none select-none"
          >
            Switch Role
          </button>
          <button
            type="button"
            onclick="confirmLogout()"
            class="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-full font-sans text-[0.82rem] font-medium bg-danger-bg text-danger border-0 transition-all cursor-pointer focus:outline-none select-none"
          >
            Sign Out
          </button>
        </div>
      </div>
    `;
  }

  function handleSearchRollInput(rawVal) {
    const clean = String(rawVal || '').trim().toUpperCase();
    const input = document.getElementById('att-search-input');
    if (input && input.value !== clean) {
      input.value = clean;
    }
    AttendX.State.studentSearchQuery = clean;

    const clearBtn = document.getElementById('att-search-clear-btn');
    if (clearBtn) {
      if (clean) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    renderList();
  }

  function clearSearchRollInput() {
    const input = document.getElementById('att-search-input');
    if (input) input.value = '';
    AttendX.State.studentSearchQuery = '';
    const clearBtn = document.getElementById('att-search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    renderList();
  }

  function setFilter(filterKey, el) {
    AttendX.State.currentFilter = filterKey;

    const activeChipClass   = 'filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all bg-primary border-primary text-white focus:outline-none select-none';
    const inactiveChipClass = 'filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-muted hover:text-main focus:outline-none select-none';

    document.querySelectorAll('.filter-chip').forEach(chip => {
      const isMatch = el ? chip === el : chip.getAttribute('data-filter') === filterKey;
      chip.className = isMatch ? activeChipClass : inactiveChipClass;
    });

    renderList();
  }

  function updateStatusBanner(allItems, searchQuery) {
    const banner = document.getElementById('student-status-banner');
    if (!banner) return;

    const { escapeHtml, formatTime } = AttendX.Utils.Sanitizer;
    const query = String(searchQuery || '').trim().toUpperCase();

    if (!query || query.length < 3) {
      banner.className = 'hidden';
      banner.innerHTML = '';
      return;
    }

    const exactMatch = allItems.find(
      a => a.rollNo === query || a.rollNo.endsWith(query)
    );

    if (exactMatch) {
      const safeRoll = escapeHtml(exactMatch.rollNo);
      const safeYear = escapeHtml(exactMatch.yearLabel);
      const safeBranch = escapeHtml(exactMatch.branch);
      const safeTime = escapeHtml(formatTime(exactMatch.timestamp));

      if (exactMatch.status === 'attended') {
        banner.className =
          'mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed bg-success-bg text-success border border-theme';
        banner.innerHTML = `<strong>✓ Marked Attended:</strong> <span class="font-mono font-medium">${safeRoll}</span> (${safeYear} Year · ${safeBranch}) is marked <strong>Present</strong> at ${safeTime}.`;
      } else {
        banner.className =
          'mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed bg-surface-tint text-accent border border-strong/40';
        banner.innerHTML = `<strong>○ Pre-Registered:</strong> <span class="font-mono font-medium">${safeRoll}</span> (${safeYear} Year · ${safeBranch}) is pre-registered but <strong>not yet marked attended</strong>.`;
      }
      return;
    }

    if (query.length >= 5) {
      const safeQuery = escapeHtml(query);
      banner.className =
        'mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed bg-danger-bg text-danger border border-theme';
      banner.innerHTML = `<strong>Not Marked Yet:</strong> No attendance record found matching <span class="font-mono font-medium">${safeQuery}</span> in this event.`;
    } else {
      banner.className = 'hidden';
      banner.innerHTML = '';
    }
  }

  function renderList() {
    const container = document.getElementById('att-list-container');
    if (!container) return;

    const state = AttendX.State;
    const { SecurityConfig } = AttendX.Backend;
    const { escapeHtml, formatTime } = AttendX.Utils.Sanitizer;

    // Determine if current user is an authenticated Coordinator for this event
    const canModify =
      SecurityConfig.isCoordinator() &&
      SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id);

    const readonlyNotice = document.getElementById('viewlist-readonly-notice');
    const studentActions = document.getElementById('student-session-actions');
    const clearBtn = document.getElementById('att-search-clear-btn');

    if (readonlyNotice) {
      if (canModify) {
        readonlyNotice.classList.add('hidden');
      } else {
        readonlyNotice.classList.remove('hidden');
      }
    }
    if (studentActions) {
      if (canModify) {
        studentActions.classList.add('hidden');
      } else {
        studentActions.classList.remove('hidden');
      }
    }

    const searchQuery = String(state.studentSearchQuery || '').trim().toUpperCase();
    if (clearBtn) {
      if (searchQuery) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    const allItems = Array.isArray(state.attendance) ? [...state.attendance] : [];
    updateStatusBanner(allItems, searchQuery);

    let items = allItems;

    if (state.currentFilter !== 'all') {
      items = items.filter(a => a.status === state.currentFilter);
    }

    if (searchQuery) {
      items = items.filter(
        a =>
          a.rollNo.includes(searchQuery) ||
          a.branch.includes(searchQuery) ||
          String(a.yearLabel).toUpperCase().includes(searchQuery)
      );
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (items.length === 0) {
      let subText = 'No attendance records found for this event yet.';
      if (searchQuery) {
        subText = `No entries matching "${searchQuery}".`;
      } else if (state.currentFilter !== 'all') {
        subText = 'Try switching to a different status filter.';
      } else if (canModify) {
        subText = 'Start marking attendance in the Entry tab.';
      }

      container.innerHTML = `
        <div class="text-center py-12 px-5 text-muted select-none">
          <div class="text-[2.4rem] mb-3 opacity-35">📋</div>
          <p class="text-[0.88rem]">No entries present.<br><span class="text-[0.75rem]">${escapeHtml(subText)}</span></p>
        </div>
      `;
      return;
    }

    container.innerHTML =
      '<div class="flex flex-col gap-2.5">' +
      items
        .map(a => {
          const safeId = escapeHtml(String(a.id ?? a.rollNo));
          const safeRoll = escapeHtml(a.rollNo);
          const safeYear = escapeHtml(a.yearLabel);
          const safeBranch = escapeHtml(a.branch);
          const safeTime = escapeHtml(formatTime(a.timestamp));
          const isAttended = a.status === 'attended';
          const badgeClass = isAttended
            ? 'bg-success-bg text-success'
            : 'bg-surface-tint text-accent';
          const badgeText = isAttended ? '✓ Present' : '○ Pre-reg';

          // Strictly omit delete button for Students (canModify === false)
          const deleteActionHtml = canModify
            ? `
                <button
                  type="button"
                  data-delete-id="${safeId}"
                  data-delete-roll="${safeRoll}"
                  title="Delete Entry"
                  aria-label="Delete ${safeRoll}"
                  class="delete-participant-btn inline-flex items-center justify-center py-2 px-4 rounded-full text-[0.8rem] font-medium bg-danger-bg text-danger border-0 transition-all cursor-pointer focus:outline-none select-none active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              `
            : '';

          return `
            <div
              id="entry-${safeRoll}"
              data-entry-id="${safeId}"
              data-entry-roll="${safeRoll}"
              class="att-item flex items-center justify-between py-3.5 px-[18px] bg-surface border border-theme hover:border-strong rounded-xl gap-3 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <div class="font-mono text-[0.92rem] font-medium text-main truncate">${safeRoll}</div>
                <div class="text-[0.76rem] text-muted mt-[3px]">${safeYear} Year · ${safeBranch} · ${safeTime}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0 select-none">
                <span class="text-[0.7rem] py-1 px-2.5 rounded-full font-medium ${badgeClass}">${badgeText}</span>
                ${deleteActionHtml}
              </div>
            </div>
          `;
        })
        .join('') +
      '</div>';

    // Bind delete listeners ONLY when Coordinator modification privileges are active
    if (canModify) {
      container.querySelectorAll('.delete-participant-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const targetId = btn.getAttribute('data-delete-id');
          const targetRoll = btn.getAttribute('data-delete-roll');
          requestDelete(targetId, targetRoll);
        });
      });
    }
  }

  function requestDelete(id, rollNo) {
    const state = AttendX.State;
    const { SecurityConfig, AuditService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_DELETE_REQUEST_BLOCKED', { id, rollNo });
      toast('Access denied: Student accounts cannot modify or delete attendance records.', 'error');
      return;
    }

    const entry = (state.attendance || []).find(
      a =>
        (rollNo && String(a.rollNo).toUpperCase() === String(rollNo).toUpperCase()) ||
        (id !== undefined && id !== null && String(a.id) === String(id)) ||
        String(a.rollNo).toUpperCase() === String(id).toUpperCase()
    );

    state.pendingDeleteId = entry ? entry.id : id;
    state.pendingDeleteRoll = entry ? entry.rollNo : rollNo || String(id);

    const targetLabel = document.getElementById('delete-target-roll');
    if (targetLabel) {
      targetLabel.textContent = state.pendingDeleteRoll;
    }

    if (state.editAuthorized) {
      AttendX.Components.Modals.openModal('modal-delete-confirm');
    } else {
      AttendX.Components.Modals.openModal('modal-edit-auth');
    }
  }

  async function confirmEditAuth() {
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { EventService, SecurityConfig, AuditService } = AttendX.Backend;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_EDIT_AUTH_BLOCKED', {});
      AttendX.Components.Modals.closeModal('modal-edit-auth');
      toast('Access denied: Student accounts are read-only.', 'error');
      return;
    }

    const passInput = document.getElementById('edit-auth-pass');
    const pass = passInput ? passInput.value : '';

    const { valid, error } = await EventService.verifyActiveEventPassword(state.currentEvent, pass);
    if (!valid) {
      toast(error || 'Incorrect password', 'error');
      return;
    }

    state.editAuthorized = true;
    AttendX.Components.Modals.closeModal('modal-edit-auth');
    if (passInput) passInput.value = '';
    AttendX.Components.Modals.openModal('modal-delete-confirm');
  }

  /**
   * Execute participant deletion with immediate synchronous state + DOM update (Coordinator only).
   */
  async function executeDelete() {
    if (isDeletingParticipant) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { AttendanceService, Supabase, SecurityConfig, AuditService } = AttendX.Backend;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id) ||
      !state.editAuthorized
    ) {
      AuditService.logAction('UNAUTHORIZED_EXECUTE_DELETE_BLOCKED', {});
      AttendX.Components.Modals.closeModal('modal-delete-confirm');
      toast('Access denied: Unauthorized modification attempt.', 'error');
      return;
    }

    const targetId = state.pendingDeleteId;
    const targetRoll =
      state.pendingDeleteRoll ||
      document.getElementById('delete-target-roll')?.textContent?.trim();

    if ((targetId === null || targetId === undefined) && !targetRoll) {
      AttendX.Components.Modals.closeModal('modal-delete-confirm');
      return;
    }

    const delBtn = document.getElementById('btn-execute-delete');
    isDeletingParticipant = true;
    if (delBtn) {
      delBtn.disabled = true;
      delBtn.textContent = 'Deleting...';
    }

    // Snapshot for rollback only if DB throws an error
    const previousAttendance = [...(state.attendance || [])];

    // 1. IMMEDIATELY remove from local state & re-render UI (0ms delay, no reload needed)
    state.attendance = previousAttendance.filter(a => {
      if (targetRoll && String(a.rollNo).toUpperCase() === String(targetRoll).toUpperCase()) {
        return false;
      }
      if (targetId !== null && targetId !== undefined && String(a.id) === String(targetId)) {
        return false;
      }
      return true;
    });

    AttendX.Components.Modals.closeModal('modal-delete-confirm');
    state.pendingDeleteId = null;
    state.pendingDeleteRoll = null;

    // Immediately update Total / Attended / Pre-reg counters, View List DOM, and Branch Summary
    AttendX.Pages.Attendance.updateAttendanceUI();

    try {
      if (Supabase.isConfigured() && state.currentEvent?.id) {
        const { error } = await AttendanceService.deleteEntry({
          id: targetId,
          rollNo: targetRoll,
          eventId: state.currentEvent.id
        });

        if (error) {
          // Rollback local state if database rejected the delete
          state.attendance = previousAttendance;
          AttendX.Pages.Attendance.updateAttendanceUI();
          toast('Failed to delete entry', 'error');
          return;
        }
      }

      toast('Entry deleted', 'info');
    } finally {
      isDeletingParticipant = false;
      if (delBtn) {
        delBtn.disabled = false;
        delBtn.textContent = 'Delete';
      }
    }
  }

  global.handleSearchRollInput = handleSearchRollInput;
  global.clearSearchRollInput = clearSearchRollInput;
  global.setFilter = setFilter;
  global.renderList = renderList;
  global.requestDelete = requestDelete;
  global.confirmEditAuth = confirmEditAuth;
  global.executeDelete = executeDelete;

  AttendX.Pages.ViewList = {
    renderViewListTab,
    handleSearchRollInput,
    clearSearchRollInput,
    setFilter,
    renderList,
    requestDelete,
    confirmEditAuth,
    executeDelete
  };
})(window);
