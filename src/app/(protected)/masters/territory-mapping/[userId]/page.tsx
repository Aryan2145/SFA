'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'

type State = { id: string; name: string }
type District = { id: string; name: string; state_id: string }
type Taluka = { id: string; name: string; district_id: string }
type Village = { id: string; name: string; taluka_id: string }
type UserInfo = { id: string; name: string; contact: string }

export default function TerritoryCanvasPage() {
  const params = useParams()
  const userId = params.userId as string
  const { toast } = useToast()

  const [user, setUser] = useState<UserInfo | null>(null)
  const [states, setStates] = useState<State[]>([])
  const [stateSearch, setStateSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Non-destructive territory memory
  const [stateIds, setStateIds] = useState<Set<string>>(new Set())
  const [districtIds, setDistrictIds] = useState<Set<string>>(new Set())
  const [talukaIds, setTalukaIds] = useState<Set<string>>(new Set())
  const [villageIds, setVillageIds] = useState<Set<string>>(new Set())

  // Lazy loaded data
  const [districtsByState, setDistrictsByState] = useState<Map<string, District[]>>(new Map())
  const [talukasByDistrict, setTalukasByDistrict] = useState<Map<string, Taluka[]>>(new Map())
  const [villagesByTaluka, setVillagesByTaluka] = useState<Map<string, Village[]>>(new Map())

  // Search per branch
  const [dSearch, setDSearch] = useState<Record<string, string>>({})
  const [tSearch, setTSearch] = useState<Record<string, string>>({})
  const [vSearch, setVSearch] = useState<Record<string, string>>({})

  // Expand state
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set())
  const [expandedTalukas, setExpandedTalukas] = useState<Set<string>>(new Set())

  const loadDistricts = useCallback(async (stateId: string) => {
    if (districtsByState.has(stateId)) return
    const r = await fetch(`/api/masters/districts?state_id=${stateId}`)
    const d = await r.json()
    setDistrictsByState(prev => new Map(prev).set(stateId, Array.isArray(d) ? d : []))
  }, [districtsByState])

  const loadTalukas = useCallback(async (districtId: string) => {
    if (talukasByDistrict.has(districtId)) return
    const r = await fetch(`/api/masters/talukas?district_id=${districtId}`)
    const d = await r.json()
    setTalukasByDistrict(prev => new Map(prev).set(districtId, Array.isArray(d) ? d : []))
  }, [talukasByDistrict])

  const loadVillages = useCallback(async (talukaId: string) => {
    if (villagesByTaluka.has(talukaId)) return
    const r = await fetch(`/api/masters/villages?taluka_id=${talukaId}`)
    const d = await r.json()
    setVillagesByTaluka(prev => new Map(prev).set(talukaId, Array.isArray(d) ? d : []))
  }, [villagesByTaluka])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const [statesRes, mappingRes] = await Promise.all([
        fetch('/api/masters/states').then(r => r.json()),
        fetch(`/api/masters/territory-mapping/${userId}`).then(r => r.json()),
      ])
      const stateList: State[] = Array.isArray(statesRes) ? statesRes : []
      setStates(stateList)
      setUser(mappingRes.user ?? null)

      const sIds = new Set<string>(mappingRes.state_ids ?? [])
      const dIds = new Set<string>(mappingRes.district_ids ?? [])
      const tIds = new Set<string>(mappingRes.taluka_ids ?? [])
      const vIds = new Set<string>(mappingRes.village_ids ?? [])
      setStateIds(sIds)
      setDistrictIds(dIds)
      setTalukaIds(tIds)
      setVillageIds(vIds)

      // Pre-load districts for saved states
      const districtData = new Map<string, District[]>()
      await Promise.all([...sIds].map(async sId => {
        const r = await fetch(`/api/masters/districts?state_id=${sId}`)
        const d = await r.json()
        districtData.set(sId, Array.isArray(d) ? d : [])
      }))
      setDistrictsByState(districtData)

      // Pre-load talukas for saved districts
      const talukaData = new Map<string, Taluka[]>()
      await Promise.all([...dIds].map(async dId => {
        const r = await fetch(`/api/masters/talukas?district_id=${dId}`)
        const d = await r.json()
        talukaData.set(dId, Array.isArray(d) ? d : [])
      }))
      setTalukasByDistrict(talukaData)

      // Pre-load villages for saved talukas
      const villageData = new Map<string, Village[]>()
      await Promise.all([...tIds].map(async tId => {
        const r = await fetch(`/api/masters/villages?taluka_id=${tId}`)
        const d = await r.json()
        villageData.set(tId, Array.isArray(d) ? d : [])
      }))
      setVillagesByTaluka(villageData)

      setExpandedDistricts(new Set(dIds))
      setExpandedTalukas(new Set(tIds))
      setLoading(false)
    }
    init()
  }, [userId])

  async function handleStateToggle(stateId: string) {
    const next = new Set(stateIds)
    if (next.has(stateId)) {
      next.delete(stateId)
    } else {
      next.add(stateId)
      await loadDistricts(stateId)
    }
    setStateIds(next)
  }

  async function handleDistrictToggle(district: District) {
    const next = new Set(districtIds)
    if (next.has(district.id)) {
      next.delete(district.id)
      // Remove from expandedDistricts view but KEEP talukaIds in memory
      setExpandedDistricts(prev => { const s = new Set(prev); s.delete(district.id); return s })
    } else {
      next.add(district.id)
      await loadTalukas(district.id)
      setExpandedDistricts(prev => new Set(prev).add(district.id))
    }
    setDistrictIds(next)
  }

  async function handleTalukaToggle(taluka: Taluka) {
    const next = new Set(talukaIds)
    if (next.has(taluka.id)) {
      next.delete(taluka.id)
      setExpandedTalukas(prev => { const s = new Set(prev); s.delete(taluka.id); return s })
    } else {
      next.add(taluka.id)
      await loadVillages(taluka.id)
      setExpandedTalukas(prev => new Set(prev).add(taluka.id))
    }
    setTalukaIds(next)
  }

  function handleVillageToggle(villageId: string) {
    const next = new Set(villageIds)
    if (next.has(villageId)) { next.delete(villageId) } else { next.add(villageId) }
    setVillageIds(next)
  }

  async function handleSave() {
    setSaving(true)
    const r = await fetch(`/api/masters/territory-mapping/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state_ids: [...stateIds],
        district_ids: [...districtIds],
        taluka_ids: [...talukaIds],
        village_ids: [...villageIds],
      }),
    })
    if (!r.ok) { toast((await r.json()).error ?? 'Save failed', 'error') }
    else { toast('Territory saved successfully') }
    setSaving(false)
  }

  const filteredStates = states.filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase()))

  // Select all / deselect all helpers for a level under a parent
  function allDistrictsSelected(stateId: string) {
    const districts = districtsByState.get(stateId) ?? []
    return districts.length > 0 && districts.every(d => districtIds.has(d.id))
  }
  function toggleAllDistricts(stateId: string) {
    const districts = districtsByState.get(stateId) ?? []
    const next = new Set(districtIds)
    if (allDistrictsSelected(stateId)) {
      districts.forEach(d => next.delete(d.id))
    } else {
      districts.forEach(d => next.add(d.id))
      // Load talukas for all
      districts.forEach(d => loadTalukas(d.id))
    }
    setDistrictIds(next)
  }

  const totalSelected = stateIds.size + districtIds.size + talukaIds.size + villageIds.size

  if (loading) return <div className="text-center py-16 text-gray-400">Loading territory data…</div>

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/masters/territory-mapping" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Territory Mapping
          </a>
          <h2 className="text-xl font-semibold text-gray-800">
            {user?.name ?? 'User'} — Territory
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalSelected > 0 ? `${stateIds.size} states · ${districtIds.size} districts · ${talukaIds.size} talukas · ${villageIds.size} villages selected` : 'No territory assigned yet'}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 transition shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          {saving ? 'Saving…' : 'Save Territory'}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700">
        <strong>Non-destructive:</strong> Unchecking a parent hides children temporarily — their selections are preserved in memory. Re-selecting the parent auto-restores all children. Click <strong>Save Territory</strong> to apply changes.
      </div>

      {/* State search */}
      <div className="mb-4">
        <input type="text" placeholder="Search states…" value={stateSearch} onChange={e => setStateSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {filteredStates.map(state => {
          const isStateSelected = stateIds.has(state.id)
          const districts = districtsByState.get(state.id) ?? []
          const activeDistricts = districts.filter(d => districtIds.has(d.id))

          return (
            <div key={state.id} className={`rounded-xl border overflow-hidden ${isStateSelected ? 'border-blue-300' : 'border-gray-200'}`}>
              {/* State row */}
              <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${isStateSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                onClick={() => handleStateToggle(state.id)}>
                <input type="checkbox" checked={isStateSelected} onChange={() => {}} className="w-4 h-4 rounded accent-blue-600 pointer-events-none" />
                <span className="font-semibold text-gray-800 flex-1">{state.name}</span>
                {isStateSelected && districts.length > 0 && (
                  <span className="text-xs text-blue-600 font-medium">{activeDistricts.length}/{districts.length} districts</span>
                )}
                {isStateSelected && <span className="text-gray-400 text-xs">{districts.length > 0 ? '▼' : '...'}</span>}
              </div>

              {/* Districts */}
              {isStateSelected && districts.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {/* District search + select all */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
                    <input type="checkbox" checked={allDistrictsSelected(state.id)}
                      onChange={() => toggleAllDistricts(state.id)}
                      className="w-4 h-4 rounded accent-blue-600" title="Select all districts" />
                    <input type="text" placeholder="Search districts…" value={dSearch[state.id] ?? ''}
                      onChange={e => setDSearch(p => ({ ...p, [state.id]: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      onClick={e => e.stopPropagation()} />
                    <span className="text-xs text-gray-400">{activeDistricts.length} sel.</span>
                  </div>

                  {/* District list */}
                  <div className="divide-y divide-gray-50">
                    {districts
                      .filter(d => d.name.toLowerCase().includes((dSearch[state.id] ?? '').toLowerCase()))
                      .map(district => {
                        const isDistSelected = districtIds.has(district.id)
                        const isExpanded = expandedDistricts.has(district.id)
                        const talukas = talukasByDistrict.get(district.id) ?? []
                        const activeTalukas = talukas.filter(t => talukaIds.has(t.id))

                        return (
                          <div key={district.id}>
                            {/* District row */}
                            <div className={`flex items-center gap-3 px-6 py-2.5 cursor-pointer ${isDistSelected ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}>
                              <input type="checkbox" checked={isDistSelected} onChange={() => handleDistrictToggle(district)}
                                className="w-4 h-4 rounded accent-green-600" />
                              <span className={`flex-1 text-sm ${isDistSelected ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>{district.name}</span>
                              {isDistSelected && talukas.length > 0 && (
                                <span className="text-xs text-green-600">{activeTalukas.length}/{talukas.length} talukas</span>
                              )}
                              {isDistSelected && talukas.length > 0 && (
                                <button onClick={e => { e.stopPropagation(); setExpandedDistricts(prev => { const s = new Set(prev); isExpanded ? s.delete(district.id) : s.add(district.id); return s }) }}
                                  className="text-gray-400 hover:text-gray-600 text-xs px-1">
                                  {isExpanded ? '▲' : '▼'}
                                </button>
                              )}
                            </div>

                            {/* Talukas */}
                            {isDistSelected && isExpanded && (
                              <div className="border-t border-gray-50 bg-green-50/30">
                                <div className="flex items-center gap-2 px-8 py-2 border-b border-gray-100">
                                  <input type="text" placeholder="Search talukas…" value={tSearch[district.id] ?? ''}
                                    onChange={e => setTSearch(p => ({ ...p, [district.id]: e.target.value }))}
                                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
                                </div>
                                {talukas.filter(t => t.name.toLowerCase().includes((tSearch[district.id] ?? '').toLowerCase())).map(taluka => {
                                  const isTalSelected = talukaIds.has(taluka.id)
                                  const isTalExpanded = expandedTalukas.has(taluka.id)
                                  const villages = villagesByTaluka.get(taluka.id) ?? []
                                  const activeVillages = villages.filter(v => villageIds.has(v.id))

                                  return (
                                    <div key={taluka.id}>
                                      <div className={`flex items-center gap-3 px-10 py-2 ${isTalSelected ? 'bg-purple-50' : 'bg-white hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={isTalSelected} onChange={() => handleTalukaToggle(taluka)}
                                          className="w-3.5 h-3.5 rounded accent-purple-600" />
                                        <span className={`flex-1 text-sm ${isTalSelected ? 'text-gray-800' : 'text-gray-600'}`}>{taluka.name}</span>
                                        {isTalSelected && villages.length > 0 && (
                                          <span className="text-xs text-purple-600">{activeVillages.length}/{villages.length} villages</span>
                                        )}
                                        {isTalSelected && villages.length > 0 && (
                                          <button onClick={() => setExpandedTalukas(prev => { const s = new Set(prev); isTalExpanded ? s.delete(taluka.id) : s.add(taluka.id); return s })}
                                            className="text-gray-400 hover:text-gray-600 text-xs px-1">
                                            {isTalExpanded ? '▲' : '▼'}
                                          </button>
                                        )}
                                      </div>

                                      {/* Villages */}
                                      {isTalSelected && isTalExpanded && (
                                        <div className="border-t border-gray-50">
                                          <div className="flex items-center gap-2 px-12 py-2 border-b border-gray-100">
                                            <input type="text" placeholder="Search villages…" value={vSearch[taluka.id] ?? ''}
                                              onChange={e => setVSearch(p => ({ ...p, [taluka.id]: e.target.value }))}
                                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                                          </div>
                                          <div className="grid grid-cols-2 gap-1 px-12 py-2">
                                            {villages.filter(v => v.name.toLowerCase().includes((vSearch[taluka.id] ?? '').toLowerCase())).map(village => (
                                              <label key={village.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                                                <input type="checkbox" checked={villageIds.has(village.id)} onChange={() => handleVillageToggle(village.id)}
                                                  className="w-3.5 h-3.5 rounded accent-orange-500" />
                                                <span className="text-xs text-gray-700">{village.name}</span>
                                              </label>
                                            ))}
                                            {villages.length === 0 && <span className="text-xs text-gray-400 col-span-2 py-2">No villages found</span>}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
              {isStateSelected && districts.length === 0 && (
                <div className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">No districts found for this state.</div>
              )}
            </div>
          )
        })}
        {filteredStates.length === 0 && (
          <div className="text-center py-8 text-gray-400">No states match your search.</div>
        )}
      </div>

      {/* Bottom save button */}
      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-xl disabled:opacity-50 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          {saving ? 'Saving…' : 'Save Territory'}
        </button>
      </div>
    </div>
  )
}
