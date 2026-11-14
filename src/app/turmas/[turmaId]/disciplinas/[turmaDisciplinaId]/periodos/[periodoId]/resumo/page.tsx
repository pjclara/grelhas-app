'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, FileSpreadsheet } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/Spinner';
import { ehSecundario, type ResultadoAlunoDTO, type ResumoPeriodoDTO } from '@/lib/types';

export default function ResumoPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string; periodoId: string };
}) {
  const [resumo, setResumo] = useState<ResumoPeriodoDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const disciplinaBase = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;
  const voltarHref = `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;

  useEffect(() => {
    fetch(`${disciplinaBase}/periodos/${params.periodoId}/resumo`).then((r) => {
      if (!r.ok) {
        setErro('Não foi possível carregar o resumo.');
        return;
      }
      r.json().then(setResumo);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId, params.periodoId]);

  if (erro) {
    return (
      <AppShell width="full">
        <BackLink href={voltarHref} />
        <Alert tone="danger">{erro}</Alert>
      </AppShell>
    );
  }

  if (!resumo) {
    return (
      <AppShell width="full">
        <PageLoading />
      </AppShell>
    );
  }

  // Os níveis 1-5 só se aplicam ao 2.º/3.º ciclo; no Secundário a nota é diretamente 0-20
  // e "negativa" significa nota final < 10 valores, não níveis 1-2.
  const mostrarNivel = !ehSecundario(resumo.turma.nivelEnsino);
  const comNota20 = resumo.resultados.filter((r) => r.notaFinal20 != null);
  const percentNegativasSecundario =
    comNota20.length > 0
      ? (comNota20.filter((r) => (r.notaFinal20 as number) < 10).length / comNota20.length) * 100
      : null;

  // Cada coluna de critério (instrumento de recolha ou sub-instrumento) mostra uma
  // coluna por instrumento de avaliação, além da média. Até ao 9.º ano (2.º/3.º ciclo)
  // os valores são apresentados em %; no Secundário (10.º/11.º/12.º) na escala 0-200.
  const escala200 = ehSecundario(resumo.turma.nivelEnsino);
  const formatarValor = (v: number | null | undefined) =>
    v == null ? '—' : escala200 ? (v * 2).toFixed(0) : `${v.toFixed(0)}%`;

  // Os critérios de "Atitudes" (um por item, cada um com o seu próprio peso) são
  // condensados numa única coluna em vez de uma coluna por item — mostram-se
  // primeiro os critérios de conhecimentos/testes com o detalhe dos instrumentos,
  // e só depois a coluna agregada das atitudes.
  const criteriosAtitude = resumo.criterios.filter((c) => c.grupo.toLowerCase().includes('atitude'));
  const criteriosDetalhados = resumo.criterios.filter((c) => !criteriosAtitude.includes(c));
  const pesoAtitudes = criteriosAtitude.reduce((acc, c) => acc + c.peso, 0);
  const nomeAtitudes = criteriosAtitude[0]?.grupo ?? 'Atitudes';

  function mediaAtitudes(resultado: ResultadoAlunoDTO): number | null {
    const comValor = criteriosAtitude
      .map((c) => ({ peso: c.peso, media: resultado.porCriterio.find((r) => r.criterioId === c.id)?.media ?? null }))
      .filter((x): x is { peso: number; media: number } => x.media != null);
    const pesoTotal = comValor.reduce((acc, x) => acc + x.peso, 0);
    if (comValor.length === 0 || pesoTotal === 0) return null;
    return comValor.reduce((acc, x) => acc + x.peso * x.media, 0) / pesoTotal;
  }

  const instrumentosPorCriterio = criteriosDetalhados.map((c) => ({
    criterio: c,
    instrumentos: resumo.instrumentos.filter((i) => i.criterioId === c.id).sort((a, b) => a.ordem - b.ordem),
  }));

  // % de alunos com nota negativa (< 50%) no instrumento, para destacar no cabeçalho da coluna.
  const resultados = resumo.resultados;
  function percentNegativasInstrumento(instrumentoId: string): number | null {
    const valores = resultados
      .map((r) => r.porInstrumento.find((x) => x.instrumentoId === instrumentoId)?.percent)
      .filter((v): v is number => v != null);
    if (valores.length === 0) return null;
    return (valores.filter((v) => v < 50).length / valores.length) * 100;
  }

  // Linhas de rodapé: média da turma e % de negativas por coluna.
  // Colunas em % (instrumentos/critérios/atitudes): negativa = < 50%; Final: < 10; Nível: < 3.
  const notNull = (v: number | null | undefined): v is number => v != null;
  const mediaDe = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  const negativasDe = (v: number[], limite: number) =>
    v.length ? (v.filter((x) => x < limite).length / v.length) * 100 : null;
  const valoresInstrumento = (id: string) =>
    resultados.map((r) => r.porInstrumento.find((x) => x.instrumentoId === id)?.percent).filter(notNull);
  const valoresCriterio = (id: string) =>
    resultados.map((r) => r.porCriterio.find((x) => x.criterioId === id)?.media).filter(notNull);
  const valoresAtitudes = resultados.map(mediaAtitudes).filter(notNull);
  const valoresFinal = resultados.map((r) => r.notaFinal20).filter(notNull);
  const valoresNivel = resultados.map((r) => r.nivel).filter(notNull);

  const fmtPct = (v: number | null) => (v == null ? '—' : `${v.toFixed(0)}%`);
  type ColunaRodape = { key: string; valores: number[]; limite: number; tipo: 'percent' | 'nota' | 'nivel'; destaque: boolean };
  const colunasRodape: ColunaRodape[] = [
    ...instrumentosPorCriterio.flatMap(({ criterio: c, instrumentos }): ColunaRodape[] =>
      instrumentos.length === 0
        ? [{ key: c.id, valores: valoresCriterio(c.id), limite: 50, tipo: 'percent', destaque: true }]
        : [
            ...instrumentos.map((i): ColunaRodape => ({ key: i.id, valores: valoresInstrumento(i.id), limite: 50, tipo: 'percent', destaque: false })),
            { key: `${c.id}-media`, valores: valoresCriterio(c.id), limite: 50, tipo: 'percent', destaque: true },
          ]
    ),
    ...(criteriosAtitude.length > 0
      ? [{ key: 'atitudes', valores: valoresAtitudes, limite: 50, tipo: 'percent', destaque: true } as ColunaRodape]
      : []),
    { key: 'final', valores: valoresFinal, limite: 10, tipo: 'nota', destaque: true },
    ...(mostrarNivel
      ? [{ key: 'nivel', valores: valoresNivel, limite: 3, tipo: 'nivel', destaque: true } as ColunaRodape]
      : []),
  ];
  const fmtMediaRodape = (c: ColunaRodape) => {
    const m = mediaDe(c.valores);
    if (m == null) return '—';
    if (c.tipo === 'percent') return formatarValor(m);
    return m.toFixed(c.tipo === 'nota' ? 1 : 2);
  };

  return (
    <AppShell width="full">
      <div className="mx-auto max-w-none">
        <Breadcrumbs
          items={[
            { label: 'As minhas turmas', href: '/dashboard' },
            { label: resumo.turma.nome, href: `/turmas/${params.turmaId}` },
            { label: resumo.turma.disciplina, href: voltarHref },
            { label: 'Resumo' },
          ]}
        />
        <p className="text-sm text-slate-500">
          {resumo.turma.disciplina} · {resumo.turma.anoLetivo} · {resumo.turma.nome}
        </p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Resumo — {resumo.periodo.nome}</h1>
          <div className="flex gap-2">
            <a
              href={`${disciplinaBase}/periodos/${params.periodoId}/export/pdf`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-xs transition-colors duration-150 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </a>
            <a
              href={`${disciplinaBase}/periodos/${params.periodoId}/export/xlsx`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-xs transition-colors duration-150 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2" rowSpan={2}>Nº</th>
                <th className="px-3 py-2" rowSpan={2}>Nome</th>
                {instrumentosPorCriterio.map(({ criterio: c, instrumentos }) =>
                  instrumentos.length > 0 ? (
                    <th key={c.id} className="px-2 py-2 text-center" colSpan={instrumentos.length + 1}>
                      {c.nome}
                      <div className="text-xs font-normal normal-case text-slate-400">{Math.round(c.peso * 100)}%</div>
                    </th>
                  ) : (
                    <th key={c.id} className="px-3 py-2 text-center" rowSpan={2}>
                      {c.nome}
                      <div className="text-xs font-normal normal-case text-slate-400">{Math.round(c.peso * 100)}%</div>
                    </th>
                  )
                )}
                {criteriosAtitude.length > 0 && (
                  <th className="px-3 py-2 text-center" rowSpan={2}>
                    {nomeAtitudes}
                    <div className="text-xs font-normal normal-case text-slate-400">{Math.round(pesoAtitudes * 100)}%</div>
                  </th>
                )}
                <th className="px-3 py-2 text-center" rowSpan={2}>Final (0-20)</th>
                {mostrarNivel && <th className="px-3 py-2 text-center" rowSpan={2}>Nível</th>}
              </tr>
              <tr>
                {instrumentosPorCriterio.flatMap(({ criterio: c, instrumentos }) =>
                  instrumentos.length > 0
                    ? [
                        ...instrumentos.map((i) => {
                          const pctNegativas = percentNegativasInstrumento(i.id);
                          return (
                            <th key={i.id} className="whitespace-nowrap px-2 py-1 text-center text-xs font-normal normal-case text-slate-500">
                              {pctNegativas != null && (
                                <span
                                  className="mr-1 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600"
                                  title="% de alunos com nota negativa neste instrumento"
                                >
                                  {pctNegativas.toFixed(0)}%
                                </span>
                              )}
                              {i.nome}
                            </th>
                          );
                        }),
                        <th key={`${c.id}-media`} className="px-2 py-1 text-center text-xs font-medium normal-case text-slate-600">
                          Média
                        </th>,
                      ]
                    : []
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resumo.alunos.map((aluno) => {
                const resultado = resumo.resultados.find((r) => r.alunoId === aluno.id)!;
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-1.5 tabular-nums text-slate-500">{aluno.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{aluno.nome}</td>
                    {instrumentosPorCriterio.flatMap(({ criterio: c, instrumentos }) => {
                      const media = resultado.porCriterio.find((x) => x.criterioId === c.id);
                      if (instrumentos.length === 0) {
                        return [
                          <td key={c.id} className="px-3 py-1.5 text-center tabular-nums">
                            {formatarValor(media?.media)}
                          </td>,
                        ];
                      }
                      return [
                        ...instrumentos.map((i) => {
                          const r = resultado.porInstrumento.find((x) => x.instrumentoId === i.id);
                          return (
                            <td key={i.id} className="px-2 py-1.5 text-center tabular-nums text-slate-500">
                              {formatarValor(r?.percent)}
                            </td>
                          );
                        }),
                        <td key={`${c.id}-media`} className="px-2 py-1.5 text-center tabular-nums font-medium text-slate-900">
                          {formatarValor(media?.media)}
                        </td>,
                      ];
                    })}
                    {criteriosAtitude.length > 0 && (
                      <td className="px-3 py-1.5 text-center tabular-nums font-medium text-slate-900">
                        {formatarValor(mediaAtitudes(resultado))}
                      </td>
                    )}
                    <td className="px-3 py-1.5 text-center tabular-nums font-semibold text-slate-900">
                      {resultado.notaFinal20 != null ? resultado.notaFinal20.toFixed(1) : '—'}
                    </td>
                    {mostrarNivel && (
                      <td className="px-3 py-1.5 text-center tabular-nums font-medium text-slate-900">
                        {resultado.nivel ?? '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <th colSpan={2} className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Média da turma
                </th>
                {colunasRodape.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2 py-1.5 text-center tabular-nums ${c.destaque ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
                  >
                    {fmtMediaRodape(c)}
                  </td>
                ))}
              </tr>
              <tr>
                <th colSpan={2} className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  % negativas
                </th>
                {colunasRodape.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-center tabular-nums font-medium text-red-600">
                    {fmtPct(negativasDe(c.valores, c.limite))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Estatistica titulo="Média da turma (0-20)" valor={resumo.estatisticas.mediaTurma20?.toFixed(2) ?? '—'} />
          {mostrarNivel ? (
            <>
              <Estatistica
                titulo="% negativas (níveis 1-2)"
                valor={
                  resumo.estatisticas.percentNegativas != null
                    ? `${resumo.estatisticas.percentNegativas.toFixed(0)}%`
                    : '—'
                }
              />
              <Card className="p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Alunos por nível</p>
                <div className="flex gap-3 text-sm">
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <span key={n} className="text-slate-600">
                      N{n}: <strong className="text-slate-900">{resumo.estatisticas.contagemPorNivel[n]}</strong>
                    </span>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Estatistica
              titulo="% negativas (< 10 valores)"
              valor={percentNegativasSecundario != null ? `${percentNegativasSecundario.toFixed(0)}%` : '—'}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
      <ArrowLeft className="h-4 w-4" /> Voltar à disciplina
    </Link>
  );
}

function Estatistica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card className="p-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
    </Card>
  );
}
