/**
 * Frontend Component — Security & Confirmation Modals
 * Renders and manages Edit Authorization, Delete Participant Confirmation, and Discard Event modals.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Components = AttendX.Components || {};

  function renderModals() {
    const mount = document.getElementById('app-modals-mount');
    if (!mount) return;

    mount.innerHTML = `
      <!-- EDIT AUTH MODAL -->
      <div
        id="modal-edit-auth"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-edit-auth-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-7 w-full max-w-[380px] shadow-card animate-modal-in">
          <h3 id="modal-edit-auth-title" class="text-[1.12rem] font-medium text-main mb-2">Authorization Required</h3>
          <p class="text-[0.86rem] text-muted mb-5 leading-relaxed">Enter the event password to manage or delete records.</p>
          <div class="mb-4">
            <label for="edit-auth-pass" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Event Password</label>
            <div class="relative w-full">
              <input
                type="password"
                id="edit-auth-pass"
                placeholder="••••••••"
                onkeydown="if(event.key==='Enter') confirmEditAuth()"
                class="w-full py-3 pl-3.5 pr-11 bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              >
              <button
                type="button"
                onclick="togglePwd('edit-auth-pass', this)"
                aria-label="Toggle password visibility"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-edit-auth')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-full font-sans text-[0.88rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-edit-auth"
              onclick="confirmEditAuth()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none"
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      <!-- DELETE CONFIRM MODAL -->
      <div
        id="modal-delete-confirm"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-delete-confirm-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-7 w-full max-w-[380px] shadow-card animate-modal-in">
          <h3 id="modal-delete-confirm-title" class="text-[1.12rem] font-medium text-danger mb-2">Delete Entry?</h3>
          <p class="text-[0.86rem] text-muted mb-5 leading-relaxed">
            Remove <strong id="delete-target-roll" class="text-main font-medium"></strong> from attendance? This cannot be undone.
          </p>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-delete-confirm')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-full font-sans text-[0.88rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-execute-delete"
              onclick="executeDelete()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-full font-sans text-[0.88rem] font-medium bg-danger-bg text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- DELETE EVENT MODAL -->
      <div
        id="modal-delete-event"
        class="modal-overlay hidden fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[500] items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-delete-event-title"
      >
        <div class="bg-surface border border-theme rounded-2xl p-7 w-full max-w-[380px] shadow-card animate-modal-in">
          <h3 id="modal-delete-event-title" class="text-[1.12rem] font-medium text-danger mb-2">⚠ Discard Event?</h3>
          <p class="text-[0.86rem] text-muted mb-5 leading-relaxed">
            This will <strong class="text-main font-medium">permanently delete the event and all attendance records</strong>. This action cannot be undone.<br><br>Enter the event password to confirm.
          </p>
          <div class="mb-4">
            <label for="delete-event-pass" class="block text-[0.8rem] font-medium text-secondary mb-1.5">Event Password</label>
            <div class="relative w-full">
              <input
                type="password"
                id="delete-event-pass"
                placeholder="••••••••"
                onkeydown="if(event.key==='Enter') executeDeleteEvent()"
                class="w-full py-3 pl-3.5 pr-11 bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              >
              <button
                type="button"
                onclick="togglePwd('delete-event-pass', this)"
                aria-label="Toggle password visibility"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
          </div>
          <div class="flex gap-2.5 mt-5">
            <button
              type="button"
              onclick="closeModal('modal-delete-event')"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-full font-sans text-[0.88rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-execute-delete-event"
              onclick="executeDeleteEvent()"
              class="flex-1 inline-flex items-center justify-center py-2.5 px-5 rounded-full font-sans text-[0.88rem] font-medium bg-danger-bg text-danger border border-danger/30 hover:bg-danger/20 hover:border-danger transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
            >
              Delete Everything
            </button>
          </div>
        </div>
      </div>
    `;

    // Close modal when clicking backdrop
    mount.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          closeModal(overlay.id);
        }
      });
    });

    // Close open modal on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        mount.querySelectorAll('.modal-overlay:not(.hidden)').forEach(overlay => {
          closeModal(overlay.id);
        });
      }
    });
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');

    // Auto-focus password input when opening auth/delete modals
    setTimeout(() => {
      const input = el.querySelector('input');
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
    }
    if (id === 'modal-delete-event') {
      const inp = document.getElementById('delete-event-pass');
      if (inp) inp.value = '';
    }
  }

  global.openModal = openModal;
  global.closeModal = closeModal;

  AttendX.Components.Modals = {
    renderModals,
    openModal,
    closeModal
  };
})(window);
