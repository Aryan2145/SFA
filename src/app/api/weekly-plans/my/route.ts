import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json({ error: 'User not in DB' }, { status: 400 })

  const weekStart = req.nextUrl.searchParams.get('weekStart')
  if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*, weekly_plan_items(*)')
    .eq('tenant_id', getTenantId())
    .eq('user_id', user.userId)
    .eq('week_start_date', weekStart)
    .single()

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}
