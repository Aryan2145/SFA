import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const { comment } = await req.json()
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
    status: 'On Hold', manager_comment: comment || null, last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'Manager',
    action_type: 'Hold', previous_status: plan.status, new_status: 'On Hold', comment: comment || null,
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
      ? `Your weekly plan has been put On Hold. Comment: ${comment}`
      : 'Your weekly plan has been put On Hold.',
  })

  return NextResponse.json({ ok: true })
}
