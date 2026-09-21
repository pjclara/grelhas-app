import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { alunoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

const INCLUDE = {
  medidas: { include: { medida: true as const } },
};

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const alunos = await prisma.aluno.findMany({
      where: { turmaId: params.turmaId },
      orderBy: { numero: 'asc' },
      include: INCLUDE,
    });
    return NextResponse.json(alunos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const { medidaIds, ...data } = alunoSchema.parse(await req.json());
    const aluno = await prisma.aluno.create({
      data: {
        turmaId: params.turmaId,
        ...data,
        medidas: { create: (medidaIds ?? []).map((medidaId) => ({ medidaId })) },
      },
      include: INCLUDE,
    });
    return NextResponse.json(aluno, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
