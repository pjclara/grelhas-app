'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Aluno, Periodo, TurmaDisciplinaDetalhe } from '@/lib/types';

interface Inscricao {
  id: string;
  alunoId: string;
  ativo: boolean;
  aluno: Aluno;
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
      <div>
        <TopNav />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <Link href={`/turmas/${params.turmaId}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← Voltar à turma
          </Link>
          <p className="text-sm text-red-600">{erro}</p>
        </main>
      </div>
    );
  }

  if (!turmaDisciplina) {
    return (
      <div>
        <TopNav />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-sm text-slate-500">A carregar…</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href={`/turmas/${params.turmaId}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← Voltar à turma
        </Link>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">{turmaDisciplina.disciplina.nome}</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <h2 className={titleClass}>Alunos inscritos</h2>
              <Link
                href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/alunos`}
                className="text-xs text-brand-600 hover:underline"
              >
                Gerir
              </Link>
            </div>
            {alunosInscritos.length === 0 ? (
              <p className={`mt-1 ${descClass}`}>Ainda não tem alunos inscritos nesta disciplina.</p>
            ) : (
              <ul className="mt-2 space-y-0.5 text-sm text-slate-700">
                {alunosInscritos.map((a) => (
                  <li key={a.id}>
                    {a.numero}. {a.nome}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {periodos.map((periodo) => (
            <div key={periodo.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className={titleClass}>{periodo.nome}</h2>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <Link
                  href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${periodo.id}/instrumentos`}
                  className="text-brand-600 hover:underline"
                >
                  Instrumentos e lançamento de notas
                </Link>
                <Link
                  href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${periodo.id}/resumo`}
                  className="text-brand-600 hover:underline"
                >
                  Resumo e nota final
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const cardClass =
  'rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md block';
const titleClass = 'font-semibold text-slate-900';
const descClass = 'text-sm text-slate-500';
