import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/visibility'

export const dynamic = 'force-dynamic'

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json({ weeks: [], subordinates: [] })

  const weeksBack = Math.min(parseInt(req.nextUrl.searchParams.get('weeksBack') ?? '11'), 51)
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const subIds = await getVisibleUserIds(user.userId, supabase, tid)
  if (!subIds.length) return NextResponse.json({ weeks: [], subordinates: [] })

  const { data: subs } = await supabase
    .from('users')
    .select('id, name')
    .in('id', subIds)
    .eq('tenant_id', tid)
    .eq('status', 'Active')
    .order('name')

  if (!subs?.length) return NextResponse.json({ weeks: [], subordinates: [] })

  // Build week list: weeksBack weeks ago → current week
  const currentMonday = getMondayOf(new Date())
  const weeks: string[] = []
  for (let i = weeksBack; i >= 0; i--) {
    weeks.push(toDateStr(addDays(currentMonday, -7 * i)))
  }

  const activeSubIds = subs.map(s => s.id)

  // Fetch all plans in the range for all subordinates
  const { data: plans } = await supabase
    .from('weekly_plans')
    .select('user_id, week_start_date, status, weekly_plan_items(plan_date, from_place)')
    .eq('tenant_id', tid)
    .in('user_id', activeSubIds)
    .in('week_start_date', weeks)

  type CellData = { status: string | null; planned_days: number }
  const grid: Record<string, Record<string, CellData>> = {}

  for (const sub of subs) {
    grid[sub.id] = {}
    for (const week of weeks) {
      grid[sub.id][week] = { status: null, planned_days: 0 }
    }
  }

  for (const plan of (plans ?? [])) {
    const items = plan.weekly_plan_items as unknown as { plan_date: string; from_place: string }[]
    // Count distinct dates that have at least one item with a non-empty place
    const uniqueDates = new Set(
      (items ?? []).filter(i => i.from_place?.trim()).map(i => i.plan_date)
    )
    if (grid[plan.user_id as string]?.[plan.week_start_date] !== undefined) {
      grid[plan.user_id as string][plan.week_start_date] = {
        status: plan.status,
        planned_days: uniqueDates.size,
      }
    }
  }

  return NextResponse.json({
    weeks,
    subordinates: subs.map(sub => ({
      id: sub.id,
      name: sub.name,
      weeks: grid[sub.id],
    })),
  })
}
