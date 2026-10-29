//  CAPTURE INITIAL URL HASH / QUERY BEFORE SUPABASE CONSUMES IT
const INITIAL_URL_HASH = window.location.hash || '';
const INITIAL_URL_SEARCH = window.location.search || '';
const IS_INITIAL_RECOVERY = INITIAL_URL_HASH.includes('type=recovery') || INITIAL_URL_SEARCH.includes('type=recovery');

//  SUPABASE Configuration
let supabaseClient = null;
try {
  if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
} catch (e) {
  console.warn("Supabase not initialized properly. Add your keys!", e);
}

//  STATE
const state = {
  user: null,
  currentEvent: null,
  attendance: [],
  currentFilter: 'all',
  editAuthorized: false,
  pendingDeleteId: null,
  events: [],
  authMode: IS_INITIAL_RECOVERY ? 'update-password' : 'signin',
  pendingEmail: '',
  otpType: 'signup',
  isPasswordRecovery: IS_INITIAL_RECOVERY,
  theme: 'dark'
};

let realtimeSubscription = null;

//  THEME MANAGEMENT (DARK / LIGHT MODE)
function applyTheme(theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  const label = document.getElementById('theme-label');
  const icon = document.getElementById('theme-icon');
  if (label) {
    label.textContent = state.theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  if (icon) {
    if (state.theme === 'dark') {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
  }
  try {
    localStorage.setItem('attendx_theme', state.theme);
  } catch (_e) {}
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// Dynamic Academic Year Logic (Starts in July)
function computeYears() {
  const now = new Date();
  let startYear = now.getFullYear();
  if (now.getMonth() < 6) { startYear -= 1; }
  return {
    1: 'Y' + (startYear).toString().slice(-2),
    2: 'Y' + (startYear - 1).toString().slice(-2),
    3: 'Y' + (startYear - 2).toString().slice(-2),
    4: 'Y' + (startYear - 3).toString().slice(-2)
  };
}
const YEAR_PREFIX = computeYears();
const YEAR_LABELS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
let selectedYear = null;

// Initialize dynamic years, theme, and URL recovery params on load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const savedTheme = localStorage.getItem('attendx_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      applyTheme(savedTheme);
    } else {
      applyTheme('dark');
    }
  } catch (_e) {
    applyTheme('dark');
  }

  document.getElementById('y1-prefix').textContent = YEAR_PREFIX[1];
  document.getElementById('y2-prefix').textContent = YEAR_PREFIX[2];
  document.getElementById('y3-prefix').textContent = YEAR_PREFIX[3];
  document.getElementById('y4-prefix').textContent = YEAR_PREFIX[4];
  document.getElementById('ev-date').valueAsDate = new Date();

  // Check if URL contains an error from expired/invalid email link
  if (INITIAL_URL_HASH.includes('error_description=') || INITIAL_URL_SEARCH.includes('error_description=')) {
    const rawParams = new URLSearchParams(INITIAL_URL_HASH.replace(/^#/, '') || INITIAL_URL_SEARCH.replace(/^\?/, ''));
    const errDesc = rawParams.get('error_description');
    if (errDesc) {
      showAuthBanner(decodeURIComponent(errDesc.replace(/\+/g, ' ')), 'error');
    }
  }

  // Handle token_hash in URL query if present (e.g. ?token_hash=...&type=recovery)
  if (supabaseClient && (INITIAL_URL_SEARCH.includes('token_hash=') || INITIAL_URL_SEARCH.includes('token='))) {
    const searchParams = new URLSearchParams(INITIAL_URL_SEARCH);
    const tokenHash = searchParams.get('token_hash') || searchParams.get('token');
    const linkType = searchParams.get('type') || 'recovery';
    if (tokenHash) {
      if (linkType === 'recovery') {
        state.isPasswordRecovery = true;
      }
      const { data, error } = await supabaseClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: linkType
      });
      if (!error && linkType === 'recovery') {
        showScreen('screen-login');
        switchAuthMode('update-password');
        showAuthBanner('Reset link verified! Enter your new password below.', 'success');
        return;
      } else if (!error && data?.session) {
        setUserFromSession(data.session);
        afterLogin();
        return;
      }
    }
  }

  if (IS_INITIAL_RECOVERY) {
    showScreen('screen-login');
    switchAuthMode('update-password');
    showAuthBanner('Reset link verified! Enter your new password below.', 'success');
  }
});

