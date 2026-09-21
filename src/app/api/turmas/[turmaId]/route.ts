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
        disciplinas: { include: { disciplina: true } },
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
    await prisma.turma.delete({ where: { id: params.turmaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
