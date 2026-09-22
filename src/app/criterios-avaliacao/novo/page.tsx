'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Spinner';
import { CreatableSelect } from '@/components/ui/CreatableSelect';
import type { AnoEscolaridade, Ciclo, Disciplina, GrupoAvaliacao, GrupoDisciplinar } from '@/lib/types';

function pct(v: number) {
  return Math.round(v * 1000) / 10;
}

interface InstrumentoDraft {
  nome: string;
  valores: Record<string, string>; // disciplinaId -> "peso em %"
}

function novoDraft(): InstrumentoDraft {
  return { nome: '', valores: {} };
}

const TOTAL_PASSOS = 6;

export default function NovoInstrumentoPage() {
  return (
    <Suspense fallback={<AppShell><PageLoading /></AppShell>}>
      <NovoInstrumentoConteudo />
    </Suspense>
  );
}

function NovoInstrumentoConteudo() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const router = useRouter();
  const anoLetivoId = useSearchParams().get('anoLetivoId') ?? '';

  const [aCarregar, setACarregar] = useState(true);
  const [grupoDisciplinares, setGrupoDisciplinares] = useState<GrupoDisciplinar[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [disciplinasAll, setDisciplinasAll] = useState<Disciplina[]>([]);
  const [gruposAvaliacao, setGruposAvaliacao] = useState<GrupoAvaliacao[]>([]);

  const [passo, setPasso] = useState(1);
  const [grupoDisciplinarId, setGrupoDisciplinarId] = useState('');
  const [cicloId, setCicloId] = useState('');
  const [disciplinaIds, setDisciplinaIds] = useState<string[]>([]);
  const [anoIds, setAnoIds] = useState<string[]>([]);
  const [grupoAvaliacaoId, setGrupoAvaliacaoId] = useState('');
  const [instrumentos, setInstrumentos] = useState<InstrumentoDraft[]>([novoDraft()]);

  const [erroPasso, setErroPasso] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  useEffect(() => {
    if (!anoLetivoId) {
      setACarregar(false);
      return;
    }
    Promise.all([
      fetch('/api/grupos-disciplinares').then((r) => r.json()),
      fetch('/api/ciclos').then((r) => r.json()),
      fetch('/api/disciplinas').then((r) => r.json()),
      fetch(`/api/grupos-avaliacao?anoLetivoId=${anoLetivoId}`).then((r) => r.json()),
    ]).then(([gd, c, d, ga]) => {
      setGrupoDisciplinares(gd);
      setCiclos(c);
      setDisciplinasAll(d);
      setGruposAvaliacao(ga);
      setACarregar(false);
    });
  }, [anoLetivoId]);

  async function criarGrupoAvaliacao(nome: string): Promise<GrupoAvaliacao> {
    const res = await fetch('/api/grupos-avaliacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anoLetivoId, nome, ordem: gruposAvaliacao.length }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Não foi possível criar o grupo (nome já usado?).');
    }
    const novo: GrupoAvaliacao = await res.json();
    setGruposAvaliacao((prev) => [...prev, novo]);
    return novo;
  }

  const disciplinasFiltradas = useMemo(
    () =>
      disciplinasAll.filter(
        (d) =>
          (!grupoDisciplinarId || d.grupoDisciplinarId === grupoDisciplinarId) &&
          (!cicloId || d.ciclos.some((dc) => dc.ciclo.id === cicloId))
      ),
    [disciplinasAll, grupoDisciplinarId, cicloId]
  );

  const anosCandidatos = useMemo(() => {
    const mapa = new Map<string, AnoEscolaridade>();
    for (const d of disciplinasAll) {
      if (!disciplinaIds.includes(d.id)) continue;
      for (const da of d.anosEscolaridade) mapa.set(da.anoEscolaridade.id, da.anoEscolaridade);
    }
    return [...mapa.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  }, [disciplinasAll, disciplinaIds]);

  const disciplinasFinal = useMemo(
    () =>
      disciplinasAll.filter(
        (d) =>
          disciplinaIds.includes(d.id) &&
          (anosCandidatos.length === 0 || d.anosEscolaridade.some((da) => anoIds.includes(da.anoEscolaridade.id)))
      ),
    [disciplinasAll, disciplinaIds, anosCandidatos, anoIds]
  );

  function totalJaAtribuido(disciplinaId: string) {
    let total = 0;
    for (const g of gruposAvaliacao) {
      for (const inst of g.instrumentos) {
        const p = inst.pesos.find((pp) => pp.disciplinaId === disciplinaId);
        if (p) total += p.peso;
      }
    }
    return total;
  }

  function totalComRascunhos(disciplinaId: string) {
    let total = totalJaAtribuido(disciplinaId);
    for (const draft of instrumentos) {
      const valor = Number((draft.valores[disciplinaId] ?? '').replace(',', '.'));
      if (!Number.isNaN(valor)) total += valor / 100;
    }
    return total;
  }

  function toggleDisciplina(id: string) {
    setDisciplinaIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleAno(id: string) {
    setAnoIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function adicionarDraft() {
    setInstrumentos((prev) => [...prev, novoDraft()]);
  }

  function removerDraft(index: number) {
    setInstrumentos((prev) => prev.filter((_, i) => i !== index));
  }

  function avancar() {
    setErroPasso(null);
    if (passo === 3 && disciplinaIds.length === 0) {
      setErroPasso('Selecione pelo menos uma disciplina.');
      return;
    }
    if (passo === 4 && anosCandidatos.length > 0 && anoIds.length === 0) {
      setErroPasso('Selecione pelo menos um ano de escolaridade.');
      return;
    }
    if (passo === 5 && !grupoAvaliacaoId) {
      setErroPasso('Selecione ou crie o grupo de avaliação.');
      return;
    }
    setPasso((p) => Math.min(TOTAL_PASSOS, p + 1));
  }

  function recuar() {
    setErroPasso(null);
    setPasso((p) => Math.max(1, p - 1));
  }

  async function submeter() {
    setErroPasso(null);
    const grupoAtual = gruposAvaliacao.find((g) => g.id === grupoAvaliacaoId);
    const nomesExistentes = new Set((grupoAtual?.instrumentos ?? []).map((i) => i.nome.trim().toLowerCase()));

    for (const [i, draft] of instrumentos.entries()) {
      const nome = draft.nome.trim();
      if (!nome) {
        setErroPasso(`Indique o nome do instrumento ${i + 1}.`);
        return;
      }
      const nomeLower = nome.toLowerCase();
      if (nomesExistentes.has(nomeLower)) {
        setErroPasso(`Já existe um instrumento chamado "${nome}" neste grupo.`);
        return;
      }
      nomesExistentes.add(nomeLower);
      for (const d of disciplinasFinal) {
        const valor = Number((draft.valores[d.id] ?? '').replace(',', '.'));
        if (Number.isNaN(valor) || valor < 0 || valor > 100) {
          setErroPasso(`Indique um peso válido (0-100) para "${d.nome}" no instrumento "${nome || i + 1}".`);
          return;
        }
      }
    }

    setAGravar(true);
    const ordemBase = grupoAtual?.instrumentos.length ?? 0;
    for (const [i, draft] of instrumentos.entries()) {
      const pesos = disciplinasFinal.map((d) => ({
        disciplinaId: d.id,
        peso: Number((draft.valores[d.id] ?? '0').replace(',', '.')) / 100,
      }));
      const res = await fetch(`/api/grupos-avaliacao/${grupoAvaliacaoId}/instrumentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: draft.nome.trim(), ordem: ordemBase + i, pesos }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAGravar(false);
        setErroPasso(body.error ?? `Não foi possível criar o instrumento "${draft.nome.trim()}".`);
        return;
      }
    }
    setAGravar(false);
    router.push(`/criterios-avaliacao?anoLetivoId=${anoLetivoId}`);
  }

  if (!anoLetivoId) {
    return (
      <AppShell>
        <Link href="/criterios-avaliacao" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar aos critérios de avaliação
        </Link>
        <Alert tone="danger">
          Escolha primeiro um ano letivo na página de critérios de avaliação e use o botão &quot;Novo instrumento&quot; a partir daí.
        </Alert>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/criterios-avaliacao" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar aos critérios de avaliação
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Novo instrumento de avaliação</h1>
      <p className="mb-6 text-sm text-slate-500">Passo {passo} de {TOTAL_PASSOS}</p>

      {status !== 'loading' && !isAdmin ? (
        <Alert tone="danger">Apenas administradores podem criar instrumentos de avaliação.</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : (
        <Card className="flex flex-col gap-4 p-4">
          {passo === 1 && (
            <div>
              <Label htmlFor="grupo-disciplinar">Grupo Disciplinar</Label>
              <Select id="grupo-disciplinar" value={grupoDisciplinarId} onChange={(e) => setGrupoDisciplinarId(e.target.value)}>
                <option value="">Todos os grupos disciplinares</option>
                {grupoDisciplinares.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {passo === 2 && (
            <div>
              <Label htmlFor="ciclo">Ciclo</Label>
              <Select id="ciclo" value={cicloId} onChange={(e) => setCicloId(e.target.value)}>
                <option value="">Todos os ciclos</option>
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {passo === 3 && (
            <div>
              <Label>Disciplinas</Label>
              {disciplinasFiltradas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma disciplina corresponde aos filtros escolhidos.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {disciplinasFiltradas.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={disciplinaIds.includes(d.id)}
                        onChange={() => toggleDisciplina(d.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
                      />
                      {d.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {passo === 4 && (
            <div>
              <Label>Anos de Escolaridade</Label>
              {anosCandidatos.length === 0 ? (
                <p className="text-sm text-slate-400">
                  As disciplinas selecionadas não têm anos de escolaridade associados — pode avançar sem escolher nenhum.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {anosCandidatos.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={anoIds.includes(a.id)}
                        onChange={() => toggleAno(a.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
                      />
                      {a.nome}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {passo === 5 && (
            <CreatableSelect
              id="grupo-avaliacao"
              label="Grupo de Avaliação"
              itens={gruposAvaliacao}
              podeCriar={isAdmin}
              tituloModal="Novo grupo de avaliação"
              onCriar={criarGrupoAvaliacao}
              value={grupoAvaliacaoId}
              onChange={setGrupoAvaliacaoId}
            />
          )}

          {passo === 6 && (
            <div className="flex flex-col gap-4">
              <div>
                <Label>Disciplinas selecionadas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {disciplinasFinal.map((d) => (
                    <Badge key={d.id}>{d.nome}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {instrumentos.map((draft, i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-3">
                    <div className="mb-2 flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`nome-instrumento-${i}`}>Nome do instrumento</Label>
                        <Input
                          id={`nome-instrumento-${i}`}
                          placeholder="ex: Teste de avaliação"
                          value={draft.nome}
                          onChange={(e) =>
                            setInstrumentos((prev) =>
                              prev.map((d, idx) => (idx === i ? { ...d, nome: e.target.value } : d))
                            )
                          }
                        />
                      </div>
                      {instrumentos.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerDraft(i)} aria-label="Remover instrumento">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {disciplinasFinal.map((d) => {
                        const valor = draft.valores[d.id] ?? '';
                        const total = pct(totalComRascunhos(d.id));
                        return (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="w-40 shrink-0 text-slate-700">{d.nome}</span>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="%"
                              value={valor}
                              onChange={(e) =>
                                setInstrumentos((prev) =>
                                  prev.map((dr, idx) =>
                                    idx === i ? { ...dr, valores: { ...dr.valores, [d.id]: e.target.value } } : dr
                                  )
                                )
                              }
                              className="w-20"
                            />
                            <span className="text-xs text-slate-400">%</span>
                            <span className={total === 100 ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
                              total nesta disciplina: {total}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="secondary" onClick={adicionarDraft} className="self-start">
                <Plus className="h-4 w-4" />
                Adicionar outro instrumento
              </Button>
            </div>
          )}

          {erroPasso && <Alert tone="danger">{erroPasso}</Alert>}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={recuar} disabled={passo === 1}>
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>
            {passo < TOTAL_PASSOS ? (
              <Button type="button" onClick={avancar}>
                Seguinte
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={submeter} loading={aGravar}>
                Criar instrumento(s)
              </Button>
            )}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
