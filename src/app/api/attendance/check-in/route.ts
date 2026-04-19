import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { awardPoint } from '@/lib/points'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json({ error: 'User not found' }, { status: 400 })

  const { latitude, longitude, address } = await req.json()
  const today = new Date().toISOString().split('T')[0]
  const supabase = createServerSupabase()
  const tid = getTenantId()

  // Check if already checked in today
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, check_in_time')
    .eq('tenant_id', tid)
    .eq('user_id', user.userId)
    .eq('date', today)
    .single()

  if (existing?.check_in_time) {
    return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })
  }

  const payload = {
    tenant_id: tid,
    user_id: user.userId,
    date: today,
    check_in_time: new Date().toISOString(),
    check_in_latitude: latitude ?? null,
    check_in_longitude: longitude ?? null,
    check_in_address: address ?? null,
  }

  const { data, error } = existing
    ? await supabase.from('attendance').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('attendance').insert(payload).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  void awardPoint(supabase, tid, user.userId, 'daily_checkin', { description: `Daily check-in on ${today}` })
  return NextResponse.json(data, { status: 201 })
}
