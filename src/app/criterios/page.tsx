'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, Trash2, ClipboardList } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import type { AnoLetivo, Ciclo, CriterioCatalogo } from '@/lib/types';

const TOLERANCIA = 0.001;

function percent(fracao: number) {
  return `${Math.round(fracao * 10000) / 100}%`;
}

export default function CriteriosPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [anoLetivoId, setAnoLetivoId] = useState('');
  const [cicloId, setCicloId] = useState('');
  const [criterios, setCriterios] = useState<CriterioCatalogo[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/anos-letivos'), fetch('/api/ciclos')])
      .then(async ([ra, rc]) => {
        if (!ra.ok || !rc.ok) throw new Error();
        const a: AnoLetivo[] = await ra.json();
        const c: Ciclo[] = await rc.json();
        setAnos(a);
        setCiclos(c);
        setAnoLetivoId(a[0]?.id ?? '');
        setCicloId(c[0]?.id ?? '');
        if (!a[0] || !c[0]) setACarregar(false);
      })
      .catch(() => {
        setErroCarregar('Não foi possível carregar os anos letivos e ciclos.');
        setACarregar(false);
      });
  }, []);

  async function carregar() {
    if (!anoLetivoId || !cicloId) return;
    setACarregar(true);
    const r = await fetch(`/api/criterios?anoLetivoId=${anoLetivoId}&cicloId=${cicloId}`);
    if (!r.ok) {
      setErroCarregar('Não foi possível carregar os critérios.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setCriterios(await r.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoLetivoId, cicloId]);

  async function remover(c: CriterioCatalogo) {
    if (!confirm(`Eliminar o critério "${c.nome}" e os seus instrumentos? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/criterios/${c.id}`, { method: 'DELETE' });
    carregar();
  }

  // Uma disciplina é avaliada pelos critérios gerais do ciclo + os específicos
  // do seu grupo disciplinar; cada uma destas combinações deve somar 100%.
  const verificacaoPesos = useMemo(() => {
    const somaGerais = criterios.filter((c) => c.tipo === 'GERAL').reduce((acc, c) => acc + c.peso, 0);
    const porGrupo = new Map<string, { nome: string; soma: number }>();
    for (const c of criterios) {
      if (c.tipo !== 'ESPECIFICO' || !c.grupoDisciplinar) continue;
      const atual = porGrupo.get(c.grupoDisciplinar.id) ?? { nome: c.grupoDisciplinar.nome, soma: 0 };
      atual.soma += c.peso;
      porGrupo.set(c.grupoDisciplinar.id, atual);
    }
    const linhas =
      porGrupo.size === 0
        ? [{ chave: 'gerais', nome: 'Apenas critérios gerais', total: somaGerais }]
        : Array.from(porGrupo.entries())
            .map(([chave, g]) => ({ chave, nome: `Gerais + ${g.nome}`, total: somaGerais + g.soma }))
            .sort((a, b) => a.nome.localeCompare(b.nome));
    return linhas;
  }, [criterios]);

  const semFiltros = !aCarregar && (anos.length === 0 || ciclos.length === 0);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Critérios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Critérios de avaliação por ano letivo e ciclo, gerais ou específicos de um grupo disciplinar.
            {!isAdmin && ' Apenas administradores podem criar, editar ou remover critérios.'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/criterios/nova">
            <Button type="button">
              <Plus className="h-4 w-4" />
              Novo critério
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:max-w-md sm:grid-cols-2">
        <div>
          <Label htmlFor="filtro-ano">Ano letivo</Label>
          <Select id="filtro-ano" value={anoLetivoId} onChange={(e) => setAnoLetivoId(e.target.value)}>
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="filtro-ciclo">Ciclo</Label>
          <Select id="filtro-ciclo" value={cicloId} onChange={(e) => setCicloId(e.target.value)}>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : semFiltros ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Faltam anos letivos ou ciclos"
            description="Crie primeiro pelo menos um ano letivo e um ciclo para poder definir critérios."
          />
        </Card>
      ) : aCarregar ? (
        <PageLoading />
      ) : criterios.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Ainda não existem critérios para este ano letivo e ciclo"
            description={isAdmin ? 'Crie o primeiro em "Novo critério".' : 'Peça a um administrador para os criar.'}
          />
        </Card>
      ) : (
        <>
          <TableContainer>
            <Table>
              <THead>
                <Tr>
                  <Th>Critério</Th>
                  <Th>Âmbito</Th>
                  <Th>Peso</Th>
                  <Th>Instrumentos</Th>
                  {isAdmin && <Th className="text-right">Ações</Th>}
                </Tr>
              </THead>
              <TBody>
                {criterios.map((c) => (
                  <Tr key={c.id}>
                    <Td className="font-medium text-slate-900">
                      <Link href={`/criterios/${c.id}`} className="hover:text-brand-700 hover:underline">
                        {c.nome}
                      </Link>
                    </Td>
                    <Td>
                      {c.tipo === 'GERAL' ? (
                        <Badge tone="brand">Geral</Badge>
                      ) : (
                        <Badge tone="warning">{c.grupoDisciplinar?.nome ?? 'Específico'}</Badge>
                      )}
                    </Td>
                    <Td className="text-slate-500">{percent(c.peso)}</Td>
                    <Td className="text-slate-500">{c.instrumentosRecolha.length}</Td>
                    {isAdmin && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/criterios/${c.id}/editar`}>
                            <Button size="sm" variant="ghost" aria-label={`Editar ${c.nome}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="ghost" onClick={() => remover(c)} aria-label={`Remover ${c.nome}`}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableContainer>

          <Card className="mt-4 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Verificação de pesos</h2>
            <p className="mt-1 text-xs text-slate-500">
              Os critérios que se aplicam a uma disciplina (gerais do ciclo + específicos do seu grupo) devem somar
              100%.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {verificacaoPesos.map((l) => {
                const certo = Math.abs(l.total - 1) <= TOLERANCIA;
                return (
                  <li key={l.chave} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">{l.nome}</span>
                    <Badge tone={certo ? 'success' : 'warning'}>{percent(l.total)}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </AppShell>
  );
}
