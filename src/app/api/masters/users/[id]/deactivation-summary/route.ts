import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!await checkPermission(user, 'users', 'edit')) return forbidden()

  const supabase = createServerSupabase()
  const tid = getTenantId()

  const [
    { count: directReports },
    { count: activeMeetings },
    { count: pendingPlans },
    { count: openOrders },
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).eq('manager_user_id', params.id).eq('status', 'Active'),
    supabase.from('daily_visits').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).eq('user_id', params.id).eq('status', 'In Progress'),
    supabase.from('weekly_plans').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).eq('user_id', params.id).eq('status', 'Submitted'),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).eq('user_id', params.id).not('status', 'in', '("Delivered","Cancelled","Rejected")'),
  ])

  return NextResponse.json({
    direct_reports: directReports ?? 0,
    active_meetings: activeMeetings ?? 0,
    pending_plans: pendingPlans ?? 0,
    open_orders: openOrders ?? 0,
  })
}
