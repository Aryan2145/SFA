import { NextRequest, NextResponse } from 'next/server'
import { signSession, COOKIE_NAME } from '@/lib/session'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()
  if (!phone || !password) return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })

  const supabase = createServerSupabase()
  const tid = getTenantId()

  // Try DB-based login first (requires password column to exist)
  const { data: user, error: dbError } = await supabase
    .from('users')
    .select('id, name, profile, contact, password, status')
    .eq('contact', phone.trim())
    .eq('tenant_id', tid)
    .single()

  // If DB query succeeded, validate normally
  if (!dbError && user) {
    if (user.password !== password) {
      return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 })
    }
    if (user.status !== 'Active') {
      return NextResponse.json({ error: 'Account is inactive. Contact your administrator.' }, { status: 403 })
    }
    const token = await signSession({ phone: user.contact, userId: user.id, name: user.name, role: user.profile })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  // Fallback: password column may not exist yet — allow hardcoded admin
  if (phone.trim() === '9999999999' && password === 'Admin@123') {
    // Look up user without password field
    const { data: basicUser } = await supabase
      .from('users')
      .select('id, name, profile')
      .eq('contact', phone.trim())
      .eq('tenant_id', tid)
      .single()
    const token = await signSession({
      phone: phone.trim(),
      userId: basicUser?.id ?? null,
      name: basicUser?.name ?? 'Admin User',
      role: basicUser?.profile ?? 'Administrator',
    })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 })
    return res
  }

  return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 })
}
