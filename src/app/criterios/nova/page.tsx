'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import CriterioForm, { type CriterioPayload } from '../CriterioForm';
import type { CriterioCatalogo } from '@/lib/types';

export default function NovoCriterioPage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const router = useRouter();

  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);
  // Guarda o id do critério depois da primeira gravação automática em segundo
  // plano, para que as gravações seguintes (incluindo a submissão manual) atualizem
  // o mesmo registo em vez de criar um duplicado.
  const idCriadoRef = useRef<string | null>(null);

  async function guardarCriterio(payload: CriterioPayload): Promise<{ ok: boolean; dados?: CriterioCatalogo; erro?: string }> {
    const res = await fetch(idCriadoRef.current ? `/api/criterios/${idCriadoRef.current}` : '/api/criterios', {
      method: idCriadoRef.current ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, erro: body.error ?? 'Não foi possível guardar o critério.' };
    }
    const dados: CriterioCatalogo = await res.json();
    idCriadoRef.current = dados.id;
    return { ok: true, dados };
  }

  async function criar(payload: CriterioPayload) {
    setErro(null);
    setAEnviar(true);
    const resultado = await guardarCriterio(payload);
    setAEnviar(false);
    if (!resultado.ok || !resultado.dados) {
      setErro(resultado.erro ?? 'Não foi possível criar o critério.');
      return;
    }
    router.push(`/criterios/${resultado.dados.id}`);
  }

  async function autoGuardar(payload: CriterioPayload) {
    const resultado = await guardarCriterio(payload);
    return resultado.ok ? resultado.dados : undefined;
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
        <CriterioForm
          aoSubmeter={criar}
          aoAutoGuardar={autoGuardar}
          aEnviar={aEnviar}
          erro={erro}
          textoSubmeter="Criar critério"
        />
      )}
    </AppShell>
  );
}
