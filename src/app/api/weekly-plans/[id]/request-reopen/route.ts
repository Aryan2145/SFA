import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const body = await req.json().catch(() => ({}))
  const message: string = body.message?.trim() ?? ''

  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('status, user_id, reopen_requested')
    .eq('id', params.id)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (plan.user_id !== user.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (plan.reopen_requested) return NextResponse.json({ error: 'Reopen already requested' }, { status: 400 })

  const editableStatuses = ['Draft', 'Rejected', 'Edited by Manager']
  if (editableStatuses.includes(plan.status)) {
    return NextResponse.json({ error: 'Plan is already editable' }, { status: 400 })
  }

  const now = new Date().toISOString()
  await supabase.from('weekly_plans').update({
    reopen_requested: true,
    reopen_request_message: message,
    last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'User',
    action_type: 'RequestReopen',
    previous_status: plan.status, new_status: plan.status,
    comment: message,
  })

  // Notify manager
  const { data: me } = await supabase.from('users').select('manager_user_id').eq('id', user.userId).single()
  if (me?.manager_user_id) {
    try {
      await supabase.from('notifications').insert({
        tenant_id: tid,
        recipient_id: me.manager_user_id,
        actor_id: user.userId,
        section: 'weekly_plan',
        context_type: 'weekly_plan',
        context_id: params.id,
        redirect_path: `/review/${user.userId}?tab=plans`,
        message: `${user.name} requested to reopen their weekly plan: "${message}"`,
      })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ ok: true })
}
