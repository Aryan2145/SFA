import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

const ALL_SECTIONS = [
  'states', 'districts', 'talukas', 'villages', 'territory_mapping',
  'dealers', 'distributors', 'institutions',
  'product_categories', 'product_subcategories', 'products',
  'departments', 'designations', 'expense_categories',
  'lead_types', 'lead_stages', 'lead_temperatures',
  'meetings', 'expenses', 'weekly_plan', 'orders', 'leads', 'users',
]

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = req.nextUrl.searchParams.get('profile') ?? ''
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data, error } = await supabase
    .from('role_permissions')
    .select('section, can_view, can_create, can_edit, can_delete, data_scope')
    .eq('tenant_id', tid)
    .eq('profile', profile)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; data_scope: string }> = {}
  for (const s of ALL_SECTIONS) {
    const row = (data ?? []).find(r => r.section === s)
    result[s] = row
      ? { view: row.can_view, create: row.can_create ?? false, edit: row.can_edit, delete: row.can_delete, data_scope: row.data_scope ?? 'own' }
      : { view: false, create: false, edit: false, delete: false, data_scope: 'own' }
  }

  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { profile, section, can_view, can_create, can_edit, can_delete, data_scope } = await req.json()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { error } = await supabase.from('role_permissions').upsert(
    { tenant_id: tid, profile, section, can_view, can_create: can_create ?? false, can_edit, can_delete, data_scope: data_scope ?? 'own' },
    { onConflict: 'tenant_id,profile,section' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
