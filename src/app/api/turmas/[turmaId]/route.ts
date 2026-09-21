import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const turma = await prisma.turma.findUnique({
      where: { id: params.turmaId },
      include: {
        anoLetivo: true,
        matriculas: {
          where: { ativa: true },
          orderBy: { numero: 'asc' },
          include: { aluno: { include: { medidas: { include: { medida: true } } } } },
        },
        periodos: { orderBy: { ordem: 'asc' } },
        disciplinas: { include: { disciplina: { include: { ciclos: { include: { ciclo: true } } } } } },
      },
    });
    if (!turma) return NextResponse.json(turma);
    const { matriculas, ...turmaSemMatriculas } = turma;
    const alunos = matriculas.map((m) => ({ ...m.aluno, numero: m.numero }));
    return NextResponse.json({ ...turmaSemMatriculas, alunos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);

    // A Matricula desta turma é apagada em cascata, mas o Aluno (identidade
    // persistente, independente da turma, para suportar transferências)
    // não — se não fizermos nada, um aluno cuja única matrícula era nesta
    // turma fica "órfão" (sem turma nenhuma) em vez de desaparecer. Apaga-se
    // aqui explicitamente quem ficaria nessa situação; quem já foi
    // transferido de/para outras turmas mantém-se, só perde a matrícula
    // desta.
    const alunosSoNestaTurma = await prisma.aluno.findMany({
      where: {
        AND: [{ matriculas: { some: {} } }, { matriculas: { every: { turmaId: params.turmaId } } }],
      },
      select: { id: true },
    });
    if (alunosSoNestaTurma.length > 0) {
      await prisma.aluno.deleteMany({ where: { id: { in: alunosSoNestaTurma.map((a) => a.id) } } });
    }

    await prisma.turma.delete({ where: { id: params.turmaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
