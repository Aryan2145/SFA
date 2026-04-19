import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

export async function GET() {
  const user = await requireUser()
  if (!await checkPermission(user, 'points_config', 'view')) return forbidden()

  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('tenant_point_settings')
    .select('*')
    .eq('tenant_id', getTenantId())
    .single()

  return NextResponse.json(data ?? { reset_period: 'monthly' })
}

export async function PUT(req: NextRequest) {
  const user = await requireUser()
  if (!await checkPermission(user, 'points_config', 'edit')) return forbidden()

  const { reset_period } = await req.json()
  if (!['monthly', 'quarterly', 'never'].includes(reset_period))
    return NextResponse.json({ error: 'Invalid reset_period' }, { status: 400 })

  const supabase = createServerSupabase()
  const tid = getTenantId()

  await supabase.from('tenant_point_settings').upsert({
    tenant_id: tid,
    reset_period,
    updated_at: new Date().toISOString(),
    updated_by_user_id: user.userId,
  }, { onConflict: 'tenant_id' })

  return NextResponse.json({ ok: true })
}
