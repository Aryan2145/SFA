import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Lightweight endpoint for meeting modal entity lookup
// GET /api/business-partners?type=Dealer&status=existing|lead
export async function GET(req: NextRequest) {
  await requireUser()
  const type   = req.nextUrl.searchParams.get('type') ?? ''
  const status = req.nextUrl.searchParams.get('status') ?? 'existing'
  const supabase = createServerSupabase()

  let query = supabase
    .from('business_partners')
    .select('id, name')
    .eq('tenant_id', getTenantId())
    .eq('is_active', true)
    .order('name')

  if (type) query = query.eq('type', type)
  if (status === 'lead') {
    query = query.neq('stage', 'Existing')
  } else {
    query = query.eq('stage', 'Existing')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
