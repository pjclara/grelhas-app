'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import { anoLetivoAtual, type AnoLetivo, type Disciplina, type GrupoAvaliacao } from '@/lib/types';

const GRUPOS_SUGERIDOS = ['Atitudes', 'Conhecimentos e Capacidades'];

function pct(v: number) {
  return Math.round(v * 1000) / 10;
}

interface PesosForm {
  nome: string;
  selecionadas: string[];
  valores: Record<string, string>;
}

function novoPesosForm(): PesosForm {
  return { nome: '', selecionadas: [], valores: {} };
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
  const [erroGrupo, setErroGrupo] = useState<string | null>(null);
  const [aGravarGrupo, setAGravarGrupo] = useState(false);

  const [editandoGrupoId, setEditandoGrupoId] = useState<string | null>(null);
  const [nomeGrupoEdit, setNomeGrupoEdit] = useState('');
  const [erroGrupoEdit, setErroGrupoEdit] = useState<string | null>(null);

  const [novoInstrumento, setNovoInstrumento] = useState<Record<string, PesosForm>>({});
  const [erroInstrumento, setErroInstrumento] = useState<Record<string, string>>({});
  const [editandoInstrumentoId, setEditandoInstrumentoId] = useState<string | null>(null);
  const [instrumentoEdit, setInstrumentoEdit] = useState<PesosForm>(novoPesosForm());
  const [erroInstrumentoEdit, setErroInstrumentoEdit] = useState<string | null>(null);

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

  async function adicionarGrupo(e: React.FormEvent) {
    e.preventDefault();
    setErroGrupo(null);
    if (!nomeGrupo.trim()) {
      setErroGrupo('Indique o nome do grupo.');
      return;
    }
    if (grupos.some((g) => g.nome.trim().toLowerCase() === nomeGrupo.trim().toLowerCase())) {
      setErroGrupo('Já existe um grupo com este nome neste ano letivo.');
      return;
    }
    setAGravarGrupo(true);
    const res = await fetch('/api/grupos-avaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anoLetivoId,
        nome: nomeGrupo.trim(),
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
    carregarGrupos(anoLetivoId);
  }

  function iniciarEdicaoGrupo(g: GrupoAvaliacao) {
    setEditandoGrupoId(g.id);
    setNomeGrupoEdit(g.nome);
    setErroGrupoEdit(null);
  }

  async function guardarEdicaoGrupo(id: string) {
    setErroGrupoEdit(null);
    if (!nomeGrupoEdit.trim()) {
      setErroGrupoEdit('Indique o nome do grupo.');
      return;
    }
    if (
      grupos.some((g) => g.id !== id && g.nome.trim().toLowerCase() === nomeGrupoEdit.trim().toLowerCase())
    ) {
      setErroGrupoEdit('Já existe um grupo com este nome neste ano letivo.');
      return;
    }
    const res = await fetch(`/api/grupos-avaliacao/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeGrupoEdit.trim() }),
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

  // Soma, para uma disciplina, os pesos já atribuídos em todos os grupos,
  // opcionalmente ignorando um instrumento (o que está a ser editado) para
  // permitir uma pré-visualização em tempo real do total ao alterar o peso.
  function totalAtribuido(disciplinaId: string, excluirInstrumentoId?: string) {
    let total = 0;
    for (const g of grupos) {
      for (const inst of g.instrumentos) {
        if (inst.id === excluirInstrumentoId) continue;
        const p = inst.pesos.find((pp) => pp.disciplinaId === disciplinaId);
        if (p) total += p.peso;
      }
    }
    return total;
  }

  function toggleDisciplinaForm(form: PesosForm, disciplinaId: string): PesosForm {
    const selecionada = form.selecionadas.includes(disciplinaId);
    return {
      ...form,
      selecionadas: selecionada
        ? form.selecionadas.filter((id) => id !== disciplinaId)
        : [...form.selecionadas, disciplinaId],
    };
  }

  function pesosFormParaPayload(form: PesosForm): { disciplinaId: string; peso: number }[] | null {
    const pesos: { disciplinaId: string; peso: number }[] = [];
    for (const disciplinaId of form.selecionadas) {
      const valor = Number((form.valores[disciplinaId] ?? '').replace(',', '.'));
      if (Number.isNaN(valor) || valor < 0 || valor > 100) return null;
      pesos.push({ disciplinaId, peso: valor / 100 });
    }
    return pesos;
  }

  async function adicionarInstrumento(grupoId: string) {
    const form = novoInstrumento[grupoId] ?? novoPesosForm();
    if (!form.nome.trim()) {
      setErroInstrumento((prev) => ({ ...prev, [grupoId]: 'Indique o nome do instrumento.' }));
      return;
    }
    const grupo = grupos.find((g) => g.id === grupoId);
    if (grupo?.instrumentos.some((i) => i.nome.trim().toLowerCase() === form.nome.trim().toLowerCase())) {
      setErroInstrumento((prev) => ({ ...prev, [grupoId]: 'Já existe um instrumento com este nome neste grupo.' }));
      return;
    }
    const pesos = pesosFormParaPayload(form);
    if (pesos === null) {
      setErroInstrumento((prev) => ({ ...prev, [grupoId]: 'Indique um peso válido (0-100) para cada disciplina selecionada.' }));
      return;
    }
    setErroInstrumento((prev) => ({ ...prev, [grupoId]: '' }));
    const res = await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome.trim(), ordem: grupo?.instrumentos.length ?? 0, pesos }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroInstrumento((prev) => ({ ...prev, [grupoId]: body.error ?? 'Não foi possível criar o instrumento.' }));
      return;
    }
    setNovoInstrumento((prev) => ({ ...prev, [grupoId]: novoPesosForm() }));
    carregarGrupos(anoLetivoId);
  }

  function iniciarEdicaoInstrumento(inst: GrupoAvaliacao['instrumentos'][number]) {
    setEditandoInstrumentoId(inst.id);
    setInstrumentoEdit({
      nome: inst.nome,
      selecionadas: inst.pesos.map((p) => p.disciplinaId),
      valores: Object.fromEntries(inst.pesos.map((p) => [p.disciplinaId, String(pct(p.peso))])),
    });
    setErroInstrumentoEdit(null);
  }

  async function guardarEdicaoInstrumento(grupoId: string, instId: string) {
    setErroInstrumentoEdit(null);
    if (!instrumentoEdit.nome.trim()) {
      setErroInstrumentoEdit('Indique o nome do instrumento.');
      return;
    }
    const grupo = grupos.find((g) => g.id === grupoId);
    if (
      grupo?.instrumentos.some(
        (i) => i.id !== instId && i.nome.trim().toLowerCase() === instrumentoEdit.nome.trim().toLowerCase()
      )
    ) {
      setErroInstrumentoEdit('Já existe um instrumento com este nome neste grupo.');
      return;
    }
    const pesos = pesosFormParaPayload(instrumentoEdit);
    if (pesos === null) {
      setErroInstrumentoEdit('Indique um peso válido (0-100) para cada disciplina selecionada.');
      return;
    }
    const res = await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos/${instId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: instrumentoEdit.nome.trim(), pesos }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroInstrumentoEdit(body.error ?? 'Não foi possível guardar.');
      return;
    }
    setEditandoInstrumentoId(null);
    carregarGrupos(anoLetivoId);
  }

  async function removerInstrumento(grupoId: string, instId: string, nome: string) {
    if (!confirm(`Eliminar o instrumento "${nome}"?`)) return;
    await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos/${instId}`, { method: 'DELETE' });
    carregarGrupos(anoLetivoId);
  }

  function nomeDisciplina(id: string) {
    return disciplinasAll.find((d) => d.id === id)?.nome ?? '—';
  }

  const totalPorDisciplina = new Map<string, number>();
  for (const g of grupos) {
    for (const inst of g.instrumentos) {
      for (const p of inst.pesos) {
        totalPorDisciplina.set(p.disciplinaId, (totalPorDisciplina.get(p.disciplinaId) ?? 0) + p.peso);
      }
    }
  }
  const disciplinasComGrupos = disciplinasAll.filter((d) => totalPorDisciplina.has(d.id));

  function SeletorPesos({
    form,
    onChange,
    excluirInstrumentoId,
  }: {
    form: PesosForm;
    onChange: (form: PesosForm) => void;
    excluirInstrumentoId?: string;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        {disciplinasAll.map((d) => {
          const marcada = form.selecionadas.includes(d.id);
          const jaAtribuido = totalAtribuido(d.id, excluirInstrumentoId);
          const valor = form.valores[d.id] ?? '';
          const valorNum = Number(valor.replace(',', '.'));
          const previsto = jaAtribuido + (marcada && !Number.isNaN(valorNum) ? valorNum / 100 : 0);
          return (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              <label className="flex w-40 shrink-0 items-center gap-1.5 text-slate-700">
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => onChange(toggleDisciplinaForm(form, d.id))}
                />
                {d.nome}
              </label>
              {marcada && (
                <>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="%"
                    value={valor}
                    onChange={(e) =>
                      onChange({ ...form, valores: { ...form.valores, [d.id]: e.target.value } })
                    }
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  <span className={pct(previsto) === 100 ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
                    total nesta disciplina: {pct(previsto)}%
                  </span>
                </>
              )}
            </div>
          );
        })}
        {disciplinasAll.length === 0 && <span className="text-sm text-slate-400">Crie disciplinas primeiro.</span>}
      </div>
    );
  }

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
                  className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Novo grupo</label>
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
                    disabled={aGravarGrupo || !nomeGrupo.trim()}
                    className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {aGravarGrupo ? 'A criar…' : 'Adicionar grupo'}
                  </button>
                  {erroGrupo && <p className="w-full text-sm text-red-600">{erroGrupo}</p>}
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
                      const formNovoInst = novoInstrumento[g.id] ?? novoPesosForm();
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
                              {erroGrupoEdit && <p className="text-sm text-red-600">{erroGrupoEdit}</p>}
                            </div>
                          ) : (
                            <div className="mb-3 flex items-start justify-between">
                              <h3 className="text-base font-semibold text-slate-900">{g.nome}</h3>
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
                                <th className="px-3 py-1.5">Disciplinas e pesos</th>
                                <th className="px-3 py-1.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {g.instrumentos.map((inst) =>
                                editandoInstrumentoId === inst.id ? (
                                  <tr key={inst.id} className="border-t border-slate-100 bg-slate-50 align-top">
                                    <td className="px-3 py-1.5">
                                      <input
                                        value={instrumentoEdit.nome}
                                        onChange={(e) =>
                                          setInstrumentoEdit((prev) => ({ ...prev, nome: e.target.value }))
                                        }
                                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                      />
                                    </td>
                                    <td className="px-3 py-1.5">
                                      <SeletorPesos
                                        form={instrumentoEdit}
                                        onChange={setInstrumentoEdit}
                                        excluirInstrumentoId={inst.id}
                                      />
                                      {erroInstrumentoEdit && (
                                        <p className="mt-1 text-xs text-red-600">{erroInstrumentoEdit}</p>
                                      )}
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
                                  <tr key={inst.id} className="border-t border-slate-100 align-top">
                                    <td className="px-3 py-1.5 text-slate-800">{inst.nome}</td>
                                    <td className="px-3 py-1.5">
                                      {inst.pesos.length === 0 ? (
                                        <span className="text-xs text-slate-400">Sem disciplinas associadas</span>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                          {inst.pesos.map((p) => (
                                            <span
                                              key={p.disciplinaId}
                                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                            >
                                              {nomeDisciplina(p.disciplinaId)}: {pct(p.peso)}%
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                      <div className="flex justify-end gap-3">
                                        <button
                                          onClick={() => iniciarEdicaoInstrumento(inst)}
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
                              <tr className="border-t border-slate-100 align-top">
                                <td className="px-3 py-1.5">
                                  <input
                                    placeholder="Nome do instrumento"
                                    value={formNovoInst.nome}
                                    onChange={(e) =>
                                      setNovoInstrumento((prev) => ({
                                        ...prev,
                                        [g.id]: { ...formNovoInst, nome: e.target.value },
                                      }))
                                    }
                                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <SeletorPesos
                                    form={formNovoInst}
                                    onChange={(form) => setNovoInstrumento((prev) => ({ ...prev, [g.id]: form }))}
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
