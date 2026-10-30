/**
 * Frontend Page — View List & Reactive Participant Deletion Page
 * Fixes the manual reload bug on participant deletion by immediately updating local state
 * and re-rendering the filtered participant list, stats counters, and branch summary.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isDeletingParticipant = false;

  function renderViewListTab() {
    const mount = document.getElementById('panel-list');
    if (!mount) return;

    mount.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div id="filter-bar" class="flex gap-2 flex-wrap select-none">
          <button
            type="button"
            onclick="setFilter('all', this)"
            class="filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all bg-primary border-primary text-white focus:outline-none select-none"
          >
            All
          </button>
          <button
            type="button"
            onclick="setFilter('attended', this)"
            class="filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-muted hover:text-main focus:outline-none select-none"
          >
            Attended
          </button>
          <button
            type="button"
            onclick="setFilter('preregistered', this)"
            class="filter-chip py-[7px] px-4 rounded-full text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-muted hover:text-main focus:outline-none select-none"
          >
            Pre-reg
          </button>
        </div>

        <div class="relative flex-1 sm:max-w-[230px]">
          <input
            type="text"
            id="list-search-input"
            placeholder="Search roll no or branch..."
            oninput="renderList()"
            class="w-full py-1.5 px-3.5 bg-input border border-theme rounded-full text-[0.8rem] text-main font-mono uppercase placeholder:font-sans placeholder:normal-case placeholder:text-muted/65 focus:border-primary focus:outline-none transition-all"
          >
        </div>
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
      chip.className = chip === el ? activeChipClass : inactiveChipClass;
    });

    renderList();
  }

  function renderList() {
    const container = document.getElementById('att-list-container');
    if (!container) return;

    const state = AttendX.State;
    const { escapeHtml, formatTime } = AttendX.Utils.Sanitizer;
    const searchInput = document.getElementById('list-search-input');
    const searchQuery = searchInput ? searchInput.value.trim().toUpperCase() : '';

    let items = Array.isArray(state.attendance) ? [...state.attendance] : [];

    if (state.currentFilter !== 'all') {
      items = items.filter(a => a.status === state.currentFilter);
    }

    if (searchQuery) {
      items = items.filter(
        a =>
          String(a.rollNo || '').toUpperCase().includes(searchQuery) ||
          String(a.branch || '').toUpperCase().includes(searchQuery) ||
          String(a.yearLabel || '').toUpperCase().includes(searchQuery)
      );
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (items.length === 0) {
      const subText =
        searchQuery
          ? 'No matching roll numbers found.'
          : state.currentFilter !== 'all'
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
          const safeId = escapeHtml(String(a.id));
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
              id="entry-${safeId}"
              class="att-item flex items-center justify-between py-3.5 px-[18px] bg-surface border border-theme hover:border-strong rounded-xl gap-3 transition-colors animate-slide-in"
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
                  title="Delete Entry"
                  aria-label="Delete ${safeRoll}"
                  class="delete-participant-btn inline-flex items-center justify-center py-2 px-3 rounded-full text-[0.8rem] font-medium bg-danger-bg text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger transition-all cursor-pointer focus:outline-none select-none active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    // Bind delete listeners safely without inline string injection issues
    container.querySelectorAll('.delete-participant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-delete-id');
        if (targetId !== null) {
          requestDelete(targetId);
        }
      });
    });
  }

  function requestDelete(id) {
    const state = AttendX.State;
    state.pendingDeleteId = id;

    // Compare normalized string IDs so BIGSERIAL numbers and string attributes always match
    const entry = (state.attendance || []).find(a => String(a.id) === String(id));
    const targetLabel = document.getElementById('delete-target-roll');
    if (targetLabel) {
      targetLabel.textContent = entry?.rollNo || String(id);
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
   * Execute participant deletion and immediately synchronize local state + UI
   * so no manual page reload is ever required.
   */
  async function executeDelete() {
    if (isDeletingParticipant) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { AttendanceService } = AttendX.Backend;

    const id = state.pendingDeleteId;
    if (id === null || id === undefined) {
      AttendX.Components.Modals.closeModal('modal-delete-confirm');
      return;
    }

    const delBtn = document.getElementById('btn-execute-delete');
    isDeletingParticipant = true;
    if (delBtn) {
      delBtn.disabled = true;
      delBtn.textContent = 'Deleting...';
    }

    try {
      const { error } = await AttendanceService.deleteEntry(id, state.currentEvent?.id);

      if (error) {
        toast('Failed to delete entry. Please try again.', 'error');
      } else {
        // Immediately remove from local state and re-render View List + Stats + Branch Summary
        state.attendance = (state.attendance || []).filter(
          a => String(a.id) !== String(id)
        );
        AttendX.Pages.Attendance.updateAttendanceUI();
        toast('Participant deleted', 'info');
      }

      AttendX.Components.Modals.closeModal('modal-delete-confirm');
      state.pendingDeleteId = null;
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
