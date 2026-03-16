'use client'

import { useState, useEffect, useMemo } from 'react'
import CrudPage, { Column } from '@/components/ui/CrudPage'
import Modal from '@/components/ui/Modal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { useCrud } from '@/hooks/useCrud'
import { useMe } from '@/hooks/useMe'

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

const COLS: Column[] = [
  { key: 'name', label: 'Account Name' },
  { key: 'sub_type', label: 'Category', render: r => {
    const v = r.sub_type as string | null
    if (!v) return <span className="text-gray-400">—</span>
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${v === 'Institution' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
        {v}
      </span>
    )
  }},
  { key: 'mobile_1', label: 'Mobile', render: r => String(r.mobile_1 ?? '—') },
  { key: 'place', label: 'Place', render: r => {
    const dist = (r.districts as { name: string } | null)?.name
    const talu = (r.talukas as { name: string } | null)?.name
    const vill = (r.villages as { name: string } | null)?.name
    if (!dist) return <span className="text-gray-400">—</span>
    return <span>{[`District: ${dist}`, talu && `Taluka: ${talu}`, vill && `Village: ${vill}`].filter(Boolean).join(', ')}</span>
  }},
]

type Opt = { value: string; label: string }
type DistrictItem = { id: string; name: string; state_id: string }
type TalukaItem = { id: string; name: string; district_id: string }
type VillageItem = { id: string; name: string; taluka_id: string }
type PlaceResolved = { state_id: string; district_id: string; taluka_id: string; village_id: string | null }

