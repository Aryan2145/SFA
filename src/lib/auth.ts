import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from './session'

export type SessionUser = {
  phone: string
  userId: string | null
  name: string
  role: string
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
  return user
}
