import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

const UNDO_WINDOW_MS = 15 * 60 * 1000

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('status, submitted_at, user_id')
    .eq('id', params.id)
    .single()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (plan.user_id !== user.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (!['Submitted', 'Resubmitted'].includes(plan.status)) {
    return NextResponse.json({ error: 'Plan is not in a submitted state' }, { status: 400 })
  }
  if (!plan.submitted_at) return NextResponse.json({ error: 'No submission timestamp' }, { status: 400 })

  const elapsed = Date.now() - new Date(plan.submitted_at).getTime()
  if (elapsed > UNDO_WINDOW_MS) {
    return NextResponse.json({ error: 'Undo window has expired (15 minutes)' }, { status: 400 })
  }

  const now = new Date().toISOString()
  await supabase.from('weekly_plans').update({
    status: 'Draft',
    last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'User',
    action_type: 'UndoSubmit',
    previous_status: plan.status, new_status: 'Draft',
    comment: 'Submission undone by user within 15-minute window',
  })

  return NextResponse.json({ ok: true })
}