function mapDbToLocal(dbRow) {
  return {
    id: dbRow.id,
    eventId: dbRow.event_id,
    rollNo: dbRow.roll_no,
    year: dbRow.year,
    yearLabel: dbRow.year_label,
    branch: dbRow.branch,
    num: dbRow.num,
    status: dbRow.status,
    timestamp: dbRow.timestamp,
    recordedBy: dbRow.recorded_by
  };
}

//  NAVIGATION
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'screen-attendance') updateAttendanceUI();
  if (id === 'screen-join') fetchRecentEvents();
}

function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id^=panel-]').forEach(p => p.style.display = 'none');
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).style.display = 'block';
  if (tab === 'export') renderBranchSummary();
}

// PASSWORD TOGGLE
function togglePwd(id, btn) {
  const input = document.getElementById(id);
  const svg = btn.querySelector('svg');
  if (input.type === 'password') {
    input.type = 'text';
    svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  } else {
    input.type = 'password';
    svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  }
}

//  AUTH HELPERS & UI MODES
function showAuthBanner(msg, type = 'info') {
  const banner = document.getElementById('auth-status-banner');
  if (!banner) return;
  if (!msg) {
    banner.className = 'auth-banner';
    banner.textContent = '';
    return;
  }
  banner.textContent = msg;
  banner.className = 'auth-banner show ' + type;
}

function validatePasswordPolicy(pass) {
  if (!pass || pass.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-zA-Z]/.test(pass) || !/\d/.test(pass)) {
    return 'Password must contain both letters and digits.';
  }
  return null;
}

function getRedirectUrl() {
  if (window.location.protocol.startsWith('http')) {
    return window.location.origin + window.location.pathname;
  }
  return undefined;
}

function setUserFromSession(session) {
  if (!session || !session.user) return;
  state.user = {
    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
    email: session.user.email,
    id: session.user.id
  };
}

function switchAuthMode(mode) {
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

  credView.style.display      = 'none';
  otpView.style.display       = 'none';
  updatePwdView.style.display = 'none';

  if (mode === 'signin') {
    cardTitle.textContent       = 'Sign in to continue';
    googleBtn.style.display     = 'inline-flex';
    orDivider.style.display     = 'flex';
    tabsWrap.style.display      = 'flex';
    tabSignin.classList.add('active');
    tabSignup.classList.remove('active');
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
    tabSignin.classList.remove('active');
    tabSignup.classList.add('active');
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
    showAuthBanner('Enter your email address to receive a password reset link.', 'info');
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
    cardTitle.textContent         = 'Set a new password';
    googleBtn.style.display       = 'none';
    orDivider.style.display       = 'none';
    tabsWrap.style.display        = 'none';
    updatePwdView.style.display   = 'block';
    document.getElementById('new-password').value = '';
  }
}

//  SUPABASE SESSION & AUTH STATE LISTENERS
if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setUserFromSession(session);
      // Do NOT skip to menu if user clicked a password recovery link
      if (state.isPasswordRecovery || state.authMode === 'update-password' || INITIAL_URL_HASH.includes('type=recovery')) {
        showScreen('screen-login');
        switchAuthMode('update-password');
        showAuthBanner('Reset link verified! Enter your new password below.', 'success');
      } else {
        afterLogin();
      }
    }
  }).catch(err => console.warn('Session check error:', err));

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      state.isPasswordRecovery = true;
      showScreen('screen-login');
      switchAuthMode('update-password');
      showAuthBanner('Password recovery link verified! Enter your new password below.', 'success');
      return;
    }
    if (session) {
      setUserFromSession(session);
      if (state.isPasswordRecovery || state.authMode === 'update-password') {
        showScreen('screen-login');
        return;
      }
      if (document.getElementById('screen-login').classList.contains('active')) {
        afterLogin();
      }
    } else {
      state.user = null;
      showScreen('screen-login');
    }
  });
}

