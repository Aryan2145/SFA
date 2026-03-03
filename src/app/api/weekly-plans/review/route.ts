import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json([])

  const status = req.nextUrl.searchParams.get('status')
  const userId = req.nextUrl.searchParams.get('userId')
  const weekStart = req.nextUrl.searchParams.get('weekStart')

  const supabase = createServerSupabase()
  let query = supabase.from('weekly_plans')
    .select('*, users!user_id(id, name, contact), weekly_plan_items(*)')
    .eq('tenant_id', getTenantId())
    .eq('current_manager_id', user.userId)
    .order('week_start_date', { ascending: false })

  if (status) query = query.eq('status', status)
  if (userId) query = query.eq('user_id', userId)
  if (weekStart) query = query.eq('week_start_date', weekStart)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
