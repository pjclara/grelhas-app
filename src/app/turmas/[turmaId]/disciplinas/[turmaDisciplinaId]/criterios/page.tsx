'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Download } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import type { Criterio } from '@/lib/types';

interface CriterioDisponivel {
  instrumentoAvaliacaoId: string;
  grupo: string;
  nome: string;
  pesoCatalogo: number | null;
}

export default function CriteriosPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string };
}) {
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [disponiveis, setDisponiveis] = useState<CriterioDisponivel[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [instrumentoAvaliacaoId, setInstrumentoAvaliacaoId] = useState('');
  const [pesoPct, setPesoPct] = useState('');

  const [aImportar, setAImportar] = useState(false);
  const [mensagemImportar, setMensagemImportar] = useState<string | null>(null);
  const [erroImportar, setErroImportar] = useState<string | null>(null);

  const base = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/criterios`;

  async function carregar() {
    setACarregar(true);
    const [r, rDisponiveis] = await Promise.all([fetch(base), fetch(`${base}/catalogo`)]);
    if (!r.ok || !rDisponiveis.ok) {
      setErroCarregar('Não foi possível carregar os critérios.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setCriterios(await r.json());
    setDisponiveis(await rDisponiveis.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId]);

  const totalPeso = criterios.reduce((acc, c) => acc + c.peso, 0);

  function selecionarDisponivel(id: string) {
    setInstrumentoAvaliacaoId(id);
    const d = disponiveis.find((x) => x.instrumentoAvaliacaoId === id);
    setPesoPct(d?.pesoCatalogo != null ? String(Math.round(d.pesoCatalogo * 100)) : '');
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!instrumentoAvaliacaoId || !pesoPct) return;
    await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instrumentoAvaliacaoId,
        peso: Number(pesoPct) / 100,
        ordem: criterios.length,
      }),
    });
    setInstrumentoAvaliacaoId('');
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

  async function importarDoCatalogo() {
    setErroImportar(null);
    setMensagemImportar(null);
    setAImportar(true);
    const res = await fetch(`${base}/importar`, { method: 'POST' });
    setAImportar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroImportar(body.error ?? 'Não foi possível importar do catálogo.');
      return;
    }
    const body: { importados: number; criterios: Criterio[] } = await res.json();
    setCriterios(body.criterios);
    setMensagemImportar(
      body.importados > 0
        ? `${body.importados} critério(s) importado(s) do catálogo.`
        : 'Não há critérios novos para importar (catálogo vazio para esta disciplina/ano letivo, ou já foram todos importados).'
    );
  }

  async function remover(id: string) {
    if (
      !confirm(
        'Desativar este critério nesta turma? Os instrumentos associados e as respetivas notas são apagados.'
      )
    )
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
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Critérios de avaliação</h1>
        <Button type="button" variant="secondary" onClick={importarDoCatalogo} loading={aImportar}>
          <Download className="h-4 w-4" />
          Importar do catálogo
        </Button>
      </div>
      {mensagemImportar && (
        <div className="mb-4">
          <Alert tone="success">{mensagemImportar}</Alert>
        </div>
      )}
      {erroImportar && (
        <div className="mb-4">
          <Alert tone="danger">{erroImportar}</Alert>
        </div>
      )}
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
            <EmptyState
              title="Ainda não tem critérios configurados"
              description={
                disponiveis.length > 0
                  ? 'Ative um critério do catálogo abaixo, ou importe todos de uma vez.'
                  : 'Não há critérios no catálogo global para esta disciplina — peça a um administrador para os configurar em Critérios de Avaliação.'
              }
            />
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

      {disponiveis.length > 0 && (
        <Card as="form" onSubmit={adicionar} className="mt-8 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[240px] flex-1">
            <Label htmlFor="criterio-catalogo">Ativar critério do catálogo</Label>
            <Select
              id="criterio-catalogo"
              value={instrumentoAvaliacaoId}
              onChange={(e) => selecionarDisponivel(e.target.value)}
            >
              <option value="">Selecionar…</option>
              {disponiveis.map((d) => (
                <option key={d.instrumentoAvaliacaoId} value={d.instrumentoAvaliacaoId}>
                  {d.grupo} — {d.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="peso">Peso (%)</Label>
            <Input id="peso" type="number" value={pesoPct} onChange={(e) => setPesoPct(e.target.value)} className="w-24" />
          </div>
          <Button type="submit" disabled={!instrumentoAvaliacaoId}>
            <Plus className="h-4 w-4" />
            Ativar critério
          </Button>
        </Card>
      )}
    </AppShell>
  );
}
