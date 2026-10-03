'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import CriterioForm, { type CriterioPayload } from '../CriterioForm';

export default function NovoCriterioPage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const router = useRouter();

  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function criar(payload: CriterioPayload) {
    setErro(null);
    setAEnviar(true);
    const res = await fetch('/api/criterios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setAEnviar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível criar o critério.');
      return;
    }
    const novo = await res.json();
    router.push(`/criterios/${novo.id}`);
  }

  return (
    <AppShell>
      <Link
        href="/criterios"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos critérios
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Novo critério</h1>

      {status !== 'loading' && !isAdmin ? (
        <Alert tone="danger">Apenas administradores podem criar critérios.</Alert>
      ) : (
        <CriterioForm aoSubmeter={criar} aEnviar={aEnviar} erro={erro} textoSubmeter="Criar critério" />
      )}
    </AppShell>
  );
}