//  MAIN EMAIL AUTH HANDLER (Sign In, Sign Up, Password Reset)
async function loginEmail() {
  if (!supabaseClient || typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    toast("Please add your Supabase keys to config.js first!", "error");
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('auth-submit-btn');

  if (!email) {
    toast('Please enter your email address', 'error');
    return;
  }

  // 1. PASSWORD RESET FLOW
  if (state.authMode === 'reset') {
    submitBtn.disabled = true;
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    showAuthBanner('');

    const redirectUrl = getRedirectUrl();
    const options = redirectUrl ? { redirectTo: redirectUrl } : {};
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, options);

    submitBtn.disabled = false;
    submitBtn.textContent = origText;

    if (error) {
      showAuthBanner(error.message, 'error');
      toast(error.message, 'error');
      return;
    }

    state.pendingEmail = email;
    state.otpType = 'recovery';
    switchAuthMode('otp');
    showAuthBanner('Password reset email sent to ' + email + '! Click the "Reset Password" link in the email—or copy & paste that link below if you opened the email on your phone.', 'success');
    toast('Reset link sent to your email!', 'success');
    return;
  }

  if (!pass) {
    toast('Please enter your password', 'error');
    return;
  }

  // 2. SIGN UP FLOW
  if (state.authMode === 'signup') {
    const pwdErr = validatePasswordPolicy(pass);
    if (pwdErr) {
      showAuthBanner(pwdErr, 'error');
      toast(pwdErr, 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    showAuthBanner('');

    const redirectUrl = getRedirectUrl();
    const signUpOpts = redirectUrl ? { options: { emailRedirectTo: redirectUrl } } : {};
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: pass,
      ...signUpOpts
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';

    if (error) {
      showAuthBanner(error.message, 'error');
      toast(error.message, 'error');
      return;
    }

    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      switchAuthMode('signin');
      showAuthBanner('An account with this email already exists. Please sign in with your password, or use "Forgot password?" to reset it.', 'error');
      toast('Account already exists. Please Sign In.', 'error');
      return;
    }

    if (data?.session) {
      setUserFromSession(data.session);
      toast('Account created & logged in!', 'success');
      afterLogin();
      return;
    }

    state.pendingEmail = email;
    state.otpType = 'signup';
    switchAuthMode('otp');
    showAuthBanner('Account created! Click the confirmation link sent to ' + email + ', or paste the confirmation link / 6-digit code below.', 'success');
    toast('Check your email to confirm your account!', 'info');
    return;
  }

  // 3. SIGN IN FLOW (default)
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing In...';
  showAuthBanner('');

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: pass
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign In';

  if (error) {
    const msg = error.message || 'Sign in failed';
    if (msg.toLowerCase().includes('email not confirmed')) {
      state.pendingEmail = email;
      state.otpType = 'signup';
      switchAuthMode('otp');
      showAuthBanner('Your email is not confirmed yet. Click the link in your email, paste the link below, or click "Resend Email".', 'error');
      toast('Please confirm your email first', 'error');
      return;
    }
    if (msg.toLowerCase().includes('invalid login credentials')) {
      showAuthBanner('Invalid email or password. If you are new, switch to the "Sign Up" tab above to create an account.', 'error');
      toast('Invalid email or password', 'error');
      return;
    }
    showAuthBanner(msg, 'error');
    toast(msg, 'error');
    return;
  }

  if (data?.session) {
    setUserFromSession(data.session);
    toast('Signed in!', 'success');
    afterLogin();
  }
}

//  UNIVERSAL VERIFY HANDLER: Accepts Pasted Email Link, Redirected URL (#access_token=...), Token Hash, or 6-Digit OTP
async function verifyEmailOtp() {
  if (!supabaseClient) return;
  const rawInput = document.getElementById('otp-code').value.trim();
  const email = state.pendingEmail || document.getElementById('login-email').value.trim();

  if (!rawInput) {
    toast('Paste the link from your email or enter the 6-digit code', 'error');
    return;
  }

  const btn = document.getElementById('btn-verify-otp');
  btn.disabled = true;
  btn.textContent = 'Verifying...';
  showAuthBanner('');

  const verifyType = state.otpType === 'recovery' ? 'recovery' : 'signup';

  try {
    // Case 1: User pasted a redirected URL containing #access_token=...&refresh_token=...
    if (rawInput.includes('access_token=')) {
      const hashPart = rawInput.includes('#') ? rawInput.split('#')[1] : rawInput.split('?')[1] || rawInput;
      const params = new URLSearchParams(hashPart);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const urlType = params.get('type') || verifyType;

      if (accessToken && refreshToken) {
        if (urlType === 'recovery' || verifyType === 'recovery') {
          state.isPasswordRecovery = true;
        }
        const { data, error } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        btn.disabled = false;
        btn.textContent = 'Verify Code & Continue';

        if (error) {
          showAuthBanner(error.message, 'error');
          toast(error.message, 'error');
          return;
        }
        if (urlType === 'recovery' || verifyType === 'recovery') {
          switchAuthMode('update-password');
          showAuthBanner('Reset link verified! Enter your new password below.', 'success');
          toast('Link verified! Set your new password.', 'success');
          return;
        }
        if (data?.session) {
          setUserFromSession(data.session);
          toast('Email verified & logged in!', 'success');
          afterLogin();
          return;
        }
      }
    }

    // Case 2: User copied & pasted the raw Supabase Email Link (https://<project>.supabase.co/auth/v1/verify?token=...&type=...)
    if (rawInput.startsWith('http://') || rawInput.startsWith('https://') || rawInput.includes('token=')) {
      const queryPart = rawInput.includes('?') ? rawInput.split('?')[1].split('#')[0] : rawInput;
      const params = new URLSearchParams(queryPart);
      const tokenHash = params.get('token_hash') || params.get('token');
      const urlType = params.get('type') || verifyType;

      if (tokenHash) {
        if (urlType === 'recovery' || verifyType === 'recovery') {
          state.isPasswordRecovery = true;
        }
        const { data, error } = await supabaseClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: urlType
        });
        btn.disabled = false;
        btn.textContent = 'Verify Code & Continue';

        if (error) {
          showAuthBanner(error.message, 'error');
          toast(error.message, 'error');
          return;
        }
        if (urlType === 'recovery' || verifyType === 'recovery') {
          switchAuthMode('update-password');
          showAuthBanner('Reset link verified! Enter your new password below.', 'success');
          toast('Reset link verified!', 'success');
          return;
        }
        if (data?.session) {
          setUserFromSession(data.session);
          toast('Email verified & logged in!', 'success');
          afterLogin();
          return;
        }
      }
    }

    // Case 3: Standard 6-digit OTP code (or raw token string)
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

    const { data, error } = await supabaseClient.auth.verifyOtp({
      email,
      token: rawInput,
      type: verifyType
    });

    btn.disabled = false;
    btn.textContent = 'Verify Code & Continue';

    if (error) {
      showAuthBanner(error.message + ' — Tip: Since Supabase sent a "Reset Password" link to your email, either click that link directly or right-click / long-press "Reset Password" in the email, copy the link URL, and paste it in the box above.', 'error');
      toast(error.message, 'error');
      return;
    }

    if (verifyType === 'recovery') {
      switchAuthMode('update-password');
      showAuthBanner('Verified! Set your new password below.', 'success');
      toast('Verified! Enter new password.', 'success');
      return;
    }

    if (data?.session) {
      setUserFromSession(data.session);
      toast('Email verified & logged in!', 'success');
      afterLogin();
    } else {
      switchAuthMode('signin');
      showAuthBanner('Email verified! You can now sign in with your password.', 'success');
      toast('Email verified! Please sign in.', 'success');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Verify Code & Continue';
    showAuthBanner('Verification failed: ' + (err.message || err), 'error');
  }
}

