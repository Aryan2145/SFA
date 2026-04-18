import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'
import { requireUser } from '@/lib/auth'
import { checkPermission, forbidden } from '@/lib/permissions'

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!await checkPermission(user, 'leads', 'edit')) return forbidden()
  const body = await req.json()
  // Prevent tenant change
  delete body.tenant_id
  if (body.mobile_1 && !/^\d{10}$/.test(String(body.mobile_1).trim()))
    return NextResponse.json({ error: 'Mobile Number 1 must be exactly 10 digits' }, { status: 400 })
  if (body.mobile_2 && !/^\d{10}$/.test(String(body.mobile_2).trim()))
    return NextResponse.json({ error: 'Mobile Number 2 must be exactly 10 digits' }, { status: 400 })
  if (body.gst_number && !GSTIN_RE.test(String(body.gst_number).trim().toUpperCase()))
    return NextResponse.json({ error: 'Please enter a valid GST Number' }, { status: 400 })
  if (body.gst_number) body.gst_number = String(body.gst_number).trim().toUpperCase()
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('business_partners')
    .update(body)
    .eq('id', params.id)
    .eq('tenant_id', getTenantId())
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!await checkPermission(user, 'leads', 'delete')) return forbidden()
  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('business_partners')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', getTenantId())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
