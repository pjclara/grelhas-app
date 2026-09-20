'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import { anoLetivoAtual, type AnoLetivo, type Disciplina, type GrupoAvaliacao } from '@/lib/types';

const GRUPOS_SUGERIDOS = ['Atitudes', 'Conhecimentos e Capacidades'];

function pct(v: number) {
  return Math.round(v * 1000) / 10;
}

export default function CriteriosAvaliacaoPage() {
  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [anoLetivoId, setAnoLetivoId] = useState('');
  const [novoAno, setNovoAno] = useState('');
  const [aCriarAno, setACriarAno] = useState(false);

  const [disciplinasAll, setDisciplinasAll] = useState<Disciplina[]>([]);
  const [grupos, setGrupos] = useState<GrupoAvaliacao[]>([]);
  const [aCarregar, setACarregar] = useState(true);

  const [nomeGrupo, setNomeGrupo] = useState('');
  const [disciplinaIds, setDisciplinaIds] = useState<string[]>([]);
  const [erroGrupo, setErroGrupo] = useState<string | null>(null);
  const [aGravarGrupo, setAGravarGrupo] = useState(false);

  const [editandoGrupoId, setEditandoGrupoId] = useState<string | null>(null);
  const [nomeGrupoEdit, setNomeGrupoEdit] = useState('');
  const [disciplinaIdsEdit, setDisciplinaIdsEdit] = useState<string[]>([]);
  const [erroGrupoEdit, setErroGrupoEdit] = useState<string | null>(null);

  const [novoInstrumento, setNovoInstrumento] = useState<Record<string, { nome: string; peso: string }>>({});
  const [erroInstrumento, setErroInstrumento] = useState<Record<string, string>>({});
  const [editandoInstrumentoId, setEditandoInstrumentoId] = useState<string | null>(null);
  const [nomeInstrumentoEdit, setNomeInstrumentoEdit] = useState('');
  const [pesoInstrumentoEdit, setPesoInstrumentoEdit] = useState('');

  useEffect(() => {
    (async () => {
      const [rAnos, rDisc] = await Promise.all([fetch('/api/anos-letivos'), fetch('/api/disciplinas')]);
      const anosData: AnoLetivo[] = await rAnos.json();
      setAnos(anosData);
      setDisciplinasAll(await rDisc.json());
      const atual = anoLetivoAtual();
      const existente = anosData.find((a) => a.nome === atual);
      if (existente) setAnoLetivoId(existente.id);
      else if (anosData.length > 0) setAnoLetivoId(anosData[0].id);
    })();
  }, []);

  async function carregarGrupos(id: string) {
    setACarregar(true);
    const r = await fetch(`/api/grupos-avaliacao?anoLetivoId=${id}`);
    setGrupos(await r.json());
    setACarregar(false);
  }

  useEffect(() => {
    if (anoLetivoId) carregarGrupos(anoLetivoId);
    else setGrupos([]);
  }, [anoLetivoId]);

  async function criarAnoLetivo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoAno.trim()) return;
    setACriarAno(true);
    const res = await fetch('/api/anos-letivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoAno.trim() }),
    });
    setACriarAno(false);
    if (!res.ok) return;
    const novo: AnoLetivo = await res.json();
    setAnos((prev) => [novo, ...prev]);
    setAnoLetivoId(novo.id);
    setNovoAno('');
  }

  function toggleDisciplina(id: string, lista: string[], setLista: (v: string[]) => void) {
    setLista(lista.includes(id) ? lista.filter((d) => d !== id) : [...lista, id]);
  }

  async function adicionarGrupo(e: React.FormEvent) {
    e.preventDefault();
    setErroGrupo(null);
    if (!nomeGrupo.trim()) {
      setErroGrupo('Indique o nome do grupo.');
      return;
    }
    if (disciplinaIds.length === 0) {
      setErroGrupo('Selecione pelo menos uma disciplina.');
      return;
    }
    setAGravarGrupo(true);
    const res = await fetch('/api/grupos-avaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anoLetivoId,
        nome: nomeGrupo.trim(),
        disciplinaIds,
        ordem: grupos.length,
      }),
    });
    setAGravarGrupo(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroGrupo(body.error ?? 'Não foi possível criar o grupo (nome já usado?).');
      return;
    }
    setNomeGrupo('');
    setDisciplinaIds([]);
    carregarGrupos(anoLetivoId);
  }

  function iniciarEdicaoGrupo(g: GrupoAvaliacao) {
    setEditandoGrupoId(g.id);
    setNomeGrupoEdit(g.nome);
    setDisciplinaIdsEdit(g.disciplinas.map((d) => d.id));
    setErroGrupoEdit(null);
  }

  async function guardarEdicaoGrupo(id: string) {
    setErroGrupoEdit(null);
    if (!nomeGrupoEdit.trim() || disciplinaIdsEdit.length === 0) {
      setErroGrupoEdit('Verifique o nome e as disciplinas.');
      return;
    }
    const res = await fetch(`/api/grupos-avaliacao/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nomeGrupoEdit.trim(),
        disciplinaIds: disciplinaIdsEdit,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroGrupoEdit(body.error ?? 'Não foi possível guardar.');
      return;
    }
    setEditandoGrupoId(null);
    carregarGrupos(anoLetivoId);
  }

  async function removerGrupo(g: GrupoAvaliacao) {
    if (!confirm(`Eliminar o grupo "${g.nome}" e todos os seus instrumentos?`)) return;
    await fetch(`/api/grupos-avaliacao/${g.id}`, { method: 'DELETE' });
    carregarGrupos(anoLetivoId);
  }

  async function adicionarInstrumento(grupoId: string) {
    const dados = novoInstrumento[grupoId] ?? { nome: '', peso: '' };
    const pesoNum = Number(dados.peso.replace(',', '.'));
    if (!dados.nome.trim() || !dados.peso || Number.isNaN(pesoNum) || pesoNum < 0 || pesoNum > 100) {
      setErroInstrumento((prev) => ({ ...prev, [grupoId]: 'Indique nome e peso (0-100).' }));
      return;
    }
    setErroInstrumento((prev) => ({ ...prev, [grupoId]: '' }));
    const grupo = grupos.find((g) => g.id === grupoId);
    const res = await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: dados.nome.trim(),
        peso: pesoNum / 100,
        ordem: grupo?.instrumentos.length ?? 0,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroInstrumento((prev) => ({ ...prev, [grupoId]: body.error ?? 'Nome já usado neste grupo.' }));
      return;
    }
    setNovoInstrumento((prev) => ({ ...prev, [grupoId]: { nome: '', peso: '' } }));
    carregarGrupos(anoLetivoId);
  }

  function iniciarEdicaoInstrumento(instId: string, nome: string, peso: number) {
    setEditandoInstrumentoId(instId);
    setNomeInstrumentoEdit(nome);
    setPesoInstrumentoEdit(String(pct(peso)));
  }

  async function guardarEdicaoInstrumento(grupoId: string, instId: string) {
    const pesoNum = Number(pesoInstrumentoEdit.replace(',', '.'));
    if (!nomeInstrumentoEdit.trim() || Number.isNaN(pesoNum) || pesoNum < 0 || pesoNum > 100) return;
    await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos/${instId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeInstrumentoEdit.trim(), peso: pesoNum / 100 }),
    });
    setEditandoInstrumentoId(null);
    carregarGrupos(anoLetivoId);
  }

  async function removerInstrumento(grupoId: string, instId: string, nome: string) {
    if (!confirm(`Eliminar o instrumento "${nome}"?`)) return;
    await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos/${instId}`, { method: 'DELETE' });
    carregarGrupos(anoLetivoId);
  }

  // O peso é definido ao nível do instrumento; os grupos são apenas categorias.
  // Uma disciplina pode aparecer em vários grupos, por isso o total de 100% tem
  // de ser verificado somando os instrumentos de todos os grupos que a incluem.
  const totalPorDisciplina = new Map<string, number>();
  for (const g of grupos) {
    const somaInstrumentosGrupo = g.instrumentos.reduce((s, i) => s + i.peso, 0);
    for (const d of g.disciplinas) {
      totalPorDisciplina.set(d.id, (totalPorDisciplina.get(d.id) ?? 0) + somaInstrumentosGrupo);
    }
  }
  const disciplinasComGrupos = disciplinasAll.filter((d) => totalPorDisciplina.has(d.id));

  return (
    <div>
      <TopNav />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-2xl font-semibold text-slate-900">Critérios de Avaliação</h1>

            <div className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Ano letivo</label>
                <select
                  value={anoLetivoId}
                  onChange={(e) => setAnoLetivoId(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {anos.length === 0 && <option value="">Sem anos letivos</option>}
                  {anos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>
              <form onSubmit={criarAnoLetivo} className="flex items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Novo ano letivo</label>
                  <input
                    placeholder="ex: 2026/2027"
                    value={novoAno}
                    onChange={(e) => setNovoAno(e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={aCriarAno}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Criar
                </button>
              </form>
            </div>

            {!anoLetivoId ? (
              <p className="text-sm text-slate-500">Crie um ano letivo para configurar os critérios de avaliação.</p>
            ) : (
              <>
                <form
                  onSubmit={adicionarGrupo}
                  className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <h2 className="text-sm font-semibold text-slate-800">Novo grupo</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-slate-700">Nome do grupo</label>
                      <input
                        placeholder="ex: Atitudes"
                        value={nomeGrupo}
                        onChange={(e) => setNomeGrupo(e.target.value)}
                        list="grupos-sugeridos"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <datalist id="grupos-sugeridos">
                        {GRUPOS_SUGERIDOS.map((g) => (
                          <option key={g} value={g} />
                        ))}
                      </datalist>
                    </div>
                    <button
                      type="submit"
                      disabled={aGravarGrupo}
                      className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {aGravarGrupo ? 'A criar…' : 'Adicionar grupo'}
                    </button>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-slate-700">Disciplinas</span>
                    <div className="flex flex-wrap gap-3">
                      {disciplinasAll.map((d) => (
                        <label key={d.id} className="flex items-center gap-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={disciplinaIds.includes(d.id)}
                            onChange={() => toggleDisciplina(d.id, disciplinaIds, setDisciplinaIds)}
                          />
                          {d.nome}
                        </label>
                      ))}
                      {disciplinasAll.length === 0 && (
                        <span className="text-sm text-slate-400">Crie disciplinas primeiro.</span>
                      )}
                    </div>
                  </div>
                  {erroGrupo && <p className="text-sm text-red-600">{erroGrupo}</p>}
                </form>

                {disciplinasComGrupos.length > 0 && (
                  <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-semibold text-slate-800">
                      Peso total dos instrumentos por disciplina
                    </h2>
                    <ul className="flex flex-col gap-1 text-sm">
                      {disciplinasComGrupos.map((d) => {
                        const total = totalPorDisciplina.get(d.id) ?? 0;
                        const completo = Math.round(total * 100) === 100;
                        return (
                          <li key={d.id} className="flex items-center gap-2">
                            <span className="text-slate-700">{d.nome}:</span>
                            <span className={completo ? 'text-emerald-600' : 'text-amber-600'}>
                              {pct(total)}%{!completo && ' (deveria somar 100%)'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {aCarregar ? (
                  <p className="text-sm text-slate-500">A carregar…</p>
                ) : grupos.length === 0 ? (
                  <p className="text-sm text-slate-400">Ainda não tem grupos configurados para este ano letivo.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {grupos.map((g) => {
                      const dadosNovoInst = novoInstrumento[g.id] ?? { nome: '', peso: '' };
                      return (
                        <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-4">
                          {editandoGrupoId === g.id ? (
                            <div className="mb-3 flex flex-col gap-2 rounded-md bg-slate-50 p-3">
                              <div className="flex flex-wrap items-end gap-2">
                                <input
                                  value={nomeGrupoEdit}
                                  onChange={(e) => setNomeGrupoEdit(e.target.value)}
                                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                                />
                                <button
                                  onClick={() => guardarEdicaoGrupo(g.id)}
                                  className="text-sm text-emerald-600 hover:underline"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditandoGrupoId(null)}
                                  className="text-sm text-slate-500 hover:underline"
                                >
                                  Cancelar
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {disciplinasAll.map((d) => (
                                  <label key={d.id} className="flex items-center gap-1 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={disciplinaIdsEdit.includes(d.id)}
                                      onChange={() => toggleDisciplina(d.id, disciplinaIdsEdit, setDisciplinaIdsEdit)}
                                    />
                                    {d.nome}
                                  </label>
                                ))}
                              </div>
                              {erroGrupoEdit && <p className="text-sm text-red-600">{erroGrupoEdit}</p>}
                            </div>
                          ) : (
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <h3 className="text-base font-semibold text-slate-900">{g.nome}</h3>
                                <p className="text-xs text-slate-500">
                                  {g.disciplinas.map((d) => d.nome).join(', ') || 'Sem disciplinas'}
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => iniciarEdicaoGrupo(g)}
                                  className="text-sm text-brand-600 hover:underline"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => removerGrupo(g)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          )}

                          <table className="w-full overflow-hidden rounded-md border border-slate-100 text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-3 py-1.5">Instrumento</th>
                                <th className="px-3 py-1.5">Peso</th>
                                <th className="px-3 py-1.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {g.instrumentos.map((inst) =>
                                editandoInstrumentoId === inst.id ? (
                                  <tr key={inst.id} className="border-t border-slate-100 bg-slate-50">
                                    <td className="px-3 py-1.5">
                                      <input
                                        value={nomeInstrumentoEdit}
                                        onChange={(e) => setNomeInstrumentoEdit(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                      />
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={pesoInstrumentoEdit}
                                        onChange={(e) => setPesoInstrumentoEdit(e.target.value)}
                                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                      />
                                      %
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      <div className="flex justify-end gap-3">
                                        <button
                                          onClick={() => guardarEdicaoInstrumento(g.id, inst.id)}
                                          className="text-emerald-600 hover:underline"
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          onClick={() => setEditandoInstrumentoId(null)}
                                          className="text-slate-500 hover:underline"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={inst.id} className="border-t border-slate-100">
                                    <td className="px-3 py-1.5 text-slate-800">{inst.nome}</td>
                                    <td className="px-3 py-1.5 text-slate-500">{pct(inst.peso)}%</td>
                                    <td className="px-3 py-1.5 text-right">
                                      <div className="flex justify-end gap-3">
                                        <button
                                          onClick={() => iniciarEdicaoInstrumento(inst.id, inst.nome, inst.peso)}
                                          className="text-brand-600 hover:underline"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => removerInstrumento(g.id, inst.id, inst.nome)}
                                          className="text-red-600 hover:underline"
                                        >
                                          Remover
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              )}
                              <tr className="border-t border-slate-100">
                                <td className="px-3 py-1.5">
                                  <input
                                    placeholder="Nome do instrumento"
                                    value={dadosNovoInst.nome}
                                    onChange={(e) =>
                                      setNovoInstrumento((prev) => ({
                                        ...prev,
                                        [g.id]: { ...dadosNovoInst, nome: e.target.value },
                                      }))
                                    }
                                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    placeholder="%"
                                    value={dadosNovoInst.peso}
                                    onChange={(e) =>
                                      setNovoInstrumento((prev) => ({
                                        ...prev,
                                        [g.id]: { ...dadosNovoInst, peso: e.target.value },
                                      }))
                                    }
                                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <button
                                    onClick={() => adicionarInstrumento(g.id)}
                                    className="text-brand-600 hover:underline"
                                  >
                                    Adicionar
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          {erroInstrumento[g.id] && (
                            <p className="mt-1 text-xs text-red-600">{erroInstrumento[g.id]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
