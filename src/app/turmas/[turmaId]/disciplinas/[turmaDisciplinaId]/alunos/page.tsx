'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Aluno } from '@/lib/types';

interface Inscricao {
  id: string;
  alunoId: string;
  ativo: boolean;
  aluno: Aluno;
}

export default function AlunosDisciplinaPage({
  params,
}: {
  params: { turmaId: string; turmaDisciplinaId: string };
}) {
  const [alunosTurma, setAlunosTurma] = useState<Aluno[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  async function carregar() {
    setACarregar(true);
    const [ra, ri] = await Promise.all([
      fetch(`/api/turmas/${params.turmaId}/alunos`),
      fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/alunos`),
    ]);
    if (!ra.ok || !ri.ok) {
      setErroCarregar('Não foi possível carregar as inscrições.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setAlunosTurma((await ra.json()).filter((a: Aluno) => a.ativo));
    setInscricoes(await ri.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId, params.turmaDisciplinaId]);

  function inscricaoAtiva(alunoId: string): boolean {
    return inscricoes.some((i) => i.alunoId === alunoId && i.ativo);
  }

  async function inscrever(alunoId: string) {
    await fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alunoId }),
    });
    carregar();
  }

  async function desinscrever(alunoId: string) {
    await fetch(`/api/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}/alunos/${alunoId}`, {
      method: 'DELETE',
    });
    carregar();
  }

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`}
          className="mb-2 inline-block text-sm text-brand-600 hover:underline"
        >
          ← Voltar à disciplina
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Alunos inscritos</h1>
        <p className="mb-6 text-sm text-slate-500">
          Só os alunos inscritos aqui recebem notas e aparecem no resumo desta disciplina. Um aluno
          pode estar inscrito em disciplinas diferentes dentro da mesma turma.
        </p>

        {erroCarregar ? (
          <p className="text-sm text-red-600">{erroCarregar}</p>
        ) : aCarregar ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {alunosTurma.map((a) => {
                const ativo = inscricaoAtiva(a.id);
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{a.numero}</td>
                    <td className="px-3 py-2">{a.nome}</td>
                    <td className="px-3 py-2 text-slate-500">{ativo ? 'Inscrito' : 'Não inscrito'}</td>
                    <td className="px-3 py-2 text-right">
                      {ativo ? (
                        <button onClick={() => desinscrever(a.id)} className="text-red-600 hover:underline">
                          Terminar inscrição
                        </button>
                      ) : (
                        <button onClick={() => inscrever(a.id)} className="text-brand-600 hover:underline">
                          Inscrever
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {alunosTurma.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Esta turma ainda não tem alunos.{' '}
                    <Link href={`/turmas/${params.turmaId}/alunos`} className="text-brand-600 hover:underline">
                      Adicionar alunos
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
