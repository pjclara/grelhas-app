import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { turmaLimiaresSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const turma = await prisma.turma.findUnique({
      where: { id: params.turmaId },
      include: {
        disciplina: true,
        anoLetivo: true,
        alunos: { orderBy: { numero: 'asc' } },
        periodos: { orderBy: { ordem: 'asc' } },
        criterios: { orderBy: { ordem: 'asc' } },
      },
    });
    return NextResponse.json(turma);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = turmaLimiaresSchema.partial().parse(await req.json());
    const turma = await prisma.turma.update({ where: { id: params.turmaId }, data });
    return NextResponse.json(turma);
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
