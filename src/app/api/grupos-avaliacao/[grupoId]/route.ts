import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminId } from '@/lib/auth';
import { grupoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const INCLUDE = {
  instrumentos: { orderBy: { ordem: 'asc' as const }, include: { pesos: true } },
};

export async function PATCH(req: NextRequest, { params }: { params: { grupoId: string } }) {
  try {
    await requireAdminId();
    const data = grupoAvaliacaoSchema.partial().parse(await req.json());

    const existente = await prisma.grupoAvaliacao.findFirst({
      where: { id: params.grupoId },
    });
    if (!existente) throw new NotFoundError('Grupo de avaliação não encontrado');

    const grupo = await prisma.grupoAvaliacao.update({
      where: { id: params.grupoId },
      data: {
        nome: data.nome,
        ordem: data.ordem,
      },
      include: INCLUDE,
    });
    return NextResponse.json(grupo);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { grupoId: string } }) {
  try {
    await requireAdminId();
    const existente = await prisma.grupoAvaliacao.findFirst({
      where: { id: params.grupoId },
    });
    if (!existente) throw new NotFoundError('Grupo de avaliação não encontrado');

    await prisma.grupoAvaliacao.delete({ where: { id: params.grupoId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
