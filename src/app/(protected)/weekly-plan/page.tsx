'use client'

import { useState, useEffect, useCallback } from 'react'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'

// ---- helpers ----
function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function formatDate(s: string) { return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function buildWeekDays(monday: Date) { return Array.from({ length: 7 }, (_, i) => toDateStr(addDays(monday, i))) }

const TRAVEL_MODES = ['Bike', 'Bus', 'Car', 'Train']
type Item = { plan_date: string; from_place: string; to_place: string; new_dealers_goal: number; existing_dealers_goal: number; mode_of_travel: string; notes: string }
type Plan = { id: string; status: string; submitted_at: string | null; manager_comment: string | null; weekly_plan_items: Item[]; week_start_date: string; week_end_date: string }
type LogEntry = { id: string; action_type: string; actor_role: string; timestamp: string; previous_status: string | null; new_status: string | null; comment: string | null; users?: { name: string } }
type ReviewPlan = Plan & { users: { id: string; name: string; contact: string } }

function emptyItems(monday: Date): Item[] {
  return buildWeekDays(monday).map(d => ({ plan_date: d, from_place: '', to_place: '', new_dealers_goal: 0, existing_dealers_goal: 0, mode_of_travel: '', notes: '' }))
}

// ---- My Plan Tab ----
function MyPlanTab({ userId }: { userId: string | null }) {
  const { toast } = useToast()
  const [monday, setMonday] = useState(() => getMondayOf(new Date()))
  const [plan, setPlan] = useState<Plan | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logsOpen, setLogsOpen] = useState(false)

  const weekStart = toDateStr(monday)
  const weekEnd = toDateStr(addDays(monday, 6))

  const loadPlan = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/weekly-plans/my?weekStart=${weekStart}`)
    const data = await r.json()
    setPlan(data)
    setItems(data ? data.weekly_plan_items.sort((a: Item, b: Item) => a.plan_date.localeCompare(b.plan_date)) : emptyItems(monday))
    setLoading(false)
  }, [weekStart])

  useEffect(() => { loadPlan() }, [loadPlan])

  async function loadLogs() {
    if (!plan) return
    const r = await fetch(`/api/weekly-plans/${plan.id}/logs`)
    setLogs(await r.json())
    setLogsOpen(true)
  }

  async function handleCreate() {
    setSaving(true)
    const r = await fetch('/api/weekly-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_start_date: weekStart, week_end_date: weekEnd, items }) })
    if (!r.ok) { toast((await r.json()).error, 'error') } else { toast('Draft created'); loadPlan() }
    setSaving(false)
  }

  async function handleSaveDraft() {
    if (!plan) return
    setSaving(true)
    const r = await fetch(`/api/weekly-plans/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
    if (!r.ok) { toast((await r.json()).error, 'error') } else { toast('Saved'); loadPlan() }
    setSaving(false)
  }

  async function handleSubmit() {
    if (!plan) return
    setSaving(true)
    const r = await fetch(`/api/weekly-plans/${plan.id}/submit`, { method: 'POST' })
    if (!r.ok) { toast((await r.json()).error, 'error') } else { toast('Submitted!'); loadPlan() }
    setSaving(false)
  }

  const canEdit = !plan || ['Draft', 'Rejected', 'Edited by Manager'].includes(plan.status)
  const canSubmit = plan && ['Draft', 'Rejected', 'Edited by Manager'].includes(plan.status)

  function setItem(idx: number, k: keyof Item, v: string | number) {
    setItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [k]: v }; return n })
  }

  if (!userId) return <div className="text-center py-12 text-gray-400">Please add yourself as a user in Masters → Users first.</div>

  return (
    <div>
      {/* Week Selector */}
      <div className="flex items-center gap-4 mb-5">
        <button onClick={() => setMonday(d => addDays(d, -7))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">← Prev</button>
        <span className="text-sm font-medium text-gray-700">Week: {formatDate(weekStart)} — {formatDate(weekEnd)}</span>
        <button onClick={() => setMonday(d => addDays(d, 7))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Next →</button>
        <button onClick={() => setMonday(getMondayOf(new Date()))} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs">Today</button>
        {plan && <StatusBadge status={plan.status} />}
        {plan?.submitted_at && <span className="text-xs text-gray-400">Submitted: {new Date(plan.submitted_at).toLocaleString('en-IN')}</span>}
      </div>

      {/* Manager comment */}
      {plan?.manager_comment && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          <strong>Manager Comment:</strong> {plan.manager_comment}
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <>
          {/* Plan Items Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'From', 'To', 'New Dealers', 'Existing', 'Travel', 'Notes'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.plan_date} className="border-t border-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{formatDate(item.plan_date)}</td>
                    <td className="px-3 py-1.5"><input disabled={!canEdit} value={item.from_place} onChange={e => setItem(i, 'from_place', e.target.value)} className="w-24 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-50" /></td>
                    <td className="px-3 py-1.5"><input disabled={!canEdit} value={item.to_place} onChange={e => setItem(i, 'to_place', e.target.value)} className="w-24 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-50" /></td>
                    <td className="px-3 py-1.5"><input type="number" disabled={!canEdit} value={item.new_dealers_goal} onChange={e => setItem(i, 'new_dealers_goal', Number(e.target.value))} className="w-16 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-50" /></td>
                    <td className="px-3 py-1.5"><input type="number" disabled={!canEdit} value={item.existing_dealers_goal} onChange={e => setItem(i, 'existing_dealers_goal', Number(e.target.value))} className="w-16 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-50" /></td>
                    <td className="px-3 py-1.5">
                      <select disabled={!canEdit} value={item.mode_of_travel} onChange={e => setItem(i, 'mode_of_travel', e.target.value)} className="w-20 border border-gray-200 rounded px-1 py-1 text-xs disabled:bg-gray-50">
                        <option value="">—</option>
                        {TRAVEL_MODES.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5"><input disabled={!canEdit} value={item.notes} onChange={e => setItem(i, 'notes', e.target.value)} className="w-32 border border-gray-200 rounded px-2 py-1 text-xs disabled:bg-gray-50" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {!plan && <button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">Create Draft</button>}
            {plan && canEdit && <button onClick={handleSaveDraft} disabled={saving} className="bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">Save Draft</button>}
            {canSubmit && <button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">Submit for Approval</button>}
            {plan && <button onClick={loadLogs} className="text-sm text-blue-600 hover:underline ml-auto">View Audit Log</button>}
          </div>
        </>
      )}

      {/* Audit Log Modal */}
      {logsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogsOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-800">Audit Log</h3>
              <button onClick={() => setLogsOpen(false)} className="text-gray-400 text-xl">&times;</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="w-1 bg-blue-200 rounded-full shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">{log.action_type} <span className="text-gray-400 font-normal text-xs">by {log.users?.name ?? log.actor_role}</span></p>
                    {(log.previous_status || log.new_status) && <p className="text-xs text-gray-500">{log.previous_status} → {log.new_status}</p>}
                    {log.comment && <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-0.5 mt-0.5">"{log.comment}"</p>}
                    <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-gray-400 text-sm">No log entries yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Review Plans Tab ----
function ReviewTab() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<ReviewPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<ReviewPlan | null>(null)
  const [commentModal, setCommentModal] = useState<{ action: string; planId: string } | null>(null)
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/weekly-plans/review${filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : ''}`)
    const d = await r.json()
    setPlans(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [filterStatus])

  useEffect(() => { loadPlans() }, [loadPlans])

  async function action(planId: string, type: string, body: Record<string, unknown> = {}) {
    setActing(true)
    const r = await fetch(`/api/weekly-plans/${planId}/${type}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) { toast(d.error, 'error') } else { toast(`Action: ${type} done`); loadPlans(); setSelected(null) }
    setActing(false)
  }

  const STATUS_OPTS = ['', 'Submitted', 'Approved', 'Rejected', 'On Hold', 'Edited by Manager', 'Resubmitted']

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : plans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No plans to review.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Week</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Submitted</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.users.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.week_start_date} — {p.week_end_date}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.submitted_at ? new Date(p.submitted_at).toLocaleString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(p)} className="text-blue-600 hover:underline text-xs font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-800">{selected.users.name} — Week of {selected.week_start_date}</h3>
                <div className="flex items-center gap-2 mt-1"><StatusBadge status={selected.status} />
                  {selected.submitted_at && <span className="text-xs text-gray-400">Submitted {new Date(selected.submitted_at).toLocaleString('en-IN')}</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-xl">&times;</button>
            </div>
            {selected.manager_comment && (
              <div className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">Comment: {selected.manager_comment}</div>
            )}
            <div className="overflow-x-auto px-6 py-4 flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{['Date', 'From', 'To', 'New', 'Existing', 'Travel', 'Notes'].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {selected.weekly_plan_items.sort((a, b) => a.plan_date.localeCompare(b.plan_date)).map(item => (
                    <tr key={item.plan_date} className="border-t border-gray-50">
                      <td className="px-3 py-2 font-medium">{formatDate(item.plan_date)}</td>
                      <td className="px-3 py-2">{item.from_place || '—'}</td>
                      <td className="px-3 py-2">{item.to_place || '—'}</td>
                      <td className="px-3 py-2">{item.new_dealers_goal}</td>
                      <td className="px-3 py-2">{item.existing_dealers_goal}</td>
                      <td className="px-3 py-2">{item.mode_of_travel || '—'}</td>
                      <td className="px-3 py-2">{item.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {['Submitted', 'Resubmitted', 'On Hold'].includes(selected.status) && (
              <div className="px-6 py-4 border-t flex flex-wrap gap-2">
                <button disabled={acting} onClick={() => action(selected.id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">Approve</button>
                <button disabled={acting} onClick={() => { setCommentModal({ action: 'reject', planId: selected.id }); setComment('') }} className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">Reject</button>
                <button disabled={acting} onClick={() => { setCommentModal({ action: 'hold', planId: selected.id }); setComment('') }} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">Hold</button>
                <button disabled={acting} onClick={() => { setCommentModal({ action: 'suggest', planId: selected.id }); setComment('') }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">Suggest Changes</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comment Modal */}
      <Modal title={`${commentModal?.action === 'reject' ? 'Reject' : commentModal?.action === 'hold' ? 'Put On Hold' : 'Suggest Changes'}`}
        isOpen={!!commentModal} onClose={() => setCommentModal(null)}
        onSave={() => { if (commentModal) action(commentModal.planId, commentModal.action, { comment }) }}
        isSaving={acting} saveLabel="Confirm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comment {commentModal?.action === 'reject' ? '(required)' : '(optional)'}
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </Modal>
    </div>
  )
}

// ---- Main Page ----
export default function WeeklyPlanPage() {
  const [tab, setTab] = useState<'my' | 'review'>('my')
  const [me, setMe] = useState<{ userId: string | null; hasSubordinates: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe({ userId: d.userId, hasSubordinates: d.hasSubordinates })).catch(() => {})
  }, [])

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('my')} className={`pb-3 text-sm font-medium border-b-2 transition ${tab === 'my' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          My Weekly Plans
        </button>
        {me?.hasSubordinates && (
          <button onClick={() => setTab('review')} className={`pb-3 text-sm font-medium border-b-2 transition ${tab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Review Plans
          </button>
        )}
      </div>
      {tab === 'my' ? <MyPlanTab userId={me?.userId ?? null} /> : <ReviewTab />}
    </div>
  )
}
