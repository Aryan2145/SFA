import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Returns a map of date -> boolean (has any visit for that date)
// Query param: month=YYYY-MM (defaults to current month)
// Optionally: userId=X (manager looking at subordinate's calendar)
export async function GET(req: NextRequest) {
  const user = await requireUser()
  const params = req.nextUrl.searchParams
  const monthParam = params.get('month') ?? new Date().toISOString().slice(0, 7)
  const userId = params.get('userId') ?? user.userId

  const [year, month] = monthParam.split('-').map(Number)
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('daily_visits')
    .select('visit_date')
    .eq('tenant_id', getTenantId())
    .eq('user_id', userId)
    .gte('visit_date', from)
    .lte('visit_date', to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduplicate and return as a set of filled dates
  const filledDates = [...new Set((data ?? []).map(r => r.visit_date))]
  return NextResponse.json({ filledDates })
}
