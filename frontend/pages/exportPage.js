/**
 * Frontend Page — Export Report, Branch Summary & Session Actions Tab
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isDeletingEvent = false;

  function renderExportTab() {
    const mount = document.getElementById('panel-export');
    if (!mount) return;

    mount.innerHTML = `
      <div class="bg-surface border border-theme rounded-2xl p-[22px] mb-4 shadow-card">
        <div class="text-[1.02rem] font-medium mb-2 text-main">Export Report</div>
        <p class="text-[0.84rem] text-muted mb-4 leading-relaxed">
          Generates separate Excel files for each branch. Students are ordered by their registered year (Y25, Y24, etc.).
        </p>
        <button
          type="button"
          onclick="exportExcel()"
          class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none"
        >
          Download Excel Report(s)
        </button>
      </div>

      <div class="bg-surface border border-theme rounded-2xl p-[22px] mb-4 shadow-card">
        <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-3 select-none">Branch Summary</div>
        <div id="branch-summary"></div>
      </div>

      <div class="bg-surface border border-theme rounded-2xl p-[22px] shadow-card">
        <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-3 select-none">Session Actions</div>
        <div class="flex flex-col gap-3">
          <button
            type="button"
            onclick="showScreen('screen-menu')"
            class="w-full inline-flex items-center justify-center py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
          >
            Back to Menu
          </button>
          <button
            type="button"
            onclick="confirmLogout()"
            class="w-full inline-flex items-center justify-center py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium bg-danger-bg text-danger border-0 transition-all cursor-pointer focus:outline-none select-none"
          >
            End Session
          </button>
          <div class="h-px bg-theme my-1"></div>
          <button
            type="button"
            onclick="openModal('modal-delete-event')"
            class="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium bg-danger-bg text-danger border-0 transition-all cursor-pointer focus:outline-none select-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4h6v2"></path>
            </svg>
            Discard Event &amp; All Data
          </button>
        </div>
      </div>
    `;
  }

  function renderBranchSummary() {
    const container = document.getElementById('branch-summary');
    if (!container) return;

    const { groupByBranch, groupByYear } = AttendX.Utils.Exporter;
    const { escapeHtml } = AttendX.Utils.Sanitizer;

    const attendedRecords = (AttendX.State.attendance || []).filter(a => a.status === 'attended');
    const branches = groupByBranch(attendedRecords);
    const entries = Object.entries(branches);

    if (entries.length === 0) {
      container.innerHTML = '<p class="text-muted text-[0.83rem]">No attendance data yet.</p>';
      return;
    }

    container.innerHTML = entries
      .map(([branch, students]) => {
        const safeBranch = escapeHtml(branch);
        const yearsStr = escapeHtml(Object.keys(groupByYear(students)).join(', '));
        return `
          <div class="flex justify-between items-center py-2.5 border-b border-theme last:border-b-0">
            <div>
              <div class="font-medium text-main">${safeBranch}</div>
              <div class="text-[0.72rem] text-muted">${yearsStr}</div>
            </div>
            <div class="font-mono text-[1.1rem] text-accent font-medium">${students.length}</div>
          </div>
        `;
      })
      .join('');
  }

  function exportExcel() {
    const { exportBranchWiseExcel } = AttendX.Utils.Exporter;
    const { toast } = AttendX.Components.Toast;
    exportBranchWiseExcel(AttendX.State.attendance, AttendX.State.currentEvent, toast);
  }

  async function executeDeleteEvent() {
    if (isDeletingEvent) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { EventService, AttendanceService } = AttendX.Backend;

    const passInput = document.getElementById('delete-event-pass');
    const pass = passInput ? passInput.value : '';

    if (!pass) {
      toast('Enter the event password', 'error');
      return;
    }

    const { valid, error: pwdErr } = await EventService.verifyActiveEventPassword(state.currentEvent, pass);
    if (!valid) {
      toast(pwdErr || 'Incorrect password', 'error');
      return;
    }

    const eventId = state.currentEvent.id;
    const btn = document.getElementById('btn-execute-delete-event');
    isDeletingEvent = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Deleting...';
    }

    try {
      const { error, stage } = await EventService.deleteEventAndRecords(eventId);
      if (error) {
        toast(
          stage === 'attendance'
            ? 'Unable to delete attendance records. Please try again.'
            : 'Unable to delete event. Please try again.',
          'error'
        );
        return;
      }

      AttendanceService.unsubscribeRealtime();
      state.currentEvent = null;
      state.attendance = [];
      state.editAuthorized = false;
      state.pendingDeleteId = null;
      state.events = (state.events || []).filter(e => e.id !== eventId);

      AttendX.Components.Modals.closeModal('modal-delete-event');
      if (passInput) passInput.value = '';
      toast('Event and all data permanently deleted', 'success');
      AttendX.App.showScreen('screen-menu');
    } finally {
      isDeletingEvent = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Delete Everything';
      }
    }
  }

  global.renderBranchSummary = renderBranchSummary;
  global.exportExcel = exportExcel;
  global.executeDeleteEvent = executeDeleteEvent;

  AttendX.Pages.ExportPage = {
    renderExportTab,
    renderBranchSummary,
    exportExcel,
    executeDeleteEvent
  };
})(window);
