'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Disciplina, TurmaDetalhe } from '@/lib/types';

export default function TurmaPage({ params }: { params: { turmaId: string } }) {
  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [disciplinasCatalogo, setDisciplinasCatalogo] = useState<Disciplina[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [disciplinaId, setDisciplinaId] = useState('');
  const [erroAdicionar, setErroAdicionar] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  async function carregar() {
    const [rt, rd] = await Promise.all([
      fetch(`/api/turmas/${params.turmaId}`),
      fetch('/api/disciplinas'),
    ]);
    if (!rt.ok) {
      setErro(rt.status === 404 ? 'Turma não encontrada.' : 'Não foi possível carregar a turma.');
      return;
    }
    setErro(null);
    setTurma(await rt.json());
    if (rd.ok) setDisciplinasCatalogo(await rd.json());
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId]);

  async function adicionarDisciplina(e: React.FormEvent) {
    e.preventDefault();
    setErroAdicionar(null);
    if (!disciplinaId) {
      setErroAdicionar('Selecione uma disciplina.');
      return;
    }
    setAGravar(true);
    const res = await fetch(`/api/turmas/${params.turmaId}/disciplinas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disciplinaId }),
    });
    setAGravar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroAdicionar(body.error ?? 'Não foi possível associar a disciplina (já associada?).');
      return;
    }
    setDisciplinaId('');
    setMostrarForm(false);
    carregar();
  }

  async function removerDisciplina(turmaDisciplinaId: string, nome: string) {
    if (
      !confirm(
        `Remover "${nome}" desta turma? Isto apaga os critérios, instrumentos, notas e inscrições dessa disciplina. Esta ação não pode ser desfeita.`
      )
    )
      return;
    await fetch(`/api/turmas/${params.turmaId}/disciplinas/${turmaDisciplinaId}`, { method: 'DELETE' });
    carregar();
  }

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

  const disciplinasDisponiveis = disciplinasCatalogo.filter(
    (d) => !turma.disciplinas.some((td) => td.disciplina.id === d.id)
  );

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/dashboard" className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← As minhas turmas
        </Link>
        <p className="text-sm text-slate-500">{turma.anoLetivo.nome}</p>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">{turma.nome}</h1>

        <Link href={`/turmas/${turma.id}/alunos`} className={cardClass}>
          <h2 className={titleClass}>Alunos</h2>
          <p className={descClass}>{turma.alunos.length} alunos na turma</p>
        </Link>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Disciplinas</h2>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {mostrarForm ? 'Cancelar' : '+ Associar disciplina'}
          </button>
        </div>

        {mostrarForm && (
          <form
            onSubmit={adicionarDisciplina}
            className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-700">Disciplina</label>
              <select
                value={disciplinaId}
                onChange={(e) => setDisciplinaId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Selecionar…</option>
                {disciplinasDisponiveis.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
              {disciplinasDisponiveis.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  Todas as disciplinas do seu catálogo já estão associadas a esta turma, ou ainda não
                  criou nenhuma em <Link href="/disciplinas" className="text-brand-600 hover:underline">Disciplinas</Link>.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={aGravar}
              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {aGravar ? 'A associar…' : 'Associar'}
            </button>
            {erroAdicionar && <p className="w-full text-sm text-red-600">{erroAdicionar}</p>}
          </form>
        )}

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turma.disciplinas.map((td) => (
            <div key={td.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <Link href={`/turmas/${turma.id}/disciplinas/${td.id}`} className="font-semibold text-brand-700 hover:underline">
                  {td.disciplina.nome}
                </Link>
                <button
                  onClick={() => removerDisciplina(td.id, td.disciplina.nome)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400">{td.disciplina.ciclo ?? '—'}</p>
            </div>
          ))}
          {turma.disciplinas.length === 0 && (
            <p className="text-sm text-slate-400">
              Ainda não tem disciplinas associadas a esta turma. Associe a primeira acima.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

const cardClass =
  'rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md block';
const titleClass = 'font-semibold text-slate-900';
const descClass = 'text-sm text-slate-500';
