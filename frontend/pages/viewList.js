(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  let isDeletingParticipant = false;
  let isReAddingParticipant = false;
  let isSelectMode = false;
  const selectedEntryIds = new Set();

  const REMOVED_KEY_PREFIX = 'attendx_removed_';
  const MAX_REMOVED_ENTRIES = 50;

  function getRemovedStorageKey(eventId) {
    const cleanId = String(eventId || AttendX.State?.currentEvent?.id || '').trim().toUpperCase();
    return cleanId ? REMOVED_KEY_PREFIX + cleanId : null;
  }

  function loadRecentlyRemoved(eventId) {
    const key = getRemovedStorageKey(eventId);
    if (!key) return [];
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_REMOVED_ENTRIES) : [];
    } catch (_e) {
      return [];
    }
  }

  function saveRecentlyRemoved(eventId, list) {
    const key = getRemovedStorageKey(eventId);
    if (!key) return;
    try {
      const capped = (Array.isArray(list) ? list : []).slice(0, MAX_REMOVED_ENTRIES);
      if (capped.length === 0) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(capped));
      }
    } catch (_e) {}
  }

  function addEntriesToRecentlyRemoved(eventId, entries) {
    if (!eventId || !Array.isArray(entries) || entries.length === 0) return;
    const current = loadRecentlyRemoved(eventId);
    const updated = [...current];

    entries.forEach(item => {
      if (!item || !item.rollNo) return;
      const rollUpper = String(item.rollNo).toUpperCase();
      const filteredIdx = updated.findIndex(x => String(x.rollNo).toUpperCase() === rollUpper);
      if (filteredIdx !== -1) {
        updated.splice(filteredIdx, 1);
      }
      updated.unshift({
        id: item.id,
        rollNo: rollUpper,
        year: Number(item.year) || 1,
        yearLabel: item.yearLabel || '1st',
        branch: String(item.branch || '').toUpperCase(),
        num: String(item.num || ''),
        status: item.status === 'preregistered' ? 'preregistered' : 'attended',
        recordedBy: item.recordedBy || 'Coordinator'
      });
    });

    saveRecentlyRemoved(eventId, updated.slice(0, MAX_REMOVED_ENTRIES));
  }

  function removeRollFromRecentlyRemoved(eventId, rollNo) {
    if (!eventId || !rollNo) return;
    const rollUpper = String(rollNo).toUpperCase();
    const current = loadRecentlyRemoved(eventId);
    const next = current.filter(item => String(item.rollNo).toUpperCase() !== rollUpper);
    if (next.length !== current.length) {
      saveRecentlyRemoved(eventId, next);
    }
  }

  function clearRecentlyRemoved(eventId) {
    const key = getRemovedStorageKey(eventId);
    if (!key) return;
    try {
      sessionStorage.removeItem(key);
    } catch (_e) {}
  }

  function resetSelectionState() {
    isSelectMode = false;
    selectedEntryIds.clear();
    if (AttendX.State) {
      AttendX.State.pendingBulkDelete = false;
    }
  }

  function removeIdFromSelection(deletedId) {
    if (deletedId === undefined || deletedId === null) return;
    selectedEntryIds.delete(String(deletedId));
  }

  function renderViewListTab() {
    const mount = document.getElementById('panel-list');
    if (!mount) return;

    mount.innerHTML = `
      <div class="bg-surface border border-theme rounded-2xl p-4 sm:p-5 mb-5 shadow-card">
        <label for="att-search-input" class="block text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted mb-2.5">
          Search Participant by Roll Number
        </label>
        <div class="relative flex items-center">
          <input
            type="text"
            id="att-search-input"
            placeholder="Search roll number (e.g. Y25CSE001 or CSE001)..."
            maxlength="20"
            oninput="handleSearchRollInput(this.value)"
            class="w-full py-2.5 pl-3.5 pr-9 bg-input border border-theme rounded-xl text-main font-mono text-[0.9rem] uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          >
          <button
            type="button"
            id="att-search-clear-btn"
            onclick="clearSearchRollInput()"
            title="Clear search"
            aria-label="Clear search"
            class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-main hover:bg-surface2 cursor-pointer focus:outline-none select-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div id="student-status-banner" class="hidden mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed"></div>
      </div>

      <div id="filter-bar" class="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-filter="all"
            onclick="setFilter('all', this)"
            class="filter-chip py-1.5 px-4 rounded-lg text-[0.78rem] font-semibold cursor-pointer border transition-all bg-primary border-primary text-white shadow-btn-primary focus:outline-none"
          >
            All
          </button>
          <button
            type="button"
            data-filter="attended"
            onclick="setFilter('attended', this)"
            class="filter-chip py-1.5 px-4 rounded-lg text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-secondary hover:text-main hover:border-strong focus:outline-none"
          >
            Attended
          </button>
          <button
            type="button"
            data-filter="preregistered"
            onclick="setFilter('preregistered', this)"
            class="filter-chip py-1.5 px-4 rounded-lg text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-secondary hover:text-main hover:border-strong focus:outline-none"
          >
            Pre-reg
          </button>
        </div>
        <div id="list-header-actions" class="flex items-center gap-2 flex-wrap"></div>
      </div>

      <div id="att-list-container">
        <div class="text-center py-12 px-5 text-muted">
          <p class="text-[0.88rem]">No entries present yet.</p>
        </div>
      </div>

      <div id="recently-removed-container" class="hidden mt-5"></div>

      <div id="student-session-actions" class="hidden mt-6 bg-surface border border-theme rounded-2xl p-5 shadow-card">
        <div class="text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted mb-3">
          Navigation
        </div>
        <div class="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onclick="leaveAttendanceScreen()"
            class="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-sans text-[0.83rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
          >
            ← Check Another Event
          </button>
          <button
            type="button"
            onclick="confirmLogout()"
            class="flex-1 inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-sans text-[0.83rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
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

    const activeChipClass =
      'filter-chip py-1.5 px-4 rounded-lg text-[0.78rem] font-semibold cursor-pointer border transition-all bg-primary border-primary text-white shadow-btn-primary focus:outline-none';
    const inactiveChipClass =
      'filter-chip py-1.5 px-4 rounded-lg text-[0.78rem] font-medium cursor-pointer border transition-all border-theme bg-surface text-secondary hover:text-main hover:border-strong focus:outline-none';

    document.querySelectorAll('.filter-chip').forEach(chip => {
      const isMatch = el ? chip === el : chip.getAttribute('data-filter') === filterKey;
      chip.className = isMatch ? activeChipClass : inactiveChipClass;
    });

    renderList();
  }

  function toggleSelectMode() {
    isSelectMode = !isSelectMode;
    if (!isSelectMode) {
      selectedEntryIds.clear();
    }
    renderList();
  }

  function toggleRowSelection(entryId, checked) {
    const key = String(entryId);
    if (checked) {
      selectedEntryIds.add(key);
    } else {
      selectedEntryIds.delete(key);
    }
    renderList();
  }

  function toggleSelectAllVisible(checked, visibleIds) {
    if (!Array.isArray(visibleIds)) return;
    if (checked) {
      visibleIds.forEach(id => selectedEntryIds.add(String(id)));
    } else {
      visibleIds.forEach(id => selectedEntryIds.delete(String(id)));
    }
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
        banner.innerHTML = `<strong>Marked Attended:</strong> <span class="font-mono font-semibold">${safeRoll}</span> (${safeYear} Year · ${safeBranch}) is marked <strong>Present</strong> at ${safeTime}.`;
      } else {
        banner.className =
          'mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed bg-surface-tint text-accent border border-theme';
        banner.innerHTML = `<strong>Pre-Registered:</strong> <span class="font-mono font-semibold">${safeRoll}</span> (${safeYear} Year · ${safeBranch}) is pre-registered but <strong>not yet marked attended</strong>.`;
      }
      return;
    }

    if (query.length >= 5) {
      const safeQuery = escapeHtml(query);
      banner.className =
        'mt-3 py-2.5 px-3.5 rounded-xl text-[0.82rem] leading-relaxed bg-danger-bg text-danger border border-theme';
      banner.innerHTML = `<strong>Not Marked Yet:</strong> No attendance record found matching <span class="font-mono font-semibold">${safeQuery}</span> in this event.`;
    } else {
      banner.className = 'hidden';
      banner.innerHTML = '';
    }
  }

  function renderRecentlyRemovedSection(canModify, isExpired) {
    const container = document.getElementById('recently-removed-container');
    if (!container) return;

    const eventId = AttendX.State?.currentEvent?.id;
    if (isExpired && eventId) {
      clearRecentlyRemoved(eventId);
    }

    if (!canModify || isExpired || !eventId) {
      container.className = 'hidden mt-5';
      container.innerHTML = '';
      return;
    }

    const removedList = loadRecentlyRemoved(eventId);
    if (removedList.length === 0) {
      container.className = 'hidden mt-5';
      container.innerHTML = '';
      return;
    }

    const { escapeHtml } = AttendX.Utils.Sanitizer;

    const reAddAllBtnHtml =
      removedList.length > 1
        ? `
          <button
            type="button"
            id="btn-readd-all"
            onclick="reAddAllRemoved()"
            class="py-1 px-3 rounded-lg text-[0.76rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
          >
            Re-add All
          </button>
        `
        : '';

    const rowsHtml = removedList
      .map(item => {
        const safeRoll = escapeHtml(item.rollNo);
        const safeBranch = escapeHtml(item.branch || '');
        const safeYear = escapeHtml(item.yearLabel || '1st');
        return `
          <div class="flex items-center justify-between py-2.5 px-3.5 bg-surface2 border border-theme rounded-xl gap-3">
            <div class="min-w-0 flex-1">
              <span class="font-mono text-[0.88rem] font-semibold text-main">${safeRoll}</span>
              <span class="text-[0.74rem] text-muted ml-2">${safeYear} Year · ${safeBranch}</span>
            </div>
            <button
              type="button"
              data-readd-roll="${safeRoll}"
              class="readd-single-btn py-1 px-3 rounded-lg text-[0.76rem] font-medium bg-surface hover:bg-surface-hover text-accent border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Re-add
            </button>
          </div>
        `;
      })
      .join('');

    container.className = 'mt-5 bg-surface border border-theme rounded-2xl p-4 sm:p-5 shadow-card';
    container.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-muted">Recently Removed</div>
        ${reAddAllBtnHtml}
      </div>
      <div class="flex flex-col gap-2">
        ${rowsHtml}
      </div>
    `;

    container.querySelectorAll('.readd-single-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const roll = btn.getAttribute('data-readd-roll');
        if (roll) reAddRemovedEntry(roll);
      });
    });
  }

  function renderList() {
    const container = document.getElementById('att-list-container');
    const headerActions = document.getElementById('list-header-actions');
    if (!container) return;

    const state = AttendX.State;
    const { SecurityConfig, EventService } = AttendX.Backend;
    const { escapeHtml, formatTime } = AttendX.Utils.Sanitizer;

    const canModify =
      SecurityConfig.isCoordinator() &&
      SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id);

    const isExpired = EventService.isEventExpired(state.currentEvent);

    const studentActions = document.getElementById('student-session-actions');
    const clearBtn = document.getElementById('att-search-clear-btn');

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
    const validIdsSet = new Set(allItems.map(a => String(a.id ?? a.rollNo)));
    Array.from(selectedEntryIds).forEach(id => {
      if (!validIdsSet.has(String(id))) {
        selectedEntryIds.delete(id);
      }
    });

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

    const visibleIds = items.map(a => String(a.id ?? a.rollNo));
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every(id => selectedEntryIds.has(id));
    const selectedCount = selectedEntryIds.size;

    if (headerActions) {
      if (canModify && allItems.length > 0) {
        let actionsHtml = '';
        if (isSelectMode) {
          actionsHtml += `
            <label class="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.78rem] font-medium bg-surface border border-theme text-secondary cursor-pointer">
              <input
                type="checkbox"
                id="att-select-all-checkbox"
                ${allVisibleSelected ? 'checked' : ''}
                class="w-3.5 h-3.5 rounded border-theme text-primary focus:ring-primary/20 cursor-pointer accent-blue-600"
              >
              <span>Select all</span>
            </label>
          `;
          if (selectedCount > 0) {
            actionsHtml += `
              <button
                type="button"
                id="btn-delete-selected"
                onclick="requestBulkDelete()"
                class="inline-flex items-center justify-center py-1.5 px-3 rounded-lg text-[0.78rem] font-semibold bg-danger-bg text-danger hover:opacity-90 border border-theme transition-all cursor-pointer focus:outline-none active:scale-95"
              >
                Delete Selected (${selectedCount})
              </button>
            `;
          }
        }
        actionsHtml += `
          <button
            type="button"
            id="btn-toggle-select-mode"
            onclick="toggleSelectMode()"
            class="py-1.5 px-3.5 rounded-lg text-[0.78rem] font-medium cursor-pointer border transition-all ${
              isSelectMode
                ? 'bg-surface2 border-strong text-main font-semibold'
                : 'border-theme bg-surface text-secondary hover:text-main hover:border-strong'
            } focus:outline-none"
          >
            Select
          </button>
        `;
        headerActions.innerHTML = actionsHtml;

        const selectAllCheckbox = document.getElementById('att-select-all-checkbox');
        if (selectAllCheckbox) {
          selectAllCheckbox.addEventListener('change', e => {
            toggleSelectAllVisible(Boolean(e.target.checked), visibleIds);
          });
        }
      } else {
        if (allItems.length === 0 && isSelectMode) {
          resetSelectionState();
        }
        headerActions.innerHTML = '';
      }
    }

    if (items.length === 0) {
      let subText = 'No attendance records found for this event yet.';
      if (searchQuery) {
        subText = `No entries matching "${searchQuery}".`;
      } else if (state.currentFilter !== 'all') {
        subText = 'Try switching to a different status filter.';
      } else if (canModify && !isExpired) {
        subText = 'Start marking attendance in the Entry tab.';
      }

      container.innerHTML = `
        <div class="bg-surface border border-theme rounded-2xl text-center py-12 px-5 text-muted shadow-card">
          <p class="text-[0.9rem] font-medium text-secondary mb-1">No entries present</p>
          <p class="text-[0.78rem] text-muted">${escapeHtml(subText)}</p>
        </div>
      `;
      renderRecentlyRemovedSection(canModify, isExpired);
      return;
    }

    container.innerHTML =
      '<div class="flex flex-col gap-2.5">' +
      items
        .map(a => {
          const rawIdStr = String(a.id ?? a.rollNo);
          const safeId = escapeHtml(rawIdStr);
          const safeRoll = escapeHtml(a.rollNo);
          const safeYear = escapeHtml(a.yearLabel);
          const safeBranch = escapeHtml(a.branch);
          const safeTime = escapeHtml(formatTime(a.timestamp));
          const isAttended = a.status === 'attended';
          const isChecked = selectedEntryIds.has(rawIdStr);
          const badgeClass = isAttended
            ? 'bg-success-bg text-success border border-theme'
            : 'bg-surface-tint text-accent border border-theme';
          const badgeText = isAttended ? 'Present' : 'Pre-reg';

          const selectCheckboxHtml =
            canModify && isSelectMode
              ? `
                <input
                  type="checkbox"
                  data-select-id="${safeId}"
                  aria-label="Select ${safeRoll}"
                  ${isChecked ? 'checked' : ''}
                  class="att-row-checkbox w-4 h-4 rounded border-theme text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
                >
              `
              : '';

          const deleteActionHtml = canModify
            ? `
                <button
                  type="button"
                  data-delete-id="${safeId}"
                  data-delete-roll="${safeRoll}"
                  title="Delete Entry"
                  aria-label="Delete ${safeRoll}"
                  class="delete-participant-btn inline-flex items-center justify-center py-1.5 px-3 rounded-lg text-[0.78rem] font-medium bg-danger-bg text-danger hover:opacity-90 border border-theme transition-all cursor-pointer focus:outline-none active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none select-none">
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
              class="att-item flex items-center justify-between py-3.5 px-4 bg-surface border ${
                isChecked ? 'border-strong bg-surface-tint/40' : 'border-theme hover:border-strong'
              } rounded-xl gap-3 shadow-card transition-colors"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                ${selectCheckboxHtml}
                <div class="flex-1 min-w-0">
                  <div class="font-mono text-[0.92rem] font-semibold text-main truncate">${safeRoll}</div>
                  <div class="text-[0.76rem] text-muted mt-[3px]">${safeYear} Year · ${safeBranch} · ${safeTime}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[0.72rem] py-1 px-2.5 rounded-lg font-medium ${badgeClass}">${badgeText}</span>
                ${deleteActionHtml}
              </div>
            </div>
          `;
        })
        .join('') +
      '</div>';

    if (canModify) {
      container.querySelectorAll('.att-row-checkbox').forEach(cb => {
        cb.addEventListener('change', e => {
          const entryId = cb.getAttribute('data-select-id');
          if (entryId !== null) {
            toggleRowSelection(entryId, Boolean(e.target.checked));
          }
        });
      });

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

    renderRecentlyRemovedSection(canModify, isExpired);
  }

  function configureDeleteConfirmModal({ isBulk = false, count = 0, rollNo = '' }) {
    const titleEl = document.getElementById('modal-delete-confirm-title');
    const rollWrapEl = document.getElementById('delete-target-roll-wrap');
    const rollEl = document.getElementById('delete-target-roll');

    if (isBulk) {
      if (titleEl) {
        titleEl.textContent = `Delete Selected (${count})?`;
        titleEl.className = 'text-[1.12rem] font-semibold text-danger mb-5';
      }
      if (rollWrapEl) rollWrapEl.classList.add('hidden');
      if (rollEl) rollEl.textContent = '';
    } else {
      if (titleEl) {
        titleEl.textContent = 'Delete Entry?';
        titleEl.className = 'text-[1.12rem] font-semibold text-danger mb-2';
      }
      if (rollWrapEl) rollWrapEl.classList.remove('hidden');
      if (rollEl) rollEl.textContent = rollNo || '';
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

    state.pendingBulkDelete = false;
    state.pendingDeleteId = entry ? entry.id : id;
    state.pendingDeleteRoll = entry ? entry.rollNo : rollNo || String(id);

    configureDeleteConfirmModal({
      isBulk: false,
      rollNo: state.pendingDeleteRoll
    });

    if (state.editAuthorized) {
      AttendX.Components.Modals.openModal('modal-delete-confirm');
    } else {
      AttendX.Components.Modals.openModal('modal-edit-auth');
    }
  }

  function requestBulkDelete() {
    const state = AttendX.State;
    const { SecurityConfig, AuditService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;

    if (
      !SecurityConfig.isCoordinator() ||
      !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
    ) {
      AuditService.logAction('UNAUTHORIZED_BULK_DELETE_REQUEST_BLOCKED', {});
      toast('Access denied: Student accounts cannot modify or delete attendance records.', 'error');
      return;
    }

    if (selectedEntryIds.size === 0) return;

    state.pendingBulkDelete = true;
    state.pendingDeleteId = null;
    state.pendingDeleteRoll = null;

    configureDeleteConfirmModal({
      isBulk: true,
      count: selectedEntryIds.size
    });

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

    if (state.pendingBulkDelete) {
      await executeBulkDeleteInternal();
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

    const previousAttendance = [...(state.attendance || [])];
    const removedEntry = previousAttendance.find(a => {
      if (targetRoll && String(a.rollNo).toUpperCase() === String(targetRoll).toUpperCase()) return true;
      if (targetId !== null && targetId !== undefined && String(a.id) === String(targetId)) return true;
      return false;
    });

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

    AttendX.Pages.Attendance.updateAttendanceUI();

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        state.attendance = previousAttendance;
        AttendX.Pages.Attendance.updateAttendanceUI();
        toast('Network offline: Failed to delete entry. Row restored.', 'error');
        return;
      }

      if (Supabase.isConfigured() && state.currentEvent?.id) {
        const { error } = await AttendanceService.deleteEntry({
          id: targetId,
          rollNo: targetRoll,
          eventId: state.currentEvent.id
        });

        if (error) {
          state.attendance = previousAttendance;
          AttendX.Pages.Attendance.updateAttendanceUI();
          toast('Failed to delete entry. Student row restored.', 'error');
          return;
        }
      }

      if (removedEntry && state.currentEvent?.id) {
        addEntriesToRecentlyRemoved(state.currentEvent.id, [removedEntry]);
        selectedEntryIds.delete(String(removedEntry.id ?? removedEntry.rollNo));
      }
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast('Entry deleted', 'info');
    } catch (_err) {
      state.attendance = previousAttendance;
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast('Failed to delete entry. Student row restored.', 'error');
    } finally {
      isDeletingParticipant = false;
      if (delBtn) {
        delBtn.disabled = false;
        delBtn.textContent = 'Delete';
      }
    }
  }

  async function executeBulkDeleteInternal() {
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { AttendanceService, Supabase } = AttendX.Backend;

    const idsToDelete = Array.from(selectedEntryIds);
    if (idsToDelete.length === 0) {
      state.pendingBulkDelete = false;
      AttendX.Components.Modals.closeModal('modal-delete-confirm');
      return;
    }

    const delBtn = document.getElementById('btn-execute-delete');
    isDeletingParticipant = true;
    if (delBtn) {
      delBtn.disabled = true;
      delBtn.textContent = 'Deleting...';
    }

    const previousAttendance = [...(state.attendance || [])];
    const idSet = new Set(idsToDelete.map(String));
    const entriesToRemove = previousAttendance.filter(a => idSet.has(String(a.id ?? a.rollNo)));
    const rollNosToDelete = entriesToRemove.map(a => a.rollNo);

    AttendX.Components.Modals.closeModal('modal-delete-confirm');

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast('Network offline: Failed to delete selected entries.', 'error');
        return;
      }

      if (Supabase.isConfigured() && state.currentEvent?.id) {
        const { error } = await AttendanceService.deleteEntriesBulk({
          ids: entriesToRemove.map(a => a.id),
          rollNos: rollNosToDelete,
          eventId: state.currentEvent.id
        });

        if (error) {
          toast('Failed to delete selected entries.', 'error');
          return;
        }
      }

      state.attendance = previousAttendance.filter(a => !idSet.has(String(a.id ?? a.rollNo)));
      if (entriesToRemove.length > 0 && state.currentEvent?.id) {
        addEntriesToRecentlyRemoved(state.currentEvent.id, entriesToRemove);
      }

      resetSelectionState();
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast(`${entriesToRemove.length} entries deleted`, 'info');
    } catch (_err) {
      toast('Failed to delete selected entries.', 'error');
    } finally {
      state.pendingBulkDelete = false;
      isDeletingParticipant = false;
      if (delBtn) {
        delBtn.disabled = false;
        delBtn.textContent = 'Delete';
      }
    }
  }

  async function reAddRemovedEntry(rollNo) {
    if (isReAddingParticipant) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { AttendanceService, EventService, SecurityConfig } = AttendX.Backend;

    const eventId = state.currentEvent?.id;
    if (!eventId || !SecurityConfig.isCoordinator() || !SecurityConfig.isEventCoordinatorVerified(eventId)) {
      return;
    }

    if (EventService.isEventExpired(state.currentEvent)) {
      clearRecentlyRemoved(eventId);
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast('Session has ended. New attendance entries cannot be added.', 'error');
      return;
    }

    const removedList = loadRecentlyRemoved(eventId);
    const target = removedList.find(
      item => String(item.rollNo).toUpperCase() === String(rollNo).toUpperCase()
    );
    if (!target) return;

    if ((state.attendance || []).some(a => a.rollNo === target.rollNo)) {
      removeRollFromRecentlyRemoved(eventId, target.rollNo);
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast('Already marked: ' + target.rollNo, 'error');
      return;
    }

    isReAddingParticipant = true;
    try {
      const { data, error } = await AttendanceService.insertEntry({
        eventId,
        rollNo: target.rollNo,
        year: target.year,
        yearLabel: target.yearLabel,
        branch: target.branch,
        num: target.num,
        status: target.status || 'attended',
        recordedBy: target.recordedBy || state.user?.name || 'Coordinator'
      });

      if (error) {
        if (EventService.isEventExpired(state.currentEvent)) {
          clearRecentlyRemoved(eventId);
          AttendX.Pages.Attendance.updateAttendanceUI();
          toast('Session has ended. New attendance entries cannot be added.', 'error');
          return;
        }
        if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
          removeRollFromRecentlyRemoved(eventId, target.rollNo);
          AttendX.Pages.Attendance.updateAttendanceUI();
          toast('Already marked: ' + target.rollNo, 'error');
          return;
        }
        toast(error.message || 'Unable to re-add entry.', 'error');
        return;
      }

      removeRollFromRecentlyRemoved(eventId, target.rollNo);
      if (data && !state.attendance.some(a => a.rollNo === data.rollNo)) {
        state.attendance.push(data);
      }
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast('Re-added: ' + target.rollNo, 'success');
    } finally {
      isReAddingParticipant = false;
    }
  }

  async function reAddAllRemoved() {
    if (isReAddingParticipant) return;
    const state = AttendX.State;
    const { toast } = AttendX.Components.Toast;
    const { AttendanceService, EventService, SecurityConfig } = AttendX.Backend;

    const eventId = state.currentEvent?.id;
    if (!eventId || !SecurityConfig.isCoordinator() || !SecurityConfig.isEventCoordinatorVerified(eventId)) {
      return;
    }

    if (EventService.isEventExpired(state.currentEvent)) {
      clearRecentlyRemoved(eventId);
      AttendX.Pages.Attendance.updateAttendanceUI();
      toast('Session has ended. New attendance entries cannot be added.', 'error');
      return;
    }

    const removedList = loadRecentlyRemoved(eventId);
    if (removedList.length === 0) return;

    isReAddingParticipant = true;
    let addedCount = 0;

    try {
      for (const target of removedList) {
        if ((state.attendance || []).some(a => a.rollNo === target.rollNo)) {
          removeRollFromRecentlyRemoved(eventId, target.rollNo);
          continue;
        }

        const { data, error } = await AttendanceService.insertEntry({
          eventId,
          rollNo: target.rollNo,
          year: target.year,
          yearLabel: target.yearLabel,
          branch: target.branch,
          num: target.num,
          status: target.status || 'attended',
          recordedBy: target.recordedBy || state.user?.name || 'Coordinator'
        });

        if (!error && data) {
          removeRollFromRecentlyRemoved(eventId, target.rollNo);
          if (!state.attendance.some(a => a.rollNo === data.rollNo)) {
            state.attendance.push(data);
          }
          addedCount++;
        } else if (error && (error.code === '23505' || /duplicate|unique/i.test(error.message || ''))) {
          removeRollFromRecentlyRemoved(eventId, target.rollNo);
        }
      }

      AttendX.Pages.Attendance.updateAttendanceUI();
      if (addedCount > 0) {
        toast(`Re-added ${addedCount} entries`, 'success');
      } else {
        toast('Entries already present in list', 'info');
      }
    } finally {
      isReAddingParticipant = false;
    }
  }

  global.handleSearchRollInput = handleSearchRollInput;
  global.clearSearchRollInput = clearSearchRollInput;
  global.setFilter = setFilter;
  global.toggleSelectMode = toggleSelectMode;
  global.requestBulkDelete = requestBulkDelete;
  global.reAddRemovedEntry = reAddRemovedEntry;
  global.reAddAllRemoved = reAddAllRemoved;
  global.renderList = renderList;
  global.requestDelete = requestDelete;
  global.confirmEditAuth = confirmEditAuth;
  global.executeDelete = executeDelete;

  AttendX.Pages.ViewList = {
    renderViewListTab,
    handleSearchRollInput,
    clearSearchRollInput,
    setFilter,
    toggleSelectMode,
    requestBulkDelete,
    reAddRemovedEntry,
    reAddAllRemoved,
    loadRecentlyRemoved,
    addEntriesToRecentlyRemoved,
    removeRollFromRecentlyRemoved,
    clearRecentlyRemoved,
    resetSelectionState,
    removeIdFromSelection,
    renderList,
    requestDelete,
    confirmEditAuth,
    executeDelete
  };
})(window);
