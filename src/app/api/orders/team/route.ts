import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { getVisibleUserIds } from '@/lib/visibility'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireUser()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const visibleIds = await getVisibleUserIds(user.userId!, supabase, tid)
  const allowedIds = [user.userId!, ...visibleIds]

  // Return current user + their visible users
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('tenant_id', tid)
    .in('id', allowedIds)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
