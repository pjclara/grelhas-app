'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Criterio, Instrumento, ModoAvaliacao } from '@/lib/types';

interface PerguntaForm {
  id?: string;
  codigo: string;
  valorMax: string;
}

export default function InstrumentosPage({
  params,
}: {
  params: { turmaId: string; periodoId: string };
}) {
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [criterioId, setCriterioId] = useState('');
  const [modo, setModo] = useState<ModoAvaliacao>('PONTOS');
  const [escalaMax, setEscalaMax] = useState('5');
  const [tema, setTema] = useState('');
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>([{ codigo: '1.', valorMax: '' }]);
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  async function carregar() {
    setACarregar(true);
    const [ri, rc] = await Promise.all([
      fetch(`/api/turmas/${params.turmaId}/instrumentos?periodoId=${params.periodoId}`),
      fetch(`/api/turmas/${params.turmaId}/criterios`),
    ]);
    if (!ri.ok || !rc.ok) {
      setErroCarregar('Não foi possível carregar os instrumentos.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setInstrumentos(await ri.json());
    setCriterios(await rc.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
  }, [params.turmaId, params.periodoId]);

  function atualizarPergunta(i: number, campo: keyof PerguntaForm, valor: string) {
    setPerguntas((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }

  function adicionarPergunta() {
    setPerguntas((prev) => [...prev, { codigo: '', valorMax: '' }]);
  }

  function removerPergunta(i: number) {
    setPerguntas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function abrirNovo() {
    setEditandoId(null);
    setNome('');
    setCriterioId('');
    setModo('PONTOS');
    setEscalaMax('5');
    setTema('');
    setPerguntas([{ codigo: '1.', valorMax: '' }]);
    setErro(null);
    setMostrarForm(true);
  }

  function iniciarEdicao(instrumento: Instrumento) {
    setEditandoId(instrumento.id);
    setNome(instrumento.nome);
    setCriterioId(instrumento.criterioId);
    setModo(instrumento.modo);
    setEscalaMax(String(instrumento.escalaMax));
    setTema(instrumento.tema ?? '');
    setPerguntas(
      instrumento.perguntas.map((p) => ({ id: p.id, codigo: p.codigo, valorMax: String(p.valorMax) }))
    );
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setEditandoId(null);
  }

  async function guardarInstrumento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome || !criterioId || perguntas.length === 0) {
      setErro('Preencha nome, critério e pelo menos uma pergunta/item.');
      return;
    }
    const perguntasValidas = perguntas.filter((p) => p.codigo && p.valorMax);
    if (perguntasValidas.length === 0) {
      setErro('Adicione pelo menos uma pergunta/item com valor máximo.');
      return;
    }
    setAGravar(true);
    const corpo = {
      periodoId: params.periodoId,
      criterioId,
      nome,
      modo,
      escalaMax: Number(escalaMax) || 5,
      tema: tema || null,
      ordem: editandoId ? undefined : instrumentos.length,
      perguntas: perguntasValidas.map((p, idx) => ({
        id: p.id,
        codigo: p.codigo,
        valorMax: Number(p.valorMax),
        ordem: idx,
      })),
    };
    const res = editandoId
      ? await fetch(`/api/turmas/${params.turmaId}/instrumentos/${editandoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        })
      : await fetch(`/api/turmas/${params.turmaId}/instrumentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        });
    setAGravar(false);
    if (!res.ok) {
      setErro(editandoId ? 'Não foi possível guardar as alterações.' : 'Não foi possível criar o instrumento.');
      return;
    }
    fecharForm();
    carregar();
  }

  async function remover(id: string) {
    if (!confirm('Remover este instrumento e todas as notas lançadas nele?')) return;
    await fetch(`/api/turmas/${params.turmaId}/instrumentos/${id}`, { method: 'DELETE' });
    carregar();
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link href={`/turmas/${params.turmaId}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
          ← Voltar à turma
        </Link>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Instrumentos de avaliação</h1>
          <button
            onClick={() => (mostrarForm ? fecharForm() : abrirNovo())}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {mostrarForm ? 'Cancelar' : '+ Novo instrumento'}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={guardarInstrumento} className="mb-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="ex: Teste de Avaliação 1"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Critério</label>
                <select
                  value={criterioId}
                  onChange={(e) => setCriterioId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecionar…</option>
                  {criterios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grupo} — {c.nome} ({Math.round(c.peso * 100)}%)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Modo de avaliação</label>
                <select
                  value={modo}
                  onChange={(e) => setModo(e.target.value as ModoAvaliacao)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="PONTOS">Pontos por pergunta (ex.: teste)</option>
                  <option value="ESCALA">Escala (ex.: 1 a 5, atitudes)</option>
                </select>
              </div>
              {modo === 'ESCALA' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Escala máxima</label>
                  <input
                    type="number"
                    value={escalaMax}
                    onChange={(e) => setEscalaMax(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tema (opcional)</label>
                <input
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {modo === 'PONTOS' ? 'Perguntas' : 'Itens da escala'}
              </label>
              <div className="space-y-2">
                {perguntas.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      placeholder="Código (ex: 2.1.)"
                      value={p.codigo}
                      onChange={(e) => atualizarPergunta(i, 'codigo', e.target.value)}
                      className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      placeholder={modo === 'PONTOS' ? 'Pontos máx.' : 'Escala máx.'}
                      value={p.valorMax}
                      onChange={(e) => atualizarPergunta(i, 'valorMax', e.target.value)}
                      className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removerPergunta(i)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={adicionarPergunta}
                className="mt-2 text-sm text-brand-600 hover:underline"
              >
                + Adicionar linha
              </button>
            </div>

            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <button
              type="submit"
              disabled={aGravar}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {aGravar ? 'A guardar…' : editandoId ? 'Guardar alterações' : 'Criar instrumento'}
            </button>
          </form>
        )}

        {erroCarregar ? (
          <p className="text-sm text-red-600">{erroCarregar}</p>
        ) : aCarregar ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : (
        <div className="space-y-2">
          {instrumentos.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <Link
                  href={`/turmas/${params.turmaId}/periodos/${params.periodoId}/instrumentos/${i.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {i.nome}
                </Link>
                <p className="text-xs text-slate-500">
                  {i.criterio?.nome} · {i.perguntas.length} {i.modo === 'PONTOS' ? 'perguntas' : 'itens'}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => iniciarEdicao(i)} className="text-sm text-brand-600 hover:underline">
                  Editar
                </button>
                <button onClick={() => remover(i.id)} className="text-sm text-red-600 hover:underline">
                  Remover
                </button>
              </div>
            </div>
          ))}
          {instrumentos.length === 0 && (
            <p className="text-sm text-slate-400">Ainda não há instrumentos neste período.</p>
          )}
        </div>
        )}
      </main>
    </div>
  );
}
