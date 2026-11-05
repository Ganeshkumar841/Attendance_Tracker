(function (global) {
  const AttendX = (global.AttendX = global.AttendX || {});
  AttendX.Backend = AttendX.Backend || {};

  let supabaseClient = null;
  const memoryStore = new Map();

  // fallback to in-memory map when strict incognito mode blocks web storage
  const safeLocalStorage = {
    getItem(key) {
      try {
        if (global.localStorage) {
          const val = global.localStorage.getItem(key);
          if (val !== null) return val;
        }
      } catch (_e) {}
      return memoryStore.get(key) ?? null;
    },
    setItem(key, value) {
      const strVal = String(value);
      memoryStore.set(key, strVal);
      try {
        if (global.localStorage) global.localStorage.setItem(key, strVal);
      } catch (_e) {}
    },
    removeItem(key) {
      memoryStore.delete(key);
      try {
        if (global.localStorage) global.localStorage.removeItem(key);
      } catch (_e) {}
    }
  };

  function createLocalFallbackClient() {
    const DB_KEY = 'attendx_local_fallback_db_v2';
    const SESSION_KEY = 'attendx_local_fallback_session_v2';
    const authListeners = new Set();

    function loadDb() {
      try {
        const raw = safeLocalStorage.getItem(DB_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return {
              events: Array.isArray(parsed.events) ? parsed.events : [],
              attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
              audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : [],
              users: Array.isArray(parsed.users) ? parsed.users : []
            };
          }
        }
      } catch (_e) {}
      return { events: [], attendance: [], audit_logs: [], users: [] };
    }

    function saveDb(db) {
      try {
        safeLocalStorage.setItem(DB_KEY, JSON.stringify(db));
      } catch (_e) {}
    }

    function getSessionObj() {
      try {
        const raw = safeLocalStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_e) {
        return null;
      }
    }

    function setSessionObj(sess) {
      if (sess) {
        safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      } else {
        safeLocalStorage.removeItem(SESSION_KEY);
      }
    }

    function notifyAuth(event, session) {
      authListeners.forEach(cb => {
        try {
          cb(event, session);
        } catch (_e) {}
      });
    }

    function makeQueryBuilder(table) {
      const state = {
        op: 'select',
        payload: null,
        upsertOpts: null,
        filters: [],
        orderCol: null,
        orderAsc: true,
        limitCount: null,
        wantSingle: false
      };

      const builder = {
        select() {
          return builder;
        },
        insert(rows) {
          state.op = 'insert';
          state.payload = Array.isArray(rows) ? rows : [rows];
          return builder;
        },
        update(patch) {
          state.op = 'update';
          state.payload = patch;
          return builder;
        },
        upsert(rows, opts) {
          state.op = 'upsert';
          state.payload = Array.isArray(rows) ? rows : [rows];
          state.upsertOpts = opts || {};
          return builder;
        },
        delete() {
          state.op = 'delete';
          return builder;
        },
        eq(col, val) {
          state.filters.push(row => String(row?.[col] ?? '') === String(val ?? ''));
          return builder;
        },
        order(col, opts) {
          state.orderCol = col;
          state.orderAsc = opts?.ascending !== false;
          return builder;
        },
        limit(n) {
          state.limitCount = n;
          return builder;
        },
        single() {
          state.wantSingle = true;
          return builder;
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
        }
      };

      async function execute() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          return { data: null, error: new Error('Network connection error: failed to fetch') };
        }

        const db = loadDb();
        const rows = db[table] || [];

        if (state.op === 'insert') {
          const inserted = [];
          for (const item of state.payload) {
            if (table === 'attendance') {
              const dup = rows.find(
                r => r.event_id === item.event_id && r.roll_no === item.roll_no
              );
              if (dup) {
                return {
                  data: null,
                  error: { code: '23505', message: 'duplicate key value violates unique constraint' }
                };
              }
            }
            const record = {
              id: item.id !== undefined ? item.id : Date.now() + Math.floor(Math.random() * 10000),
              created_at: item.created_at || new Date().toISOString(),
              timestamp: item.timestamp || new Date().toISOString(),
              ...item
            };
            rows.push(record);
            inserted.push(record);
          }
          db[table] = rows;
          saveDb(db);
          return {
            data: state.wantSingle ? (inserted[0] || null) : inserted,
            error: null
          };
        }

        if (state.op === 'upsert') {
          const results = [];
          for (const item of state.payload) {
            const existingIdx = rows.findIndex(
              r => r.event_id === item.event_id && r.roll_no === item.roll_no
            );
            if (existingIdx !== -1) {
              if (!state.upsertOpts?.ignoreDuplicates) {
                rows[existingIdx] = { ...rows[existingIdx], ...item };
                results.push(rows[existingIdx]);
              }
            } else {
              const record = {
                id: item.id !== undefined ? item.id : Date.now() + Math.floor(Math.random() * 10000),
                timestamp: item.timestamp || new Date().toISOString(),
                ...item
              };
              rows.push(record);
              results.push(record);
            }
          }
          db[table] = rows;
          saveDb(db);
          return { data: results, error: null };
        }

        if (state.op === 'update') {
          const updated = [];
          for (let i = 0; i < rows.length; i++) {
            if (state.filters.every(fn => fn(rows[i]))) {
              rows[i] = { ...rows[i], ...state.payload };
              updated.push(rows[i]);
            }
          }
          db[table] = rows;
          saveDb(db);
          if (state.wantSingle && updated.length === 0) {
            return { data: null, error: new Error('Row not found') };
          }
          return {
            data: state.wantSingle ? (updated[0] || null) : updated,
            error: null
          };
        }

        if (state.op === 'delete') {
          const remaining = [];
          for (let i = 0; i < rows.length; i++) {
            if (!state.filters.every(fn => fn(rows[i]))) {
              remaining.push(rows[i]);
            }
          }
          db[table] = remaining;
          saveDb(db);
          return { data: null, error: null };
        }

        let matched = rows.filter(r => state.filters.every(fn => fn(r)));
        if (state.orderCol) {
          matched.sort((a, b) => {
            const va = a[state.orderCol] || '';
            const vb = b[state.orderCol] || '';
            return state.orderAsc
              ? String(va).localeCompare(String(vb))
              : String(vb).localeCompare(String(va));
          });
        }
        if (typeof state.limitCount === 'number') {
          matched = matched.slice(0, state.limitCount);
        }
        if (state.wantSingle) {
          if (matched.length === 0) {
            return { data: null, error: new Error('Not found') };
          }
          return { data: matched[0], error: null };
        }
        return { data: matched, error: null };
      }

      return builder;
    }

    return {
      from: makeQueryBuilder,
      channel() {
        const ch = {
          on() {
            return ch;
          },
          subscribe() {
            return ch;
          }
        };
        return ch;
      },
      removeChannel() {},
      auth: {
        async getSession() {
          return { data: { session: getSessionObj() }, error: null };
        },
        onAuthStateChange(cb) {
          authListeners.add(cb);
          return {
            data: {
              subscription: {
                unsubscribe() {
                  authListeners.delete(cb);
                }
              }
            }
          };
        },
        async signInWithPassword({ email, password }) {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return { data: null, error: new Error('Network connection error') };
          }
          const cleanEmail = String(email || '').trim().toLowerCase();
          const db = loadDb();
          let userRecord = db.users.find(u => u.email === cleanEmail);
          if (userRecord && userRecord.password && userRecord.password !== password) {
            return { data: null, error: new Error('Invalid login credentials') };
          }
          if (!userRecord) {
            userRecord = {
              id: 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
              email: cleanEmail,
              password,
              user_metadata: { full_name: cleanEmail.split('@')[0] }
            };
            db.users.push(userRecord);
            saveDb(db);
          }
          const session = {
            access_token: 'local_token_' + Date.now(),
            refresh_token: 'local_refresh_' + Date.now(),
            user: userRecord
          };
          setSessionObj(session);
          notifyAuth('SIGNED_IN', session);
          return { data: { user: userRecord, session }, error: null };
        },
        async signUp({ email, password }) {
          const cleanEmail = String(email || '').trim().toLowerCase();
          const db = loadDb();
          const existing = db.users.find(u => u.email === cleanEmail);
          if (existing) {
            return { data: { user: { ...existing, identities: [] }, session: null }, error: null };
          }
          const userRecord = {
            id: 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
            email: cleanEmail,
            password,
            identities: [{ id: '1' }],
            user_metadata: { full_name: cleanEmail.split('@')[0] }
          };
          db.users.push(userRecord);
          saveDb(db);
          const session = {
            access_token: 'local_token_' + Date.now(),
            refresh_token: 'local_refresh_' + Date.now(),
            user: userRecord
          };
          setSessionObj(session);
          notifyAuth('SIGNED_IN', session);
          return { data: { user: userRecord, session }, error: null };
        },
        async resetPasswordForEmail() {
          return { data: {}, error: null };
        },
        async resend() {
          return { data: {}, error: null };
        },
        async verifyOtp() {
          const sess = getSessionObj();
          return { data: { session: sess, user: sess?.user || null }, error: null };
        },
        async setSession({ access_token, refresh_token }) {
          const sess = getSessionObj() || {
            access_token,
            refresh_token,
            user: { id: 'usr_recovery', email: 'coordinator@college.edu' }
          };
          setSessionObj(sess);
          return { data: { session: sess, user: sess.user }, error: null };
        },
        async updateUser({ password }) {
          const sess = getSessionObj();
          if (sess?.user) {
            const db = loadDb();
            const u = db.users.find(item => item.email === sess.user.email);
            if (u) {
              u.password = password;
              saveDb(db);
            }
          }
          return { data: { user: sess?.user || { id: 'usr_recovery', email: 'coordinator@college.edu' } }, error: null };
        },
        async signInWithOAuth() {
          return { data: {}, error: null };
        },
        async signOut() {
          setSessionObj(null);
          notifyAuth('SIGNED_OUT', null);
          return { error: null };
        }
      }
    };
  }

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
            detectSessionInUrl: true,
            storage: safeLocalStorage
          }
        });
        return supabaseClient;
      }
    } catch (_err) {
      supabaseClient = null;
    }

    supabaseClient = createLocalFallbackClient();
    return supabaseClient;
  }

  function getClient() {
    return supabaseClient || initSupabaseClient();
  }

  function isConfigured() {
    return Boolean(getClient());
  }

  initSupabaseClient();

  AttendX.Backend.Supabase = {
    getClient,
    isConfigured,
    safeLocalStorage
  };
})(window);
