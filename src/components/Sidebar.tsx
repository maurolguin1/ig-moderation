import Link from 'next/link';
import { useRouter } from 'next/router';

const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/import', label: 'Importar' },
  { href: '/explorer', label: 'Explorar' },
  { href: '/compare', label: 'Comparar' },
  { href: '/report', label: 'Informes' },
  { href: '/dashboard', label: 'Tablero' },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside className="w-56 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen fixed top-0 left-0 p-4 overflow-y-auto">
      <h1 className="text-xl font-semibold mb-6">IG Moderación</h1>
      <nav className="space-y-2">
        {navItems.map(({ href, label }) => (
          <Link key={href} href={href} className={`block px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${router.pathname === href ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>{label}</Link>
        ))}
      </nav>
    </aside>
  );
}