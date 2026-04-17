import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

export async function GET() {
  const user = await requireUser()
  if (!await checkPermission(user, 'users', 'view')) return forbidden()

  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data, error } = await supabase
    .from('roles')
    .select('id, name, is_system')
    .eq('tenant_id', tid)
    .neq('name', 'Administrator')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
