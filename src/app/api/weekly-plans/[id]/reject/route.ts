import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const { comment } = await req.json()
  if (!comment?.trim()) return NextResponse.json({ error: 'Comment is required for rejection' }, { status: 400 })
  const supabase = createServerSupabase()
  const tid = getTenantId()
  const now = new Date().toISOString()

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('status, user_id')
    .eq('id', params.id)
    .single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  await supabase.from('weekly_plans').update({
    status: 'Rejected', manager_comment: comment, last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'Manager',
    action_type: 'Reject', previous_status: plan.status, new_status: 'Rejected', comment,
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
    message: `Your weekly plan has been Rejected. Comment: ${comment}`,
  })

  return NextResponse.json({ ok: true })
}
