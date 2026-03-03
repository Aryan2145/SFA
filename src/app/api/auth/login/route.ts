import { NextRequest, NextResponse } from 'next/server'
import { signSession, COOKIE_NAME } from '@/lib/session'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

const VALID_PHONE = '9999999999'
const VALID_PASSWORD = 'Admin@123'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()

  if (phone !== VALID_PHONE || password !== VALID_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Look up user record for session enrichment
  let userId: string | null = null
  let userName = 'Admin'
  let userRole = 'Administrator'
  try {
    const supabase = createServerSupabase()
    const { data } = await supabase
      .from('users')
      .select('id, name, profile')
      .eq('contact', phone)
      .eq('tenant_id', getTenantId())
      .single()
    if (data) {
      userId = data.id
      userName = data.name
      userRole = data.profile
    }
  } catch { /* tables may not exist yet */ }

  const token = await signSession({ phone, userId, name: userName, role: userRole })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return res
}
