import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const [{ data: user }, { data: mapping }] = await Promise.all([
    supabase.from('users').select('id, name, contact').eq('id', params.userId).eq('tenant_id', tid).single(),
    supabase.from('user_territory_mappings').select('state_ids, district_ids, taluka_ids, village_ids').eq('user_id', params.userId).eq('tenant_id', tid).single(),
  ])

  return NextResponse.json({
    user: user ?? null,
    state_ids: mapping?.state_ids ?? [],
    district_ids: mapping?.district_ids ?? [],
    taluka_ids: mapping?.taluka_ids ?? [],
    village_ids: mapping?.village_ids ?? [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const { state_ids, district_ids, taluka_ids, village_ids } = await req.json()
  const supabase = createServerSupabase()
  const tid = getTenantId()

  // Check if a mapping already exists for this user
  const { data: existing } = await supabase
    .from('user_territory_mappings')
    .select('id')
    .eq('user_id', params.userId)
    .eq('tenant_id', tid)
    .maybeSingle()

  let error
  if (existing) {
    // Update existing record
    const res = await supabase
      .from('user_territory_mappings')
      .update({
        state_ids: state_ids ?? [],
        district_ids: district_ids ?? [],
        taluka_ids: taluka_ids ?? [],
        village_ids: village_ids ?? [],
      })
      .eq('id', existing.id)
    error = res.error
  } else {
    // Insert new record
    const res = await supabase
      .from('user_territory_mappings')
      .insert({
        tenant_id: tid,
        user_id: params.userId,
        state_ids: state_ids ?? [],
        district_ids: district_ids ?? [],
        taluka_ids: taluka_ids ?? [],
        village_ids: village_ids ?? [],
      })
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
