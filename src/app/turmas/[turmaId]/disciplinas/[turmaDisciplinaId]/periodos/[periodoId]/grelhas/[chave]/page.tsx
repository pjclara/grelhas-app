'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';

interface Grelha {
  nome: string;
  periodo: { id: string; nome: string };
  ocorrencia: number;
  ocorrencias: number[];
  data: string | null;
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
  const [ocorrencia, setOcorrencia] = useState(1);
  const api = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/grelhas/${encodeURIComponent(chave)}?ocorrencia=${ocorrencia}`;
  const voltarHref = `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos`;

  const [grelha, setGrelha] = useState<Grelha | null>(null);
  const [nomes, setNomes] = useState<{ turma: string; disciplina: string } | null>(null);
  const [dataAvaliacao, setDataAvaliacao] = useState('');
  const [valores, setValores] = useState<Valores>({});
  const [original, setOriginal] = useState<Valores>({});
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoEm, setGuardadoEm] = useState<Date | null>(null);

  async function carregar() {
    const [r, rtd] = await Promise.all([
      fetch(api),
      fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`),
    ]);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setErroCarregar(body.error ?? 'Não foi possível carregar a grelha.');
      return;
    }
    if (rtd.ok) {
      const td = await rtd.json();
      setNomes({ turma: td.turma?.nome ?? '…', disciplina: td.disciplina.nome });
    }
    const g: Grelha = await r.json();
    setGrelha(g);
    setDataAvaliacao((g.data ?? new Date().toISOString()).slice(0, 10));
    const v = paraValores(g);
    setValores(v);
    setOriginal(v);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId, params.periodoId, params.chave, ocorrencia]);

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
    if (!dataAvaliacao) {
      setErro('Indique a data desta avaliação.');
      return;
    }
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
    if (Object.keys(notas).length === 0 && !dataMudou) {
      setGuardadoEm(new Date());
      return;
    }
    setAGuardar(true);
    const res = await fetch(api, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas, data: dataAvaliacao }),
    });
    setAGuardar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível guardar as notas.');
      return;
    }
    setOriginal(valores);
    setGrelha((g) => (g ? { ...g, data: new Date(dataAvaliacao).toISOString() } : g));
    setGuardadoEm(new Date());
  }

  const dataMudou = dataAvaliacao !== (grelha?.data ?? '').slice(0, 10);
  const porGuardar = Object.keys(alteracoes()).length > 0 || dataMudou;

  /** Soma das notas já lançadas (ou em edição) de um aluno nesta grelha; null se nenhuma estiver preenchida. */
  function somaAluno(alunoId: string): number | null {
    const porColuna = valores[alunoId];
    if (!porColuna) return null;
    let soma = 0;
    let algumaPreenchida = false;
    for (const c of grelha?.colunas ?? []) {
      const texto = porColuna[c.id];
      if (!texto || texto.trim() === '') continue;
      const n = Number(texto.replace(',', '.'));
      if (!Number.isFinite(n)) continue;
      algumaPreenchida = true;
      soma += n;
    }
    return algumaPreenchida ? soma : null;
  }

  function mudarOcorrencia(n: number) {
    if (n === ocorrencia) return;
    if (porGuardar && !confirm('Há alterações por guardar nesta avaliação. Descartá-las?')) return;
    setGuardadoEm(null);
    setErro(null);
    setOcorrencia(n);
  }

  return (
    <AppShell width="full">
      <div className="mx-auto max-w-screen-2xl">
        {erroCarregar ? (
          <>
            <Link
              href={voltarHref}
              className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar aos instrumentos
            </Link>
            <Alert tone="danger">{erroCarregar}</Alert>
          </>
        ) : !grelha ? (
          <PageLoading />
        ) : (
          <>
            <Breadcrumbs
              items={[
                { label: 'As minhas turmas', href: '/dashboard' },
                { label: nomes?.turma ?? '…', href: `/turmas/${params.turmaId}` },
                {
                  label: nomes?.disciplina ?? '…',
                  href: `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`,
                },
                { label: 'Instrumentos', href: voltarHref },
                { label: grelha.nome },
              ]}
            />
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

            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="data-avaliacao" className="mb-1 block text-xs font-medium text-slate-600">
                  Data desta avaliação
                </label>
                <Input
                  id="data-avaliacao"
                  type="date"
                  value={dataAvaliacao}
                  onChange={(e) => {
                    setDataAvaliacao(e.target.value);
                    setGuardadoEm(null);
                  }}
                  className="w-40"
                />
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Avaliações do período">
              {grelha.ocorrencias.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={n === grelha.ocorrencia ? 'primary' : 'secondary'}
                  aria-pressed={n === grelha.ocorrencia}
                  onClick={() => mudarOcorrencia(n)}
                >
                  {n}.ª avaliação
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => mudarOcorrencia(Math.max(...grelha.ocorrencias) + 1)}
              >
                <Plus className="h-4 w-4" /> Nova avaliação
              </Button>
              {grelha.ocorrencias.length > 1 && (
                <span className="text-xs text-slate-500">A nota do critério é a média das avaliações lançadas.</span>
              )}
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
                      <th className="px-3 py-2 text-center">
                        Soma
                        <div className="text-xs font-normal normal-case text-slate-400">
                          máx. {grelha.colunas.length * grelha.escalaMax}
                        </div>
                      </th>
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
                        <td className="px-3 py-1.5 text-center tabular-nums font-semibold text-slate-900">
                          {somaAluno(aluno.id) ?? '—'}
                        </td>
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
