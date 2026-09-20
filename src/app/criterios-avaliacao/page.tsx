'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Spinner';
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
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
                />
                {d.nome}
              </label>
              {marcada && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="%"
                    value={valor}
                    onChange={(e) =>
                      onChange({ ...form, valores: { ...form.valores, [d.id]: e.target.value } })
                    }
                    className="w-20"
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
    <AppShell>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Critérios de Avaliação</h1>

      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <Label htmlFor="ano-letivo">Ano letivo</Label>
          <Select id="ano-letivo" value={anoLetivoId} onChange={(e) => setAnoLetivoId(e.target.value)}>
            {anos.length === 0 && <option value="">Sem anos letivos</option>}
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
        </div>
        <form onSubmit={criarAnoLetivo} className="flex items-end gap-2">
          <div>
            <Label htmlFor="novo-ano">Novo ano letivo</Label>
            <Input id="novo-ano" placeholder="ex: 2026/2027" value={novoAno} onChange={(e) => setNovoAno(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" loading={aCriarAno}>
            Criar
          </Button>
        </form>
      </Card>

      {!anoLetivoId ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-400">
            Crie um ano letivo para configurar os critérios de avaliação.
          </div>
        </Card>
      ) : (
        <>
          <Card as="form" onSubmit={adicionarGrupo} className="mb-6 flex flex-wrap items-end gap-3 p-4">
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="novo-grupo">Novo grupo</Label>
              <Input
                id="novo-grupo"
                placeholder="ex: Atitudes"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                list="grupos-sugeridos"
              />
              <datalist id="grupos-sugeridos">
                {GRUPOS_SUGERIDOS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <Button type="submit" loading={aGravarGrupo} disabled={!nomeGrupo.trim()}>
              <Plus className="h-4 w-4" />
              Adicionar grupo
            </Button>
            {erroGrupo && (
              <div className="w-full">
                <Alert tone="danger">{erroGrupo}</Alert>
              </div>
            )}
          </Card>

          {disciplinasComGrupos.length > 0 && (
            <Card className="mb-6 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Peso total dos instrumentos por disciplina</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {disciplinasComGrupos.map((d) => {
                  const total = totalPorDisciplina.get(d.id) ?? 0;
                  const completo = Math.round(total * 100) === 100;
                  return (
                    <li key={d.id} className="flex items-center gap-2">
                      <span className="text-slate-700">{d.nome}:</span>
                      <Badge tone={completo ? 'success' : 'warning'}>
                        {pct(total)}%{!completo && ' (deveria somar 100%)'}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {aCarregar ? (
            <PageLoading />
          ) : grupos.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-sm text-slate-400">
                Ainda não tem grupos configurados para este ano letivo.
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {grupos.map((g) => {
                const formNovoInst = novoInstrumento[g.id] ?? novoPesosForm();
                return (
                  <Card key={g.id} className="p-4">
                    {editandoGrupoId === g.id ? (
                      <div className="mb-3 flex flex-col gap-2 rounded-md bg-slate-50 p-3">
                        <div className="flex flex-wrap items-end gap-2">
                          <Input value={nomeGrupoEdit} onChange={(e) => setNomeGrupoEdit(e.target.value)} className="w-48" />
                          <Button size="sm" variant="ghost" onClick={() => guardarEdicaoGrupo(g.id)} aria-label="Guardar">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditandoGrupoId(null)} aria-label="Cancelar">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {erroGrupoEdit && <Alert tone="danger">{erroGrupoEdit}</Alert>}
                      </div>
                    ) : (
                      <div className="mb-3 flex items-start justify-between">
                        <h3 className="text-base font-semibold text-slate-900">{g.nome}</h3>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => iniciarEdicaoGrupo(g)} aria-label="Editar grupo">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removerGrupo(g)} aria-label="Remover grupo">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Instrumento</th>
                            <th className="px-3 py-2">Disciplinas e pesos</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.instrumentos.map((inst) =>
                            editandoInstrumentoId === inst.id ? (
                              <tr key={inst.id} className="bg-slate-50/70 align-top">
                                <td className="px-3 py-2">
                                  <Input
                                    value={instrumentoEdit.nome}
                                    onChange={(e) => setInstrumentoEdit((prev) => ({ ...prev, nome: e.target.value }))}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <SeletorPesos form={instrumentoEdit} onChange={setInstrumentoEdit} excluirInstrumentoId={inst.id} />
                                  {erroInstrumentoEdit && <p className="mt-1 text-xs text-red-600">{erroInstrumentoEdit}</p>}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => guardarEdicaoInstrumento(g.id, inst.id)} aria-label="Guardar">
                                      <Check className="h-4 w-4 text-emerald-600" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditandoInstrumentoId(null)} aria-label="Cancelar">
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr key={inst.id} className="align-top hover:bg-slate-50/70">
                                <td className="px-3 py-2 text-slate-800">{inst.nome}</td>
                                <td className="px-3 py-2">
                                  {inst.pesos.length === 0 ? (
                                    <span className="text-xs text-slate-400">Sem disciplinas associadas</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {inst.pesos.map((p) => (
                                        <Badge key={p.disciplinaId}>
                                          {nomeDisciplina(p.disciplinaId)}: {pct(p.peso)}%
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => iniciarEdicaoInstrumento(inst)} aria-label="Editar">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removerInstrumento(g.id, inst.id, inst.nome)}
                                      aria-label="Remover"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          )}
                          <tr className="align-top">
                            <td className="px-3 py-2">
                              <Input
                                placeholder="Nome do instrumento"
                                value={formNovoInst.nome}
                                onChange={(e) =>
                                  setNovoInstrumento((prev) => ({
                                    ...prev,
                                    [g.id]: { ...formNovoInst, nome: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <SeletorPesos form={formNovoInst} onChange={(form) => setNovoInstrumento((prev) => ({ ...prev, [g.id]: form }))} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button size="sm" variant="ghost" onClick={() => adicionarInstrumento(g.id)} aria-label="Adicionar instrumento">
                                <Plus className="h-4 w-4 text-brand-600" />
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {erroInstrumento[g.id] && (
                      <div className="mt-2">
                        <Alert tone="danger">{erroInstrumento[g.id]}</Alert>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
