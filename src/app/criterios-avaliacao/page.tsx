'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import { anoLetivoAtual, type AnoLetivo, type Disciplina, type GrupoAvaliacao } from '@/lib/types';
import { compararPorGrupoCicloDisciplinaAno } from '@/lib/disciplina-order';

function pct(v: number) {
  return Math.round(v * 1000) / 10;
}

export default function CriteriosAvaliacaoPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [anoLetivoId, setAnoLetivoId] = useState('');
  const [novoAno, setNovoAno] = useState('');
  const [aCriarAno, setACriarAno] = useState(false);

  const [grupos, setGrupos] = useState<GrupoAvaliacao[]>([]);
  const [disciplinasAll, setDisciplinasAll] = useState<Disciplina[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');

  const [instrumentoEditar, setInstrumentoEditar] = useState<{ grupoId: string; instrumentoId: string } | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [disciplinaIdsEdicao, setDisciplinaIdsEdicao] = useState<string[]>([]);
  const [valoresEdicao, setValoresEdicao] = useState<Record<string, string>>({});
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [aGravarEdicao, setAGravarEdicao] = useState(false);
  const [aEliminarEdicao, setAEliminarEdicao] = useState(false);

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
      else setACarregar(false);
    })();
  }, []);

  async function carregarGrupos(id: string) {
    setACarregar(true);
    const r = await fetch(`/api/grupos-avaliacao?anoLetivoId=${id}`);
    if (!r.ok) {
      setErroCarregar('Não foi possível carregar os critérios de avaliação.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
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

  function pesosDaDisciplina(disciplinaId: string) {
    const entradas: {
      grupoId: string;
      grupoNome: string;
      instrumentoId: string;
      instrumentoNome: string;
      pesos: GrupoAvaliacao['instrumentos'][number]['pesos'];
      peso: number;
    }[] = [];
    for (const g of grupos) {
      for (const inst of g.instrumentos) {
        const p = inst.pesos.find((pp) => pp.disciplinaId === disciplinaId);
        if (p) {
          entradas.push({
            grupoId: g.id,
            grupoNome: g.nome,
            instrumentoId: inst.id,
            instrumentoNome: inst.nome,
            pesos: inst.pesos,
            peso: p.peso,
          });
        }
      }
    }
    return entradas;
  }

  function nomeDisciplina(id: string) {
    return disciplinasAll.find((d) => d.id === id)?.nome ?? '—';
  }

  function abrirEdicaoInstrumento(grupoId: string, instrumentoId: string, nome: string, pesos: { disciplinaId: string; peso: number }[]) {
    setInstrumentoEditar({ grupoId, instrumentoId });
    setNomeEdicao(nome);
    setDisciplinaIdsEdicao(pesos.map((p) => p.disciplinaId));
    setValoresEdicao(Object.fromEntries(pesos.map((p) => [p.disciplinaId, String(pct(p.peso))])));
    setErroEdicao(null);
  }

  function fecharEdicaoInstrumento() {
    setInstrumentoEditar(null);
    setErroEdicao(null);
  }

  function removerLinhaEdicao(disciplinaId: string) {
    setDisciplinaIdsEdicao((prev) => prev.filter((id) => id !== disciplinaId));
  }

  /** Total já atribuído a uma disciplina por outros instrumentos, mais o valor em edição neste modal. */
  function totalPreviewEdicao(disciplinaId: string) {
    let total = 0;
    for (const g of grupos) {
      for (const inst of g.instrumentos) {
        if (inst.id === instrumentoEditar?.instrumentoId) continue;
        const p = inst.pesos.find((pp) => pp.disciplinaId === disciplinaId);
        if (p) total += p.peso;
      }
    }
    if (disciplinaIdsEdicao.includes(disciplinaId)) {
      const valor = Number((valoresEdicao[disciplinaId] ?? '').replace(',', '.'));
      if (!Number.isNaN(valor)) total += valor / 100;
    }
    return total;
  }

  async function guardarEdicaoInstrumento() {
    if (!instrumentoEditar) return;
    setErroEdicao(null);
    const nome = nomeEdicao.trim();
    if (!nome) {
      setErroEdicao('Indique o nome do instrumento.');
      return;
    }
    const { grupoId, instrumentoId } = instrumentoEditar;
    const grupo = grupos.find((g) => g.id === grupoId);
    if (grupo?.instrumentos.some((i) => i.id !== instrumentoId && i.nome.trim().toLowerCase() === nome.toLowerCase())) {
      setErroEdicao('Já existe um instrumento com este nome neste grupo.');
      return;
    }
    if (disciplinaIdsEdicao.length === 0) {
      setErroEdicao('Mantenha pelo menos uma disciplina associada (ou elimine o instrumento).');
      return;
    }
    const pesos: { disciplinaId: string; peso: number }[] = [];
    for (const disciplinaId of disciplinaIdsEdicao) {
      const valor = Number((valoresEdicao[disciplinaId] ?? '').replace(',', '.'));
      if (Number.isNaN(valor) || valor < 0 || valor > 100) {
        setErroEdicao(`Indique um peso válido (0-100) para "${nomeDisciplina(disciplinaId)}".`);
        return;
      }
      pesos.push({ disciplinaId, peso: valor / 100 });
    }
    setAGravarEdicao(true);
    const res = await fetch(`/api/grupos-avaliacao/${grupoId}/instrumentos/${instrumentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, pesos }),
    });
    setAGravarEdicao(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroEdicao(body.error ?? 'Não foi possível guardar.');
      return;
    }
    fecharEdicaoInstrumento();
    carregarGrupos(anoLetivoId);
  }

  async function eliminarInstrumentoEdicao() {
    if (!instrumentoEditar) return;
    if (!confirm(`Eliminar o instrumento "${nomeEdicao}"?`)) return;
    setAEliminarEdicao(true);
    await fetch(`/api/grupos-avaliacao/${instrumentoEditar.grupoId}/instrumentos/${instrumentoEditar.instrumentoId}`, {
      method: 'DELETE',
    });
    setAEliminarEdicao(false);
    fecharEdicaoInstrumento();
    carregarGrupos(anoLetivoId);
  }

  const disciplinasComCriterios = disciplinasAll
    .filter((d) => pesosDaDisciplina(d.id).length > 0)
    .filter((d) => d.nome.toLowerCase().includes(filtroNome.trim().toLowerCase()))
    .sort(compararPorGrupoCicloDisciplinaAno);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Critérios de Avaliação</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo global de critérios de avaliação, partilhado por todos os professores.
            {!isAdmin && ' Apenas administradores podem criar, editar ou remover critérios.'}
          </p>
        </div>
        {isAdmin && anoLetivoId && (
          <Link href={`/criterios-avaliacao/novo?anoLetivoId=${anoLetivoId}`}>
            <Button type="button">
              <Plus className="h-4 w-4" />
              Novo instrumento
            </Button>
          </Link>
        )}
      </div>

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
        {isAdmin && (
          <form onSubmit={criarAnoLetivo} className="flex items-end gap-2">
            <div>
              <Label htmlFor="novo-ano">Novo ano letivo</Label>
              <Input id="novo-ano" placeholder="ex: 2026/2027" value={novoAno} onChange={(e) => setNovoAno(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary" loading={aCriarAno}>
              Criar
            </Button>
          </form>
        )}
      </Card>

      {!anoLetivoId ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-400">
            Crie um ano letivo para configurar os critérios de avaliação.
          </div>
        </Card>
      ) : erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : (
        <>
          <div className="mb-4 max-w-xs">
            <Label htmlFor="filtro-nome">Pesquisar disciplina</Label>
            <Input
              id="filtro-nome"
              placeholder="ex: Matemática"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
            />
          </div>

          {disciplinasComCriterios.length === 0 ? (
            <Card>
              <EmptyState
                icon={ClipboardList}
                title={
                  disciplinasAll.some((d) => pesosDaDisciplina(d.id).length > 0)
                    ? 'Sem resultados'
                    : 'Ainda não existem critérios de avaliação'
                }
                description={
                  disciplinasAll.some((d) => pesosDaDisciplina(d.id).length > 0)
                    ? 'Nenhuma disciplina corresponde à pesquisa.'
                    : isAdmin
                      ? 'Crie o primeiro em "Novo instrumento".'
                      : 'Peça a um administrador para criar critérios de avaliação.'
                }
              />
            </Card>
          ) : (
            <TableContainer>
              <Table>
                <THead>
                  <Tr>
                    <Th>Grupo Disciplinar</Th>
                    <Th>Ciclo</Th>
                    <Th>Disciplina</Th>
                    <Th>Ano</Th>
                    <Th>Instrumentos</Th>
                    <Th>Total</Th>
                  </Tr>
                </THead>
                <TBody>
                  {disciplinasComCriterios.map((d) => {
                    const pesos = pesosDaDisciplina(d.id);
                    const total = pesos.reduce((soma, p) => soma + p.peso, 0);
                    const completo = Math.round(total * 100) === 100;
                    return (
                      <Tr key={d.id}>
                        <Td className="text-slate-500">{d.grupoDisciplinar?.nome ?? '—'}</Td>
                        <Td>
                          {d.ciclos.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {d.ciclos.map((dc) => (
                                <Badge key={dc.id}>{dc.ciclo.nome}</Badge>
                              ))}
                            </div>
                          )}
                        </Td>
                        <Td className="font-medium text-slate-900">{d.nome}</Td>
                        <Td>
                          {d.anosEscolaridade.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {d.anosEscolaridade.map((da) => (
                                <Badge key={da.id}>{da.anoEscolaridade.nome}</Badge>
                              ))}
                            </div>
                          )}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {pesos.map((p) =>
                              isAdmin ? (
                                <button
                                  key={p.instrumentoId}
                                  type="button"
                                  onClick={() => abrirEdicaoInstrumento(p.grupoId, p.instrumentoId, p.instrumentoNome, p.pesos)}
                                >
                                  <Badge className="hover:bg-brand-50 hover:text-brand-700">
                                    {p.grupoNome} · {p.instrumentoNome}: {pct(p.peso)}%
                                  </Badge>
                                </button>
                              ) : (
                                <Badge key={p.instrumentoId}>
                                  {p.grupoNome} · {p.instrumentoNome}: {pct(p.peso)}%
                                </Badge>
                              )
                            )}
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={completo ? 'success' : 'warning'}>{pct(total)}%</Badge>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Modal
        open={instrumentoEditar !== null}
        onClose={fecharEdicaoInstrumento}
        title="Editar instrumento"
        size="lg"
        footer={
          <>
            <Button variant="danger" onClick={eliminarInstrumentoEdicao} loading={aEliminarEdicao} className="mr-auto">
              <Trash2 className="h-4 w-4" />
              Eliminar instrumento
            </Button>
            <Button variant="secondary" onClick={fecharEdicaoInstrumento}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicaoInstrumento} loading={aGravarEdicao}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nome-instrumento-edicao">Nome do instrumento</Label>
            <Input id="nome-instrumento-edicao" value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)} />
          </div>
          <div>
            <Label>Disciplinas e pesos</Label>
            {disciplinaIdsEdicao.length === 0 ? (
              <p className="text-sm text-slate-400">Sem disciplinas associadas.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {disciplinaIdsEdicao.map((disciplinaId) => {
                  const total = pct(totalPreviewEdicao(disciplinaId));
                  return (
                    <div key={disciplinaId} className="flex items-center gap-2 text-sm">
                      <span className="w-40 shrink-0 text-slate-700">{nomeDisciplina(disciplinaId)}</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="%"
                        value={valoresEdicao[disciplinaId] ?? ''}
                        onChange={(e) => setValoresEdicao((prev) => ({ ...prev, [disciplinaId]: e.target.value }))}
                        className="w-20"
                      />
                      <span className="text-xs text-slate-400">%</span>
                      <span className={total === 100 ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
                        total nesta disciplina: {total}%
                      </span>
                      <button
                        type="button"
                        onClick={() => removerLinhaEdicao(disciplinaId)}
                        aria-label={`Remover ${nomeDisciplina(disciplinaId)}`}
                        className="ml-auto text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {erroEdicao && <Alert tone="danger">{erroEdicao}</Alert>}
        </div>
      </Modal>
    </AppShell>
  );
}
