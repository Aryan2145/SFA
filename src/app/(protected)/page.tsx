'use client'

import { useEffect, useState } from 'react'

interface Stats { states: number; districts: number; users: number; dealers: number; distributors: number; products: number; weeklyPlans: number }

const CARDS = [
  { key: 'users', label: 'Users', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { key: 'dealers', label: 'Dealers', color: 'bg-green-50 text-green-700 border-green-100' },
  { key: 'distributors', label: 'Distributors', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { key: 'products', label: 'Products', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { key: 'states', label: 'States', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'districts', label: 'Districts', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'weeklyPlans', label: 'Weekly Plans', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
] as const

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {CARDS.map(card => (
          <div key={card.key} className={`rounded-xl border p-5 ${card.color}`}>
            <p className="text-3xl font-bold">{stats ? stats[card.key] : '—'}</p>
            <p className="text-sm font-medium mt-1 opacity-80">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
