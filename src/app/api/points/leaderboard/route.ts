import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json([])

  const supabase = createServerSupabase()
  const tid = getTenantId()
  const period = req.nextUrl.searchParams.get('period') ?? 'month'
  const canSeeAll = user.role === 'Administrator' || await checkPermission(user, 'leaderboard', 'view')

  // Determine date range
  let fromDate: string | null = null
  const now = new Date()
  if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    fromDate = new Date(now.getFullYear(), q * 3, 1).toISOString()
  }

  // Determine visible user IDs
  let userIds: string[] = []
  if (canSeeAll) {
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tid)
      .eq('status', 'Active')
    userIds = (allUsers ?? []).map(u => u.id)
  } else {
    // Only show team (users visible to current user + self)
    const { data: visRows } = await supabase
      .from('user_visibility')
      .select('target_user_id')
      .eq('tenant_id', tid)
      .eq('viewer_user_id', user.userId)
    userIds = [(visRows ?? []).map(r => r.target_user_id), user.userId].flat()
  }

  if (userIds.length === 0) return NextResponse.json([])

  // Aggregate points per user
  let evQuery = supabase
    .from('point_events')
    .select('user_id, points')
    .eq('tenant_id', tid)
    .in('user_id', userIds)

  if (fromDate) evQuery = evQuery.gte('earned_at', fromDate)

  const { data: events } = await evQuery

  const totals: Record<string, number> = {}
  for (const e of events ?? []) {
    totals[e.user_id] = (totals[e.user_id] ?? 0) + e.points
  }

  // Fetch user names
  const { data: users } = await supabase
    .from('users')
    .select('id, name, profile, designations(name)')
    .eq('tenant_id', tid)
    .in('id', userIds)

  const ranked = (users ?? [])
    .map(u => ({
      user_id: u.id,
      name: u.name,
      designation: ((u.designations as unknown) as { name: string } | null)?.name ?? u.profile ?? '',
      points: totals[u.id] ?? 0,
      is_self: u.id === user.userId,
    }))
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ ...u, rank: i + 1 }))

  return NextResponse.json(ranked)
}
