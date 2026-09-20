'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { ResumoPeriodoDTO } from '@/lib/types';

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
      <div>
        <TopNav />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Link href={voltarHref} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← Voltar à disciplina
          </Link>
          <p className="text-sm text-red-600">{erro}</p>
        </main>
      </div>
    );
  }

  if (!resumo) {
    return (
      <div>
        <TopNav />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-slate-500">A carregar…</p>
        </main>
      </div>
    );
  }

  // Os níveis 1-5 só se aplicam ao 2.º/3.º ciclo; no Secundário a nota é diretamente 0-20
  // e "negativa" significa nota final < 10 valores, não níveis 1-2.
  const mostrarNivel = resumo.turma.nivelEnsino !== 'Secundário';
  const comNota20 = resumo.resultados.filter((r) => r.notaFinal20 != null);
  const percentNegativasSecundario =
    comNota20.length > 0
      ? (comNota20.filter((r) => (r.notaFinal20 as number) < 10).length / comNota20.length) * 100
      : null;

  // Para os critérios fora do grupo "Atitudes" (ex.: Conhecimentos e Capacidades), mostra-se
  // uma coluna por instrumento (além da média do critério) — em Atitudes cada critério já
  // corresponde a um único instrumento, pelo que a coluna do critério já mostra esse valor.
  const instrumentosPorCriterio = resumo.criterios.map((c) => ({
    criterio: c,
    instrumentos:
      c.grupo === 'Atitudes'
        ? []
        : resumo.instrumentos.filter((i) => i.criterioId === c.id).sort((a, b) => a.ordem - b.ordem),
  }));

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-screen-2xl px-6 py-8">
        <Link href={voltarHref} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← Voltar à disciplina
        </Link>
        <p className="text-sm text-slate-500">
          {resumo.turma.disciplina} · {resumo.turma.anoLetivo} · {resumo.turma.nome}
        </p>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Resumo — {resumo.periodo.nome}</h1>
          <div className="flex gap-2">
            <a
              href={`${disciplinaBase}/periodos/${params.periodoId}/export/pdf`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Exportar PDF
            </a>
            <a
              href={`${disciplinaBase}/periodos/${params.periodoId}/export/xlsx`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Exportar Excel
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2" rowSpan={2}>Nº</th>
                <th className="px-3 py-2" rowSpan={2}>Nome</th>
                {instrumentosPorCriterio.map(({ criterio: c, instrumentos }) =>
                  instrumentos.length > 0 ? (
                    <th key={c.id} className="px-2 py-2 text-center" colSpan={instrumentos.length + 1}>
                      {c.nome}
                      <div className="text-xs font-normal text-slate-400">{Math.round(c.peso * 100)}%</div>
                    </th>
                  ) : (
                    <th key={c.id} className="px-3 py-2 text-center" rowSpan={2}>
                      {c.nome}
                      <div className="text-xs font-normal text-slate-400">{Math.round(c.peso * 100)}%</div>
                    </th>
                  )
                )}
                <th className="px-3 py-2 text-center" rowSpan={2}>Final (0-20)</th>
                {mostrarNivel && <th className="px-3 py-2 text-center" rowSpan={2}>Nível</th>}
              </tr>
              <tr>
                {instrumentosPorCriterio.flatMap(({ criterio: c, instrumentos }) =>
                  instrumentos.length > 0
                    ? [
                        ...instrumentos.map((i) => (
                          <th key={i.id} className="whitespace-nowrap px-2 py-1 text-center text-xs font-normal text-slate-500">
                            {i.nome}
                          </th>
                        )),
                        <th key={`${c.id}-media`} className="px-2 py-1 text-center text-xs font-medium text-slate-600">
                          Média
                        </th>,
                      ]
                    : []
                )}
              </tr>
            </thead>
            <tbody>
              {resumo.alunos.map((aluno) => {
                const resultado = resumo.resultados.find((r) => r.alunoId === aluno.id)!;
                return (
                  <tr key={aluno.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{aluno.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">{aluno.nome}</td>
                    {instrumentosPorCriterio.flatMap(({ criterio: c, instrumentos }) => {
                      const media = resultado.porCriterio.find((x) => x.criterioId === c.id);
                      if (instrumentos.length === 0) {
                        return [
                          <td key={c.id} className="px-3 py-1.5 text-center">
                            {media?.media != null ? `${media.media.toFixed(0)}%` : '—'}
                          </td>,
                        ];
                      }
                      return [
                        ...instrumentos.map((i) => {
                          const r = resultado.porInstrumento.find((x) => x.instrumentoId === i.id);
                          return (
                            <td key={i.id} className="px-2 py-1.5 text-center text-slate-500">
                              {r?.percent != null ? `${r.percent.toFixed(0)}%` : '—'}
                            </td>
                          );
                        }),
                        <td key={`${c.id}-media`} className="px-2 py-1.5 text-center font-medium">
                          {media?.media != null ? `${media.media.toFixed(0)}%` : '—'}
                        </td>,
                      ];
                    })}
                    <td className="px-3 py-1.5 text-center font-medium">
                      {resultado.notaFinal20 != null ? resultado.notaFinal20.toFixed(1) : '—'}
                    </td>
                    {mostrarNivel && (
                      <td className="px-3 py-1.5 text-center font-medium">
                        {resultado.nivel ?? '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Estatistica
            titulo="Média da turma (0-20)"
            valor={resumo.estatisticas.mediaTurma20?.toFixed(2) ?? '—'}
          />
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
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium uppercase text-slate-500">Alunos por nível</p>
                <div className="flex gap-3 text-sm">
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <span key={n}>
                      N{n}: <strong>{resumo.estatisticas.contagemPorNivel[n]}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Estatistica
              titulo="% negativas (< 10 valores)"
              valor={percentNegativasSecundario != null ? `${percentNegativasSecundario.toFixed(0)}%` : '—'}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Estatistica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-1 text-xs font-medium uppercase text-slate-500">{titulo}</p>
      <p className="text-2xl font-semibold text-slate-900">{valor}</p>
    </div>
  );
}
