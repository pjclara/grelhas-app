'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import { cn } from '@/lib/cn';
import { version } from '../../package.json';

interface AppShellProps {
  children: ReactNode;
  /** Largura máxima do conteúdo. Usar 'full' para páginas com tabelas/grelhas largas. */
  width?: 'default' | 'full';
}

export default function AppShell({ children, width = 'default' }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className={cn('mx-auto', width === 'default' ? 'max-w-7xl' : 'max-w-none')}>{children}</div>
          </main>
          <footer className="px-4 pb-3 text-right text-xs text-slate-400 sm:px-6">
            v{version} · © {new Date().getFullYear()} SurgTuga
          </footer>
        </div>
      </div>
    </div>
  );
}
