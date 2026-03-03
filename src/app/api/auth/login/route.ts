import { NextRequest, NextResponse } from 'next/server'
import { signSession, COOKIE_NAME } from '@/lib/session'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()
  if (!phone || !password) return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })

  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data: user } = await supabase
    .from('users')
    .select('id, name, profile, contact, password, status')
    .eq('contact', phone.trim())
    .eq('tenant_id', tid)
    .single()

  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Invalid phone or password' }, { status: 401 })
  }

  if (user.status !== 'Active') {
    return NextResponse.json({ error: 'Account is inactive. Contact your administrator.' }, { status: 403 })
  }

  const token = await signSession({ phone: user.contact, userId: user.id, name: user.name, role: user.profile })

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
