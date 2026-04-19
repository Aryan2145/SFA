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

  const { data: existing } = await supabase
    .from('attendance')
    .select('id, check_in_time, check_out_time')
    .eq('tenant_id', tid)
    .eq('user_id', user.userId)
    .eq('date', today)
    .single()

  if (!existing?.check_in_time) {
    return NextResponse.json({ error: 'Check in first before checking out' }, { status: 400 })
  }
  if (existing.check_out_time) {
    return NextResponse.json({ error: 'Already checked out today' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out_time: new Date().toISOString(),
      check_out_latitude: latitude ?? null,
      check_out_longitude: longitude ?? null,
      check_out_address: address ?? null,
    })
    .eq('id', existing.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  void awardPoint(supabase, tid, user.userId, 'daily_checkout', { description: `Daily check-out on ${today}` })
  return NextResponse.json(data)
}
