/**
 * Backend Configuration — Supabase Client Initialization
 * Initializes and exports the singleton Supabase client instance.
 */
(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  let supabaseClient = null;

  function initSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    try {
      const url = typeof SUPABASE_URL !== 'undefined' ? String(SUPABASE_URL).trim() : '';
      const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? String(SUPABASE_ANON_KEY).trim() : '';

      if (
        typeof global.supabase !== 'undefined' &&
        url &&
        key &&
        url !== 'YOUR_SUPABASE_URL' &&
        key !== 'YOUR_SUPABASE_ANON_KEY' &&
        /^https?:\/\//i.test(url)
      ) {
        supabaseClient = global.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
      }
    } catch (err) {
      console.warn('[AttendX] Supabase client initialization failed:', err);
    }
    return supabaseClient;
  }

  function getClient() {
    return supabaseClient || initSupabaseClient();
  }

  function isConfigured() {
    return Boolean(getClient());
  }

  // Initialize eagerly on script load
  initSupabaseClient();

  AttendX.Backend.Supabase = {
    getClient,
    isConfigured
  };
})(window);
