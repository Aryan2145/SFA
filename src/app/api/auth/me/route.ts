import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase-server'
import { getTenantId } from '@/lib/tenant'

type SectionPerm = { view: boolean; edit: boolean; delete: boolean }
type Permissions = Record<string, SectionPerm>

const ALL_SECTIONS = [
  // Locations
  'states', 'districts', 'talukas', 'villages', 'territory_mapping',
  // Business
  'dealers', 'distributors', 'institutions',
  // Products
  'product_categories', 'product_subcategories', 'products',
  // Organisation
  'departments', 'designations', 'expense_categories',
  // Lead config
  'lead_types', 'lead_stages', 'lead_temperatures',
  // Operations
  'meetings', 'expenses', 'weekly_plan', 'orders', 'leads', 'users',
] as const

const allTrue: Permissions = ALL_SECTIONS.reduce(
  (acc, s) => ({ ...acc, [s]: { view: true, edit: true, delete: true } }),
  {} as Permissions
)
const allFalse: Permissions = ALL_SECTIONS.reduce(
  (acc, s) => ({ ...acc, [s]: { view: false, edit: false, delete: false } }),
  {} as Permissions
)

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabase()
  const tid = getTenantId()

  // Invalidate session if credentials have changed since login
  if (user.userId && user.cv !== undefined) {
    const { data: dbUser } = await supabase
      .from('users').select('credentials_version').eq('id', user.userId).single()
    if (dbUser && (dbUser.credentials_version ?? 1) !== user.cv) {
      return NextResponse.json({ error: 'Credentials changed' }, { status: 401 })
    }
  }

  const { data: tenant } = await supabase
    .from('tenants').select('name').eq('id', tid).single()
  const tenantName: string = tenant?.name ?? ''

  if (user.role === 'Administrator') {
    if (!user.userId) return NextResponse.json({ ...user, tenantName, hasSubordinates: false, permissions: allTrue })
    const { count } = await supabase
      .from('user_visibility').select('id', { count: 'exact', head: true }).eq('viewer_user_id', user.userId)
    return NextResponse.json({ ...user, tenantName, hasSubordinates: (count ?? 0) > 0, permissions: allTrue })
  }

  if (user.role === 'NoRole' || user.role === 'Deactivated') {
    return NextResponse.json({ ...user, tenantName, hasSubordinates: false, permissions: allFalse })
  }

  // Role-based user — fetch permissions + subordinate count
  const [visResult, permResult] = await Promise.all([
    user.userId
      ? supabase.from('user_visibility').select('id', { count: 'exact', head: true }).eq('viewer_user_id', user.userId)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('role_permissions')
      .select('section, can_view, can_create, can_edit, can_delete')
      .eq('tenant_id', tid)
      .eq('profile', user.role),
  ])

  const permissions: Permissions = { ...allFalse }
  for (const row of (permResult as { data: { section: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[] | null }).data ?? []) {
    if ((ALL_SECTIONS as readonly string[]).includes(row.section)) {
      permissions[row.section] = {
        view: row.can_view,
        edit: row.can_edit || row.can_create,
        delete: row.can_delete,
      }
    }
  }

  return NextResponse.json({
    ...user,
    tenantName,
    hasSubordinates: ((visResult as { count: number | null }).count ?? 0) > 0,
    permissions,
  })
}
