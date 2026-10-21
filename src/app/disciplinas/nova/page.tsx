'use client';

import { useRef, useState } from 'react';
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
  // Guarda o id da disciplina depois da primeira gravação automática em segundo
  // plano, para que as gravações seguintes (incluindo a submissão manual) atualizem
  // o mesmo registo em vez de criar um duplicado.
  const idCriadoRef = useRef<string | null>(null);

  async function guardarDisciplina(valores: DisciplinaFormValues): Promise<{ ok: boolean; id?: string; erro?: string }> {
    const res = await fetch(idCriadoRef.current ? `/api/disciplinas/${idCriadoRef.current}` : '/api/disciplinas', {
      method: idCriadoRef.current ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valores),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, erro: body.error ?? 'Não foi possível guardar a disciplina (nome já usado?).' };
    }
    const dados = await res.json();
    idCriadoRef.current = dados.id;
    return { ok: true, id: dados.id };
  }

  async function criar(valores: DisciplinaFormValues) {
    setErro(null);
    setAEnviar(true);
    const resultado = await guardarDisciplina(valores);
    setAEnviar(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Não foi possível criar a disciplina.');
      return;
    }
    router.push(`/disciplinas/${resultado.id}`);
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
        <DisciplinaForm
          aoSubmeter={criar}
          aoAutoGuardar={guardarDisciplina}
          aEnviar={aEnviar}
          erro={erro}
          textoSubmeter="Criar disciplina"
        />
      )}
    </AppShell>
  );
}
