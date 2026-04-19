import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json({ total: 0, events: [] })

  const supabase = createServerSupabase()
  const tid = getTenantId()
  const period = req.nextUrl.searchParams.get('period') ?? 'month'

  // Determine date range
  let fromDate: string | null = null
  const now = new Date()
  if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    fromDate = new Date(now.getFullYear(), q * 3, 1).toISOString()
  }
  // period === 'all' → no date filter

  // Fetch events
  let query = supabase
    .from('point_events')
    .select('*')
    .eq('tenant_id', tid)
    .eq('user_id', user.userId)
    .order('earned_at', { ascending: false })
    .limit(500)

  if (fromDate) query = query.gte('earned_at', fromDate)

  const { data: events } = await query

  const total = (events ?? []).reduce((sum, e) => sum + e.points, 0)

  // Breakdown by action type
  const breakdown: Record<string, { count: number; points: number; label: string }> = {}
  for (const e of events ?? []) {
    if (!breakdown[e.action_type]) breakdown[e.action_type] = { count: 0, points: 0, label: e.action_type }
    breakdown[e.action_type].count++
    breakdown[e.action_type].points += e.points
  }

  // Fetch labels from config
  const { data: configs } = await supabase
    .from('point_config')
    .select('action_type, label')
    .eq('tenant_id', tid)

  for (const c of configs ?? []) {
    if (breakdown[c.action_type]) breakdown[c.action_type].label = c.label
  }

  return NextResponse.json({ total, events: events ?? [], breakdown })
}
