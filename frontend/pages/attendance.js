/**
 * Frontend Page — Attendance Workspace (Header, Stats Row, Tab Switcher, Manual Entry & Pre-reg CSV Upload)
 * Enforces role-based access: Coordinators have Entry, View List, and Export;
 * Students are restricted strictly to the View List section in read-only mode.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isSubmittingEntry = false;

  function renderAttendancePage() {
    const mount = document.getElementById('page-attendance-mount');
    if (!mount) return;

    mount.innerHTML = `
      <section id="screen-attendance" class="screen hidden flex-1 flex-col">
        <!-- Event Context Subheader -->
        <div class="flex items-center justify-between py-4 px-4 sm:px-7 border-b border-theme bg-surface select-none gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              id="hdr-back-btn"
              onclick="leaveAttendanceScreen()"
              class="py-1.5 px-3 rounded-full text-[0.76rem] font-medium text-accent bg-surface-tint border border-theme hover:border-strong cursor-pointer focus:outline-none select-none shrink-0"
            >
              ← Back
            </button>
            <strong id="hdr-event-name" class="text-[1.02rem] font-medium text-main truncate">Event</strong>
          </div>
          <div class="flex items-center gap-2.5 shrink-0 text-right text-[0.78rem] text-muted">
            <span
              id="hdr-student-readonly-pill"
              class="hidden py-1 px-2.5 rounded-full text-[0.7rem] font-medium bg-surface2 text-secondary border border-theme"
            >
              View Only
            </span>
            <span id="hdr-event-id" class="font-mono text-accent font-medium text-[0.88rem]"></span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto py-6 px-4 max-w-[760px] mx-auto w-full">
          <!-- STATS ROW -->
          <div class="grid grid-cols-3 gap-3 mb-6 select-none">
            <div class="bg-surface border border-theme rounded-[14px] py-[18px] px-3.5 text-center">
              <div id="stat-total" class="text-[1.55rem] font-medium font-sans text-main">0</div>
              <div class="text-[0.7rem] text-muted uppercase tracking-[0.06em] mt-1 font-medium">Total</div>
            </div>
            <div class="bg-surface border border-theme rounded-[14px] py-[18px] px-3.5 text-center">
              <div id="stat-attended" class="text-[1.55rem] font-medium font-sans text-success">0</div>
              <div class="text-[0.7rem] text-muted uppercase tracking-[0.06em] mt-1 font-medium">Attended</div>
            </div>
            <div class="bg-surface border border-theme rounded-[14px] py-[18px] px-3.5 text-center">
              <div id="stat-prereg" class="text-[1.55rem] font-medium font-sans text-accent">0</div>
              <div class="text-[0.7rem] text-muted uppercase tracking-[0.06em] mt-1 font-medium">Pre-reg</div>
            </div>
          </div>

          <!-- TABS -->
          <div id="attendance-tabs-bar" class="flex bg-input rounded-full p-1 mb-6 border border-theme select-none">
            <button
              type="button"
              id="tab-entry"
              onclick="switchTab('entry')"
              class="nav-tab flex-1 py-[9px] px-3.5 rounded-full font-sans text-[0.82rem] font-medium cursor-pointer text-center transition-all border-none bg-primary text-white focus:outline-none select-none"
            >
              Entry
            </button>
            <button
              type="button"
              id="tab-list"
              onclick="switchTab('list')"
              class="nav-tab flex-1 py-[9px] px-3.5 rounded-full font-sans text-[0.82rem] font-medium cursor-pointer text-center transition-all border-none bg-transparent text-muted hover:text-main focus:outline-none select-none"
            >
              View List
            </button>
            <button
              type="button"
              id="tab-export"
              onclick="switchTab('export')"
              class="nav-tab flex-1 py-[9px] px-3.5 rounded-full font-sans text-[0.82rem] font-medium cursor-pointer text-center transition-all border-none bg-transparent text-muted hover:text-main focus:outline-none select-none"
            >
              Export
            </button>
          </div>

          <!-- ENTRY TAB (Coordinator / Staff Only) -->
          <div id="panel-entry">
            <div class="bg-surface border border-theme rounded-2xl p-6 mb-5">
              <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-3 select-none">Select Year</div>
              <div class="grid grid-cols-4 gap-2.5 mb-6 select-none">
                <button
                  type="button"
                  onclick="selectYear(1)"
                  class="year-btn py-3 px-2 rounded-[10px] font-sans text-[0.88rem] font-medium cursor-pointer border border-theme bg-input text-muted hover:border-strong hover:text-main transition-all text-center focus:outline-none select-none"
                >
                  1st <span id="y1-prefix" class="prefix font-mono text-[0.68rem] opacity-85 block mt-[3px] font-normal"></span>
                </button>
                <button
                  type="button"
                  onclick="selectYear(2)"
                  class="year-btn py-3 px-2 rounded-[10px] font-sans text-[0.88rem] font-medium cursor-pointer border border-theme bg-input text-muted hover:border-strong hover:text-main transition-all text-center focus:outline-none select-none"
                >
                  2nd <span id="y2-prefix" class="prefix font-mono text-[0.68rem] opacity-85 block mt-[3px] font-normal"></span>
                </button>
                <button
                  type="button"
                  onclick="selectYear(3)"
                  class="year-btn py-3 px-2 rounded-[10px] font-sans text-[0.88rem] font-medium cursor-pointer border border-theme bg-input text-muted hover:border-strong hover:text-main transition-all text-center focus:outline-none select-none"
                >
                  3rd <span id="y3-prefix" class="prefix font-mono text-[0.68rem] opacity-85 block mt-[3px] font-normal"></span>
                </button>
                <button
                  type="button"
                  onclick="selectYear(4)"
                  class="year-btn py-3 px-2 rounded-[10px] font-sans text-[0.88rem] font-medium cursor-pointer border border-theme bg-input text-muted hover:border-strong hover:text-main transition-all text-center focus:outline-none select-none"
                >
                  4th <span id="y4-prefix" class="prefix font-mono text-[0.68rem] opacity-85 block mt-[3px] font-normal"></span>
                </button>
              </div>

              <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-3 select-none">Roll Number</div>
              <div
                id="roll-wrap"
                class="flex items-center bg-input border border-theme rounded-lg overflow-hidden transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
              >
                <div
                  id="roll-prefix"
                  class="py-3 px-4 bg-surface-tint font-mono text-[0.92rem] text-accent whitespace-nowrap border-r border-theme font-medium select-none"
                >
                  Y??
                </div>
                <input
                  type="text"
                  id="roll-input"
                  placeholder="CSE001"
                  maxlength="10"
                  onkeydown="if(event.key==='Enter') addEntry()"
                  oninput="this.value=this.value.toUpperCase()"
                  class="flex-1 py-3 px-4 bg-transparent border-none outline-none text-main font-mono text-[0.95rem] uppercase font-medium placeholder:text-muted/65"
                >
              </div>
              <p class="text-[0.75rem] text-muted mt-2">
                Format: BRANCH + 3-digit number (e.g. CSE042, MECH007)
              </p>
              <button
                type="button"
                id="btn-mark-attendance"
                onclick="addEntry()"
                class="mt-5 w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Mark Attendance
              </button>
            </div>

            <!-- Pre-registration CSV Upload Card -->
            <div class="bg-surface border border-theme rounded-2xl p-[22px] shadow-card">
              <div class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-1.5 select-none">Pre-registration</div>
              <p class="text-[0.82rem] text-muted mb-3 leading-[1.45]">
                Upload a CSV of pre-registered roll numbers to automatically verify them during manual entry.
              </p>

              <div class="bg-input border border-dashed border-theme rounded-lg p-3.5 text-[0.78rem] text-muted">
                <strong class="text-secondary font-medium">Format requirement:</strong><br>
                A single column list containing only the full roll numbers.<br>
                <code class="block mt-1.5 bg-surface py-2 px-2.5 rounded-md text-accent border border-theme font-mono">
                  Y25CSE001<br>Y25CSE002<br>Y24ECE045
                </code>
              </div>

              <input type="file" id="prereg-file" accept=".csv,text/csv" class="hidden" onchange="loadPreregCSV(this)">
              <button
                type="button"
                id="btn-upload-prereg"
                onclick="document.getElementById('prereg-file').click()"
                class="mt-4 w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Upload Pre-reg CSV
              </button>
            </div>
          </div>

          <!-- VIEW LIST TAB MOUNT -->
          <div id="panel-list" class="hidden"></div>

          <!-- EXPORT TAB MOUNT (Coordinator / Staff Only) -->
          <div id="panel-export" class="hidden"></div>

          <div class="h-8"></div>
        </div>
      </section>
    `;

    AttendX.Pages.ViewList.renderViewListTab();
    AttendX.Pages.ExportPage.renderExportTab();
  }

  /**
   * Synchronize tab bar visibility and read-only badges based on whether the current session
   * is an authorized Coordinator or a read-only Student.
   */
  function syncAttendanceRoleUI() {
    const { SecurityConfig } = AttendX.Backend;
    const state = AttendX.State;
    const isCoord =
      SecurityConfig.isCoordinator() &&
      SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id);

    const tabEntry = document.getElementById('tab-entry');
    const tabList = document.getElementById('tab-list');
    const tabExport = document.getElementById('tab-export');
    const panelEntry = document.getElementById('panel-entry');
    const panelExport = document.getElementById('panel-export');
    const studentPill = document.getElementById('hdr-student-readonly-pill');
    const backBtn = document.getElementById('hdr-back-btn');

    if (!isCoord) {
      // Student mode: hide Entry and Export tabs & panels completely
      if (tabEntry) {
        tabEntry.classList.add('hidden');
        tabEntry.style.display = 'none';
      }
      if (tabExport) {
        tabExport.classList.add('hidden');
        tabExport.style.display = 'none';
      }
      if (panelEntry) {
        panelEntry.classList.add('hidden');
        panelEntry.style.display = 'none';
      }
      if (panelExport) {
        panelExport.classList.add('hidden');
        panelExport.style.display = 'none';
      }
      if (tabList) {
        tabList.textContent = 'View List (Attendance Status)';
      }
      if (studentPill) {
        studentPill.classList.remove('hidden');
      }
      if (backBtn) {
        backBtn.textContent = '← Events';
      }
    } else {
      // Coordinator mode: show all 3 tabs
      if (tabEntry) {
        tabEntry.classList.remove('hidden');
        tabEntry.style.display = '';
      }
      if (tabExport) {
        tabExport.classList.remove('hidden');
        tabExport.style.display = '';
      }
      if (tabList) {
        tabList.textContent = 'View List';
      }
      if (studentPill) {
        studentPill.classList.add('hidden');
      }
      if (backBtn) {
        backBtn.textContent = '← Menu';
      }
    }
  }

  function switchTab(tab) {
    const { SecurityConfig, AuditService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    const isCoord =
      SecurityConfig.isCoordinator() &&
      SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id);

    // Enforce Student restriction: Students can ONLY access the 'list' section
    if (!isCoord && tab !== 'list') {
      AuditService.logAction('STUDENT_RESTRICTED_TAB_BLOCKED', { attemptedTab: tab });
      toast('Student login is restricted to the View List section only.', 'info');
      tab = 'list';
    }

    syncAttendanceRoleUI();

    const activeTabClass   = 'nav-tab flex-1 py-[9px] px-3.5 rounded-full font-sans text-[0.82rem] font-medium cursor-pointer text-center transition-all border-none bg-primary text-white focus:outline-none select-none';
    const inactiveTabClass = 'nav-tab flex-1 py-[9px] px-3.5 rounded-full font-sans text-[0.82rem] font-medium cursor-pointer text-center transition-all border-none bg-transparent text-muted hover:text-main focus:outline-none select-none';

    ['entry', 'list', 'export'].forEach(t => {
      const tabBtn = document.getElementById('tab-' + t);
      const panel  = document.getElementById('panel-' + t);

      if (!isCoord && (t === 'entry' || t === 'export')) {
        if (tabBtn) {
          tabBtn.classList.add('hidden');
          tabBtn.style.display = 'none';
        }
        if (panel) {
          panel.classList.add('hidden');
          panel.style.display = 'none';
        }
        return;
      }

      if (tabBtn) {
        tabBtn.className = t === tab ? activeTabClass : inactiveTabClass;
      }
      if (panel) {
        if (t === tab) {
          panel.classList.remove('hidden');
          panel.style.display = 'block';
        } else {
          panel.classList.add('hidden');
          panel.style.display = 'none';
        }
      }
    });

    if (tab === 'list') {
      AttendX.Pages.ViewList.renderList();
    } else if (tab === 'export' && isCoord) {
      AttendX.Pages.ExportPage.renderBranchSummary();
    }
  }

  function leaveAttendanceScreen() {
    const { SecurityConfig, AttendanceService } = AttendX.Backend;
    AttendanceService.unsubscribeRealtime();
    if (SecurityConfig.isStudent()) {
      AttendX.App.showScreen('screen-student-events');
    } else {
      AttendX.App.showScreen('screen-menu');
    }
  }

  function selectYear(y) {
    if (!AttendX.Backend.SecurityConfig.isCoordinator()) return;
    AttendX.State.selectedYear = y;
    updateYearUI();
    const input = document.getElementById('roll-input');
    if (input) input.focus();
  }

  function updateYearUI() {
    const selectedYear = AttendX.State.selectedYear;
    const yearPrefixes = AttendX.State.yearPrefixes;

    const baseBtnClass   = 'year-btn py-3 px-2 rounded-[10px] font-sans text-[0.88rem] font-medium cursor-pointer border transition-all text-center focus:outline-none select-none ';
    const activeClass    = 'bg-primary border-primary text-white';
    const inactiveClass  = 'border-theme bg-input text-muted hover:border-strong hover:text-main';

    document.querySelectorAll('.year-btn').forEach((btn, i) => {
      const isSelected = i + 1 === selectedYear;
      btn.className = baseBtnClass + (isSelected ? activeClass : inactiveClass);
    });

    const prefixEl = document.getElementById('roll-prefix');
    if (prefixEl) {
      prefixEl.textContent = selectedYear ? yearPrefixes[selectedYear] : 'Y??';
    }
  }

  function enterAttendance() {
    const state = AttendX.State;
    const { SecurityConfig } = AttendX.Backend;
    if (!state.currentEvent) return;

    document.getElementById('hdr-event-name').textContent = state.currentEvent.name;
    document.getElementById('hdr-event-id').textContent = state.currentEvent.id;

    state.selectedYear = null;
    updateYearUI();
    syncAttendanceRoleUI();

    // Sync student search input if student entered their roll number on the event lookup screen
    const searchInput = document.getElementById('att-search-input');
    if (searchInput) {
      searchInput.value = state.studentSearchQuery || '';
    }

    AttendX.Backend.AttendanceService.subscribeToEventAttendance(state.currentEvent.id, {
      onInsert(record) {
        if (!record) return;
        const exists = state.attendance.some(
          a => String(a.id) === String(record.id) || a.rollNo === record.rollNo
        );
        if (!exists) {
          state.attendance.push(record);
          updateAttendanceUI();
        }
      },
      onUpdate(record) {
        if (!record) return;
        const idx = state.attendance.findIndex(
          a => String(a.id) === String(record.id) || a.rollNo === record.rollNo
        );
        if (idx !== -1) {
          state.attendance[idx] = record;
          updateAttendanceUI();
        }
      },
      onDelete(deletedId, deletedRollNo) {
        const beforeLen = state.attendance.length;
        state.attendance = state.attendance.filter(a => {
          if (deletedRollNo && a.rollNo === String(deletedRollNo).toUpperCase()) return false;
          if (deletedId !== undefined && deletedId !== null && String(a.id) === String(deletedId)) return false;
          return true;
        });
        if (state.attendance.length !== beforeLen) {
          updateAttendanceUI();
        }
      }
    });

    AttendX.App.showScreen('screen-attendance');

    const isCoord =
      SecurityConfig.isCoordinator() &&
      SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id);

    // Students are strictly directed to the View List section; Coordinators default to Entry
    switchTab(isCoord ? 'entry' : 'list');
  }

  async function addEntry() {
    if (isSubmittingEntry) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { parseRollSuffix, YEAR_LABELS } = AttendX.Utils.Sanitizer;
    const { AttendanceService, SecurityConfig, AuditService } = AttendX.Backend;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_ADD_ENTRY_BLOCKED', { role: SecurityConfig.getSessionRole() });
      toast('Access denied: Student accounts cannot mark attendance.', 'error');
      return;
    }

    if (!state.selectedYear) {
      toast('Select a year first', 'error');
      return;
    }

    const rollInput = document.getElementById('roll-input');
    const parsed = parseRollSuffix(rollInput.value);
    if (!parsed.valid) {
      toast(parsed.error, 'error');
      return;
    }

    const fullRoll = state.yearPrefixes[state.selectedYear] + parsed.suffix;
    const existing = state.attendance.find(a => a.rollNo === fullRoll);

    const btn = document.getElementById('btn-mark-attendance');
    isSubmittingEntry = true;
    if (btn) btn.disabled = true;

    try {
      if (existing) {
        if (existing.status === 'preregistered') {
          const { data, error } = await AttendanceService.markPresentFromPrereg(
            existing.id,
            state.currentEvent.id,
            fullRoll
          );
          if (!error && data) {
            const idx = state.attendance.findIndex(
              a => String(a.id) === String(existing.id) || a.rollNo === fullRoll
            );
            if (idx !== -1) state.attendance[idx] = data;
            updateAttendanceUI();
            toast('✓ Pre-reg verified: ' + fullRoll, 'success');
            rollInput.value = '';
          } else {
            toast('Unable to update pre-registered entry.', 'error');
          }
        } else {
          toast('Already marked: ' + fullRoll, 'error');
        }
        return;
      }

      const { data, error } = await AttendanceService.insertEntry({
        eventId: state.currentEvent.id,
        rollNo: fullRoll,
        year: state.selectedYear,
        yearLabel: YEAR_LABELS[state.selectedYear],
        branch: parsed.branch,
        num: parsed.num,
        recordedBy: state.user?.name
      });

      if (error) {
        if (error.code === '23505') {
          toast('Already marked: ' + fullRoll, 'error');
        } else {
          toast('Unable to mark attendance. Please try again.', 'error');
        }
        return;
      }

      if (data) {
        const alreadyAddedByRealtime = state.attendance.some(
          a => String(a.id) === String(data.id) || a.rollNo === data.rollNo
        );
        if (!alreadyAddedByRealtime) {
          state.attendance.push(data);
        }
        updateAttendanceUI();
      }

      rollInput.value = '';
      toast('✓ Marked: ' + fullRoll, 'success');
    } finally {
      isSubmittingEntry = false;
      if (btn) btn.disabled = false;
    }
  }

  async function loadPreregCSV(input) {
    const file = input.files?.[0];
    if (!file) return;

    const { toast } = AttendX.Components.Toast;
    const { SecurityConfig, AttendanceService, AuditService } = AttendX.Backend;
    const { parseFullRollRow } = AttendX.Utils.Sanitizer;
    const state = AttendX.State;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_CSV_UPLOAD_BLOCKED', { role: SecurityConfig.getSessionRole() });
      toast('Access denied: Student accounts cannot upload CSV files.', 'error');
      input.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast('Only .csv files are supported', 'error');
      input.value = '';
      return;
    }

    if (file.size > SecurityConfig.MAX_FILE_SIZE_BYTES) {
      toast('CSV file exceeds the 5 MB size limit', 'error');
      input.value = '';
      return;
    }

    const btn = document.getElementById('btn-upload-prereg');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="inline-block w-[13px] h-[13px] border-2 border-white/20 border-t-main rounded-full animate-spin shrink-0 align-middle"></span> Uploading…';
    }

    const resetBtn = () => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Upload Pre-reg CSV';
      }
    };

    const reader = new FileReader();
    reader.onerror = () => {
      toast('Failed to read CSV file', 'error');
      resetBtn();
    };

    reader.onload = async e => {
      try {
        const text = String(e.target?.result || '');
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        if (lines.length > SecurityConfig.MAX_CSV_ROWS) {
          toast(`CSV exceeds maximum limit of ${SecurityConfig.MAX_CSV_ROWS} rows`, 'error');
          resetBtn();
          return;
        }

        const seenInBatch = new Set();
        const existingRolls = new Set(state.attendance.map(a => a.rollNo));
        const toInsert = [];

        lines.forEach(line => {
          const parsed = parseFullRollRow(line, state.yearPrefixes);
          if (!parsed) return;
          if (existingRolls.has(parsed.rollNo) || seenInBatch.has(parsed.rollNo)) return;

          seenInBatch.add(parsed.rollNo);
          toInsert.push({
            event_id: state.currentEvent.id,
            roll_no: parsed.rollNo,
            year: parsed.year,
            year_label: parsed.yearLabel,
            branch: parsed.branch,
            num: parsed.num,
            status: 'preregistered',
            recorded_by: 'pre-registration setup'
          });
        });

        if (toInsert.length === 0) {
          toast('No new valid roll numbers to add', 'info');
          resetBtn();
          return;
        }

        const { data, error } = await AttendanceService.bulkInsertPrereg(toInsert);
        if (error) {
          toast('Error uploading pre-registrations', 'error');
        } else {
          data.forEach(row => {
            if (!state.attendance.some(a => a.rollNo === row.rollNo)) {
              state.attendance.push(row);
            }
          });
          updateAttendanceUI();
          toast(`✓ ${data.length} pre-registered students added`, 'success');
        }
      } finally {
        resetBtn();
      }
    };

    reader.readAsText(file);
    input.value = '';
  }

  function updateAttendanceUI() {
    const all      = AttendX.State.attendance || [];
    const attended = all.filter(a => a.status === 'attended');
    const prereg   = all.filter(a => a.status === 'preregistered');

    const totalEl = document.getElementById('stat-total');
    const attEl   = document.getElementById('stat-attended');
    const preEl   = document.getElementById('stat-prereg');

    if (totalEl) totalEl.textContent = String(all.length);
    if (attEl)   attEl.textContent   = String(attended.length);
    if (preEl)   preEl.textContent   = String(prereg.length);

    syncAttendanceRoleUI();
    AttendX.Pages.ViewList.renderList();

    if (AttendX.Backend.SecurityConfig.isCoordinator()) {
      AttendX.Pages.ExportPage.renderBranchSummary();
    }
  }

  global.switchTab = switchTab;
  global.selectYear = selectYear;
  global.enterAttendance = enterAttendance;
  global.leaveAttendanceScreen = leaveAttendanceScreen;
  global.addEntry = addEntry;
  global.loadPreregCSV = loadPreregCSV;
  global.updateAttendanceUI = updateAttendanceUI;

  AttendX.Pages.Attendance = {
    renderAttendancePage,
    syncAttendanceRoleUI,
    switchTab,
    selectYear,
    updateYearUI,
    enterAttendance,
    leaveAttendanceScreen,
    addEntry,
    loadPreregCSV,
    updateAttendanceUI
  };
})(window);
