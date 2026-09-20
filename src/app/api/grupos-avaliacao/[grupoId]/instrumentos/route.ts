import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { instrumentoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

export async function POST(req: NextRequest, { params }: { params: { grupoId: string } }) {
  try {
    const userId = await requireUserId();
    const grupo = await prisma.grupoAvaliacao.findFirst({
      where: { id: params.grupoId, userId },
    });
    if (!grupo) throw new NotFoundError('Grupo de avaliação não encontrado');

    const data = instrumentoAvaliacaoSchema.parse(await req.json());
    const instrumento = await prisma.instrumentoAvaliacao.create({
      data: {
        grupoId: params.grupoId,
        nome: data.nome,
        peso: data.peso,
        ordem: data.ordem ?? 0,
      },
    });
    return NextResponse.json(instrumento, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
