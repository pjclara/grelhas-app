'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function TopNav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <Link href="/dashboard" className="font-semibold text-slate-900">
        Grelhas de Avaliação
      </Link>
      <div className="flex items-center gap-4 text-sm text-slate-600">
        {isAdmin && (
          <Link href="/admin" className="text-brand-600 hover:underline">
            Administração
          </Link>
        )}
        {session?.user?.name && <span>{session.user.name}</span>}
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-brand-600 hover:underline">
          Sair
        </button>
      </div>
    </header>
  );
}
