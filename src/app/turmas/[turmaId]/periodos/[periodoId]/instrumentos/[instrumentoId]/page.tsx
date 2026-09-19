'use client';

import { useEffect, useMemo, useState } from 'react';
import TopNav from '@/components/TopNav';
import type { Aluno, Instrumento } from '@/lib/types';

interface NotaValor {
  [perguntaId: string]: string; // string para permitir campo vazio no input
}

export default function InstrumentoPage({
  params,
}: {
  params: { turmaId: string; periodoId: string; instrumentoId: string };
}) {
  const [instrumento, setInstrumento] = useState<Instrumento | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Record<string, NotaValor>>({});
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoEm, setGuardadoEm] = useState<Date | null>(null);

  async function carregar() {
    const [ri, ra] = await Promise.all([
      fetch(`/api/turmas/${params.turmaId}/instrumentos/${params.instrumentoId}`),
      fetch(`/api/turmas/${params.turmaId}/alunos`),
    ]);
    const inst = await ri.json();
    const listaAlunos: Aluno[] = (await ra.json()).filter((a: Aluno) => a.ativo);
    setInstrumento(inst);
    setAlunos(listaAlunos);

    const iniciais: Record<string, NotaValor> = {};
    for (const aluno of listaAlunos) {
      iniciais[aluno.id] = {};
      for (const pergunta of inst.perguntas) {
        const nota = pergunta.notas?.find((n: { alunoId: string }) => n.alunoId === aluno.id);
        iniciais[aluno.id][pergunta.id] = nota?.valor != null ? String(nota.valor) : '';
      }
    }
    setNotas(iniciais);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.instrumentoId]);

  function atualizarNota(alunoId: string, perguntaId: string, valor: string) {
    setNotas((prev) => ({ ...prev, [alunoId]: { ...prev[alunoId], [perguntaId]: valor } }));
  }

  const totais = useMemo(() => {
    if (!instrumento) return {};
    const resultado: Record<string, { soma: number; max: number; preenchido: boolean }> = {};
    const max =
      instrumento.modo === 'ESCALA'
        ? instrumento.escalaMax * instrumento.perguntas.length
        : instrumento.perguntas.reduce((acc, p) => acc + p.valorMax, 0);
    for (const aluno of alunos) {
      let soma = 0;
      let preenchido = false;
      for (const pergunta of instrumento.perguntas) {
        const v = notas[aluno.id]?.[pergunta.id];
        if (v !== undefined && v !== '') {
          preenchido = true;
          soma += Number(v);
        }
      }
      resultado[aluno.id] = { soma, max, preenchido };
    }
    return resultado;
  }, [alunos, instrumento, notas]);

  async function guardar() {
    if (!instrumento) return;
    setAGuardar(true);
    const payload: Record<string, Record<string, number | null>> = {};
    for (const aluno of alunos) {
      payload[aluno.id] = {};
      for (const pergunta of instrumento.perguntas) {
        const v = notas[aluno.id]?.[pergunta.id];
        payload[aluno.id][pergunta.id] = v === '' || v === undefined ? null : Number(v);
      }
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/instrumentos/${instrumento.id}/notas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: payload }),
    });
    setAGuardar(false);
    if (res.ok) setGuardadoEm(new Date());
  }

  if (!instrumento) {
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
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">{instrumento.nome}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {instrumento.criterio?.nome} ·{' '}
          {instrumento.modo === 'PONTOS' ? 'pontos por pergunta' : `escala de 1 a ${instrumento.escalaMax}`}
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="grelha min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Nº</th>
                <th className="px-3 py-2 text-left">Nome</th>
                {instrumento.perguntas.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center">
                    {p.codigo}
                    <div className="text-xs font-normal text-slate-400">/{p.valorMax}</div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center">Total</th>
                <th className="px-3 py-2 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => {
                const total = totais[aluno.id];
                return (
                  <tr key={aluno.id}>
                    <td className="px-3 py-1.5">{aluno.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">{aluno.nome}</td>
                    {instrumento.perguntas.map((p) => (
                      <td key={p.id} className="px-1 py-1">
                        <input
                          type="number"
                          min={0}
                          max={p.valorMax}
                          step="0.5"
                          value={notas[aluno.id]?.[p.id] ?? ''}
                          onChange={(e) => atualizarNota(aluno.id, p.id, e.target.value)}
                          className="w-16 rounded border border-slate-200 px-1 py-0.5 text-center text-sm"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center font-medium">
                      {total?.preenchido ? `${total.soma}/${total.max}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center font-medium">
                      {total?.preenchido ? `${((total.soma / total.max) * 100).toFixed(0)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={guardar}
            disabled={aGuardar}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {aGuardar ? 'A guardar…' : 'Guardar notas'}
          </button>
          {guardadoEm && (
            <span className="text-sm text-emerald-600">Guardado às {guardadoEm.toLocaleTimeString('pt-PT')}</span>
          )}
        </div>
      </main>
    </div>
  );
}
