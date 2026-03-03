import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireUser()
  if (!user.userId) return NextResponse.json([])
  const supabase = createServerSupabase()
  const tid = getTenantId()

  const { data: mapping } = await supabase
    .from('user_territory_mappings')
    .select('state_ids, district_ids, taluka_ids, village_ids')
    .eq('tenant_id', tid)
    .eq('user_id', user.userId)
    .single()

  if (!mapping) return NextResponse.json([])

  const stateSet = new Set<string>(mapping.state_ids ?? [])
  const dIds: string[] = mapping.district_ids ?? []
  const tIds: string[] = mapping.taluka_ids ?? []
  const vIds: string[] = mapping.village_ids ?? []

  const [{ data: districts }, { data: talukas }, { data: villages }] = await Promise.all([
    dIds.length > 0 ? supabase.from('districts').select('id, name, state_id').in('id', dIds) : Promise.resolve({ data: [] }),
    tIds.length > 0 ? supabase.from('talukas').select('id, name, district_id').in('id', tIds) : Promise.resolve({ data: [] }),
    vIds.length > 0 ? supabase.from('villages').select('id, name, taluka_id').in('id', vIds) : Promise.resolve({ data: [] }),
  ])

  const activeDistricts = (districts ?? []).filter(d => stateSet.has(d.state_id))
  const activeDistrictSet = new Set(activeDistricts.map(d => d.id))
  const activeTalukas = (talukas ?? []).filter(t => activeDistrictSet.has(t.district_id))
  const activeTalukaSet = new Set(activeTalukas.map(t => t.id))
  const activeVillages = (villages ?? []).filter(v => activeTalukaSet.has(v.taluka_id))

  const places = [
    ...activeDistricts.map(d => ({ id: `district:${d.id}`, label: `District: ${d.name}`, type: 'District', name: d.name })),
    ...activeTalukas.map(t => ({ id: `taluka:${t.id}`, label: `Taluka: ${t.name}`, type: 'Taluka', name: t.name })),
    ...activeVillages.map(v => ({ id: `village:${v.id}`, label: `Village: ${v.name}`, type: 'Village', name: v.name })),
  ].sort((a, b) => a.label.localeCompare(b.label))

  return NextResponse.json(places)
}
