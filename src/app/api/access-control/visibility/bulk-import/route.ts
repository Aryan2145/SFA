import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export async function POST() {
  const user = await requireUser()
  if (user.role !== 'Administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServerSupabase()
  const tenantId = getTenantId()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, manager_user_id')
    .eq('tenant_id', tenantId)
    .not('manager_user_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!users?.length) return NextResponse.json({ inserted: 0 })

  const rows = users.map(u => ({
    tenant_id: tenantId,
    viewer_user_id: u.manager_user_id as string,
    target_user_id: u.id,
  }))

  const { error: insertError } = await supabase
    .from('user_visibility')
    .upsert(rows, { onConflict: 'viewer_user_id,target_user_id' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ inserted: rows.length })
}
