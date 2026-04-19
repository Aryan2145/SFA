import { NextResponse } from 'next/server'
import { createServerSupabase } from './supabase-server'
import { getTenantId } from './tenant'
import { SessionUser } from './auth'

// Master sections — data_scope not used (always tenant-wide)
export type MasterSection =
  | 'states' | 'districts' | 'talukas' | 'villages' | 'territory_mapping'
  | 'dealers' | 'distributors' | 'institutions'
  | 'product_categories' | 'product_subcategories' | 'products'
  | 'departments' | 'designations' | 'expense_categories'
  | 'lead_types' | 'lead_stages' | 'lead_temperatures'

// Operations sections — data_scope applies (own / team / all)
export type OperationSection = 'meetings' | 'expenses' | 'weekly_plan' | 'orders' | 'leads' | 'users'

// Points sections
export type PointsSection = 'leaderboard' | 'points_config'

export type PermSection = MasterSection | OperationSection | PointsSection
export type PermAction = 'view' | 'create' | 'edit' | 'delete'
export type DataScope = 'own' | 'team' | 'all'

const MASTER_SECTIONS: ReadonlySet<string> = new Set<MasterSection>([
  'states', 'districts', 'talukas', 'villages', 'territory_mapping',
  'dealers', 'distributors', 'institutions',
  'product_categories', 'product_subcategories', 'products',
  'departments', 'designations', 'expense_categories',
  'lead_types', 'lead_stages', 'lead_temperatures',
])

export async function checkPermission(
  user: SessionUser,
  section: PermSection,
  action: PermAction
): Promise<boolean> {
  if (user.role === 'Administrator') return true
  if (user.role === 'Deactivated' || user.role === 'NoRole') return false
  const supabase = createServerSupabase()
  const tid = getTenantId()
  const { data } = await supabase
    .from('role_permissions')
    .select('can_view,can_create,can_edit,can_delete')
    .eq('tenant_id', tid)
    .eq('profile', user.role)
    .eq('section', section)
    .maybeSingle()
  if (!data) return false
  switch (action) {
    case 'view':   return data.can_view
    case 'create': return data.can_create ?? data.can_edit
    case 'edit':   return data.can_edit
    case 'delete': return data.can_delete
  }
}

export async function getDataScope(
  user: SessionUser,
  section: PermSection
): Promise<DataScope> {
  if (user.role === 'Administrator') return 'all'
  // Master sections are always tenant-wide
  if (MASTER_SECTIONS.has(section)) return 'all'
  if (user.role === 'NoRole') return 'own'
  const supabase = createServerSupabase()
  const tid = getTenantId()
  const { data } = await supabase
    .from('role_permissions')
    .select('data_scope')
    .eq('tenant_id', tid)
    .eq('profile', user.role)
    .eq('section', section)
    .maybeSingle()
  const scope = data?.data_scope as DataScope | undefined
  return scope ?? 'own'
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
