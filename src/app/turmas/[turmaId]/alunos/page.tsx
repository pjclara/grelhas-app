'use client';

import { useEffect, useState } from 'react';
import TopNav from '@/components/TopNav';
import type { Aluno } from '@/lib/types';

export default function AlunosPage({ params }: { params: { turmaId: string } }) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [medidas, setMedidas] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const r = await fetch(`/api/turmas/${params.turmaId}/alunos`);
    setAlunos(await r.json());
  }

  useEffect(() => {
    carregar();
  }, [params.turmaId]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero || !nome) {
      setErro('Indique número e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: Number(numero), nome, medidas: medidas || null }),
    });
    if (!res.ok) {
      setErro('Não foi possível adicionar (número já usado?).');
      return;
    }
    setNumero('');
    setNome('');
    setMedidas('');
    carregar();
  }

  async function remover(id: string) {
    if (!confirm('Remover este aluno e todas as suas notas?')) return;
    await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, { method: 'DELETE' });
    carregar();
  }

  async function alternarAtivo(aluno: Aluno) {
    await fetch(`/api/turmas/${params.turmaId}/alunos/${aluno.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !aluno.ativo }),
    });
    carregar();
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Alunos</h1>

        <form onSubmit={adicionar} className="mb-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nº</label>
            <input
              type="number"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Medidas (Dec-Lei 54)
            </label>
            <input
              value={medidas}
              onChange={(e) => setMedidas(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Adicionar
          </button>
          {erro && <p className="w-full text-sm text-red-600">{erro}</p>}
        </form>

        <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Nº</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Medidas</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {alunos.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{a.numero}</td>
                <td className="px-3 py-2">{a.nome}</td>
                <td className="px-3 py-2 text-slate-500">{a.medidas ?? '—'}</td>
                <td className="px-3 py-2">
                  <button onClick={() => alternarAtivo(a)} className="text-brand-600 hover:underline">
                    {a.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remover(a.id)} className="text-red-600 hover:underline">
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
