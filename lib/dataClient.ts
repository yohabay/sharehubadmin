// Returns the base URL that supabase-js should talk to.
//
// In the browser we point supabase-js at our own /api/supabase proxy, which
// adds the service-role key server-side so the admin dashboard keeps working
// even when RLS is fully hardened. On the server this value is never used for
// real requests (data loading happens in useEffect), but createClient() still
// needs a syntactically valid absolute URL at module load.
export function getDataClientUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/supabase`
  }
  return 'http://localhost/api/supabase'
}
