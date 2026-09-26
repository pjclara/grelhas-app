'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
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
            {!pesoOk && ' — deve somar 100% para a nota final ser calculada; peça a um administrador para rever os pesos'}
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
              description="Não há critérios definidos para esta disciplina — peça a um administrador para os configurar em Critérios de Avaliação."
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
                    <span className="text-sm tabular-nums text-slate-700">{(c.peso * 100).toFixed(0)}%</span>
                  </div>
                ))}
            </Card>
          </div>
        ))
      )}

    </AppShell>
  );
}
