'use client'

import { useState } from 'react'
import CrudPage, { Column } from '@/components/ui/CrudPage'
import Modal from '@/components/ui/Modal'
import { useCrud } from '@/hooks/useCrud'
import { useMe } from '@/hooks/useMe'

const COLS: Column[] = [
  { key: 'name', label: 'Type Name' },
  { key: 'sort_order', label: 'Sort Order', render: r => String(r.sort_order ?? 0) },
]

export default function LeadTypesPage() {
  const crud = useCrud('/api/masters/lead-types')
  const me = useMe()
  const isAdmin = me?.role === 'Administrator'

  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [name, setName]       = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [saving, setSaving]   = useState(false)

  function openAdd() { setName(''); setSortOrder('0'); setEditing(null); setOpen(true) }
  function openEdit(row: Record<string, unknown>) {
    setName(String(row.name ?? ''))
    setSortOrder(String(row.sort_order ?? 0))
    setEditing(row); setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const body = { name: name.trim(), sort_order: Number(sortOrder) || 0 }
    const ok = editing ? await crud.update(editing.id as string, body) : await crud.create(body)
    setSaving(false)
    if (ok !== false && ok !== null) setOpen(false)
  }

  return (
    <>
      <CrudPage
        title="Lead Types" backHref="/masters" columns={COLS}
        rows={crud.rows} allRowsCount={crud.allRows.length}
        isLoading={crud.isLoading} search={crud.search} onSearchChange={crud.setSearch}
        page={crud.page} totalPages={crud.totalPages} onPage={crud.setPage}
        onAdd={isAdmin ? openAdd : undefined}
        onEdit={isAdmin ? openEdit : undefined}
        onToggleActive={isAdmin ? (r, v) => crud.update(r.id as string, { is_active: v }) : undefined}
        onDelete={isAdmin ? r => crud.remove(r.id as string) : undefined}
      />
      <Modal title={editing ? 'Edit Lead Type' : 'Add Lead Type'} isOpen={open} onClose={() => setOpen(false)} onSave={handleSave} isSaving={saving}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type Name <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dealer, Institution…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </Modal>
    </>
  )
}
