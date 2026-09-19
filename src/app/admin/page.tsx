'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';

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
  disciplina: { nome: string };
  anoLetivo: { nome: string };
  user: { id: string; name: string; email: string };
  _count: { alunos: number };
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
    <div>
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Administração</h1>
          {tab === 'utilizadores' && (
            <button
              onClick={() => setMostrarFormUser((v) => !v)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {mostrarFormUser ? 'Cancelar' : '+ Novo utilizador'}
            </button>
          )}
        </div>

        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab('utilizadores')}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === 'utilizadores' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'
            }`}
          >
            Utilizadores
          </button>
          <button
            onClick={() => setTab('turmas')}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === 'turmas' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'
            }`}
          >
            Todas as turmas
          </button>
        </div>

        {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

        {tab === 'utilizadores' && mostrarFormUser && (
          <NovoUtilizadorForm
            onCriado={() => {
              setMostrarFormUser(false);
              carregar();
            }}
          />
        )}

        {aCarregar ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : tab === 'utilizadores' ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Papel</th>
                  <th className="px-4 py-2">Turmas</th>
                  <th className="px-4 py-2">Registado em</th>
                  <th className="px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2 text-slate-500">{u.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === 'ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role === 'ADMIN' ? 'Administrador' : 'Professor'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{u._count.turmas}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        {u.role === 'ADMIN' ? (
                          <button
                            onClick={() => alterarRole(u.id, 'PROFESSOR')}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Despromover
                          </button>
                        ) : (
                          <button
                            onClick={() => alterarRole(u.id, 'ADMIN')}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Promover a admin
                          </button>
                        )}
                        <button
                          onClick={() => eliminarUtilizador(u.id, u.name)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      Sem utilizadores.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Turma</th>
                  <th className="px-4 py-2">Disciplina</th>
                  <th className="px-4 py-2">Ano letivo</th>
                  <th className="px-4 py-2">Alunos</th>
                  <th className="px-4 py-2">Professor</th>
                </tr>
              </thead>
              <tbody>
                {turmas.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-900">{t.nome}</td>
                    <td className="px-4 py-2">{t.disciplina.nome}</td>
                    <td className="px-4 py-2">{t.anoLetivo.nome}</td>
                    <td className="px-4 py-2">{t._count.alunos}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {t.user.name} ({t.user.email})
                    </td>
                  </tr>
                ))}
                {turmas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Sem turmas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
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
    <form onSubmit={onSubmit} className="mb-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Palavra-passe</label>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Papel</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'PROFESSOR' | 'ADMIN')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="PROFESSOR">Professor</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button
        type="submit"
        disabled={aGravar}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {aGravar ? 'A criar…' : 'Criar utilizador'}
      </button>
    </form>
  );
}