//  RESEND CONFIRMATION / RECOVERY EMAIL
async function resendVerificationEmail() {
  if (!supabaseClient) return;
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
    const redirectUrl = getRedirectUrl();
    const res = await supabaseClient.auth.resetPasswordForEmail(email, redirectUrl ? { redirectTo: redirectUrl } : {});
    error = res.error;
  } else {
    const redirectUrl = getRedirectUrl();
    const res = await supabaseClient.auth.resend({
      type: 'signup',
      email,
      options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined
    });
    error = res.error;
  }

  btn.disabled = false;
  btn.textContent = 'Resend Email';

  if (error) {
    showAuthBanner(error.message, 'error');
    toast(error.message, 'error');
  } else {
    showAuthBanner('A fresh email has been sent to ' + email + '. Click the link inside the email or copy & paste the link URL above.', 'success');
    toast('Email resent!', 'success');
  }
}

//  UPDATE PASSWORD (Step 2 of Reset Password flow)
async function submitNewPassword() {
  if (!supabaseClient) return;
  const newPass = document.getElementById('new-password').value;
  const pwdErr = validatePasswordPolicy(newPass);
  if (pwdErr) {
    showAuthBanner(pwdErr, 'error');
    toast(pwdErr, 'error');
    return;
  }

  const btn = document.getElementById('btn-update-pwd');
  btn.disabled = true;
  btn.textContent = 'Updating...';

  const { data, error } = await supabaseClient.auth.updateUser({
    password: newPass
  });

  btn.disabled = false;
  btn.textContent = 'Update Password';

  if (error) {
    let errMsg = error.message;
    if (errMsg.toLowerCase().includes('current password')) {
      errMsg += ' (In Supabase Dashboard → Authentication → Providers → Email, toggle OFF "Require current password when updating" so users can reset forgotten passwords.)';
    }
    showAuthBanner(errMsg, 'error');
    toast(error.message, 'error');
    return;
  }

  state.isPasswordRecovery = false;
  if (data?.user) {
    state.user = {
      name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
      email: data.user.email,
      id: data.user.id
    };
  }
  switchAuthMode('signin');
  toast('Password updated & logged in!', 'success');
  afterLogin();
}

