import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from './session'
import { createServerSupabase } from './supabase-server'

export type SessionUser = {
  phone: string
  userId: string | null
  name: string
  role: string
  tenantId: string
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifySession(token)
  if (!payload) return null
  return payload as SessionUser
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')

  // Re-validate role from DB so role changes take effect on next API call
  // without waiting for session expiry / re-login.
  if (user.userId) {
    try {
      const supabase = createServerSupabase()
      const { data } = await supabase
        .from('users')
        .select('profile, status')
        .eq('id', user.userId)
        .single()
      if (data?.profile) user.role = data.profile
      if (data?.status === 'Inactive') throw new Error('Account deactivated')
    } catch (e) {
      if ((e as Error).message === 'Account deactivated') throw e
      // If DB lookup fails (e.g. during migrations), fall back to session role
    }
  }

  return user
}
