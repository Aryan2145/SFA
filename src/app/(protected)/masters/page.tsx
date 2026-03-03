import Link from 'next/link'

const SECTIONS = [
  {
    title: 'Users', href: '/masters/users', desc: 'Manage system users and hierarchy',
    icon: '👤', color: 'border-blue-200 hover:border-blue-400',
  },
  {
    title: 'Locations', href: '/masters/states', desc: 'States, Districts, Talukas, Villages',
    icon: '📍', color: 'border-green-200 hover:border-green-400',
  },
  {
    title: 'Business', href: '/masters/dealers', desc: 'Dealers and Distributors',
    icon: '🏪', color: 'border-purple-200 hover:border-purple-400',
  },
  {
    title: 'Products', href: '/masters/product-categories', desc: 'Categories, Sub-categories, Products',
    icon: '📦', color: 'border-orange-200 hover:border-orange-400',
  },
  {
    title: 'Organization', href: '/masters/departments', desc: 'Departments, Designations, Levels',
    icon: '🏢', color: 'border-indigo-200 hover:border-indigo-400',
  },
]

export default function MastersPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Masters</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} className={`bg-white rounded-xl border-2 p-5 transition group ${s.color}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{s.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
