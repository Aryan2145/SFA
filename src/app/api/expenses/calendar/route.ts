import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Returns dates in a month that have at least one expense entry
// Query params: month=YYYY-MM, userId=X (optional, defaults to current user)
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
    .from('expenses')
    .select('expense_date')
    .eq('tenant_id', getTenantId())
    .eq('user_id', userId)
    .gte('expense_date', from)
    .lte('expense_date', to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filledDates = [...new Set((data ?? []).map(r => r.expense_date))]
  return NextResponse.json({ filledDates })
}
