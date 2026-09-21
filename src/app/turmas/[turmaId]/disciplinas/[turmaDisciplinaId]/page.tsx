'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, ClipboardList, FileBarChart } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';
import type { AlunoTurma, Periodo, TurmaDisciplinaDetalhe } from '@/lib/types';

interface Inscricao {
  id: string;
  alunoId: string;
  ativo: boolean;
  aluno: AlunoTurma;
}

export default function TurmaDisciplinaPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string };
}) {
  const [turmaDisciplina, setTurmaDisciplina] = useState<TurmaDisciplinaDetalhe | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const [rtd, rp, ri] = await Promise.all([
        fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`),
        fetch(`/api/turmas/${params.turmaId}/periodos`),
        fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/alunos`),
      ]);
      if (!rtd.ok) {
        setErro(rtd.status === 404 ? 'Disciplina não encontrada nesta turma.' : 'Não foi possível carregar.');
        return;
      }
      setErro(null);
      setTurmaDisciplina(await rtd.json());
      if (rp.ok) setPeriodos(await rp.json());
      if (ri.ok) setInscricoes(await ri.json());
    }
    carregar();
  }, [params.turmaId, params.turmaDisciplinaId]);

  const alunosInscritos = inscricoes.filter((i) => i.ativo).map((i) => i.aluno);

  if (erro) {
    return (
      <AppShell>
        <BackLink turmaId={params.turmaId} />
        <Alert tone="danger">{erro}</Alert>
      </AppShell>
    );
  }

  if (!turmaDisciplina) {
    return (
      <AppShell>
        <PageLoading />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackLink turmaId={params.turmaId} />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">{turmaDisciplina.disciplina.nome}</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Alunos inscritos</h2>
            </div>
            <Link
              href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/alunos`}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Gerir
            </Link>
          </div>
          {alunosInscritos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Ainda não tem alunos inscritos nesta disciplina.</p>
          ) : (
            <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
              {alunosInscritos.map((a) => (
                <li key={a.id}>
                  {a.numero}. {a.nome}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {periodos.map((periodo) => (
          <Card key={periodo.id} className="p-4">
            <h2 className="font-semibold text-slate-900">{periodo.nome}</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link
                href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${periodo.id}/instrumentos`}
                className="flex items-center gap-1.5 text-brand-600 hover:underline"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Instrumentos e lançamento de notas
              </Link>
              <Link
                href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${periodo.id}/resumo`}
                className="flex items-center gap-1.5 text-brand-600 hover:underline"
              >
                <FileBarChart className="h-3.5 w-3.5" />
                Resumo e nota final
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function BackLink({ turmaId }: { turmaId: string }) {
  return (
    <Link href={`/turmas/${turmaId}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
      <ArrowLeft className="h-4 w-4" /> Voltar à turma
    </Link>
  );
}
