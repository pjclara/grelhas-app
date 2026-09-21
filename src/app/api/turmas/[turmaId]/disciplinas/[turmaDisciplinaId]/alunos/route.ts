import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { alunoDisciplinaSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

/** Lista as inscrições (ativas e terminadas) dos alunos da turma nesta disciplina. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const [inscricoes, matriculas] = await Promise.all([
      prisma.alunoDisciplina.findMany({
        where: { turmaDisciplinaId: params.turmaDisciplinaId },
        include: { aluno: true },
      }),
      prisma.matricula.findMany({
        where: { turmaId: params.turmaId, ativa: true },
        select: { alunoId: true, numero: true },
      }),
    ]);
    const numeroPorAluno = new Map(matriculas.map((m) => [m.alunoId, m.numero]));
    const comNumero = inscricoes
      .map((i) => ({ ...i, aluno: { ...i.aluno, numero: numeroPorAluno.get(i.alunoId) ?? 0 } }))
      .sort((a, b) => a.aluno.numero - b.aluno.numero);
    return NextResponse.json(comNumero);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Inscreve um aluno (da turma) nesta disciplina. Se já existir uma
 * inscrição terminada (ativo=false) para o mesmo par aluno/disciplina,
 * reabre-a em vez de violar o @@unique([alunoId, turmaDisciplinaId]) —
 * isto é o que permite reentradas/mudanças sem perder o histórico.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const data = alunoDisciplinaSchema.parse(await req.json());

    const matricula = await prisma.matricula.findFirst({
      where: { alunoId: data.alunoId, turmaId: params.turmaId, ativa: true },
    });
    if (!matricula) throw new NotFoundError('Aluno não encontrado nesta turma');

    const inscricao = await prisma.alunoDisciplina.upsert({
      where: {
        alunoId_turmaDisciplinaId: {
          alunoId: data.alunoId,
          turmaDisciplinaId: params.turmaDisciplinaId,
        },
      },
      update: { ativo: true },
      create: {
        alunoId: data.alunoId,
        turmaDisciplinaId: params.turmaDisciplinaId,
        ativo: true,
      },
      include: { aluno: true },
    });

    return NextResponse.json(
      { ...inscricao, aluno: { ...inscricao.aluno, numero: matricula.numero } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
