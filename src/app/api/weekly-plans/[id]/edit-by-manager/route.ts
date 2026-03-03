import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const { items, comment } = await req.json()
  const supabase = createServerSupabase()
  const tid = getTenantId()
  const now = new Date().toISOString()

  const { data: plan } = await supabase.from('weekly_plans').select('status').eq('id', params.id).single()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Replace items
  await supabase.from('weekly_plan_items').delete().eq('weekly_plan_id', params.id)
  if (items?.length) {
    await supabase.from('weekly_plan_items').insert(
      items.map((item: Record<string, unknown>) => ({ ...item, weekly_plan_id: params.id, tenant_id: tid }))
    )
  }

  await supabase.from('weekly_plans').update({
    status: 'Edited by Manager', manager_comment: comment || null, last_status_changed_at: now,
  }).eq('id', params.id)

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'Manager',
    action_type: 'EditByManager', previous_status: plan.status, new_status: 'Edited by Manager',
    comment: comment || null, edited_fields: { items: 'manager edited' },
  })

  return NextResponse.json({ ok: true })
}
