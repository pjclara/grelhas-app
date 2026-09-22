import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { disciplinaSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const INCLUDE = {
  grupoDisciplinar: true,
  ciclos: { include: { ciclo: true as const } },
  anosEscolaridade: { include: { anoEscolaridade: true as const } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { disciplinaId: string } }
) {
  try {
    await requireUserId();
    const disciplina = await prisma.disciplina.findFirst({
      where: { id: params.disciplinaId },
      include: INCLUDE,
    });
    if (!disciplina) throw new NotFoundError('Disciplina não encontrada');
    return NextResponse.json(disciplina);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { disciplinaId: string } }
) {
  try {
    await requireAdminId();
    const { cicloIds, anoEscolaridadeIds, ...data } = disciplinaSchema.partial().parse(await req.json());

    const existente = await prisma.disciplina.findFirst({
      where: { id: params.disciplinaId },
    });
    if (!existente) throw new NotFoundError('Disciplina não encontrada');

    const disciplina = await prisma.$transaction(async (tx) => {
      if (cicloIds) {
        await tx.disciplinaCiclo.deleteMany({ where: { disciplinaId: params.disciplinaId } });
      }
      if (anoEscolaridadeIds) {
        await tx.disciplinaAnoEscolaridade.deleteMany({ where: { disciplinaId: params.disciplinaId } });
      }
      return tx.disciplina.update({
        where: { id: params.disciplinaId },
        data: {
          ...data,
          ...(cicloIds ? { ciclos: { create: cicloIds.map((cicloId) => ({ cicloId })) } } : {}),
          ...(anoEscolaridadeIds
            ? { anosEscolaridade: { create: anoEscolaridadeIds.map((anoEscolaridadeId) => ({ anoEscolaridadeId })) } }
            : {}),
        },
        include: INCLUDE,
      });
    });
    return NextResponse.json(disciplina);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { disciplinaId: string } }
) {
  try {
    await requireAdminId();
    const existente = await prisma.disciplina.findFirst({
      where: { id: params.disciplinaId },
    });
    if (!existente) throw new NotFoundError('Disciplina não encontrada');

    await prisma.disciplina.delete({ where: { id: params.disciplinaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
