'use client'

import { useState, useEffect } from 'react'
import CrudPage, { Column } from '@/components/ui/CrudPage'
import Modal from '@/components/ui/Modal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useCrud } from '@/hooks/useCrud'

const COLS: Column[] = [
  { key: 'name', label: 'Name' },
  { key: 'state', label: 'State', render: r => (r.states as { name: string } | null)?.name ?? '' },
  { key: 'district', label: 'District', render: r => (r.districts as { name: string } | null)?.name ?? '' },
  { key: 'taluka', label: 'Taluka', render: r => (r.talukas as { name: string } | null)?.name ?? '' },
]

type Opt = { value: string; label: string }
type LocItem = { id: string; name: string; state_id?: string; district_id?: string }

export default function DealersPage() {
  const crud = useCrud('/api/masters/dealers')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ name: '', state_id: '', district_id: '', taluka_id: '', village_id: '', distributor_id: '', latitude: '', longitude: '' })
  const [saving, setSaving] = useState(false)
  const [states, setStates] = useState<Opt[]>([])
  const [districts, setDistricts] = useState<LocItem[]>([])
  const [talukas, setTalukas] = useState<LocItem[]>([])
  const [villages, setVillages] = useState<LocItem[]>([])
  const [distributors, setDistributors] = useState<Opt[]>([])

  useEffect(() => {
    fetch('/api/masters/states').then(r => r.json()).then((d: LocItem[]) => setStates(d.map(x => ({ value: x.id, label: x.name }))))
    fetch('/api/masters/districts').then(r => r.json()).then(setDistricts)
    fetch('/api/masters/talukas').then(r => r.json()).then(setTalukas)
    fetch('/api/masters/villages').then(r => r.json()).then(setVillages)
    fetch('/api/masters/distributors').then(r => r.json()).then((d: LocItem[]) => setDistributors(d.map(x => ({ value: x.id, label: x.name }))))
  }, [])

  const filteredDistricts = districts.filter(d => !form.state_id || d.state_id === form.state_id).map(x => ({ value: x.id, label: x.name }))
  const filteredTalukas = talukas.filter(t => !form.district_id || t.district_id === form.district_id).map(x => ({ value: x.id, label: x.name }))
  const filteredVillages = villages.filter(v => !form.taluka_id || (v as { taluka_id?: string }).taluka_id === form.taluka_id).map(x => ({ value: x.id, label: x.name }))

  function openAdd() { setEditing(null); setForm({ name: '', state_id: '', district_id: '', taluka_id: '', village_id: '', distributor_id: '', latitude: '', longitude: '' }); setOpen(true) }
  function openEdit(row: Record<string, unknown>) {
    setEditing(row)
    setForm({ name: String(row.name), state_id: String(row.state_id), district_id: String(row.district_id), taluka_id: String(row.taluka_id), village_id: String(row.village_id ?? ''), distributor_id: String(row.distributor_id ?? ''), latitude: String(row.latitude ?? ''), longitude: String(row.longitude ?? '') })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.state_id || !form.district_id || !form.taluka_id) return
    setSaving(true)
    const body = { name: form.name.trim(), state_id: form.state_id, district_id: form.district_id, taluka_id: form.taluka_id, village_id: form.village_id || null, distributor_id: form.distributor_id || null, latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null }
    const ok = editing ? await crud.update(editing.id as string, body) : await crud.create(body)
    setSaving(false)
    if (ok !== false && ok !== null) setOpen(false)
  }

  const setF = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <CrudPage title="Dealers" backHref="/masters" columns={COLS} rows={crud.rows} allRowsCount={crud.allRows.length}
        isLoading={crud.isLoading} search={crud.search} onSearchChange={crud.setSearch}
        page={crud.page} totalPages={crud.totalPages} onPage={crud.setPage}
        onAdd={openAdd} onEdit={openEdit} onToggleActive={(r, v) => crud.update(r.id as string, { is_active: v })}
        onDelete={r => crud.remove(r.id as string)} />
      <Modal title={editing ? 'Edit Dealer' : 'Add Dealer'} isOpen={open} onClose={() => setOpen(false)} onSave={handleSave} isSaving={saving} size="lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dealer Name <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={e => setF('name')(e.target.value)} placeholder="Dealer name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
            <SearchableSelect value={form.state_id} onChange={v => setForm(f => ({ ...f, state_id: v, district_id: '', taluka_id: '', village_id: '' }))} options={states} placeholder="State…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District <span className="text-red-500">*</span></label>
            <SearchableSelect value={form.district_id} onChange={v => setForm(f => ({ ...f, district_id: v, taluka_id: '', village_id: '' }))} options={filteredDistricts} placeholder="District…" disabled={!form.state_id} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taluka <span className="text-red-500">*</span></label>
            <SearchableSelect value={form.taluka_id} onChange={v => setForm(f => ({ ...f, taluka_id: v, village_id: '' }))} options={filteredTalukas} placeholder="Taluka…" disabled={!form.district_id} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
            <SearchableSelect value={form.village_id} onChange={setF('village_id')} options={filteredVillages} placeholder="Village…" disabled={!form.taluka_id} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Distributor</label>
          <SearchableSelect value={form.distributor_id} onChange={setF('distributor_id')} options={distributors} placeholder="Optional…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input type="number" step="0.0000001" value={form.latitude} onChange={e => setF('latitude')(e.target.value)} placeholder="-90 to 90" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input type="number" step="0.0000001" value={form.longitude} onChange={e => setF('longitude')(e.target.value)} placeholder="-180 to 180" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </Modal>
    </>
  )
}
