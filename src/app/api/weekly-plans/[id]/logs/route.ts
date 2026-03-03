import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.from('weekly_plan_audit_logs')
    .select('*, users!actor_user_id(name)')
    .eq('weekly_plan_id', params.id)
    .eq('tenant_id', getTenantId())
    .order('timestamp', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
