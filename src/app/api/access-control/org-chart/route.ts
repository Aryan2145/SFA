import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServerSupabase()
  const tenantId = getTenantId()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, profile, manager_user_id, designations(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'Active')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map(u => ({
    id: u.id,
    name: u.name,
    role: (u.designations as { name: string } | null)?.name ?? u.profile ?? '',
    manager_user_id: u.manager_user_id ?? null,
  }))

  return NextResponse.json(result)
}
