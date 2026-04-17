import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

async function requireSuperAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SuperAdmin') return null
  return user
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  if (!await requireSuperAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServerSupabase()

  // Count remaining active admins for this tenant
  const { count: adminCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', params.id)
    .eq('profile', 'Administrator')
    .eq('status', 'Active')

  if ((adminCount ?? 0) <= 1)
    return NextResponse.json(
      { error: 'Cannot revoke the only Administrator. The company must have at least one admin.' },
      { status: 400 }
    )

  // Revoke admin: change profile to Standard, clear role_id (they'll see "define role" page)
  const { error } = await supabase
    .from('users')
    .update({ profile: 'Standard', role_id: null })
    .eq('id', params.userId)
    .eq('tenant_id', params.id)
    .eq('profile', 'Administrator')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
