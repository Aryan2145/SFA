import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { forbidden } from '@/lib/permissions'

export async function GET() {
  const user = await requireUser()
  if (user.role !== 'Administrator') return forbidden()

  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data, error } = await supabase
    .from('user_audit_logs')
    .select('*')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
