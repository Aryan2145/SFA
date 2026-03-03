import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data: plan } = await supabase.from('weekly_plans').select('status').eq('id', params.id).single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const allowed = ['Draft', 'Rejected', 'Edited by Manager']
  if (!allowed.includes(plan.status)) return NextResponse.json({ error: 'Cannot submit from current status' }, { status: 400 })

  const newStatus = plan.status === 'Draft' ? 'Submitted' : 'Resubmitted'
  const now = new Date().toISOString()

  await supabase.from('weekly_plans').update({
    status: newStatus, submitted_at: now, last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'User',
    action_type: newStatus === 'Submitted' ? 'Submit' : 'Resubmit',
    previous_status: plan.status, new_status: newStatus,
  })

  return NextResponse.json({ ok: true, status: newStatus })
}
