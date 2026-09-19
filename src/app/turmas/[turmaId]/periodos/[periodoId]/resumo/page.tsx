'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import type { ResumoPeriodoDTO } from '@/lib/types';

export default function ResumoPage({
  params,
}: {
  params: { turmaId: string; periodoId: string };
}) {
  const [resumo, setResumo] = useState<ResumoPeriodoDTO | null>(null);

  useEffect(() => {
    fetch(`/api/turmas/${params.turmaId}/periodos/${params.periodoId}/resumo`)
      .then((r) => r.json())
      .then(setResumo);
  }, [params.turmaId, params.periodoId]);

  if (!resumo) {
    return (
      <div>
        <TopNav />
        <p className="p-6 text-sm text-slate-500">A carregar…</p>
      </div>
    );
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm text-slate-500">
          {resumo.turma.disciplina} · {resumo.turma.anoLetivo} · {resumo.turma.nome}
        </p>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Resumo — {resumo.periodo.nome}</h1>
          <div className="flex gap-2">
            <a
              href={`/api/turmas/${params.turmaId}/periodos/${params.periodoId}/export/pdf`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Exportar PDF
            </a>
            <a
              href={`/api/turmas/${params.turmaId}/periodos/${params.periodoId}/export/xlsx`}
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
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Nome</th>
                {resumo.criterios.map((c) => (
                  <th key={c.id} className="px-3 py-2 text-center">
                    {c.nome}
                    <div className="text-xs font-normal text-slate-400">{Math.round(c.peso * 100)}%</div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Final (0-20)</th>
                <th className="px-3 py-2 text-center">Nível</th>
              </tr>
            </thead>
            <tbody>
              {resumo.alunos.map((aluno) => {
                const resultado = resumo.resultados.find((r) => r.alunoId === aluno.id)!;
                return (
                  <tr key={aluno.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{aluno.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">{aluno.nome}</td>
                    {resumo.criterios.map((c) => {
                      const r = resultado.porCriterio.find((x) => x.criterioId === c.id);
                      return (
                        <td key={c.id} className="px-3 py-1.5 text-center">
                          {r?.media != null ? `${r.media.toFixed(0)}%` : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-center font-medium">
                      {resultado.notaFinal20 != null ? resultado.notaFinal20.toFixed(1) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center font-medium">
                      {resultado.nivel ?? '—'}
                    </td>
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
