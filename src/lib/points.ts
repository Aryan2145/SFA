import { SupabaseClient } from '@supabase/supabase-js'

export const POINT_ACTIONS = [
  'weekly_plan_submitted',
  'weekly_plan_approved',
  'daily_checkin',
  'daily_checkout',
  'meeting_logged',
  'expense_submitted',
  'weekly_streak',
] as const

export type PointActionType = typeof POINT_ACTIONS[number]

export async function awardPoint(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  actionType: string,
  opts?: { refType?: string; refId?: string; description?: string }
) {
  const { data: config } = await supabase
    .from('point_config')
    .select('points, cap_per_day, is_active')
    .eq('tenant_id', tenantId)
    .eq('action_type', actionType)
    .single()

  if (!config || !config.is_active || config.points <= 0) return 0

  if (config.cap_per_day !== null) {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('point_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('earned_at', `${today}T00:00:00.000Z`)
      .lte('earned_at', `${today}T23:59:59.999Z`)

    if ((count ?? 0) >= config.cap_per_day) return 0
  }

  await supabase.from('point_events').insert({
    tenant_id: tenantId,
    user_id: userId,
    action_type: actionType,
    points: config.points,
    ref_type: opts?.refType ?? null,
    ref_id: opts?.refId ?? null,
    description: opts?.description ?? null,
  })

  return config.points
}
