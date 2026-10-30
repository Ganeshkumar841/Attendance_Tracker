/**
 * Backend Service — Authentication Service
 * Handles Supabase email/password sign-in, sign-up, Google OAuth, OTP verification,
 * password reset, and user-friendly error formatting.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  function formatAuthError(error, context = 'general') {
    const raw = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
    const status = error?.status || 0;

    if (
      status === 429 ||
      raw.includes('rate limit') ||
      raw.includes('too many requests') ||
      raw.includes('over_email_send_rate_limit') ||
      raw.includes('over_request_rate_limit') ||
      raw.includes('for security purposes') ||
      raw.includes('can only request this') ||
      raw.includes('email_send_rate_limit') ||
      raw.includes('2 emails') ||
      raw.includes('limit')
    ) {
      if (context === 'reset' || context === 'recovery' || context === 'update-password') {
        return 'Password reset limit reached. Please try again after an hour.';
      }
      if (context === 'signup' || context === 'resend' || context === 'otp') {
        return 'Verification email limit reached. Please try again after an hour.';
      }
      return 'Too many sign-in attempts right now. Please try again after an hour.';
    }

    if (raw.includes('invalid login credentials') || raw.includes('invalid_grant')) {
      return 'Incorrect email or password. If you do not have an account yet, switch to Sign Up.';
    }
    if (raw.includes('email not confirmed')) {
      return 'Your email address is not verified yet. Please check your inbox for the verification link.';
    }
    if (raw.includes('already registered') || raw.includes('already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (
      raw.includes('expired') ||
      raw.includes('otp_expired') ||
      raw.includes('invalid token') ||
      raw.includes('token has expired')
    ) {
      return 'This verification link or code has expired. Please request a new email.';
    }
    if (raw.includes('different from the old password') || raw.includes('same_password')) {
      return 'Please choose a new password that is different from your previous password.';
    }
    if (raw.includes('current password')) {
      return 'Unable to update password at the moment. Please request a fresh password reset link or try again later.';
    }
    if (raw.includes('weak_password') || raw.includes('at least')) {
      return 'Password must be at least 8 characters long and include both letters and digits.';
    }
    if (raw.includes('network') || raw.includes('fetch')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    return 'Unable to complete this request right now. Please try again after some time.';
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

  function validateEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function getRedirectUrl() {
    if (window.location.protocol.startsWith('http')) {
      return window.location.origin + window.location.pathname;
    }
    return undefined;
  }

  function extractUserFromSession(session) {
    if (!session || !session.user) return null;
    const rawName =
      session.user.user_metadata?.full_name ||
      session.user.email?.split('@')[0] ||
      'Coordinator';
    return {
      name: String(rawName).trim().slice(0, 60),
      email: session.user.email || '',
      id: session.user.id
    };
  }

  async function signInWithPassword(email, password) {
    const client = AttendX.Backend.Supabase.getClient();
    const redirectUrl = getRedirectUrl();
    return client.auth.signInWithPassword({ email, password, options: redirectUrl ? { redirectTo: redirectUrl } : undefined });
  }

  async function signUp(email, password) {
    const client = AttendX.Backend.Supabase.getClient();
    const redirectUrl = getRedirectUrl();
    const opts = redirectUrl ? { options: { emailRedirectTo: redirectUrl } } : {};
    return client.auth.signUp({ email, password, ...opts });
  }

  async function resetPasswordForEmail(email) {
    const client = AttendX.Backend.Supabase.getClient();
    const redirectUrl = getRedirectUrl();
    return client.auth.resetPasswordForEmail(email, redirectUrl ? { redirectTo: redirectUrl } : {});
  }

  async function resendSignupEmail(email) {
    const client = AttendX.Backend.Supabase.getClient();
    const redirectUrl = getRedirectUrl();
    return client.auth.resend({
      type: 'signup',
      email,
      options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined
    });
  }

  async function verifyOtpPayload(params) {
    const client = AttendX.Backend.Supabase.getClient();
    return client.auth.verifyOtp(params);
  }

  async function setSessionTokens(accessToken, refreshToken) {
    const client = AttendX.Backend.Supabase.getClient();
    return client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  async function updatePassword(newPassword) {
    const client = AttendX.Backend.Supabase.getClient();
    return client.auth.updateUser({ password: newPassword });
  }

  async function signInWithGoogle() {
    const client = AttendX.Backend.Supabase.getClient();
    const redirectUrl = getRedirectUrl();
    return client.auth.signInWithOAuth({
      provider: 'google',
      options: redirectUrl ? { redirectTo: redirectUrl } : {}
    });
  }

  async function signOut() {
    const client = AttendX.Backend.Supabase.getClient();
    if (client) {
      return client.auth.signOut();
    }
  }

  AttendX.Backend.AuthService = {
    formatAuthError,
    validatePasswordPolicy,
    validateEmailFormat,
    getRedirectUrl,
    extractUserFromSession,
    signInWithPassword,
    signUp,
    resetPasswordForEmail,
    resendSignupEmail,
    verifyOtpPayload,
    setSessionTokens,
    updatePassword,
    signInWithGoogle,
    signOut
  };
})(window);
