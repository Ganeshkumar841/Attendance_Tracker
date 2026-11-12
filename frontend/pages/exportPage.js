(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isDeletingEvent = false;
  let isChangingEventPassword = false;

  function renderExportTab() {
    const mount = document.getElementById('panel-export');
    if (!mount) return;

    mount.innerHTML = `
      <div class="bg-surface border border-theme rounded-2xl p-6 mb-4 shadow-card">
        <div class="text-[1.02rem] font-semibold mb-4 text-main">Export Attendance Data</div>
        <button
          type="button"
          id="btn-download-excel"
          onclick="exportExcel()"
          class="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-sans text-[0.9rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none"
        >
          Download Excel Report(s)
        </button>
      </div>

      <div class="bg-surface border border-theme rounded-2xl p-6 mb-4 shadow-card">
        <div class="text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted mb-3">Branch Summary (Attended)</div>
        <div id="branch-summary"></div>
      </div>

      <div class="bg-surface border border-theme rounded-2xl p-6 shadow-card">
        <div class="text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted mb-3">Event &amp; Session Management</div>
        <div class="flex flex-col gap-2.5">
          <button
            type="button"
            id="btn-open-change-ev-pwd"
            onclick="openModal('modal-change-event-password')"
            class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-sans text-[0.84rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
          >
            Change Password
          </button>
          <button
            type="button"
            onclick="leaveAttendanceScreen()"
            class="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-sans text-[0.84rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
          >
            Back to Menu
          </button>
          <button
            type="button"
            onclick="confirmLogout()"
            class="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-sans text-[0.84rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
          >
            Sign Out
          </button>
          <div class="h-px bg-theme my-1.5"></div>
          <button
            type="button"
            onclick="openModal('modal-delete-event')"
            class="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-sans text-[0.84rem] font-medium bg-danger-bg text-danger border border-theme hover:border-danger/40 transition-all cursor-pointer focus:outline-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 select-none">
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
      container.innerHTML = '<p class="text-muted text-[0.83rem]">No attendance data recorded yet.</p>';
      return;
    }

    container.innerHTML = entries
      .map(([branch, students]) => {
        const safeBranch = escapeHtml(branch);
        const yearsStr = escapeHtml(Object.keys(groupByYear(students)).join(', '));
        return `
          <div class="flex justify-between items-center py-2.5 border-b border-theme last:border-b-0">
            <div>
              <div class="font-semibold text-main">${safeBranch}</div>
              <div class="text-[0.72rem] text-muted">${yearsStr}</div>
            </div>
            <div class="font-mono text-[1.1rem] text-accent font-semibold">${students.length}</div>
          </div>
        `;
      })
      .join('');
  }

  function exportExcel() {
    const { SecurityConfig, AuditService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_EXPORT_BLOCKED', { role: SecurityConfig.getSessionRole() });
      toast('Access denied: Export is restricted to Coordinators & Staff.', 'error');
      return;
    }

    const { exportBranchWiseExcel } = AttendX.Utils.Exporter;
    exportBranchWiseExcel(state.attendance, state.currentEvent, toast);
  }

  async function executeChangeEventPassword() {
    if (isChangingEventPassword) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { EventService, SecurityConfig, AuditService } = AttendX.Backend;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_CHANGE_EVENT_PWD_BLOCKED', {});
      AttendX.Components.Modals.closeModal('modal-change-event-password');
      toast('Access denied: Unauthorized password change attempt.', 'error');
      return;
    }

    const currentPass = document.getElementById('change-ev-current-pass')?.value || '';
    const newPass = document.getElementById('change-ev-new-pass')?.value || '';

    if (!currentPass || !newPass) {
      toast('Please fill in both password fields', 'error');
      return;
    }

    if (newPass.length < 4) {
      toast('Event password must be at least 4 characters', 'error');
      return;
    }

    const btn = document.getElementById('btn-submit-change-ev-pwd');
    isChangingEventPassword = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating...';
    }

    try {
      const res = await EventService.changeEventPassword(
        state.currentEvent.id,
        currentPass,
        newPass
      );

      if (!res.success) {
        toast(res.error || 'Unable to change event password', 'error');
        return;
      }

      AttendX.Components.Modals.closeModal('modal-change-event-password');
      toast('Event password updated!', 'success');
    } finally {
      isChangingEventPassword = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Update Password';
      }
    }
  }

  async function executeDeleteEvent() {
    if (isDeletingEvent) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { EventService, AttendanceService, SecurityConfig, AuditService } = AttendX.Backend;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_EVENT_DELETE_MODAL_BLOCKED', {});
      AttendX.Components.Modals.closeModal('modal-delete-event');
      toast('Access denied: Student accounts cannot delete events.', 'error');
      return;
    }

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

      if (AttendX.Pages?.Attendance?.stopExpirationMonitor) {
        AttendX.Pages.Attendance.stopExpirationMonitor();
      }
      if (AttendX.Pages?.ViewList?.clearRecentlyRemoved) {
        AttendX.Pages.ViewList.clearRecentlyRemoved(eventId);
      }
      AttendanceService.unsubscribeRealtime();
      state.currentEvent = null;
      state.attendance = [];
      state.editAuthorized = false;
      state.pendingDeleteId = null;
      state.pendingDeleteRoll = null;
      state.pendingBulkDelete = false;
      state.events = (state.events || []).filter(e => e.id !== eventId);
      if (AttendX.App?.clearPersistedActiveEvent) {
        AttendX.App.clearPersistedActiveEvent();
      }

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
  global.executeChangeEventPassword = executeChangeEventPassword;
  global.executeDeleteEvent = executeDeleteEvent;

  AttendX.Pages.ExportPage = {
    renderExportTab,
    renderBranchSummary,
    exportExcel,
    executeChangeEventPassword,
    executeDeleteEvent
  };
})(window);