function loginGoogle() {
  if (!supabaseClient || SUPABASE_URL === 'YOUR_SUPABASE_URL') return toast("Add Supabase keys first!", "error");
  const redirectUrl = getRedirectUrl();
  supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: redirectUrl ? { redirectTo: redirectUrl } : {}
  });
}

function afterLogin() {
  if (!state.user) return;
  document.getElementById('user-name').textContent = state.user.name;
  showScreen('screen-menu');
}

async function logout() {
  if (supabaseClient && SUPABASE_URL !== 'YOUR_SUPABASE_URL') await supabaseClient.auth.signOut();
  state.user = null; state.currentEvent = null; state.attendance = [];
  if (realtimeSubscription && supabaseClient) supabaseClient.removeChannel(realtimeSubscription);
  switchAuthMode('signin');
  showScreen('screen-login');
}
function confirmLogout() { logout(); }

//  EVENTS
function generateEventId() { return 'EV' + Math.random().toString(36).substr(2, 4).toUpperCase(); }

async function fetchRecentEvents() {
  if (!supabaseClient || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
  const { data, error } = await supabaseClient.from('events').select('*').order('created_at', { ascending: false }).limit(5);
  if (!error && data) {
    state.events = data;
    renderRecentEvents();
  }
}

function renderRecentEvents() {
  const c = document.getElementById('recent-events-list');
  if (state.events.length === 0) {
    c.innerHTML = '<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:20px">No recent events found</p>';
    return;
  }
  c.innerHTML = state.events.map(ev => `
    <div class="att-item" style="cursor:pointer;margin-bottom:8px" onclick="quickJoin('${ev.id}')">
      <div>
        <div class="att-roll">${ev.name}</div>
        <div class="att-meta">${ev.id} · ${ev.date} ${ev.organization ? '· ' + ev.organization : ''}</div>
      </div>
      <div class="status-badge status-attended">Select to verify</div>
    </div>
  `).join('');
}

async function createNewEvent() {
  const name   = document.getElementById('ev-name').value.trim();
  const date   = document.getElementById('ev-date').value;
  const time   = document.getElementById('ev-time').value || null;
  const venue  = document.getElementById('ev-venue').value.trim() || null;
  const org    = document.getElementById('ev-org').value.trim() || null;
  const pass   = document.getElementById('ev-pass').value;

  if (!name || !date || !pass) { toast('Fill in required fields', 'error'); return; }

  const newEvent = {
    id: generateEventId(),
    name, date, time, venue, password: pass, organization: org,
    created_by: state.user?.name,
  };

  const { data, error } = await supabaseClient.from('events').insert([newEvent]).select().single();
  
  if (error) { toast('Error creating event: ' + error.message, 'error'); return; }

  state.currentEvent = data;
  state.events.unshift(data);
  state.attendance = [];

  document.getElementById('display-event-id').textContent = data.id;
  document.getElementById('display-event-pass').textContent = data.password;
  document.getElementById('display-event-name').textContent = data.name;
  document.getElementById('display-event-dt').textContent =
    new Date(data.date + 'T' + (data.time || '00:00')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  showScreen('screen-event-created');
  toast('Event created!', 'success');
}

function copyEventId() {
  const idText = state.currentEvent?.id || '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(idText).catch(() => {});
  }
  toast('Event ID copied!', 'info');
}

async function joinEvent() {
  const id   = document.getElementById('join-id').value.trim().toUpperCase();
  const pass = document.getElementById('join-pass').value;

  const { data: ev, error } = await supabaseClient.from('events').select('*').eq('id', id).single();

  if (error || !ev) { toast('Event not found', 'error'); return; }
  if (ev.password !== pass) { toast('Incorrect password', 'error'); return; }
  
  state.currentEvent = ev;
  await fetchAttendance(ev.id);
  enterAttendance();
  toast('Joined ' + ev.name, 'success');
}

function quickJoin(id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('join-id').value = ev.id;
  document.getElementById('join-pass').value = '';
  document.getElementById('join-pass').focus();
  toast(`Please enter password for ${ev.name}`, 'info');
}

async function fetchAttendance(eventId) {
  const { data, error } = await supabaseClient.from('attendance').select('*').eq('event_id', eventId);
  if (!error && data) {
    state.attendance = data.map(mapDbToLocal);
  }
}

function enterAttendance() {
  if (!state.currentEvent) return;
  document.getElementById('hdr-event-name').textContent = state.currentEvent.name;
  document.getElementById('hdr-event-id').textContent = state.currentEvent.id;
  selectedYear = null;
  updateYearUI();
  subscribeToAttendance(state.currentEvent.id);
  showScreen('screen-attendance');
  switchTab('entry');
}

//  REAL-TIME SYNCHRONIZATION
function subscribeToAttendance(eventId) {
  if (!supabaseClient) return;
  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);

  realtimeSubscription = supabaseClient
    .channel('attendance_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `event_id=eq.${eventId}` }, payload => {
      if (payload.eventType === 'INSERT') {
        if (!state.attendance.find(a => a.id === payload.new.id)) {
          state.attendance.push(mapDbToLocal(payload.new));
        }
      } else if (payload.eventType === 'UPDATE') {
        const idx = state.attendance.findIndex(a => a.id === payload.new.id);
        if (idx !== -1) state.attendance[idx] = mapDbToLocal(payload.new);
      } else if (payload.eventType === 'DELETE') {
        state.attendance = state.attendance.filter(a => a.id !== payload.old.id);
      }
      updateAttendanceUI();
    })
    .subscribe();
}

