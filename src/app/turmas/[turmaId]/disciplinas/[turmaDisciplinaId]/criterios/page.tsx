'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
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
  const pesoOk = Math.abs(totalPeso - 1) < 0.001;

  return (
    <AppShell>
      <Link
        href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à disciplina
      </Link>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">Critérios de avaliação</h1>
      {!aCarregar && !erroCarregar && criterios.length > 0 && (
        <div className="mb-6">
          <Alert tone={pesoOk ? 'success' : 'warning'}>
            Soma dos pesos: {(totalPeso * 100).toFixed(0)}%
            {!pesoOk && ' — deve somar 100% para a nota final ser calculada'}
          </Alert>
        </div>
      )}

      {erroCarregar ? (
        <div className="mb-6">
          <Alert tone="danger">{erroCarregar}</Alert>
        </div>
      ) : aCarregar ? (
        <PageLoading />
      ) : grupos.length === 0 ? (
        <div className="mb-6">
          <Card>
            <EmptyState title="Ainda não tem critérios configurados" description="Adicione o primeiro abaixo." />
          </Card>
        </div>
      ) : (
        grupos.map((g) => (
          <div key={g} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</h2>
            <Card className="divide-y divide-slate-100">
              {criterios
                .filter((c) => c.grupo === g)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm text-slate-800">{c.nome}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        defaultValue={(c.peso * 100).toFixed(0)}
                        onBlur={(e) => atualizarPeso(c, e.target.value)}
                        className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm shadow-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                    <button
                      onClick={() => remover(c.id)}
                      aria-label="Remover critério"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </Card>
          </div>
        ))
      )}

      <Card as="form" onSubmit={adicionar} className="mt-8 flex flex-wrap items-end gap-3 p-4">
        <div>
          <Label htmlFor="grupo">Grupo</Label>
          <Input id="grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="ex: Atitudes" className="w-40" />
        </div>
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="nome-criterio">Nome do critério</Label>
          <Input id="nome-criterio" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="peso">Peso (%)</Label>
          <Input id="peso" type="number" value={pesoPct} onChange={(e) => setPesoPct(e.target.value)} className="w-24" />
        </div>
        <Button type="submit">
          <Plus className="h-4 w-4" />
          Adicionar critério
        </Button>
      </Card>
    </AppShell>
  );
}
