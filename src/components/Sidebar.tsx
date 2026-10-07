'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { GraduationCap, BookOpen, ClipboardList, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';

// Cada secção tem a sua própria cor (como disciplinas na pauta de uma escola),
// para a navegação ficar mais colorida sem perder a hierarquia visual.
const LINKS = [
  { href: '/dashboard', label: 'As minhas turmas', icon: GraduationCap, cor: 'sky' as const },
  { href: '/disciplinas', label: 'Disciplinas', icon: BookOpen, cor: 'violet' as const },
  { href: '/criterios', label: 'Critérios de Avaliação', icon: ClipboardList, cor: 'amber' as const },
];

const CORES = {
  sky: { chip: 'bg-sky-50 text-sky-500', chipAtivo: 'bg-sky-100 text-sky-700', textoAtivo: 'bg-sky-50 text-sky-700' },
  violet: {
    chip: 'bg-violet-50 text-violet-500',
    chipAtivo: 'bg-violet-100 text-violet-700',
    textoAtivo: 'bg-violet-50 text-violet-700',
  },
  amber: { chip: 'bg-amber-50 text-amber-500', chipAtivo: 'bg-amber-100 text-amber-700', textoAtivo: 'bg-amber-50 text-amber-700' },
  emerald: {
    chip: 'bg-emerald-50 text-emerald-500',
    chipAtivo: 'bg-emerald-100 text-emerald-700',
    textoAtivo: 'bg-emerald-50 text-emerald-700',
  },
};

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const links = isAdmin
    ? [...LINKS, { href: '/admin', label: 'Administração', icon: ShieldCheck, cor: 'emerald' as const }]
    : LINKS;

  const content = (
    <nav className="flex flex-col gap-0.5 px-3 py-5">
      <div className="mb-3 flex items-center gap-2 px-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
          <GraduationCap className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Navegação</p>
      </div>
      {links.map((link) => {
        const Icon = link.icon;
        const ativo = pathname === link.href || pathname.startsWith(link.href + '/');
        const cores = CORES[link.cor];
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              ativo ? cores.textoAtivo : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150',
                ativo ? cores.chipAtivo : cores.chip,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
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