//  YEAR SELECTION
function selectYear(y) {
  selectedYear = y;
  updateYearUI();
  document.getElementById('roll-input').focus();
}

function updateYearUI() {
  document.querySelectorAll('.year-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i + 1 === selectedYear);
  });
  document.getElementById('roll-prefix').textContent = selectedYear ? YEAR_PREFIX[selectedYear] : 'Y??';
}

//  ATTENDANCE ENTRY
async function addEntry() {
  if (!selectedYear) { toast('Select a year first', 'error'); return; }

  const suffix = document.getElementById('roll-input').value.trim().toUpperCase();
  if (!suffix) { toast('Enter roll number suffix', 'error'); return; }

  if (!/^[A-Z]{2,5}\d{3}$/.test(suffix)) {
    toast('Format: BRANCH + 3 digits (e.g. CSE042)', 'error');
    return;
  }

  const branch  = suffix.replace(/\d+/, '');
  const num     = suffix.match(/\d+/)[0];
  const fullRoll = YEAR_PREFIX[selectedYear] + suffix;

  const existing = state.attendance.find(a => a.rollNo === fullRoll);

  if (existing) {
    if (existing.status === 'preregistered') {
      const { data, error } = await supabaseClient
        .from('attendance')
        .update({ status: 'attended', timestamp: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();
        
      if (!error && data) {
        const existingIdx = state.attendance.findIndex(a => a.id === existing.id);
        state.attendance[existingIdx] = mapDbToLocal(data);
        updateAttendanceUI();
        
        toast('✓ Pre-reg verified: ' + fullRoll, 'success');
        document.getElementById('roll-input').value = '';
      }
    } else {
      toast('Already marked: ' + fullRoll, 'error');
    }
    return;
  }

  const { data, error } = await supabaseClient
    .from('attendance')
    .insert([{
      event_id: state.currentEvent.id,
      roll_no: fullRoll,
      year: selectedYear,
      year_label: YEAR_LABELS[selectedYear],
      branch: branch,
      num: num,
      status: 'attended',
      recorded_by: state.user?.name
    }])
    .select().single();

  if (error) {
    if (error.code === '23505') { 
      toast('Already marked: ' + fullRoll, 'error');
    } else {
      toast('Error: ' + error.message, 'error');
    }
    return;
  }

  state.attendance.push(mapDbToLocal(data));
  updateAttendanceUI();

  document.getElementById('roll-input').value = '';
  toast('✓ Marked: ' + fullRoll, 'success');
}

//  PRE-REG CSV UPLOAD
async function loadPreregCSV(input) {
  const file = input.files[0];
  if (!file) return;

  const btn = document.querySelector('#panel-entry .btn-secondary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="prereg-spinner"></span> Uploading…';
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    const toInsert = [];

    lines.forEach(roll => {
      roll = roll.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!roll) return;
      if (!state.attendance.find(a => a.rollNo === roll)) {
        const prefix = roll.substring(0, 3);
        const yearEntry = Object.entries(YEAR_PREFIX).find(([, p]) => p === prefix);
        const year = yearEntry ? parseInt(yearEntry[0]) : 1;
        const suffix = roll.substring(3);
        const branch = suffix.replace(/\d+/, '');

        toInsert.push({
          event_id: state.currentEvent.id,
          roll_no: roll,
          year: year,
          year_label: YEAR_LABELS[year] || '?',
          branch: branch,
          num: suffix.match(/\d+/)?.[0] || '',
          status: 'preregistered',
          recorded_by: 'pre-registration setup'
        });
      }
    });

    const resetBtn = () => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Upload Pre-reg CSV';
      }
    };

    if (toInsert.length === 0) {
      toast('No new roll numbers to add', 'info');
      resetBtn();
    } else {
      const { data, error } = await supabaseClient.from('attendance').insert(toInsert).select();
      if (error) {
        toast('Error uploading pre-registrations', 'error');
      } else {
        data.forEach(row => state.attendance.push(mapDbToLocal(row)));
        updateAttendanceUI();
        toast(`✓ ${data.length} pre-registered students added`, 'success');
      }
      resetBtn();
    }
  };
  reader.readAsText(file);
  input.value = '';
}

