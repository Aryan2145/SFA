import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.userId) return NextResponse.json({ ...user, hasSubordinates: false })

  const supabase = createServerSupabase()
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('manager_user_id', user.userId)

  return NextResponse.json({ ...user, hasSubordinates: (count ?? 0) > 0 })
}
