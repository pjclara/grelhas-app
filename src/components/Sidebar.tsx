'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { GraduationCap, BookOpen, ClipboardList, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/dashboard', label: 'Turmas', icon: GraduationCap },
  { href: '/disciplinas', label: 'Disciplinas', icon: BookOpen },
  { href: '/criterios-avaliacao', label: 'Critérios de Avaliação', icon: ClipboardList },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const links = isAdmin ? [...LINKS, { href: '/admin', label: 'Administração', icon: ShieldCheck }] : LINKS;

  const content = (
    <nav className="flex flex-col gap-0.5 px-3 py-5">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Navegação</p>
      {links.map((link) => {
        const Icon = link.icon;
        const ativo = pathname === link.href || pathname.startsWith(link.href + '/');
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              ativo
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', ativo ? 'text-brand-600' : 'text-slate-400')} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
          <div className="relative flex h-full w-64 flex-col bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                onClick={onClose}
                aria-label="Fechar menu"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
