'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';

interface Grelha {
  nome: string;
  periodo: { id: string; nome: string };
  escalaMax: number;
  colunas: Array<{ id: string; nome: string; peso: number; pesoDefinido: boolean }>;
  alunos: Array<{ id: string; numero: number; nome: string }>;
  notas: Record<string, Record<string, number | null>>;
}

type Valores = Record<string, Record<string, string>>; // string para permitir célula vazia

function paraValores(g: Grelha): Valores {
  const v: Valores = {};
  for (const aluno of g.alunos) {
    v[aluno.id] = {};
    for (const c of g.colunas) {
      const n = g.notas[aluno.id]?.[c.id];
      v[aluno.id][c.id] = n != null ? String(n) : '';
    }
  }
  return v;
}

export default function GrelhaPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string; periodoId: string; chave: string };
}) {
  const chave = decodeURIComponent(params.chave);
  const api = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/grelhas/${encodeURIComponent(chave)}`;
  const voltarHref = `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos`;

  const [grelha, setGrelha] = useState<Grelha | null>(null);
  const [valores, setValores] = useState<Valores>({});
  const [original, setOriginal] = useState<Valores>({});
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoEm, setGuardadoEm] = useState<Date | null>(null);

  async function carregar() {
    const r = await fetch(api);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setErroCarregar(body.error ?? 'Não foi possível carregar a grelha.');
      return;
    }
    const g: Grelha = await r.json();
    setGrelha(g);
    const v = paraValores(g);
    setValores(v);
    setOriginal(v);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId, params.periodoId, params.chave]);

  function alterar(alunoId: string, colunaId: string, valor: string) {
    setValores((prev) => ({ ...prev, [alunoId]: { ...prev[alunoId], [colunaId]: valor } }));
    setGuardadoEm(null);
  }

  /** Só as células alteradas desde o último carregamento/gravação. */
  function alteracoes() {
    const notas: Record<string, Record<string, number | null>> = {};
    for (const [alunoId, porColuna] of Object.entries(valores)) {
      for (const [colunaId, texto] of Object.entries(porColuna)) {
        if (texto === original[alunoId]?.[colunaId]) continue;
        const numero = texto.trim() === '' ? null : Number(texto.replace(',', '.'));
        (notas[alunoId] ??= {})[colunaId] = numero;
      }
    }
    return notas;
  }

  async function guardar() {
    if (!grelha) return;
    setErro(null);
    for (const [alunoId, porColuna] of Object.entries(valores)) {
      for (const texto of Object.values(porColuna)) {
        if (texto.trim() === '') continue;
        const n = Number(texto.replace(',', '.'));
        if (!Number.isFinite(n) || n < 1 || n > grelha.escalaMax) {
          const aluno = grelha.alunos.find((a) => a.id === alunoId);
          setErro(`As notas têm de estar entre 1 e ${grelha.escalaMax} (verifique ${aluno?.nome ?? 'a grelha'}).`);
          return;
        }
      }
    }
    const notas = alteracoes();
    if (Object.keys(notas).length === 0) {
      setGuardadoEm(new Date());
      return;
    }
    setAGuardar(true);
    const res = await fetch(api, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas }),
    });
    setAGuardar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível guardar as notas.');
      return;
    }
    setOriginal(valores);
    setGuardadoEm(new Date());
  }

  const porGuardar = Object.keys(alteracoes()).length > 0;

  return (
    <AppShell width="full">
      <div className="mx-auto max-w-screen-2xl">
        <Link
          href={voltarHref}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos instrumentos
        </Link>

        {erroCarregar ? (
          <Alert tone="danger">{erroCarregar}</Alert>
        ) : !grelha ? (
          <PageLoading />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{grelha.nome}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {grelha.periodo.nome} · notas de 1 a {grelha.escalaMax} por aluno e instrumento
                </p>
              </div>
              <div className="flex items-center gap-3">
                {guardadoEm && !porGuardar && (
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Guardado
                  </span>
                )}
                {porGuardar && <span className="text-sm text-amber-700">Alterações por guardar</span>}
                <Button type="button" onClick={guardar} loading={aGuardar} disabled={!porGuardar}>
                  Guardar notas
                </Button>
              </div>
            </div>

            {erro && (
              <div className="mb-4">
                <Alert tone="danger">{erro}</Alert>
              </div>
            )}

            {grelha.alunos.length === 0 ? (
              <Alert tone="warning">Esta disciplina ainda não tem alunos inscritos.</Alert>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Nº</th>
                      <th className="px-3 py-2">Nome</th>
                      {grelha.colunas.map((c) => (
                        <th key={c.id} className="px-3 py-2 text-center">
                          {c.nome}
                          {c.pesoDefinido && (
                            <div className="text-xs font-normal normal-case text-slate-400">
                              {Math.round(c.peso * 1000) / 10}%
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grelha.alunos.map((aluno) => (
                      <tr key={aluno.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-1.5 tabular-nums text-slate-500">{aluno.numero}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{aluno.nome}</td>
                        {grelha.colunas.map((c) => (
                          <td key={c.id} className="px-2 py-1 text-center">
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={1}
                              max={grelha.escalaMax}
                              step="any"
                              value={valores[aluno.id]?.[c.id] ?? ''}
                              onChange={(e) => alterar(aluno.id, c.id, e.target.value)}
                              aria-label={`Nota de ${aluno.nome} em ${c.nome}`}
                              className="mx-auto w-20 text-center"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
