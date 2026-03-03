'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type NavItem = { label: string; href: string }
type NavGroup = { label: string; items: NavItem[] }
type NavSection = NavItem | { label: string; groups: NavGroup[]; prefix: string }

const NAV: NavSection[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Daily Activity', href: '/daily-activity' },
  { label: 'Weekly Plan', href: '/weekly-plan' },
  {
    label: 'Masters',
    prefix: '/masters',
    groups: [
      { label: '', items: [{ label: 'Users', href: '/masters/users' }] },
      {
        label: 'Locations',
        items: [
          { label: 'States', href: '/masters/states' },
          { label: 'Districts', href: '/masters/districts' },
          { label: 'Talukas', href: '/masters/talukas' },
          { label: 'Villages', href: '/masters/villages' },
          { label: 'Territory Mapping', href: '/masters/territory-mapping' },
        ],
      },
      {
        label: 'Business',
        items: [
          { label: 'Dealers', href: '/masters/dealers' },
          { label: 'Distributors', href: '/masters/distributors' },
        ],
      },
      {
        label: 'Products',
        items: [
          { label: 'Categories', href: '/masters/product-categories' },
          { label: 'Sub-Categories', href: '/masters/product-subcategories' },
          { label: 'Products', href: '/masters/products' },
        ],
      },
      {
        label: 'Organization',
        items: [
          { label: 'Departments', href: '/masters/departments' },
          { label: 'Designations', href: '/masters/designations' },
          { label: 'Levels', href: '/masters/levels' },
        ],
      },
    ],
  },
  { label: 'Access Control', href: '/settings/access-control' },
]

function isNavGroup(item: NavSection): item is { label: string; groups: NavGroup[]; prefix: string } {
  return 'groups' in item
}

interface SidebarProps { open: boolean }

export default function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()
  const [mastersOpen, setMastersOpen] = useState(pathname.startsWith('/masters'))

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  if (!open) return null

  return (
    <aside className="w-60 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">R</div>
          <span className="font-bold text-base tracking-tight">RGB Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          if (!isNavGroup(item)) {
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive(item.href) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                {item.label}
              </Link>
            )
          }
          return (
            <div key={item.label}>
              <button
                onClick={() => setMastersOpen(o => !o)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${pathname.startsWith(item.prefix) ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] opacity-60">{mastersOpen ? '▲' : '▼'}</span>
              </button>
              {mastersOpen && (
                <div className="mt-0.5 ml-2 space-y-0.5">
                  {item.groups.map(group => (
                    <div key={group.label}>
                      {group.label && (
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{group.label}</p>
                      )}
                      {group.items.map(link => (
                        <Link key={link.href} href={link.href}
                          className={`block rounded-lg px-3 py-1.5 text-sm transition ${isActive(link.href) ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-500">RGB SFA Admin v1.0</p>
      </div>
    </aside>
  )
}
