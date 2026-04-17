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

  if (user.userId) {
    try {
      const supabase = createServerSupabase()
      const { data } = await supabase
        .from('users')
        .select('profile, status, roles(name)')
        .eq('id', user.userId)
        .single()

      if (data?.status === 'Inactive') {
        user.role = 'Deactivated'
      } else if (data?.profile === 'Administrator') {
        user.role = 'Administrator'
      } else {
        const roleName = (data?.roles as unknown as { name: string } | null)?.name
        user.role = roleName ?? 'NoRole'
      }
    } catch {
      // Fall back to session role if DB lookup fails
    }
  }

  return user
}
