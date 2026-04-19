import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'
import { POINT_ACTIONS } from '@/lib/points'

const DEFAULT_CONFIG: Record<string, { label: string; points: number; cap_per_day: number | null }> = {
  weekly_plan_submitted: { label: 'Weekly Plan Submitted On Time', points: 10, cap_per_day: null },
  weekly_plan_approved:  { label: 'Weekly Plan Approved (No Rejection)', points: 5, cap_per_day: null },
  daily_checkin:         { label: 'Daily Check-In', points: 3, cap_per_day: 1 },
  daily_checkout:        { label: 'Daily Check-Out', points: 3, cap_per_day: 1 },
  meeting_logged:        { label: 'Meeting / Visit Logged', points: 2, cap_per_day: 5 },
  expense_submitted:     { label: 'Expense Submitted', points: 2, cap_per_day: 1 },
  weekly_streak:         { label: 'Full Week Consistency Bonus', points: 15, cap_per_day: null },
}

export async function GET() {
  const user = await requireUser()
  if (!await checkPermission(user, 'points_config', 'view')) return forbidden()

  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data } = await supabase
    .from('point_config')
    .select('*')
    .eq('tenant_id', tid)
    .order('action_type')

  // Merge DB rows with defaults for any missing action types
  const result = POINT_ACTIONS.map(action => {
    const row = data?.find(r => r.action_type === action)
    const def = DEFAULT_CONFIG[action]
    return row ?? { action_type: action, tenant_id: tid, is_active: true, ...def }
  })

  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const user = await requireUser()
  if (!await checkPermission(user, 'points_config', 'edit')) return forbidden()

  const supabase = createServerSupabase()
  const tid = getTenantId()
  const updates: { action_type: string; points: number; cap_per_day: number | null; is_active: boolean }[] = await req.json()

  for (const u of updates) {
    if (!POINT_ACTIONS.includes(u.action_type as never)) continue

    // Fetch old values for history
    const { data: old } = await supabase
      .from('point_config')
      .select('points, cap_per_day, is_active, label')
      .eq('tenant_id', tid)
      .eq('action_type', u.action_type)
      .single()

    const label = old?.label ?? DEFAULT_CONFIG[u.action_type]?.label ?? u.action_type

    await supabase.from('point_config').upsert({
      tenant_id: tid,
      action_type: u.action_type,
      label,
      points: u.points,
      cap_per_day: u.cap_per_day,
      is_active: u.is_active,
      updated_at: new Date().toISOString(),
      updated_by_user_id: user.userId,
    }, { onConflict: 'tenant_id,action_type' })

    // Only log if something actually changed
    if (old && (old.points !== u.points || old.cap_per_day !== u.cap_per_day || old.is_active !== u.is_active)) {
      await supabase.from('point_config_history').insert({
        tenant_id: tid,
        action_type: u.action_type,
        label,
        old_points: old.points,
        new_points: u.points,
        old_cap_per_day: old.cap_per_day,
        new_cap_per_day: u.cap_per_day,
        old_is_active: old.is_active,
        new_is_active: u.is_active,
        changed_by_user_id: user.userId,
        changed_by_name: user.name,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
