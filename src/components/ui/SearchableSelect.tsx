'use client'

import { useState, useRef, useEffect } from 'react'

export interface SelectOption { value: string; label: string }

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

export default function SearchableSelect({ value, onChange, options, placeholder = 'Select…', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{selected?.label ?? placeholder}</span>
        <span className="text-gray-400 text-xs ml-2">▼</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {value && (
              <li
                onClick={() => { onChange(''); setOpen(false) }}
                className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer italic"
              >
                — Clear selection —
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : filtered.map(o => (
              <li
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${o.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
