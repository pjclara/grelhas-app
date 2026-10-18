'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, ClipboardList, FileBarChart, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  const router = useRouter();
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

  async function removerDisciplina() {
    if (!turmaDisciplina) return;
    if (
      !confirm(
        `Remover "${turmaDisciplina.disciplina.nome}" desta turma? Isto apaga os critérios, instrumentos, notas e inscrições dessa disciplina. Esta ação não pode ser desfeita.`
      )
    )
      return;
    const res = await fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      alert('Não foi possível remover a disciplina.');
      return;
    }
    router.push(`/turmas/${params.turmaId}`);
  }

  const alunosInscritos = inscricoes.filter((i) => i.ativo).map((i) => i.aluno);
  // Disciplina semestral: só mostra o período do semestre definido no catálogo.
  const semestreDisciplina =
    turmaDisciplina?.disciplina.periodicidade === 'SEMESTRAL' ? turmaDisciplina.disciplina.semestre : null;
  const periodosRelevantes = turmaDisciplina?.periodoId
    ? periodos.filter((p) => p.id === turmaDisciplina.periodoId)
    : semestreDisciplina
      ? periodos.filter((p) => p.ordem === semestreDisciplina)
      : periodos;

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
      <Breadcrumbs
        items={[
          { label: 'As minhas turmas', href: '/dashboard' },
          { label: turmaDisciplina.turma?.nome ?? '…', href: `/turmas/${params.turmaId}` },
          { label: turmaDisciplina.disciplina.nome },
        ]}
      />
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{turmaDisciplina.disciplina.nome}</h1>
        <Button
          type="button"
          variant="ghost"
          onClick={removerDisciplina}
          title="Apaga também critérios, instrumentos, notas e inscrições desta disciplina nesta turma"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
          Remover disciplina
        </Button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        {turmaDisciplina.disciplina.periodicidade === 'SEMESTRAL'
          ? `Semestral — ${turmaDisciplina.disciplina.semestre === 2 ? '2.º Semestre' : '1.º Semestre'}`
          : 'Anual'}
      </p>

      <Alert tone="info" className="mb-6">
        <p className="font-medium">Como avançar nesta disciplina</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li className={alunosInscritos.length > 0 ? 'line-through opacity-60' : ''}>
            Inscreva os alunos que frequentam esta disciplina (em &quot;Gerir&quot;).
          </li>
          <li>
            Ver os{' '}
            <Link
              href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/criterios`}
              className="font-medium underline"
            >
              critérios de avaliação
            </Link>
            ; os pesos de cada instrumento.
          </li>
          <li>Em cada período, crie instrumentos e lance as notas.</li>
          <li>Consulte o resumo para ver a nota final e o nível de cada aluno.</li>
        </ol>
      </Alert>

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

        {periodosRelevantes.map((periodo) => (
          <div key={periodo.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="mb-3 font-semibold text-slate-900">{periodo.nome}</h2>
            <div className="flex flex-col gap-2">
              <Link
                href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${periodo.id}/instrumentos`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Instrumentos</p>
                  <p className="text-xs text-slate-500">Criar instrumentos e lançar notas</p>
                </div>
              </Link>
              <Link
                href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${periodo.id}/resumo`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
                  <FileBarChart className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Resumo</p>
                  <p className="text-xs text-slate-500">Nota final e nível de cada aluno</p>
                </div>
              </Link>
            </div>
          </div>
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
