'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/Spinner';
import DisciplinaForm, { type DisciplinaFormValues } from '../../DisciplinaForm';
import type { Disciplina } from '@/lib/types';

export default function EditarDisciplinaPage({ params }: { params: { disciplinaId: string } }) {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const router = useRouter();

  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    fetch(`/api/disciplinas/${params.disciplinaId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: Disciplina) => {
        setDisciplina(d);
        setACarregar(false);
      })
      .catch(() => {
        setErroCarregar('Não foi possível carregar a disciplina.');
        setACarregar(false);
      });
  }, [params.disciplinaId]);

  async function guardar(valores: DisciplinaFormValues) {
    setErro(null);
    setAEnviar(true);
    const res = await fetch(`/api/disciplinas/${params.disciplinaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valores),
    });
    setAEnviar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível guardar (nome já usado?).');
      return;
    }
    router.push(`/disciplinas/${params.disciplinaId}`);
  }

  async function remover() {
    if (!disciplina) return;
    const turmas = disciplina._count?.turmaDisciplinas ?? 0;
    const aviso =
      turmas > 0
        ? `A disciplina "${disciplina.nome}" tem ${turmas} turma(s) associada(s). Eliminá-la apaga também essas turmas, alunos e notas. Esta ação não pode ser desfeita. Continuar?`
        : `Eliminar a disciplina "${disciplina.nome}"?`;
    if (!confirm(aviso)) return;
    await fetch(`/api/disciplinas/${params.disciplinaId}`, { method: 'DELETE' });
    router.push('/disciplinas');
  }

  return (
    <AppShell>
      <Link
        href={`/disciplinas/${params.disciplinaId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à disciplina
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Editar disciplina</h1>
        {disciplina && isAdmin && (
          <Button type="button" variant="danger" onClick={remover}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      {status !== 'loading' && !isAdmin ? (
        <Alert tone="danger">Apenas administradores podem editar disciplinas.</Alert>
      ) : erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar || !disciplina ? (
        <PageLoading />
      ) : (
        <DisciplinaForm
          valoresIniciais={{
            nome: disciplina.nome,
            grupoDisciplinarId: disciplina.grupoDisciplinarId ?? '',
            cicloIds: disciplina.ciclos.map((dc) => dc.ciclo.id),
            anoEscolaridadeIds: disciplina.anosEscolaridade.map((da) => da.anoEscolaridade.id),
          }}
          aoSubmeter={guardar}
          aEnviar={aEnviar}
          erro={erro}
          textoSubmeter="Guardar alterações"
          cancelarHref={`/disciplinas/${params.disciplinaId}`}
        />
      )}
    </AppShell>
  );
}
