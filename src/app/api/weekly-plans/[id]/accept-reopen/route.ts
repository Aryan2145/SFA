import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { canView } from '@/lib/visibility'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('status, user_id, reopen_requested')
    .eq('id', params.id)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (!plan.reopen_requested) return NextResponse.json({ error: 'No reopen request pending' }, { status: 400 })

  const authorized = await canView(user.userId!, plan.user_id, supabase, tid)
  if (!authorized) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const now = new Date().toISOString()
  await supabase.from('weekly_plans').update({
    status: 'Draft',
    reopen_requested: false,
    reopen_request_message: null,
    last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'Manager',
    action_type: 'AcceptReopen',
    previous_status: plan.status, new_status: 'Draft',
    comment: 'Reopen request accepted by manager',
  })

  try {
    await supabase.from('notifications').insert({
      tenant_id: tid,
      recipient_id: plan.user_id,
      actor_id: user.userId,
      section: 'weekly_plan',
      context_type: 'weekly_plan',
      context_id: params.id,
      redirect_path: '/weekly-plan',
      message: 'Your reopen request was accepted. You can now edit your weekly plan.',
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