export default function InstitutionsPage() {
  const crud = useCrud('/api/masters/institutions')
  const me = useMe()
  const isAdmin = me?.role === 'Administrator'
  const canEdit = isAdmin || (me?.permissions?.business?.edit ?? false)
  const canDelete = isAdmin || (me?.permissions?.business?.delete ?? false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState({ name: '', sub_type: 'Institution', contact_person_name: '', pincode: '', gst_number: '', mobile_1: '', mobile_2: '', address: '', description: '', place: '', state_id: '', district_id: '', taluka_id: '', village_id: '', latitude: '', longitude: '' })
  const [showMobile2, setShowMobile2] = useState(false)
  const [mobile1Error, setMobile1Error] = useState('')
  const [mobile2Error, setMobile2Error] = useState('')
  const [gstError, setGstError] = useState('')
  const [saving, setSaving] = useState(false)

  const [districts, setDistricts] = useState<DistrictItem[]>([])
  const [talukas, setTalukas] = useState<TalukaItem[]>([])
  const [villages, setVillages] = useState<VillageItem[]>([])

  useEffect(() => {
    fetch('/api/masters/districts').then(r => r.json()).then(setDistricts)
    fetch('/api/masters/talukas').then(r => r.json()).then(setTalukas)
    fetch('/api/masters/villages').then(r => r.json()).then(setVillages)
  }, [])

  const { placeOptions, placeMap } = useMemo(() => {
    const distMap = new Map(districts.map(d => [d.id, d]))
    const taluMap = new Map(talukas.map(t => [t.id, t]))
    const placeMap = new Map<string, PlaceResolved>()
    const opts: Opt[] = []
    for (const t of talukas) {
      const dist = distMap.get(t.district_id)
      if (!dist) continue
      const val = `t:${t.id}`
      opts.push({ value: val, label: `District: ${dist.name}, Taluka: ${t.name}` })
      placeMap.set(val, { state_id: dist.state_id, district_id: t.district_id, taluka_id: t.id, village_id: null })
    }
    for (const v of villages) {
      const talu = taluMap.get(v.taluka_id)
      const dist = talu ? distMap.get(talu.district_id) : undefined
      if (!talu || !dist) continue
      const val = `v:${v.id}`
      opts.push({ value: val, label: `District: ${dist.name}, Taluka: ${talu.name}, Village: ${v.name}` })
      placeMap.set(val, { state_id: dist.state_id, district_id: talu.district_id, taluka_id: v.taluka_id, village_id: v.id })
    }
    return { placeOptions: opts, placeMap }
  }, [districts, talukas, villages])

  function openAdd() {
    setEditing(null)
    setForm({ name: '', sub_type: 'Institution', contact_person_name: '', pincode: '', gst_number: '', mobile_1: '', mobile_2: '', address: '', description: '', place: '', state_id: '', district_id: '', taluka_id: '', village_id: '', latitude: '', longitude: '' })
    setShowMobile2(false); setMobile1Error(''); setMobile2Error(''); setGstError('')
    setOpen(true)
  }

  function openEdit(row: Record<string, unknown>) {
    setEditing(row)
    const place = row.village_id ? `v:${row.village_id}` : row.taluka_id ? `t:${row.taluka_id}` : ''
    setForm({
      name: String(row.name ?? ''),
      sub_type: String(row.sub_type ?? 'Institution'),
      contact_person_name: String(row.contact_person_name ?? ''),
      pincode: String(row.pincode ?? ''),
      gst_number: String(row.gst_number ?? ''),
      mobile_1: String(row.mobile_1 ?? ''),
      mobile_2: String(row.mobile_2 ?? ''),
      address: String(row.address ?? ''),
      description: String(row.description ?? ''),
      place, state_id: String(row.state_id ?? ''), district_id: String(row.district_id ?? ''),
      taluka_id: String(row.taluka_id ?? ''), village_id: String(row.village_id ?? ''),
      latitude: String(row.latitude ?? ''), longitude: String(row.longitude ?? ''),
    })
    setShowMobile2(!!row.mobile_2)
    setMobile1Error(''); setMobile2Error(''); setGstError('')
    setOpen(true)
  }

  function handlePlaceChange(val: string) {
    const resolved = placeMap.get(val)
    if (resolved) setForm(f => ({ ...f, place: val, state_id: resolved.state_id, district_id: resolved.district_id, taluka_id: resolved.taluka_id, village_id: resolved.village_id ?? '' }))
    else setForm(f => ({ ...f, place: '', state_id: '', district_id: '', taluka_id: '', village_id: '' }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    if (form.mobile_1 && !/^\d{10}$/.test(form.mobile_1.trim())) { setMobile1Error('Must be exactly 10 digits'); return }
    if (form.mobile_2 && !/^\d{10}$/.test(form.mobile_2.trim())) { setMobile2Error('Must be exactly 10 digits'); return }
    if (form.gst_number && !GSTIN_RE.test(form.gst_number.trim().toUpperCase())) { setGstError('Please enter a valid GST Number'); return }
    setMobile1Error(''); setMobile2Error(''); setGstError(''); setSaving(true)
    const body = {
      name: form.name.trim(),
      sub_type: form.sub_type || null,
      contact_person_name: form.contact_person_name.trim() || null,
      pincode: form.pincode.trim() || null,
      gst_number: form.gst_number.trim().toUpperCase() || null,
      mobile_1: form.mobile_1.trim() || null,
      mobile_2: form.mobile_2.trim() || null,
      address: form.address || null, description: form.description || null,
      state_id: form.state_id || null, district_id: form.district_id || null,
      taluka_id: form.taluka_id || null, village_id: form.village_id || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    }
    const ok = editing ? await crud.update(editing.id as string, body) : await crud.create(body)
    setSaving(false)
    if (ok !== false && ok !== null) setOpen(false)
  }

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <CrudPage
        title="Institutions / Consumers" backHref="/masters" columns={COLS}
        rows={crud.rows} allRowsCount={crud.allRows.length}
        isLoading={crud.isLoading} search={crud.search} onSearchChange={crud.setSearch}
        page={crud.page} totalPages={crud.totalPages} onPage={crud.setPage}
        onAdd={canEdit ? openAdd : undefined}
        onEdit={canEdit ? openEdit : undefined}
        onToggleActive={canEdit ? (r, v) => crud.update(r.id as string, { is_active: v }) : undefined}
        onDelete={canDelete ? r => crud.remove(r.id as string) : undefined}
      />
      <Modal title={editing ? 'Edit Institution / Consumer' : 'Add Institution / Consumer'} isOpen={open} onClose={() => setOpen(false)} onSave={handleSave} isSaving={saving} size="lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
          <select value={form.sub_type} onChange={F('sub_type')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="Institution">Institution</option>
            <option value="Consumer">Consumer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account Name <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={F('name')} placeholder="Institution / Consumer name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name</label>
          <input type="text" value={form.contact_person_name} onChange={F('contact_person_name')} placeholder="Contact person name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Place</label>
          <SearchableSelect value={form.place} onChange={handlePlaceChange} options={placeOptions} placeholder="Search by district, taluka or village…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            <input type="text" value={form.gst_number} onChange={e => { F('gst_number')(e); setGstError('') }} placeholder="GSTIN (15 characters)" maxLength={15} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${gstError ? 'border-red-400' : 'border-gray-300'}`} />
            {gstError && <p className="text-xs text-red-500 mt-1">{gstError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
            <input type="text" value={form.pincode} onChange={F('pincode')} placeholder="6-digit pin code" maxLength={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Mobile Number 1</label>
            {!showMobile2 && (
              <button type="button" onClick={() => setShowMobile2(true)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Secondary Contact
              </button>
            )}
          </div>
          <input type="tel" value={form.mobile_1} onChange={e => { F('mobile_1')(e); setMobile1Error('') }} placeholder="10-digit number" maxLength={10} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${mobile1Error ? 'border-red-400' : 'border-gray-300'}`} />
          {mobile1Error && <p className="text-xs text-red-500 mt-1">{mobile1Error}</p>}
        </div>
        {showMobile2 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Mobile Number 2</label>
              <button type="button" onClick={() => { setShowMobile2(false); setForm(f => ({ ...f, mobile_2: '' })); setMobile2Error('') }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Remove</button>
            </div>
            <input type="tel" value={form.mobile_2} onChange={e => { F('mobile_2')(e); setMobile2Error('') }} placeholder="10-digit number" maxLength={10} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${mobile2Error ? 'border-red-400' : 'border-gray-300'}`} />
            {mobile2Error && <p className="text-xs text-red-500 mt-1">{mobile2Error}</p>}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea value={form.address} onChange={F('address')} rows={2} placeholder="Address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={F('description')} rows={2} placeholder="Description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input type="number" step="0.0000001" value={form.latitude} onChange={F('latitude')} placeholder="-90 to 90" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input type="number" step="0.0000001" value={form.longitude} onChange={F('longitude')} placeholder="-180 to 180" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </Modal>
    </>
  )
}
