'use client';

import { useEffect, useState } from 'react';
import { Plus, ShieldCheck, Users2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'PROFESSOR' | 'ADMIN';
  createdAt: string;
  _count: { turmas: number };
}

interface AdminTurma {
  id: string;
  nome: string;
  nivelEnsino: string | null;
  createdAt: string;
  disciplinas: Array<{ disciplina: { nome: string } }>;
  anoLetivo: { nome: string };
  user: { id: string; name: string; email: string };
  _count: { matriculas: number };
}

export default function AdminPage() {
  const [tab, setTab] = useState<'utilizadores' | 'turmas'>('utilizadores');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [turmas, setTurmas] = useState<AdminTurma[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormUser, setMostrarFormUser] = useState(false);

  async function carregar() {
    setACarregar(true);
    setErro(null);
    const [ru, rt] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/turmas')]);
    if (!ru.ok || !rt.ok) {
      setErro('Não foi possível carregar os dados de administração.');
      setACarregar(false);
      return;
    }
    setUsers(await ru.json());
    setTurmas(await rt.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alterarRole(userId: string, role: 'PROFESSOR' | 'ADMIN') {
    setErro(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível alterar o papel do utilizador.');
      return;
    }
    carregar();
  }

  async function eliminarUtilizador(userId: string, nome: string) {
    if (!confirm(`Eliminar a conta de "${nome}"? Esta ação apaga também todas as turmas, alunos e notas associadas e não pode ser desfeita.`)) {
      return;
    }
    setErro(null);
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível eliminar o utilizador.');
      return;
    }
    carregar();
  }

  return (
    <AppShell width="full">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Administração</h1>
            <p className="mt-1 text-sm text-slate-500">Gerir utilizadores e visualizar todas as turmas.</p>
          </div>
          {tab === 'utilizadores' && (
            <Button onClick={() => setMostrarFormUser((v) => !v)}>
              <Plus className="h-4 w-4" />
              Novo utilizador
            </Button>
          )}
        </div>

        <Tabs
          tabs={[
            { key: 'utilizadores', label: 'Utilizadores' },
            { key: 'turmas', label: 'Todas as turmas' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as 'utilizadores' | 'turmas')}
        />

        {erro && (
          <div className="mb-4">
            <Alert tone="danger">{erro}</Alert>
          </div>
        )}

        {tab === 'utilizadores' && mostrarFormUser && (
          <NovoUtilizadorForm
            onCriado={() => {
              setMostrarFormUser(false);
              carregar();
            }}
          />
        )}

        {aCarregar ? (
          <PageLoading />
        ) : tab === 'utilizadores' ? (
          <TableContainer>
            <Table>
              <THead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Email</Th>
                  <Th>Papel</Th>
                  <Th>Turmas</Th>
                  <Th>Registado em</Th>
                  <Th className="text-right">Ações</Th>
                </Tr>
              </THead>
              <TBody>
                {users.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium text-slate-900">{u.name}</Td>
                    <Td className="text-slate-500">{u.email}</Td>
                    <Td>
                      <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>
                        {u.role === 'ADMIN' && <ShieldCheck className="h-3 w-3" />}
                        {u.role === 'ADMIN' ? 'Administrador' : 'Professor'}
                      </Badge>
                    </Td>
                    <Td>{u._count.turmas}</Td>
                    <Td className="text-slate-500">{new Date(u.createdAt).toLocaleDateString('pt-PT')}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-3">
                        {u.role === 'ADMIN' ? (
                          <button
                            onClick={() => alterarRole(u.id, 'PROFESSOR')}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Despromover
                          </button>
                        ) : (
                          <button
                            onClick={() => alterarRole(u.id, 'ADMIN')}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Promover a admin
                          </button>
                        )}
                        <button
                          onClick={() => eliminarUtilizador(u.id, u.name)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {users.length === 0 && (
                  <Tr>
                    <Td colSpan={6}>
                      <div className="py-4 text-center text-slate-400">Sem utilizadores.</div>
                    </Td>
                  </Tr>
                )}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <TableContainer>
            <Table>
              <THead>
                <Tr>
                  <Th>Turma</Th>
                  <Th>Disciplina</Th>
                  <Th>Ano letivo</Th>
                  <Th>Alunos</Th>
                  <Th>Professor</Th>
                </Tr>
              </THead>
              <TBody>
                {turmas.map((t) => (
                  <Tr key={t.id}>
                    <Td className="font-medium text-slate-900">{t.nome}</Td>
                    <Td>{t.disciplinas.length > 0 ? t.disciplinas.map((td) => td.disciplina.nome).join(', ') : '—'}</Td>
                    <Td>{t.anoLetivo.nome}</Td>
                    <Td>{t._count.matriculas}</Td>
                    <Td className="text-slate-500">
                      {t.user.name} ({t.user.email})
                    </Td>
                  </Tr>
                ))}
                {turmas.length === 0 && (
                  <Tr>
                    <Td colSpan={5}>
                      <div className="py-4 text-center text-slate-400">Sem turmas.</div>
                    </Td>
                  </Tr>
                )}
              </TBody>
            </Table>
          </TableContainer>
        )}
      </div>
    </AppShell>
  );
}

function NovoUtilizadorForm({ onCriado }: { onCriado: () => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PROFESSOR' | 'ADMIN'>('PROFESSOR');
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAGravar(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nome, email, password, role }),
    });
    setAGravar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível criar o utilizador.');
      return;
    }
    onCriado();
  }

  return (
    <Card as="form" onSubmit={onSubmit} className="mb-6 space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Users2 className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Novo utilizador</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="role">Papel</Label>
          <Select id="role" value={role} onChange={(e) => setRole(e.target.value as 'PROFESSOR' | 'ADMIN')}>
            <option value="PROFESSOR">Professor</option>
            <option value="ADMIN">Administrador</option>
          </Select>
        </div>
      </div>
      {erro && <Alert tone="danger">{erro}</Alert>}
      <Button type="submit" loading={aGravar}>
        {aGravar ? 'A criar…' : 'Criar utilizador'}
      </Button>
    </Card>
  );
}
