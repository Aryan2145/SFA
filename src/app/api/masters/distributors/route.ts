import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export async function GET(req: NextRequest) {
  const user = await requireUser()
  if (!await checkPermission(user, 'business', 'view')) return forbidden()
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const supabase = createServerSupabase()
  const tid = getTenantId()

  let query = supabase
    .from('business_partners')
    .select('*, states(name), districts(name), talukas(name), villages(name)')
    .eq('tenant_id', tid)
    .eq('type', 'Distributor')
    .order('name')
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: distributors, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const distIds = (distributors ?? []).map(d => d.id as string)
  const dealersByDist = new Map<string, { id: string; name: string }[]>()
  if (distIds.length > 0) {
    const { data: dealers } = await supabase
      .from('business_partners')
      .select('id, name, distributor_id')
      .eq('tenant_id', tid)
      .eq('type', 'Dealer')
      .in('distributor_id', distIds)
    for (const d of dealers ?? []) {
      const key = d.distributor_id as string
      if (!dealersByDist.has(key)) dealersByDist.set(key, [])
      dealersByDist.get(key)!.push({ id: d.id as string, name: d.name as string })
    }
  }

  const result = (distributors ?? []).map(d => ({
    ...d,
    dealers: dealersByDist.get(d.id as string) ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await requireUser()
  if (!await checkPermission(user, 'business', 'edit')) return forbidden()
  const {
    name, contact_person_name, pincode, gst_number,
    mobile_1, mobile_2, address, description,
    state_id, district_id, taluka_id, village_id, latitude, longitude,
  } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Account Name is required' }, { status: 400 })
  if (mobile_1 && !/^\d{10}$/.test(String(mobile_1).trim()))
    return NextResponse.json({ error: 'Mobile Number 1 must be exactly 10 digits' }, { status: 400 })
  if (mobile_2 && !/^\d{10}$/.test(String(mobile_2).trim()))
    return NextResponse.json({ error: 'Mobile Number 2 must be exactly 10 digits' }, { status: 400 })
  if (pincode && !/^\d{6}$/.test(String(pincode).trim()))
    return NextResponse.json({ error: 'Pin Code must be exactly 6 digits' }, { status: 400 })
  if (gst_number && !GSTIN_RE.test(String(gst_number).trim().toUpperCase()))
    return NextResponse.json({ error: 'Please enter a valid GST Number' }, { status: 400 })
  if (latitude != null && (isNaN(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90))
    return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 })
  if (longitude != null && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180))
    return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 })
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('business_partners')
    .insert({
      type: 'Distributor',
      name: name.trim(),
      contact_person_name: contact_person_name?.trim() || null,
      pincode: pincode?.trim() || null,
      gst_number: gst_number?.trim().toUpperCase() || null,
      mobile_1: mobile_1?.trim() || null,
      mobile_2: mobile_2?.trim() || null,
      address: address || null,
      description: description || null,
      state_id: state_id || null,
      district_id: district_id || null,
      taluka_id: taluka_id || null,
      village_id: village_id || null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      tenant_id: getTenantId(),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
