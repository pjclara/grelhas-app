'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import { NIVEIS_ENSINO, type Disciplina } from '@/lib/types';

export default function DisciplinasPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [cicloEdit, setCicloEdit] = useState('');
  const [erroEdit, setErroEdit] = useState<string | null>(null);

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

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setErro('Indique o nome da disciplina.');
      return;
    }
    setAGravar(true);
    const res = await fetch('/api/disciplinas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim(), ciclo: ciclo || null }),
    });
    setAGravar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível criar a disciplina (nome já usado?).');
      return;
    }
    setNome('');
    setCiclo('');
    carregar();
  }

  function iniciarEdicao(d: Disciplina) {
    setEditandoId(d.id);
    setNomeEdit(d.nome);
    setCicloEdit(d.ciclo ?? '');
    setErroEdit(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setErroEdit(null);
  }

  async function guardarEdicao(id: string) {
    setErroEdit(null);
    if (!nomeEdit.trim()) {
      setErroEdit('Indique o nome da disciplina.');
      return;
    }
    const res = await fetch(`/api/disciplinas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nomeEdit.trim(), ciclo: cicloEdit || null }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroEdit(body.error ?? 'Não foi possível guardar (nome já usado?).');
      return;
    }
    setEditandoId(null);
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

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Disciplinas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Catálogo global de disciplinas, partilhado por todos os professores.
          {!isAdmin && ' Apenas administradores podem criar, editar ou remover disciplinas.'}
        </p>
      </div>

      {isAdmin && (
        <Card as="form" onSubmit={adicionar} className="mb-6 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="nome-disciplina">Nome da disciplina</Label>
            <Input
              id="nome-disciplina"
              placeholder="ex: Matemática"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ciclo">Ciclo</Label>
            <Select id="ciclo" value={ciclo} onChange={(e) => setCiclo(e.target.value)} className="w-48">
              <option value="">Selecionar…</option>
              {NIVEIS_ENSINO.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" loading={aGravar}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
          {erro && (
            <div className="w-full">
              <Alert tone="danger">{erro}</Alert>
            </div>
          )}
        </Card>
      )}

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : disciplinas.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Ainda não existem disciplinas"
            description={isAdmin ? 'Crie a primeira acima.' : 'Peça a um administrador para criar disciplinas.'}
          />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th>Nome</Th>
                <Th>Ciclo</Th>
                <Th>Turmas</Th>
                {isAdmin && <Th className="text-right">Ações</Th>}
              </Tr>
            </THead>
            <TBody>
              {disciplinas.map((d) =>
                isAdmin && editandoId === d.id ? (
                  <Tr key={d.id} className="bg-slate-50/70">
                    <Td>
                      <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
                      {erroEdit && <p className="mt-1 text-xs text-red-600">{erroEdit}</p>}
                    </Td>
                    <Td>
                      <Select value={cicloEdit} onChange={(e) => setCicloEdit(e.target.value)}>
                        <option value="">Selecionar…</option>
                        {NIVEIS_ENSINO.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td className="text-slate-400">{d._count?.turmaDisciplinas ?? 0}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => guardarEdicao(d.id)} aria-label="Guardar">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelarEdicao} aria-label="Cancelar">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ) : (
                  <Tr key={d.id}>
                    <Td className="font-medium text-slate-900">{d.nome}</Td>
                    <Td className="text-slate-500">{d.ciclo ?? '—'}</Td>
                    <Td className="text-slate-500">{d._count?.turmaDisciplinas ?? 0}</Td>
                    {isAdmin && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => iniciarEdicao(d)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remover(d)} aria-label="Remover">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Td>
                    )}
                  </Tr>
                ),
              )}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </AppShell>
  );
}
