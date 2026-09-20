'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Criterio } from '@/lib/types';

export default function CriteriosPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string };
}) {
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [grupo, setGrupo] = useState('');
  const [nome, setNome] = useState('');
  const [pesoPct, setPesoPct] = useState('');

  const base = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/criterios`;

  async function carregar() {
    setACarregar(true);
    const r = await fetch(base);
    if (!r.ok) {
      setErroCarregar('Não foi possível carregar os critérios.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setCriterios(await r.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId]);

  const totalPeso = criterios.reduce((acc, c) => acc + c.peso, 0);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!grupo || !nome || !pesoPct) return;
    await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grupo,
        nome,
        peso: Number(pesoPct) / 100,
        ordem: criterios.length,
      }),
    });
    setGrupo('');
    setNome('');
    setPesoPct('');
    carregar();
  }

  async function atualizarPeso(criterio: Criterio, novoPesoPct: string) {
    const peso = Number(novoPesoPct) / 100;
    if (Number.isNaN(peso)) return;
    setCriterios((prev) => prev.map((c) => (c.id === criterio.id ? { ...c, peso } : c)));
    await fetch(`${base}/${criterio.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peso }),
    });
  }

  async function remover(id: string) {
    if (!confirm('Remover este critério? Os instrumentos associados ficam sem critério e devem ser reatribuídos.'))
      return;
    await fetch(`${base}/${id}`, { method: 'DELETE' });
    carregar();
  }

  const grupos = Array.from(new Set(criterios.map((c) => c.grupo)));

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`}
          className="mb-2 inline-block text-sm text-brand-600 hover:underline"
        >
          ← Voltar à disciplina
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Critérios de avaliação</h1>
        {!aCarregar && !erroCarregar && (
          <p className={`mb-6 text-sm ${Math.abs(totalPeso - 1) < 0.001 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Soma dos pesos: {(totalPeso * 100).toFixed(0)}%{' '}
            {Math.abs(totalPeso - 1) > 0.001 && '— deve somar 100% para a nota final ser calculada'}
          </p>
        )}

        {erroCarregar ? (
          <p className="mb-6 text-sm text-red-600">{erroCarregar}</p>
        ) : aCarregar ? (
          <p className="mb-6 text-sm text-slate-500">A carregar…</p>
        ) : grupos.length === 0 ? (
          <p className="mb-6 text-sm text-slate-400">Ainda não tem critérios configurados. Adicione o primeiro abaixo.</p>
        ) : (
        grupos.map((g) => (
          <div key={g} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{g}</h2>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {criterios
                .filter((c) => c.grupo === g)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm text-slate-800">{c.nome}</span>
                    <input
                      type="number"
                      defaultValue={(c.peso * 100).toFixed(0)}
                      onBlur={(e) => atualizarPeso(c, e.target.value)}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                    />
                    <span className="text-sm text-slate-500">%</span>
                    <button onClick={() => remover(c.id)} className="text-sm text-red-600 hover:underline">
                      Remover
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )))}

        <form onSubmit={adicionar} className="mt-8 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Grupo</label>
            <input
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              placeholder="ex: Atitudes"
              className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome do critério</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Peso (%)</label>
            <input
              type="number"
              value={pesoPct}
              onChange={(e) => setPesoPct(e.target.value)}
              className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Adicionar critério
          </button>
        </form>
      </main>
    </div>
  );
}
