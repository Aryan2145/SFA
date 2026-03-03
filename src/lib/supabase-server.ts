import { createClient } from '@supabase/supabase-js'

// Uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS, server-only.
// Never expose this key to the browser.
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { persistSession: false } })
}
