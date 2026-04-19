import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { canView } from '@/lib/visibility'
import { awardPoint } from '@/lib/points'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const body = await req.json().catch(() => ({}))
  const comment: string | undefined = body.comment?.trim() || undefined
  const supabase = createServerSupabase()
  const tid = getTenantId()
  const now = new Date().toISOString()

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('status, user_id')
    .eq('id', params.id)
    .single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const authorized = await canView(user.userId!, plan.user_id, supabase, tid)
  if (!authorized) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  await supabase.from('weekly_plans').update({
    status: 'Approved',
    last_status_changed_at: now,
    ...(comment ? { manager_comment: comment } : {}),
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'Manager',
    action_type: 'Approve', previous_status: plan.status, new_status: 'Approved',
    comment: comment ?? null,
  })

  // Notify plan owner
  await supabase.from('notifications').insert({
    tenant_id: tid,
    recipient_id: plan.user_id,
    actor_id: user.userId,
    section: 'weekly_plan',
    context_type: 'weekly_plan',
    context_id: params.id,
    redirect_path: '/weekly-plan',
    message: comment
      ? `Your weekly plan has been Approved. Comment: ${comment}`
      : 'Your weekly plan has been Approved.',
  })

  // Award points to plan owner for getting approved
  if (plan.user_id) {
    void awardPoint(supabase, tid, plan.user_id, 'weekly_plan_approved', {
      refType: 'weekly_plan', refId: params.id,
      description: 'Weekly plan approved by manager',
    })
  }

  return NextResponse.json({ ok: true })
}
