'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { TurmaDetalhe } from '@/lib/types';

export default function TurmaPage({ params }: { params: { turmaId: string } }) {
  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/turmas/${params.turmaId}`).then((r) => {
      if (!r.ok) {
        setErro(r.status === 404 ? 'Turma não encontrada.' : 'Não foi possível carregar a turma.');
        return;
      }
      r.json().then(setTurma);
    });
  }, [params.turmaId]);

  if (erro) {
    return (
      <div>
        <TopNav />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <Link href="/dashboard" className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← As minhas turmas
          </Link>
          <p className="text-sm text-red-600">{erro}</p>
        </main>
      </div>
    );
  }

  if (!turma) {
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
        <Link href="/dashboard" className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← As minhas turmas
        </Link>
        <p className="text-sm text-slate-500">
          {turma.disciplina.nome} · {turma.anoLetivo.nome}
        </p>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">{turma.nome}</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href={`/turmas/${turma.id}/alunos`} className={cardClass}>
            <h2 className={titleClass}>Alunos</h2>
            <p className={descClass}>{turma.alunos.length} alunos na turma</p>
          </Link>

          <Link href={`/turmas/${turma.id}/criterios`} className={cardClass}>
            <h2 className={titleClass}>Critérios de avaliação</h2>
            <p className={descClass}>{turma.criterios.length} critérios configurados</p>
          </Link>

          {turma.periodos.map((periodo) => (
            <div key={periodo.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className={titleClass}>{periodo.nome}</h2>
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <Link
                  href={`/turmas/${turma.id}/periodos/${periodo.id}/instrumentos`}
                  className="text-brand-600 hover:underline"
                >
                  Instrumentos e lançamento de notas
                </Link>
                <Link
                  href={`/turmas/${turma.id}/periodos/${periodo.id}/resumo`}
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
