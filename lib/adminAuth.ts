import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Shared storage key for the login page and the dashboard.
//
// supabase-js derives this key from the request hostname (`sb-<host>-auth-token`),
// which differs between the two pages: login talks to the real Supabase origin
// while the dashboard talks to /api/supabase on this app's own origin. With two
// keys the dashboard could never see — or refresh — the session login created,
// so the admin_token cookie went stale after the ~1h access-token lifetime and
// every proxy call started returning 401.
export const ADMIN_STORAGE_KEY = 'sharehub-admin-auth-token'

// Session shape stored by older builds; migrated into ADMIN_STORAGE_KEY on load.
export const ADMIN_LEGACY_SESSION_KEY = 'admin_session'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbmvuhcrvswbttbhioux.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXZ1aGNydnN3YnR0Ymhpb3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODIzMzcsImV4cCI6MjA3OTM1ODMzN30.7RYZa52neesxSUJ8vKbWD-MUGIa1hj0-za2fjxv0Cwo'

// Session client: talks straight to Supabase (never through the data proxy) so
// refresh tokens hit GoTrue normally instead of being rewritten with the
// service-role key by /api/supabase.
export function createAdminAuthClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: ADMIN_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}

// Cookie read by /api/supabase to authorise admin data access. Access tokens
// live ~1 hour while this cookie is allowed 7 days, so it must be rewritten on
// every token refresh — not set once at login.
export function setAdminTokenCookie(token?: string | null): void {
  if (typeof document === 'undefined') return
  document.cookie = token
    ? `admin_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : 'admin_token=; path=/; max-age=0'
}

export function readLegacySession(): {
  access_token?: string
  refresh_token?: string
} | null {
  try {
    const raw = localStorage.getItem(ADMIN_LEGACY_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
