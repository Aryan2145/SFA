'use client'

import { useRouter, usePathname } from 'next/navigation'

interface HeaderProps { onToggleSidebar: () => void }

function getTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/': 'Dashboard',
    '/daily-activity': 'Daily Activity',
    '/weekly-plan': 'Weekly Plan',
    '/masters': 'Masters',
    '/masters/users': 'Users',
    '/masters/states': 'States',
    '/masters/districts': 'Districts',
    '/masters/talukas': 'Talukas',
    '/masters/villages': 'Villages',
    '/masters/territory-mapping': 'Territory Mapping',
    '/masters/dealers': 'Dealers',
    '/masters/distributors': 'Distributors',
    '/masters/product-categories': 'Product Categories',
    '/masters/product-subcategories': 'Product Sub-Categories',
    '/masters/products': 'Products',
    '/masters/departments': 'Departments',
    '/masters/designations': 'Designations',
    '/masters/levels': 'Levels',
    '/settings/access-control': 'Access Control',
  }
  return map[pathname] ?? 'RGB Admin'
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-700">{getTitle(pathname)}</h1>
      </div>
      <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 font-medium transition">
        Logout
      </button>
    </header>
  )
}
