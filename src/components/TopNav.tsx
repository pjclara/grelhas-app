'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Menu, LogOut } from 'lucide-react';

interface TopNavProps {
  onMenuClick?: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { data: session } = useSession();
  const nome = session?.user?.name ?? '';
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-slate-900">
          Grelhas de Avaliação
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {nome && (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-600 sm:inline">{nome}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {iniciais || 'U'}
            </span>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Sair"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
