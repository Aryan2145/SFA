import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json({ error: 'User not in DB' }, { status: 400 })

  const { week_start_date, week_end_date, items, day_notes } = await req.json()
  if (!week_start_date) return NextResponse.json({ error: 'week_start_date required' }, { status: 400 })

  const supabase = createServerSupabase()
  const tid = getTenantId()

  // Look up manager
  const { data: dbUser } = await supabase.from('users').select('manager_user_id').eq('id', user.userId).single()

  const { data: plan, error: planErr } = await supabase.from('weekly_plans').insert({
    tenant_id: tid, user_id: user.userId,
    week_start_date, week_end_date,
    status: 'Draft',
    current_manager_id: dbUser?.manager_user_id ?? null,
    last_status_changed_at: new Date().toISOString(),
    day_notes: day_notes ?? {},
  }).select().single()

  if (planErr) return NextResponse.json({ error: planErr.message }, { status: 500 })

  if (items?.length) {
    await supabase.from('weekly_plan_items').insert(
      items.map((item: Record<string, unknown>) => ({ ...item, weekly_plan_id: plan.id, tenant_id: tid }))
    )
  }

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: plan.id,
    actor_user_id: user.userId, actor_role: 'User',
    action_type: 'Create', new_status: 'Draft',
  })

  return NextResponse.json(plan, { status: 201 })
}
