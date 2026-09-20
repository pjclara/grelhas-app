'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const LINKS = [
  { href: '/dashboard', label: 'Turmas' },
  { href: '/disciplinas', label: 'Disciplinas' },
  { href: '/criterios-avaliacao', label: 'Critérios de Avaliação' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const links = isAdmin ? [...LINKS, { href: '/admin', label: 'Administração' }] : LINKS;

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white px-3 py-6">
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const ativo = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                ativo ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
