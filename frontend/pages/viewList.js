/**
 * Frontend Page — View List & Instant Reactive Participant Deletion Page
 * Immediately removes deleted participants from DOM and state without requiring a page reload.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isDeletingParticipant = false;

  function renderViewListTab() {
    const mount = document.getElementById('panel-list');
    if (!mount) return;

    mount.innerHTML = `
      <div id="filter-bar" class="flex gap-2 mb-4 flex-wrap select-none">
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

      <div id="att-list-container">
        <div class="text-center py-12 px-5 text-muted">
          <div class="text-[2.4rem] mb-3 opacity-35">📋</div>
          <p class="text-[0.88rem]">No entries present yet.<br>Start marking attendance.</p>
        </div>
      </div>
    `;
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

  function renderList() {
    const container = document.getElementById('att-list-container');
    if (!container) return;

    const state = AttendX.State;
    const { escapeHtml, formatTime } = AttendX.Utils.Sanitizer;

    let items = Array.isArray(state.attendance) ? [...state.attendance] : [];

    if (state.currentFilter !== 'all') {
      items = items.filter(a => a.status === state.currentFilter);
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (items.length === 0) {
      const subText =
        state.currentFilter !== 'all'
          ? 'Try a different filter.'
          : 'Start marking attendance.';
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
                <button
                  type="button"
                  data-delete-id="${safeId}"
                  data-delete-roll="${safeRoll}"
                  title="Delete Entry"
                  aria-label="Delete ${safeRoll}"
                  class="delete-participant-btn inline-flex items-center justify-center py-2 px-4 rounded-full text-[0.8rem] font-medium bg-danger-bg text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger transition-all cursor-pointer focus:outline-none select-none active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          `;
        })
        .join('') +
      '</div>';

    // Attach click listeners directly to each delete button
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

  function requestDelete(id, rollNo) {
    const state = AttendX.State;
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
    const { EventService } = AttendX.Backend;

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
   * Execute participant deletion with immediate synchronous state + DOM update.
   * No manual page reload is needed.
   */
  async function executeDelete() {
    if (isDeletingParticipant) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { AttendanceService, Supabase } = AttendX.Backend;

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

  global.setFilter = setFilter;
  global.renderList = renderList;
  global.requestDelete = requestDelete;
  global.confirmEditAuth = confirmEditAuth;
  global.executeDelete = executeDelete;

  AttendX.Pages.ViewList = {
    renderViewListTab,
    setFilter,
    renderList,
    requestDelete,
    confirmEditAuth,
    executeDelete
  };
})(window);
