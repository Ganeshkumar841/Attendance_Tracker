/**
 * Frontend Page — Sign In, Sign Up, Password Reset & OTP Verification Page
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Pages = AttendX.Pages || {};

  function renderSignInPage() {
    const mount = document.getElementById('page-signin-mount');
    if (!mount) return;

    mount.innerHTML = `
      <section id="screen-login" class="screen flex flex-1 flex-col items-center justify-center py-10 px-5 pb-14">
        <div class="max-w-[460px] mx-auto px-5 w-full">
          <div class="text-center mb-7 select-none">
            <span class="font-sans text-[1.95rem] sm:text-[2.25rem] font-medium text-main block mb-2 tracking-[-0.025em]">AttendX</span>
            <p class="text-muted text-[0.94rem] max-w-[360px] mx-auto leading-relaxed">College Event Attendance Management</p>
          </div>

          <div class="bg-surface border border-theme rounded-2xl p-[22px] sm:p-7 shadow-card transition-all">
            <div id="auth-card-title" class="text-[0.75rem] font-medium tracking-[0.04em] uppercase text-muted mb-4">
              Sign in to continue
            </div>

            <button
              type="button"
              id="btn-google-login"
              onclick="loginGoogle()"
              class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-surface2 text-main border border-theme hover:border-strong hover:bg-surface-hover transition-all cursor-pointer focus:outline-none select-none"
            >
              <svg class="w-[18px] h-[18px]" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-2.9-11.3-7.1l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 5.9l6.2 5.2C40.8 35.7 44 30.4 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
              Continue with Google
            </button>

            <div id="auth-divider-or" class="flex items-center gap-3 my-[18px] text-muted text-[0.75rem] uppercase font-medium tracking-[0.05em] select-none">
              <span class="flex-1 h-px bg-theme"></span>
              <span>or</span>
              <span class="flex-1 h-px bg-theme"></span>
            </div>

            <!-- Mode Tabs: Sign In vs Sign Up -->
            <div id="auth-mode-tabs" class="flex bg-input rounded-full p-1 mb-[18px] border border-theme select-none">
              <button
                type="button"
                id="tab-auth-signin"
                onclick="switchAuthMode('signin')"
                class="auth-tab flex-1 py-2 px-3 rounded-full text-[0.82rem] font-medium cursor-pointer text-center transition-all font-sans bg-primary text-white focus:outline-none select-none"
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-auth-signup"
                onclick="switchAuthMode('signup')"
                class="auth-tab flex-1 py-2 px-3 rounded-full text-[0.82rem] font-medium cursor-pointer text-center transition-all font-sans bg-transparent text-muted hover:text-main focus:outline-none select-none"
              >
                Sign Up
              </button>
            </div>

            <!-- Status / Error Banner -->
            <div id="auth-status-banner" class="hidden py-3 px-3.5 rounded-[10px] text-[0.82rem] leading-[1.45] mb-4 border border-theme bg-surface2 text-main"></div>

            <!-- Main Email / Password View -->
            <div id="auth-view-credentials">
              <div id="field-login-email" class="mb-[18px]">
                <label for="login-email" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Email Address</label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="Email"
                  autocomplete="email"
                  onkeydown="if(event.key==='Enter') loginEmail()"
                  class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>

              <div id="field-login-password" class="mb-[18px]">
                <div class="flex items-center justify-between mb-[7px]">
                  <label for="login-password" class="text-[0.8rem] font-medium text-secondary mb-0">Password</label>
                  <button
                    type="button"
                    id="forgot-pwd-link"
                    onclick="switchAuthMode('reset')"
                    class="bg-transparent border-none text-accent text-[0.78rem] font-medium cursor-pointer p-0 font-sans hover:opacity-85 hover:underline focus:outline-none select-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div class="relative w-full">
                  <input
                    type="password"
                    id="login-password"
                    placeholder="Password"
                    autocomplete="current-password"
                    onkeydown="if(event.key==='Enter') loginEmail()"
                    class="w-full py-3 pl-[15px] pr-11 bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                  <button
                    type="button"
                    onclick="togglePwd('login-password', this)"
                    aria-label="Toggle password visibility"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
                <div id="pwd-policy-hint" class="hidden text-[0.75rem] text-muted mt-[7px] leading-[1.45]">
                  Must be at least 8 characters and include both letters and digits.
                </div>
              </div>

              <button
                type="button"
                id="auth-submit-btn"
                onclick="loginEmail()"
                class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer mb-2 focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
              >
                Sign In
              </button>

              <div id="reset-back-wrap" class="hidden text-center mt-2">
                <button
                  type="button"
                  onclick="switchAuthMode('signin')"
                  class="bg-transparent border-none text-accent text-[0.78rem] font-medium cursor-pointer p-0 font-sans hover:opacity-85 hover:underline focus:outline-none select-none"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>

            <!-- Email Link / OTP Verification View -->
            <div id="auth-view-otp" class="hidden">
              <div id="otp-instructions-box" class="bg-input border border-theme rounded-[10px] py-3 px-3.5 mb-3.5 text-[0.8rem] leading-relaxed text-secondary">
                <strong class="text-accent font-medium">1. Click the link in your email:</strong> Open the email sent to <strong id="otp-email-display" class="text-main font-medium"></strong> and click the action link.<br>
                <strong class="text-accent font-medium">2. Opened on phone or another tab?</strong> Copy the link from the email (or copy the redirected URL from your browser bar) and paste it below:
              </div>
              <div class="mb-[18px]">
                <label for="otp-code" id="otp-input-label" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">Paste Email Link or Verification Code</label>
                <input
                  type="text"
                  id="otp-code"
                  placeholder="Paste link from email or enter code..."
                  onkeydown="if(event.key==='Enter') verifyEmailOtp()"
                  class="w-full py-3 px-[15px] bg-input border border-theme rounded-lg text-main font-mono text-[0.9rem] font-medium placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                >
              </div>
              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  id="btn-verify-otp"
                  onclick="verifyEmailOtp()"
                  class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
                >
                  Verify Code &amp; Continue
                </button>
                <button
                  type="button"
                  id="btn-resend-otp"
                  onclick="resendVerificationEmail()"
                  class="w-full inline-flex items-center justify-center py-2 px-4 rounded-full font-sans text-[0.8rem] font-medium text-accent bg-transparent border border-theme hover:border-strong hover:bg-surface-tint transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
                >
                  Resend Email
                </button>
                <button
                  type="button"
                  onclick="switchAuthMode('signin')"
                  class="bg-transparent border-none text-accent text-[0.78rem] font-medium cursor-pointer p-0 font-sans hover:opacity-85 hover:underline mt-1 focus:outline-none select-none"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>

            <!-- Update Password View -->
            <div id="auth-view-update-pwd" class="hidden">
              <div class="mb-[18px]">
                <label for="new-password" class="block text-[0.8rem] font-medium text-secondary mb-[7px]">New Password</label>
                <div class="relative w-full">
                  <input
                    type="password"
                    id="new-password"
                    placeholder="Min. 8 chars (letters + digits)"
                    onkeydown="if(event.key==='Enter') submitNewPassword()"
                    class="w-full py-3 pl-[15px] pr-11 bg-input border border-theme rounded-lg text-main font-sans text-[0.92rem] placeholder:text-muted/65 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  >
                  <button
                    type="button"
                    onclick="togglePwd('new-password', this)"
                    aria-label="Toggle password visibility"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted hover:text-main hover:bg-surface2 transition-colors cursor-pointer focus:outline-none select-none"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </div>
                <div class="text-[0.75rem] text-muted mt-[7px] leading-[1.45]">
                  Must be at least 8 characters and include both letters and digits.
                </div>
              </div>
              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  id="btn-update-pwd"
                  onclick="submitNewPassword()"
                  class="w-full inline-flex items-center justify-center gap-2 py-[11px] px-[22px] rounded-full font-sans text-[0.88rem] font-medium bg-primary hover:bg-primary-hover text-white hover:shadow-btn-primary transition-all cursor-pointer focus:outline-none select-none disabled:opacity-60 disabled:pointer-events-none"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onclick="switchAuthMode('signin')"
                  class="bg-transparent border-none text-accent text-[0.78rem] font-medium cursor-pointer p-0 font-sans hover:opacity-85 hover:underline mt-1 focus:outline-none select-none"
                >
                  Cancel
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>
    `;
  }

  function showAuthBanner(msg, type = 'info') {
    const banner = document.getElementById('auth-status-banner');
    if (!banner) return;
    if (!msg) {
      banner.className = 'hidden';
      banner.textContent = '';
      return;
    }
    banner.textContent = msg;
    const base = 'block py-3 px-3.5 rounded-[10px] text-[0.82rem] leading-[1.45] mb-4 border ';
    if (type === 'error') {
      banner.className = base + 'bg-danger-bg border-0 text-danger';
    } else if (type === 'success') {
      banner.className = base + 'bg-success-bg border-0 text-success';
    } else {
      banner.className = base + 'bg-surface-tint border-0 text-main';
    }
  }

  function switchAuthMode(mode) {
    const state = AttendX.State;
    state.authMode = mode;
    if (mode !== 'update-password') {
      state.isPasswordRecovery = false;
    }
    showAuthBanner('');

    const tabsWrap      = document.getElementById('auth-mode-tabs');
    const tabSignin     = document.getElementById('tab-auth-signin');
    const tabSignup     = document.getElementById('tab-auth-signup');
    const credView      = document.getElementById('auth-view-credentials');
    const otpView       = document.getElementById('auth-view-otp');
    const updatePwdView = document.getElementById('auth-view-update-pwd');
    const pwdField      = document.getElementById('field-login-password');
    const pwdHint       = document.getElementById('pwd-policy-hint');
    const forgotLink    = document.getElementById('forgot-pwd-link');
    const submitBtn     = document.getElementById('auth-submit-btn');
    const resetBackWrap = document.getElementById('reset-back-wrap');
    const cardTitle     = document.getElementById('auth-card-title');
    const googleBtn     = document.getElementById('btn-google-login');
    const orDivider     = document.getElementById('auth-divider-or');

    if (!credView) return;

    credView.style.display      = 'none';
    otpView.style.display       = 'none';
    updatePwdView.style.display = 'none';

    const activeTabClass   = 'auth-tab flex-1 py-2 px-3 rounded-full text-[0.82rem] font-medium cursor-pointer text-center transition-all font-sans bg-primary text-white focus:outline-none select-none';
    const inactiveTabClass = 'auth-tab flex-1 py-2 px-3 rounded-full text-[0.82rem] font-medium cursor-pointer text-center transition-all font-sans bg-transparent text-muted hover:text-main focus:outline-none select-none';

    if (mode === 'signin') {
      cardTitle.textContent       = 'Sign in to continue';
      googleBtn.style.display     = 'inline-flex';
      orDivider.style.display     = 'flex';
      tabsWrap.style.display      = 'flex';
      tabSignin.className         = activeTabClass;
      tabSignup.className         = inactiveTabClass;
      credView.style.display      = 'block';
      pwdField.style.display      = 'block';
      pwdHint.style.display       = 'none';
      forgotLink.style.display    = 'inline';
      resetBackWrap.style.display = 'none';
      submitBtn.textContent       = 'Sign In';
    } else if (mode === 'signup') {
      cardTitle.textContent       = 'Create an account';
      googleBtn.style.display     = 'inline-flex';
      orDivider.style.display     = 'flex';
      tabsWrap.style.display      = 'flex';
      tabSignin.className         = inactiveTabClass;
      tabSignup.className         = activeTabClass;
      credView.style.display      = 'block';
      pwdField.style.display      = 'block';
      pwdHint.style.display       = 'block';
      forgotLink.style.display    = 'none';
      resetBackWrap.style.display = 'none';
      submitBtn.textContent       = 'Create Account';
    } else if (mode === 'reset') {
      cardTitle.textContent       = 'Reset your password';
      googleBtn.style.display     = 'none';
      orDivider.style.display     = 'none';
      tabsWrap.style.display      = 'none';
      credView.style.display      = 'block';
      pwdField.style.display      = 'none';
      resetBackWrap.style.display = 'block';
      submitBtn.textContent       = 'Send Reset Email';
      showAuthBanner('Enter your registered email address to receive a password reset link.', 'info');
    } else if (mode === 'otp') {
      cardTitle.textContent       = state.otpType === 'recovery' ? 'Check your email to reset' : 'Verify your email';
      googleBtn.style.display     = 'none';
      orDivider.style.display     = 'none';
      tabsWrap.style.display      = 'none';
      otpView.style.display       = 'block';
      document.getElementById('otp-email-display').textContent = state.pendingEmail || 'your email';
      document.getElementById('otp-code').value = '';
      document.getElementById('otp-code').focus();
    } else if (mode === 'update-password') {
      cardTitle.textContent       = 'Set a new password';
      googleBtn.style.display     = 'none';
      orDivider.style.display     = 'none';
      tabsWrap.style.display      = 'none';
      updatePwdView.style.display = 'block';
      document.getElementById('new-password').value = '';
    }
  }

  async function loginEmail() {
    const { Supabase, AuthService, SecurityConfig, RateLimiter, AuditService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing. Please check config.js.', 'error');
      return;
    }

    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!email || !AuthService.validateEmailFormat(email)) {
      toast('Please enter a valid email address', 'error');
      return;
    }

    // 1. PASSWORD RESET FLOW
    if (state.authMode === 'reset') {
      submitBtn.disabled = true;
      const origText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      showAuthBanner('');

      const { error } = await AuthService.resetPasswordForEmail(email);

      submitBtn.disabled = false;
      submitBtn.textContent = origText;

      if (error) {
        const friendly = AuthService.formatAuthError(error, 'reset');
        showAuthBanner(friendly, 'error');
        toast(friendly, 'error');
        return;
      }

      state.pendingEmail = email;
      state.otpType = 'recovery';
      switchAuthMode('otp');
      showAuthBanner(
        `Password reset link sent to ${email}. Click the "Reset Password" link in the email, or copy & paste that link below if opened on another device.`,
        'success'
      );
      toast('Reset link sent to your email!', 'success');
      return;
    }

    if (!pass) {
      toast('Please enter your password', 'error');
      return;
    }

    // 2. SIGN UP FLOW
    if (state.authMode === 'signup') {
      const pwdErr = AuthService.validatePasswordPolicy(pass);
      if (pwdErr) {
        showAuthBanner(pwdErr, 'error');
        toast(pwdErr, 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
      showAuthBanner('');

      const { data, error } = await AuthService.signUp(email, pass);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';

      if (error) {
        const friendly = AuthService.formatAuthError(error, 'signup');
        showAuthBanner(friendly, 'error');
        toast(friendly, 'error');
        return;
      }

      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        switchAuthMode('signin');
        showAuthBanner(
          'An account with this email already exists. Please sign in with your password, or use "Forgot password?" to reset it.',
          'error'
        );
        toast('Account already exists. Please Sign In.', 'error');
        return;
      }

      if (data?.session) {
        state.user = AuthService.extractUserFromSession(data.session);
        AuditService.logAction('USER_SIGNUP_SUCCESS', {}, email);
        toast('Account created & logged in!', 'success');
        AttendX.App.afterLogin();
        return;
      }

      state.pendingEmail = email;
      state.otpType = 'signup';
      switchAuthMode('otp');
      showAuthBanner(`Account created! Click the confirmation link sent to ${email}, or paste the link below.`, 'success');
      toast('Check your email to confirm your account!', 'info');
      return;
    }

    // 3. SIGN IN FLOW (with Brute-Force Rate Limiting)
    const rateKey = 'login_' + email.toLowerCase();
    const limitStatus = RateLimiter.checkLimit(
      rateKey,
      SecurityConfig.MAX_LOGIN_ATTEMPTS,
      SecurityConfig.LOGIN_LOCKOUT_MS
    );

    if (!limitStatus.allowed) {
      const mins = Math.ceil(limitStatus.retryAfterSec / 60);
      const lockMsg = `Too many failed sign-in attempts. Please wait ${mins} minute(s) before trying again.`;
      showAuthBanner(lockMsg, 'error');
      toast(lockMsg, 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';
    showAuthBanner('');

    const { data, error } = await AuthService.signInWithPassword(email, pass);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';

    if (error) {
      RateLimiter.recordFailure(rateKey, SecurityConfig.LOGIN_LOCKOUT_MS);
      const rawMsg = (error.message || '').toLowerCase();
      if (rawMsg.includes('email not confirmed')) {
        state.pendingEmail = email;
        state.otpType = 'signup';
        switchAuthMode('otp');
        showAuthBanner(
          'Your email is not verified yet. Click the link in your email, paste the link below, or click "Resend Email".',
          'error'
        );
        toast('Please verify your email first', 'error');
        return;
      }
      const friendly = AuthService.formatAuthError(error, 'signin');
      showAuthBanner(friendly, 'error');
      toast(friendly, 'error');
      return;
    }

    RateLimiter.resetLimit(rateKey);
    if (data?.session) {
      state.user = AuthService.extractUserFromSession(data.session);
      AuditService.logAction('USER_SIGNIN_SUCCESS', {}, email);
      toast('Signed in!', 'success');
      AttendX.App.afterLogin();
    }
  }

  async function verifyEmailOtp() {
    const { Supabase, AuthService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) return;
    const rawInput = document.getElementById('otp-code').value.trim();
    const email = state.pendingEmail || document.getElementById('login-email').value.trim();

    if (!rawInput) {
      toast('Paste the link from your email or enter the verification code', 'error');
      return;
    }

    const btn = document.getElementById('btn-verify-otp');
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    showAuthBanner('');

    const verifyType = state.otpType === 'recovery' ? 'recovery' : 'signup';

    try {
      // Case 1: Redirected URL containing #access_token=...&refresh_token=...
      if (rawInput.includes('access_token=')) {
        const hashPart = rawInput.includes('#')
          ? rawInput.split('#')[1]
          : rawInput.split('?')[1] || rawInput;
        const params = new URLSearchParams(hashPart);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const urlType = params.get('type') || verifyType;

        if (accessToken && refreshToken) {
          if (urlType === 'recovery' || verifyType === 'recovery') {
            state.isPasswordRecovery = true;
          }
          const { data, error } = await AuthService.setSessionTokens(accessToken, refreshToken);
          btn.disabled = false;
          btn.textContent = 'Verify Code & Continue';

          if (error) {
            const friendly = AuthService.formatAuthError(error, verifyType);
            showAuthBanner(friendly, 'error');
            toast(friendly, 'error');
            return;
          }
          if (urlType === 'recovery' || verifyType === 'recovery') {
            switchAuthMode('update-password');
            showAuthBanner('Reset link verified! Enter your new password below.', 'success');
            toast('Link verified! Set your new password.', 'success');
            return;
          }
          if (data?.session) {
            state.user = AuthService.extractUserFromSession(data.session);
            toast('Email verified & logged in!', 'success');
            AttendX.App.afterLogin();
            return;
          }
        }
      }

      // Case 2: Raw Email Link (?token=...&type=...)
      if (rawInput.startsWith('http://') || rawInput.startsWith('https://') || rawInput.includes('token=')) {
        const queryPart = rawInput.includes('?') ? rawInput.split('?')[1].split('#')[0] : rawInput;
        const params = new URLSearchParams(queryPart);
        const tokenHash = params.get('token_hash') || params.get('token');
        const urlType = params.get('type') || verifyType;

        if (tokenHash) {
          if (urlType === 'recovery' || verifyType === 'recovery') {
            state.isPasswordRecovery = true;
          }
          const { data, error } = await AuthService.verifyOtpPayload({
            token_hash: tokenHash,
            type: urlType
          });
          btn.disabled = false;
          btn.textContent = 'Verify Code & Continue';

          if (error) {
            const friendly = AuthService.formatAuthError(error, verifyType);
            showAuthBanner(friendly, 'error');
            toast(friendly, 'error');
            return;
          }
          if (urlType === 'recovery' || verifyType === 'recovery') {
            switchAuthMode('update-password');
            showAuthBanner('Reset link verified! Enter your new password below.', 'success');
            toast('Reset link verified!', 'success');
            return;
          }
          if (data?.session) {
            state.user = AuthService.extractUserFromSession(data.session);
            toast('Email verified & logged in!', 'success');
            AttendX.App.afterLogin();
            return;
          }
        }
      }

      // Case 3: Standard OTP code
      if (!email) {
        btn.disabled = false;
        btn.textContent = 'Verify Code & Continue';
        switchAuthMode('signin');
        toast('Enter your email address first', 'error');
        return;
      }

      if (verifyType === 'recovery') {
        state.isPasswordRecovery = true;
      }

      const { data, error } = await AuthService.verifyOtpPayload({
        email,
        token: rawInput,
        type: verifyType
      });

      btn.disabled = false;
      btn.textContent = 'Verify Code & Continue';

      if (error) {
        const friendly = AuthService.formatAuthError(error, verifyType);
        showAuthBanner(friendly, 'error');
        toast(friendly, 'error');
        return;
      }

      if (verifyType === 'recovery') {
        switchAuthMode('update-password');
        showAuthBanner('Verified! Set your new password below.', 'success');
        toast('Verified! Enter new password.', 'success');
        return;
      }

      if (data?.session) {
        state.user = AuthService.extractUserFromSession(data.session);
        toast('Email verified & logged in!', 'success');
        AttendX.App.afterLogin();
      } else {
        switchAuthMode('signin');
        showAuthBanner('Email verified! You can now sign in with your password.', 'success');
        toast('Email verified! Please sign in.', 'success');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Verify Code & Continue';
      const friendly = AuthService.formatAuthError(err, verifyType);
      showAuthBanner(friendly, 'error');
    }
  }

  async function resendVerificationEmail() {
    const { Supabase, AuthService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) return;
    const email = state.pendingEmail || document.getElementById('login-email').value.trim();
    if (!email) {
      toast('Missing email address', 'error');
      return;
    }

    const btn = document.getElementById('btn-resend-otp');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    let error = null;
    if (state.otpType === 'recovery') {
      const res = await AuthService.resetPasswordForEmail(email);
      error = res.error;
    } else {
      const res = await AuthService.resendSignupEmail(email);
      error = res.error;
    }

    btn.disabled = false;
    btn.textContent = 'Resend Email';

    if (error) {
      const friendly = AuthService.formatAuthError(error, state.otpType === 'recovery' ? 'reset' : 'resend');
      showAuthBanner(friendly, 'error');
      toast(friendly, 'error');
    } else {
      showAuthBanner(`A new verification email has been sent to ${email}. Please check your inbox.`, 'success');
      toast('Email resent!', 'success');
    }
  }

  async function submitNewPassword() {
    const { Supabase, AuthService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;
    const state = AttendX.State;

    if (!Supabase.isConfigured()) return;
    const newPass = document.getElementById('new-password').value;
    const pwdErr = AuthService.validatePasswordPolicy(newPass);
    if (pwdErr) {
      showAuthBanner(pwdErr, 'error');
      toast(pwdErr, 'error');
      return;
    }

    const btn = document.getElementById('btn-update-pwd');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    const { data, error } = await AuthService.updatePassword(newPass);

    btn.disabled = false;
    btn.textContent = 'Update Password';

    if (error) {
      const friendly = AuthService.formatAuthError(error, 'update-password');
      showAuthBanner(friendly, 'error');
      toast(friendly, 'error');
      return;
    }

    state.isPasswordRecovery = false;
    if (data?.user) {
      state.user = AuthService.extractUserFromSession({ user: data.user });
    }
    switchAuthMode('signin');
    toast('Password updated & logged in!', 'success');
    AttendX.App.afterLogin();
  }

  function loginGoogle() {
    const { Supabase, AuthService } = AttendX.Backend;
    const { toast } = AttendX.Components.Toast;

    if (!Supabase.isConfigured()) {
      toast('Service configuration missing.', 'error');
      return;
    }
    AuthService.signInWithGoogle();
  }

  // Expose global handlers
  global.switchAuthMode = switchAuthMode;
  global.loginEmail = loginEmail;
  global.verifyEmailOtp = verifyEmailOtp;
  global.resendVerificationEmail = resendVerificationEmail;
  global.submitNewPassword = submitNewPassword;
  global.loginGoogle = loginGoogle;

  AttendX.Pages.SignIn = {
    renderSignInPage,
    showAuthBanner,
    switchAuthMode,
    loginEmail,
    verifyEmailOtp,
    resendVerificationEmail,
    submitNewPassword,
    loginGoogle
  };
})(window);
