import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/visibility'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const visibleIds = await getVisibleUserIds(user.userId!, supabase, tid)
  const allowedIds = [user.userId!, ...visibleIds]

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*), users!orders_user_id_fkey(name)')
    .eq('id', params.id)
    .eq('tenant_id', tid)
    .in('user_id', allowedIds)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  return NextResponse.json(order)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const { status } = await req.json() as { status: 'Draft' | 'Submitted' | 'Confirmed' }
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const visibleIds = await getVisibleUserIds(user.userId!, supabase, tid)
  const allowedIds = [user.userId!, ...visibleIds]

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', params.id)
    .eq('tenant_id', tid)
    .in('user_id', allowedIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
