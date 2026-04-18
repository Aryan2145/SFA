import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireUser()
  if (!await checkPermission(user, 'lead_temperatures', 'view')) return forbidden()
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('lead_temperatures')
    .select('*')
    .eq('tenant_id', getTenantId())
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!await checkPermission(user, 'lead_temperatures', 'create')) return forbidden()
  const { name, sort_order } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('lead_temperatures')
    .insert({ tenant_id: getTenantId(), name: name.trim(), sort_order: sort_order ?? 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