//  UI UPDATES
function updateAttendanceUI() {
  const all       = state.attendance;
  const attended  = all.filter(a => a.status === 'attended');
  const prereg    = all.filter(a => a.status === 'preregistered');

  document.getElementById('stat-total').textContent    = all.length;
  document.getElementById('stat-attended').textContent  = attended.length;
  document.getElementById('stat-prereg').textContent    = prereg.length;

  renderList();

  if (document.getElementById('panel-export')?.style.display !== 'none') {
    renderBranchSummary();
  }
}

function setFilter(f, el) {
  state.currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

function renderList() {
  const container = document.getElementById('att-list-container');
  let items = state.attendance;
  if (state.currentFilter !== 'all') items = items.filter(a => a.status === state.currentFilter);
  items = [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">📋</div>
      <p>No entries present.<br><span style="font-size:.75rem">${state.currentFilter !== 'all' ? 'Try a different filter.' : 'Start marking attendance.'}</span></p>
    </div>`;
    return;
  }

  container.innerHTML = '<div class="attendance-list">' + items.map(a => `
    <div class="att-item" id="entry-${a.id}">
      <div style="flex:1">
        <div class="att-roll">${a.rollNo}</div>
        <div class="att-meta">${a.yearLabel} Year · ${a.branch} · ${formatTime(a.timestamp)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="status-badge status-${a.status}">${a.status === 'attended' ? '✓ Present' : '○ Pre-reg'}</span>
        <button class="btn btn-danger btn-sm" onclick="requestDelete('${a.id}')" title="Delete Entry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
      </div>
    </div>
  `).join('') + '</div>';
}

function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

//  EDIT / DELETE
function requestDelete(id) {
  state.pendingDeleteId = id;
  const entry = state.attendance.find(a => a.id === id);
  document.getElementById('delete-target-roll').textContent = entry?.rollNo || id;

  if (state.editAuthorized) {
    openModal('modal-delete-confirm');
  } else {
    openModal('modal-edit-auth');
  }
}

function confirmEditAuth() {
  const pass = document.getElementById('edit-auth-pass').value;
  if (pass !== state.currentEvent?.password) {
    toast('Incorrect password', 'error'); return;
  }
  state.editAuthorized = true;
  closeModal('modal-edit-auth');
  document.getElementById('edit-auth-pass').value = '';
  openModal('modal-delete-confirm');
}

async function executeDelete() {
  const id = state.pendingDeleteId;
  const { error } = await supabaseClient.from('attendance').delete().eq('id', id);
  
  if (error) { toast('Failed to delete entry', 'error'); }
  else { toast('Entry deleted', 'info'); }
  
  closeModal('modal-delete-confirm');
  state.pendingDeleteId = null;
}

async function executeDeleteEvent() {
  const pass = document.getElementById('delete-event-pass').value;
  if (!pass) { toast('Enter the event password', 'error'); return; }
  if (pass !== state.currentEvent?.password) { toast('Incorrect password', 'error'); return; }

  const eventId = state.currentEvent.id;

  const { error: attErr } = await supabaseClient.from('attendance').delete().eq('event_id', eventId);
  if (attErr) { toast('Failed to delete attendance records: ' + attErr.message, 'error'); return; }

  const { error: evErr } = await supabaseClient.from('events').delete().eq('id', eventId);
  if (evErr) { toast('Failed to delete event: ' + evErr.message, 'error'); return; }

  if (realtimeSubscription) supabaseClient.removeChannel(realtimeSubscription);
  state.currentEvent = null;
  state.attendance = [];
  state.editAuthorized = false;
  state.events = state.events.filter(e => e.id !== eventId);

  closeModal('modal-delete-event');
  document.getElementById('delete-event-pass').value = '';
  toast('Event and all data permanently deleted', 'success');
  showScreen('screen-menu');
}

//  EXPORT
function renderBranchSummary() {
  const c = document.getElementById('branch-summary');
  const branches = groupByBranch(state.attendance.filter(a => a.status === 'attended'));
  if (Object.keys(branches).length === 0) {
    c.innerHTML = '<p style="color:var(--muted);font-size:.83rem">No attendance data yet.</p>';
    return;
  }
  c.innerHTML = Object.entries(branches).map(([branch, students]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600">${branch}</div>
        <div style="font-size:.72rem;color:var(--muted)">${Object.keys(groupByYear(students)).join(', ')} Year</div>
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:1.1rem;color:var(--accent);font-weight:700">${students.length}</div>
    </div>
  `).join('');
}

function groupByBranch(data) {
  return data.reduce((acc, a) => { (acc[a.branch] = acc[a.branch] || []).push(a); return acc; }, {});
}

function groupByYear(data) {
  return data.reduce((acc, a) => { 
    const label = a.yearLabel + ' Year'; 
    (acc[label] = acc[label] || []).push(a); return acc; 
  }, {});
}

function exportExcel() {
  if (state.attendance.length === 0) { toast('No attendance data to export', 'error'); return; }

  const ev = state.currentEvent;
  const byBranch = groupByBranch(state.attendance);
  let fileCount = 0;

  Object.entries(byBranch).forEach(([branch, students], index) => {
    students.sort((a, b) => {
      const yearPrefixA = a.rollNo.match(/^[A-Z]+\d+/)?.[0] || '';
      const yearPrefixB = b.rollNo.match(/^[A-Z]+\d+/)?.[0] || '';
      if (yearPrefixA !== yearPrefixB) {
        return yearPrefixB.localeCompare(yearPrefixA);
      }
      return a.rollNo.localeCompare(b.rollNo);
    });

    const wb = XLSX.utils.book_new();
    const rows = [
      ['Registered Number (Roll No)', 'Year', 'Branch', 'Status', 'Time', 'Recorded By'],
      ...students.map(s => [s.rollNo, s.yearLabel + ' Year', s.branch, s.status, formatTime(s.timestamp), s.recordedBy])
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];
    
    XLSX.utils.book_append_sheet(wb, ws, branch.substring(0, 31));

    const filename = `Attendance_${ev.name.replace(/\s+/g,'_')}_${branch}.xlsx`;

    setTimeout(() => {
      XLSX.writeFile(wb, filename);
    }, index * 400);

    fileCount++;
  });

  toast(`Exporting ${fileCount} Excel file(s)...`, 'success');
}

//  MODALS & TOAST
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});
