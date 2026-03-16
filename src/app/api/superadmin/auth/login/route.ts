import { NextRequest, NextResponse } from 'next/server'
import { signSession, COOKIE_NAME } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { phone, password } = await req.json()
  if (!phone || !password) return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })

  const saPhone = process.env.SUPER_ADMIN_PHONE
  const saPassword = process.env.SUPER_ADMIN_PASSWORD

  if (!saPhone || !saPassword) {
    return NextResponse.json({ error: 'Super Admin not configured' }, { status: 500 })
  }

  if (phone.trim() !== saPhone || password !== saPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signSession({
    phone: phone.trim(),
    userId: null,
    name: 'Super Admin',
    role: 'SuperAdmin',
    tenantId: '',
  })

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
