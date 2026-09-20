'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import { NIVEIS_ENSINO, type Disciplina } from '@/lib/types';

export default function DisciplinasPage() {
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
    <div>
      <TopNav />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-6 py-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-2xl font-semibold text-slate-900">Disciplinas</h1>

            <form
              onSubmit={adicionar}
              className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-700">Nome da disciplina</label>
                <input
                  placeholder="ex: Matemática"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Ciclo</label>
                <select
                  value={ciclo}
                  onChange={(e) => setCiclo(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Selecionar…</option>
                  {NIVEIS_ENSINO.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={aGravar}
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {aGravar ? 'A criar…' : 'Adicionar'}
              </button>
              {erro && <p className="w-full text-sm text-red-600">{erro}</p>}
            </form>

            {erroCarregar ? (
              <p className="text-sm text-red-600">{erroCarregar}</p>
            ) : aCarregar ? (
              <p className="text-sm text-slate-500">A carregar…</p>
            ) : (
              <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Ciclo</th>
                    <th className="px-3 py-2">Turmas</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {disciplinas.map((d) =>
                    editandoId === d.id ? (
                      <tr key={d.id} className="border-t border-slate-100 bg-slate-50">
                        <td className="px-3 py-2">
                          <input
                            value={nomeEdit}
                            onChange={(e) => setNomeEdit(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={cicloEdit}
                            onChange={(e) => setCicloEdit(e.target.value)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">Selecionar…</option>
                            {NIVEIS_ENSINO.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-slate-400">{d._count?.turmaDisciplinas ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => guardarEdicao(d.id)}
                              className="text-emerald-600 hover:underline"
                            >
                              Guardar
                            </button>
                            <button onClick={cancelarEdicao} className="text-slate-500 hover:underline">
                              Cancelar
                            </button>
                          </div>
                          {erroEdit && <p className="mt-1 text-xs text-red-600">{erroEdit}</p>}
                        </td>
                      </tr>
                    ) : (
                      <tr key={d.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{d.nome}</td>
                        <td className="px-3 py-2 text-slate-500">{d.ciclo ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{d._count?.turmaDisciplinas ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => iniciarEdicao(d)}
                              className="text-brand-600 hover:underline"
                            >
                              Editar
                            </button>
                            <button onClick={() => remover(d)} className="text-red-600 hover:underline">
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                  {disciplinas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                        Ainda não tem disciplinas. Crie a primeira acima.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
