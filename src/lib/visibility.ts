import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns IDs of all users that `viewerUserId` is configured to see.
 * Does NOT include viewerUserId itself (callers add that if needed).
 */
export async function getVisibleUserIds(
  viewerUserId: string,
  supabase: SupabaseClient,
  tenantId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('user_visibility')
    .select('target_user_id')
    .eq('viewer_user_id', viewerUserId)
    .eq('tenant_id', tenantId)
  return (data ?? []).map(r => r.target_user_id)
}

/**
 * Returns true if `viewerUserId` can see `targetUserId`.
 */
export async function canView(
  viewerUserId: string,
  targetUserId: string,
  supabase: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('user_visibility')
    .select('id', { count: 'exact', head: true })
    .eq('viewer_user_id', viewerUserId)
    .eq('target_user_id', targetUserId)
    .eq('tenant_id', tenantId)
  return (count ?? 0) > 0
}
