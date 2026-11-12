(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  const COORDINATOR_ONLY_MODALS = new Set([
    'modal-edit-auth',
    'modal-delete-confirm',
    'modal-delete-event',
    'modal-change-event-password'
  ]);

  const ALL_MODAL_IDS = [
    'modal-edit-auth',
    'modal-delete-confirm',
    'modal-delete-event',
    'modal-change-event-password',
    'modal-forgot-event-password'
  ];

  function renderModals() {
    const mount = document.getElementById('app-modals-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div
        id="modal-edit-auth"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-edit-auth-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-6 sm:p-7 w-full max-w-[390px] shadow-card animate-modal-in">
          <h3 id="modal-edit-auth-title" class="text-[1.12rem] font-semibold text-main mb-4">Authorization Required</h3>
          <div class="mb-4">
            <div class="flex items-center justify-between mb-1.5">
              <label for="edit-auth-pass" class="text-[0.8rem] font-medium text-secondary">Event Password</label>
              <button
                type="button"
                onclick="openForgotEventPasswordModal(AttendX.State?.currentEvent?.id)"
                class="bg-transparent border-none text-accent text-[0.76rem] font-medium cursor-pointer p-0 font-sans hover:underline focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <div class="relative w-full">
              <input
                type="password"
                id="edit-auth-pass"
                placeholder="••••••••"
                onkeydown="if(event.key==='Enter') confirmEditAuth()"
                class="w-full py-2.5 pl-3.5 pr-11 bg-input border border-theme rounded-xl text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              >
              <button
                type="button"
                onclick="togglePwd('edit-auth-pass', this)"
                aria-label="Toggle password visibility"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-edit-auth')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-edit-auth"
              onclick="confirmEditAuth()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none"
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      <div
        id="modal-delete-confirm"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-delete-confirm-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-6 sm:p-7 w-full max-w-[390px] shadow-card animate-modal-in">
          <h3 id="modal-delete-confirm-title" class="text-[1.12rem] font-semibold text-danger mb-2">Delete Entry?</h3>
          <p id="delete-target-roll-wrap" class="text-[0.85rem] text-secondary mb-5">
            <strong id="delete-target-roll" class="text-main font-mono font-semibold"></strong>
          </p>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-delete-confirm')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-execute-delete"
              onclick="executeDelete()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-semibold bg-danger-bg text-danger border border-theme hover:border-danger/40 transition-all cursor-pointer focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div
        id="modal-delete-event"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-delete-event-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-6 sm:p-7 w-full max-w-[390px] shadow-card animate-modal-in">
          <h3 id="modal-delete-event-title" class="text-[1.12rem] font-semibold text-danger mb-4">Discard Event?</h3>
          <div class="mb-4">
            <label for="delete-event-pass" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Event Password</label>
            <div class="relative w-full">
              <input
                type="password"
                id="delete-event-pass"
                placeholder="••••••••"
                onkeydown="if(event.key==='Enter') executeDeleteEvent()"
                class="w-full py-2.5 pl-3.5 pr-11 bg-input border border-theme rounded-xl text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              >
              <button
                type="button"
                onclick="togglePwd('delete-event-pass', this)"
                aria-label="Toggle password visibility"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-delete-event')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-execute-delete-event"
              onclick="executeDeleteEvent()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-semibold bg-danger-bg text-danger border border-theme hover:border-danger/40 transition-all cursor-pointer focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Delete Everything
            </button>
          </div>
        </div>
      </div>

      <div
        id="modal-change-event-password"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-change-event-pwd-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-6 sm:p-7 w-full max-w-[400px] shadow-card animate-modal-in">
          <h3 id="modal-change-event-pwd-title" class="text-[1.12rem] font-semibold text-main mb-4">Change Password</h3>
          <div class="flex flex-col gap-3.5">
            <div>
              <label for="change-ev-current-pass" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Current Password</label>
              <div class="relative w-full">
                <input
                  type="password"
                  id="change-ev-current-pass"
                  placeholder="Current password"
                  class="w-full py-2.5 pl-3.5 pr-11 bg-input border border-theme rounded-xl text-main font-sans text-[0.9rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
                <button
                  type="button"
                  onclick="togglePwd('change-ev-current-pass', this)"
                  aria-label="Toggle password visibility"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </div>
            <div>
              <label for="change-ev-new-pass" class="block text-[0.8rem] font-medium text-secondary mb-1.5">New Password</label>
              <div class="relative w-full">
                <input
                  type="password"
                  id="change-ev-new-pass"
                  placeholder="Min. 4 characters"
                  onkeydown="if(event.key==='Enter') executeChangeEventPassword()"
                  class="w-full py-2.5 pl-3.5 pr-11 bg-input border border-theme rounded-xl text-main font-sans text-[0.9rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
                <button
                  type="button"
                  onclick="togglePwd('change-ev-new-pass', this)"
                  aria-label="Toggle password visibility"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
            </div>
          </div>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-change-event-password')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-submit-change-ev-pwd"
              onclick="executeChangeEventPassword()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>

      <div
        id="modal-forgot-event-password"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-forgot-ev-pwd-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-6 sm:p-7 w-full max-w-[420px] shadow-card animate-modal-in">
          <h3 id="modal-forgot-ev-pwd-title" class="text-[1.12rem] font-semibold text-main mb-4">Forgot Event Password</h3>
          <div class="flex flex-col gap-3.5 mb-4">
            <div>
              <label for="forgot-ev-id-input" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Event ID</label>
              <input
                type="text"
                id="forgot-ev-id-input"
                placeholder="e.g. EV2405"
                maxlength="20"
                oninput="this.value=this.value.toUpperCase()"
                class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-mono text-[0.92rem] tracking-[0.08em] uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              >
            </div>
            <div>
              <label for="forgot-ev-email-input" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Creator Email</label>
              <input
                type="email"
                id="forgot-ev-email-input"
                placeholder="Email"
                onkeydown="if(event.key==='Enter') submitForgotEventPassword()"
                class="w-full py-2.5 px-3.5 bg-input border border-theme rounded-xl text-main font-sans text-[0.92rem] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              >
            </div>
          </div>
          <div id="forgot-ev-status-box" class="hidden mb-4 py-3 px-3.5 rounded-xl text-[0.8rem] leading-relaxed border border-theme bg-surface2 text-main"></div>
          <div class="flex gap-2.5 mt-4">
            <button
              type="button"
              onclick="closeModal('modal-forgot-event-password')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-medium text-secondary hover:text-main bg-surface2 hover:bg-surface-hover border border-theme hover:border-strong transition-all cursor-pointer focus:outline-none"
            >
              Close
            </button>
            <button
              type="button"
              id="btn-submit-forgot-ev-pwd"
              onclick="submitForgotEventPassword()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-xl font-sans text-[0.86rem] font-semibold bg-primary hover:bg-primary-hover text-white shadow-btn-primary transition-all cursor-pointer focus:outline-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Send Password
            </button>
          </div>
        </div>
      </div>
    `;

    mount.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          closeModal(overlay.id);
        }
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        mount.querySelectorAll('.modal-overlay:not(.hidden)').forEach(overlay => {
          closeModal(overlay.id);
        });
      }
    });
  }

  function openModal(id) {
    if (COORDINATOR_ONLY_MODALS.has(id)) {
      const { SecurityConfig } = AttendX.Backend;
      const state = AttendX.State;
      if (
        !SecurityConfig.isCoordinator() ||
        !SecurityConfig.isEventCoordinatorVerified(state.currentEvent?.id)
      ) {
        AttendX.Components.Toast.toast('Access denied: Student login is view-only.', 'error');
        return;
      }
    }

    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');

    setTimeout(() => {
      const input = el.querySelector('input:not([type="hidden"])');
      if (input) input.focus();
    }, 50);
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');

    if (id === 'modal-edit-auth') {
      const inp = document.getElementById('edit-auth-pass');
      if (inp) inp.value = '';
    } else if (id === 'modal-delete-event') {
      const inp = document.getElementById('delete-event-pass');
      if (inp) inp.value = '';
    } else if (id === 'modal-change-event-password') {
      ['change-ev-current-pass', 'change-ev-new-pass'].forEach(fid => {
        const inp = document.getElementById(fid);
        if (inp) inp.value = '';
      });
    } else if (id === 'modal-forgot-event-password') {
      const emailInp = document.getElementById('forgot-ev-email-input');
      if (emailInp) emailInp.value = '';
    }
  }

  function closeAllModals() {
    ALL_MODAL_IDS.forEach(closeModal);
  }

  global.openModal = openModal;
  global.closeModal = closeModal;

  AttendX.Components.Modals = {
    renderModals,
    openModal,
    closeModal,
    closeAllModals
  };
})(window);
