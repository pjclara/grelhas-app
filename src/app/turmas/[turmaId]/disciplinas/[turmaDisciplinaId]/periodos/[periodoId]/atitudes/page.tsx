'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Aluno, Instrumento } from '@/lib/types';

interface Inscricao {
  alunoId: string;
  ativo: boolean;
  aluno: Aluno;
}

/** notas[alunoId][instrumentoId] = valor (string para permitir campo vazio no input) */
type NotasGrelha = Record<string, Record<string, string>>;

export default function AtitudesPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string; periodoId: string };
}) {
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<NotasGrelha>({});
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [guardadoEm, setGuardadoEm] = useState<Date | null>(null);

  const disciplinaBase = `/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`;
  const voltarHref = `/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/periodos/${params.periodoId}/instrumentos`;

  async function carregar() {
    setACarregar(true);
    const [ri, ra] = await Promise.all([
      fetch(`${disciplinaBase}/instrumentos?periodoId=${params.periodoId}`),
      fetch(`${disciplinaBase}/alunos`),
    ]);
    if (!ri.ok || !ra.ok) {
      setErroCarregar('Não foi possível carregar a grelha de Atitudes.');
      setACarregar(false);
      return;
    }
    const todos: Instrumento[] = await ri.json();
    const resumoAtitudes = todos
      .filter((i) => i.criterio?.grupo === 'Atitudes')
      .sort((a, b) => (a.criterio?.ordem ?? a.ordem) - (b.criterio?.ordem ?? b.ordem));

    // A lista de instrumentos não inclui as notas — vão-se buscar os detalhes
    // de cada instrumento de Atitudes individualmente (esse GET já as inclui).
    const respostasDetalhe = await Promise.all(
      resumoAtitudes.map((i) => fetch(`${disciplinaBase}/instrumentos/${i.id}`))
    );
    if (respostasDetalhe.some((r) => !r.ok)) {
      setErroCarregar('Não foi possível carregar a grelha de Atitudes.');
      setACarregar(false);
      return;
    }
    const atitudes: Instrumento[] = await Promise.all(respostasDetalhe.map((r) => r.json()));

    const inscricoes: Inscricao[] = await ra.json();
    const listaAlunos: Aluno[] = inscricoes
      .filter((ins) => ins.ativo && ins.aluno.ativo)
      .map((ins) => ins.aluno)
      .sort((a, b) => a.numero - b.numero);

    setInstrumentos(atitudes);
    setAlunos(listaAlunos);

    const iniciais: NotasGrelha = {};
    for (const aluno of listaAlunos) {
      iniciais[aluno.id] = {};
      for (const inst of atitudes) {
        const pergunta = inst.perguntas[0];
        const nota = pergunta?.notas?.find((n) => n.alunoId === aluno.id);
        iniciais[aluno.id][inst.id] = nota?.valor != null ? String(nota.valor) : '';
      }
    }
    setNotas(iniciais);
    setErroCarregar(null);
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId, params.periodoId]);

  function atualizarNota(alunoId: string, instrumentoId: string, valor: string) {
    setNotas((prev) => ({ ...prev, [alunoId]: { ...prev[alunoId], [instrumentoId]: valor } }));
  }

  const totais = useMemo(() => {
    const max = instrumentos.reduce((acc, i) => acc + i.escalaMax, 0);
    const resultado: Record<string, { soma: number; max: number; preenchido: boolean }> = {};
    for (const aluno of alunos) {
      let soma = 0;
      let preenchido = false;
      for (const inst of instrumentos) {
        const v = notas[aluno.id]?.[inst.id];
        if (v !== undefined && v !== '') {
          preenchido = true;
          soma += Number(v);
        }
      }
      resultado[aluno.id] = { soma, max, preenchido };
    }
    return resultado;
  }, [alunos, instrumentos, notas]);

  async function guardar() {
    setAGuardar(true);
    const resultados = await Promise.all(
      instrumentos.map((inst) => {
        const pergunta = inst.perguntas[0];
        if (!pergunta) return Promise.resolve(new Response(null, { status: 200 }));
        const payload: Record<string, Record<string, number | null>> = {};
        for (const aluno of alunos) {
          const v = notas[aluno.id]?.[inst.id];
          payload[aluno.id] = { [pergunta.id]: v === '' || v === undefined ? null : Number(v) };
        }
        return fetch(`${disciplinaBase}/instrumentos/${inst.id}/notas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notas: payload }),
        });
      })
    );
    setAGuardar(false);
    if (resultados.every((r) => r.ok)) setGuardadoEm(new Date());
  }

  if (erroCarregar) {
    return (
      <div>
        <TopNav />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Link href={voltarHref} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
            ← Voltar aos instrumentos
          </Link>
          <p className="text-sm text-red-600">{erroCarregar}</p>
        </main>
      </div>
    );
  }

  if (aCarregar) {
    return (
      <div>
        <TopNav />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-sm text-slate-500">A carregar…</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link href={voltarHref} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← Voltar aos instrumentos
        </Link>
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Atitudes</h1>
        <p className="mb-4 text-sm text-slate-500">Escala de 1 a 5 por critério.</p>

        {instrumentos.length === 0 ? (
          <p className="text-sm text-slate-400">Ainda não há critérios de Atitudes configurados.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="grelha min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº</th>
                    <th className="px-3 py-2 text-left">Nome</th>
                    {instrumentos.map((inst) => (
                      <th key={inst.id} className="w-32 px-2 py-2 text-center">
                        {inst.criterio?.nome ?? inst.nome}
                        <div className="text-xs font-normal text-slate-400">/{inst.escalaMax}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((aluno) => {
                    const total = totais[aluno.id];
                    return (
                      <tr key={aluno.id}>
                        <td className="px-3 py-1.5">{aluno.numero}</td>
                        <td className="whitespace-nowrap px-3 py-1.5">{aluno.nome}</td>
                        {instrumentos.map((inst) => (
                          <td key={inst.id} className="px-1 py-1">
                            <input
                              type="number"
                              min={0}
                              max={inst.escalaMax}
                              step="1"
                              value={notas[aluno.id]?.[inst.id] ?? ''}
                              onChange={(e) => atualizarNota(aluno.id, inst.id, e.target.value)}
                              aria-label={`Nota de ${aluno.nome} em ${inst.criterio?.nome ?? inst.nome}`}
                              className="w-16 rounded border border-slate-200 px-1 py-0.5 text-center text-sm"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1.5 text-center font-medium">
                          {total?.preenchido ? `${total.soma}/${total.max}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {alunos.length === 0 && (
                    <tr>
                      <td colSpan={instrumentos.length + 3} className="px-3 py-4 text-center text-slate-400">
                        Não há alunos inscritos nesta disciplina.
                      </td>
                    </tr>
                  )}
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
          </>
        )}
      </main>
    </div>
  );
}
