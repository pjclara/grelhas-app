'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import type { Disciplina } from '@/lib/types';

export default function DisciplinasPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');

  async function carregar() {
    setACarregar(true);
    const r = await fetch('/api/disciplinas?comContagem=1');
    if (!r.ok) {
      setErroCarregar('Não foi possível carregar as disciplinas.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setDisciplinas(await r.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarAtivo(d: Disciplina) {
    await fetch(`/api/disciplinas/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !d.ativo }),
    });
    carregar();
  }

  async function remover(d: Disciplina) {
    const turmas = d._count?.turmaDisciplinas ?? 0;
    const aviso =
      turmas > 0
        ? `A disciplina "${d.nome}" tem ${turmas} turma(s) associada(s). Eliminá-la apaga também essas turmas, alunos e notas. Esta ação não pode ser desfeita. Continuar?`
        : `Eliminar a disciplina "${d.nome}"?`;
    if (!confirm(aviso)) return;
    await fetch(`/api/disciplinas/${d.id}`, { method: 'DELETE' });
    carregar();
  }

  const disciplinasFiltradas = disciplinas.filter((d) =>
    d.nome.toLowerCase().includes(filtroNome.trim().toLowerCase())
  );

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Disciplinas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo global de disciplinas, partilhado por todos os professores.
            {!isAdmin && ' Apenas administradores podem criar, editar ou remover disciplinas.'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/disciplinas/nova">
            <Button type="button">
              <Plus className="h-4 w-4" />
              Nova disciplina
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4 max-w-xs">
        <Label htmlFor="filtro-nome">Pesquisar por nome</Label>
        <Input
          id="filtro-nome"
          placeholder="ex: Matemática"
          value={filtroNome}
          onChange={(e) => setFiltroNome(e.target.value)}
        />
      </div>

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : disciplinasFiltradas.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={disciplinas.length === 0 ? 'Ainda não existem disciplinas' : 'Sem resultados'}
            description={
              disciplinas.length === 0
                ? isAdmin
                  ? 'Crie a primeira em "Nova disciplina".'
                  : 'Peça a um administrador para criar disciplinas.'
                : 'Nenhuma disciplina corresponde à pesquisa.'
            }
          />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th>Disciplina</Th>
                <Th>Grupo Disciplinar</Th>
                <Th>Ciclos</Th>
                <Th>Anos</Th>
                <Th>Estado</Th>
                {isAdmin && <Th className="text-right">Ações</Th>}
              </Tr>
            </THead>
            <TBody>
              {disciplinasFiltradas.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium text-slate-900">
                    <Link href={`/disciplinas/${d.id}`} className="hover:text-brand-700 hover:underline">
                      {d.nome}
                    </Link>
                  </Td>
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
                    {isAdmin ? (
                      <button onClick={() => alternarAtivo(d)}>
                        <Badge tone={d.ativo ? 'success' : 'neutral'}>{d.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </button>
                    ) : (
                      <Badge tone={d.ativo ? 'success' : 'neutral'}>{d.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    )}
                  </Td>
                  {isAdmin && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/disciplinas/${d.id}/editar`}>
                          <Button size="sm" variant="ghost" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => remover(d)} aria-label="Remover">
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
      )}
    </AppShell>
  );
}
