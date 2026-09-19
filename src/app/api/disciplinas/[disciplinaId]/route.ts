import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { disciplinaSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { disciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    const data = disciplinaSchema.partial().parse(await req.json());

    const existente = await prisma.disciplina.findFirst({
      where: { id: params.disciplinaId, userId },
    });
    if (!existente) throw new NotFoundError('Disciplina não encontrada');

    const disciplina = await prisma.disciplina.update({
      where: { id: params.disciplinaId },
      data,
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
    const userId = await requireUserId();
    const existente = await prisma.disciplina.findFirst({
      where: { id: params.disciplinaId, userId },
    });
    if (!existente) throw new NotFoundError('Disciplina não encontrada');

    await prisma.disciplina.delete({ where: { id: params.disciplinaId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
