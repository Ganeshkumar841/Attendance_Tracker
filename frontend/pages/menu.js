/**
 * Frontend Page — Coordinator Dashboard Menu Page
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  function renderMenuPage() {
    const mount = document.getElementById('page-menu-mount');
    if (!mount) return;

    mount.innerHTML = `
      <section id="screen-menu" class="screen hidden flex-1 flex-col">
        <div class="max-w-[760px] mx-auto px-5 w-full pt-14 pb-10">
          <div class="mb-9 text-center select-none">
            <div class="text-[2rem] font-medium mb-2 tracking-[-0.02em] text-main">
              Welcome back, <span id="user-name" class="text-accent">Coordinator</span>
            </div>
            <p class="text-muted text-[0.95rem]">Create a new attendance session or join an active campus event.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onclick="showScreen('screen-create')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-[14px] p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[10px] flex items-center justify-center text-accent shrink-0 bg-surface-tint">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1rem] font-medium text-main mb-1">Create New Event</h3>
                  <p class="text-[0.82rem] text-muted">Set up a fresh attendance session</p>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>

            <button
              type="button"
              onclick="showScreen('screen-join')"
              class="group bg-surface border border-theme hover:border-strong hover:bg-surface2 rounded-[14px] p-6 cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 text-left w-full focus:outline-none select-none active:scale-[0.99]"
            >
              <div class="flex items-center gap-4">
                <div class="w-11 h-11 rounded-[10px] flex items-center justify-center text-accent shrink-0 bg-surface-tint">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-[1rem] font-medium text-main mb-1">Join Existing Event</h3>
                  <p class="text-[0.82rem] text-muted">Multiple coordinators, same event</p>
                </div>
              </div>
              <span class="text-muted text-[1.25rem] transition-all duration-150 group-hover:translate-x-[3px] group-hover:text-accent">›</span>
            </button>
          </div>

          <div class="mt-10 text-center">
            <button
              type="button"
              onclick="logout()"
              class="inline-flex items-center justify-center py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    `;
  }

  AttendX.Pages.Menu = {
    renderMenuPage
  };
})(window);
