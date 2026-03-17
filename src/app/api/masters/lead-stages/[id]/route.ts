import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, sort_order, is_active } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const tid = getTenantId()
  const supabase = createServerSupabase()
  // Check if fixed — fixed stages can toggle is_active but not rename/reorder
  const { data: existing } = await supabase
    .from('lead_stages').select('is_fixed').eq('id', params.id).eq('tenant_id', tid).single()
  const update: Record<string, unknown> = { is_active: is_active ?? true }
  if (!existing?.is_fixed) { update.name = name.trim(); update.sort_order = sort_order ?? 0 }
  const supabase2 = createServerSupabase()
  const { data, error } = await supabase2
    .from('lead_stages').update(update).eq('id', params.id).eq('tenant_id', tid).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const tid = getTenantId()
  const supabase = createServerSupabase()
  const { data: stage } = await supabase
    .from('lead_stages').select('is_fixed').eq('id', params.id).eq('tenant_id', tid).single()
  if (stage?.is_fixed) return NextResponse.json({ error: 'Fixed stages cannot be deleted' }, { status: 400 })
  const supabase2 = createServerSupabase()
  const { error } = await supabase2
    .from('lead_stages').update({ is_active: false }).eq('id', params.id).eq('tenant_id', tid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
