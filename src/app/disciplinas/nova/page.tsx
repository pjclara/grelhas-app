'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import DisciplinaForm, { type DisciplinaFormValues } from '../DisciplinaForm';

export default function NovaDisciplinaPage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const router = useRouter();

  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function criar(valores: DisciplinaFormValues) {
    setErro(null);
    setAEnviar(true);
    const res = await fetch('/api/disciplinas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valores),
    });
    setAEnviar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível criar a disciplina (nome já usado?).');
      return;
    }
    const nova = await res.json();
    router.push(`/disciplinas/${nova.id}`);
  }

  return (
    <AppShell>
      <Link href="/disciplinas" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar às disciplinas
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Nova disciplina</h1>

      {status !== 'loading' && !isAdmin ? (
        <Alert tone="danger">Apenas administradores podem criar disciplinas.</Alert>
      ) : (
        <DisciplinaForm aoSubmeter={criar} aEnviar={aEnviar} erro={erro} textoSubmeter="Criar disciplina" />
      )}
    </AppShell>
  );
}
