import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const { items, day_notes } = await req.json()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  // Update day notes on the plan
  if (day_notes !== undefined) {
    await supabase.from('weekly_plans').update({ day_notes }).eq('id', params.id)
  }

  // Replace all items
  await supabase.from('weekly_plan_items').delete().eq('weekly_plan_id', params.id)
  if (items?.length) {
    await supabase.from('weekly_plan_items').insert(
      items.map((item: Record<string, unknown>) => ({ ...item, weekly_plan_id: params.id, tenant_id: tid }))
    )
  }

  await supabase.from('weekly_plan_audit_logs').insert({
    tenant_id: tid, weekly_plan_id: params.id,
    actor_user_id: user.userId, actor_role: 'User',
    action_type: 'Update', edited_fields: { items: 'updated' },
  })

  const { data } = await supabase.from('weekly_plans')
    .select('*, weekly_plan_items(*)').eq('id', params.id).single()
  return NextResponse.json(data)
}
