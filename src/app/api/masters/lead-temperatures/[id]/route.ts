import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, sort_order, is_active } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('lead_temperatures')
    .update({ name: name.trim(), sort_order: sort_order ?? 0, is_active: is_active ?? true })
    .eq('id', params.id)
    .eq('tenant_id', getTenantId())
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('lead_temperatures')
    .update({ is_active: false })
    .eq('id', params.id)
    .eq('tenant_id', getTenantId())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
