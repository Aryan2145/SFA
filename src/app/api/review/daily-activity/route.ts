import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { canView } from '@/lib/visibility'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const manager = await requireUser()
  const userId = req.nextUrl.searchParams.get('userId')
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const supabase = createServerSupabase()
  const tenantId = getTenantId()

  const allowed = await canView(manager.userId!, userId, supabase, tenantId)
  if (!allowed) return NextResponse.json({ error: 'Not authorized to view this user' }, { status: 403 })

  const { data, error } = await supabase
    .from('daily_visits')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('visit_date', date)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
