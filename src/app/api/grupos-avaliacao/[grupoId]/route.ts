import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { grupoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const INCLUDE = {
  disciplinas: true,
  instrumentos: { orderBy: { ordem: 'asc' as const } },
};

export async function PATCH(req: NextRequest, { params }: { params: { grupoId: string } }) {
  try {
    const userId = await requireUserId();
    const data = grupoAvaliacaoSchema.partial().parse(await req.json());

    const existente = await prisma.grupoAvaliacao.findFirst({
      where: { id: params.grupoId, userId },
    });
    if (!existente) throw new NotFoundError('Grupo de avaliação não encontrado');

    if (data.disciplinaIds) {
      const disciplinas = await prisma.disciplina.findMany({
        where: { id: { in: data.disciplinaIds }, userId },
        select: { id: true },
      });
      if (disciplinas.length !== data.disciplinaIds.length) {
        throw new NotFoundError('Uma ou mais disciplinas não foram encontradas');
      }
    }

    const grupo = await prisma.grupoAvaliacao.update({
      where: { id: params.grupoId },
      data: {
        nome: data.nome,
        ordem: data.ordem,
        ...(data.disciplinaIds
          ? { disciplinas: { set: data.disciplinaIds.map((id) => ({ id })) } }
          : {}),
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
    const userId = await requireUserId();
    const existente = await prisma.grupoAvaliacao.findFirst({
      where: { id: params.grupoId, userId },
    });
    if (!existente) throw new NotFoundError('Grupo de avaliação não encontrado');

    await prisma.grupoAvaliacao.delete({ where: { id: params.grupoId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
