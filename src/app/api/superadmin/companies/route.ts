import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

async function requireSuperAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SuperAdmin') return null
  return user
}

export async function GET() {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServerSupabase()

  // Get all tenants
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get user counts per tenant
  const { data: userCounts } = await supabase
    .from('users')
    .select('tenant_id')
  const countMap = new Map<string, number>()
  for (const u of userCounts ?? []) {
    countMap.set(u.tenant_id, (countMap.get(u.tenant_id) ?? 0) + 1)
  }

  const result = (tenants ?? []).map(t => ({
    ...t,
    user_count: countMap.get(t.id) ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const {
    name, email, phone, address, gstin,
    license_count, payment_due_date,
    adminName, adminEmail, adminPhone, adminPassword,
  } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  if (!adminName?.trim()) return NextResponse.json({ error: 'Admin name is required' }, { status: 400 })
  if (!adminPhone?.trim()) return NextResponse.json({ error: 'Admin phone is required' }, { status: 400 })
  if (!adminPassword?.trim()) return NextResponse.json({ error: 'Admin password is required' }, { status: 400 })

  const supabase = createServerSupabase()

  // Check admin phone is not already in use
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('contact', adminPhone.trim())
    .maybeSingle()
  if (existingUser) {
    return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 400 })
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      gstin: gstin?.trim() || null,
      license_count: license_count ? Number(license_count) : 10,
      payment_due_date: payment_due_date || null,
    })
    .select()
    .single()
  if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 500 })

  const tid = tenant.id

  // Auto-create 3 default levels
  const { data: levels, error: levelsError } = await supabase
    .from('levels')
    .insert([
      { tenant_id: tid, level_no: 1, name: 'L1 - Admin' },
      { tenant_id: tid, level_no: 2, name: 'L2 - Manager' },
      { tenant_id: tid, level_no: 3, name: 'L3 - Executive' },
    ])
    .select()
  if (levelsError) {
    // Rollback tenant
    await supabase.from('tenants').delete().eq('id', tid)
    return NextResponse.json({ error: levelsError.message }, { status: 500 })
  }

  const l1 = levels?.find(l => l.level_no === 1)
  if (!l1) return NextResponse.json({ error: 'Failed to create default levels' }, { status: 500 })

  // Create admin user
  const { data: adminUser, error: userError } = await supabase
    .from('users')
    .insert({
      tenant_id: tid,
      name: adminName.trim(),
      email: adminEmail?.trim() || `admin@${name.trim().toLowerCase().replace(/\s+/g, '')}.local`,
      contact: adminPhone.trim(),
      password: adminPassword.trim(),
      profile: 'Administrator',
      level_id: l1.id,
      status: 'Active',
    })
    .select()
    .single()
  if (userError) {
    // Rollback
    await supabase.from('levels').delete().eq('tenant_id', tid)
    await supabase.from('tenants').delete().eq('id', tid)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ tenant, user: adminUser }, { status: 201 })
}
