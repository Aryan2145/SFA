import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

export async function GET() {
  const user = await requireUser()
  if (!await checkPermission(user, 'points_config', 'view')) return forbidden()

  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('point_config_history')
    .select('*')
    .eq('tenant_id', getTenantId())
    .order('changed_at', { ascending: false })
    .limit(200)

  return NextResponse.json(data ?? [])
}
