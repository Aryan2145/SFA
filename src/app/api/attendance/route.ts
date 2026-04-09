import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json(null)

  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const supabase = createServerSupabase()

  const { data } = await supabase
    .from('attendance')
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('user_id', user.userId)
    .eq('date', date)
    .single()

  return NextResponse.json(data ?? null)
}
