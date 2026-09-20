'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
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
    <AppShell>
      <Link
        href={`/turmas/${params.turmaId}/disciplinas/${params.turmaDisciplinaId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à disciplina
      </Link>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">Alunos inscritos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Só os alunos inscritos aqui recebem notas e aparecem no resumo desta disciplina. Um aluno
        pode estar inscrito em disciplinas diferentes dentro da mesma turma.
      </p>

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th className="w-16">Nº</Th>
                <Th>Nome</Th>
                <Th>Estado</Th>
                <Th className="text-right">Ações</Th>
              </Tr>
            </THead>
            <TBody>
              {alunosTurma.map((a) => {
                const ativo = inscricaoAtiva(a.id);
                return (
                  <Tr key={a.id}>
                    <Td className="tabular-nums text-slate-500">{a.numero}</Td>
                    <Td className="font-medium text-slate-900">{a.nome}</Td>
                    <Td>
                      <Badge tone={ativo ? 'success' : 'neutral'}>{ativo ? 'Inscrito' : 'Não inscrito'}</Badge>
                    </Td>
                    <Td className="text-right">
                      {ativo ? (
                        <button
                          onClick={() => desinscrever(a.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Terminar inscrição
                        </button>
                      ) : (
                        <button
                          onClick={() => inscrever(a.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Inscrever
                        </button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
              {alunosTurma.length === 0 && (
                <Tr>
                  <Td colSpan={4}>
                    <div className="py-6 text-center text-sm text-slate-400">
                      Esta turma ainda não tem alunos.{' '}
                      <Link href={`/turmas/${params.turmaId}/alunos`} className="text-brand-600 hover:underline">
                        Adicionar alunos
                      </Link>
                    </div>
                  </Td>
                </Tr>
              )}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </AppShell>
  );
}
