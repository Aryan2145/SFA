import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { requireUser } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  await requireUser()

  const form = await req.formData()
  const file = form.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'Only JPG and PNG files are allowed' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Photo must be 5 MB or less' }, { status: 400 })

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const supabase = createServerSupabase()
  const { error } = await supabase.storage
    .from('expense-photos')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('expense-photos').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
