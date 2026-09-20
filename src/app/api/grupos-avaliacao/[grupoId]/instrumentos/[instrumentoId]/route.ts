import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { instrumentoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

async function assertOwnership(grupoId: string, instrumentoId: string, userId: string) {
  const instrumento = await prisma.instrumentoAvaliacao.findFirst({
    where: { id: instrumentoId, grupoId, grupo: { userId } },
  });
  if (!instrumento) throw new NotFoundError('Instrumento não encontrado');
  return instrumento;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { grupoId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertOwnership(params.grupoId, params.instrumentoId, userId);
    const data = instrumentoAvaliacaoSchema.partial().parse(await req.json());
    const instrumento = await prisma.instrumentoAvaliacao.update({
      where: { id: params.instrumentoId },
      data,
    });
    return NextResponse.json(instrumento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { grupoId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertOwnership(params.grupoId, params.instrumentoId, userId);
    await prisma.instrumentoAvaliacao.delete({ where: { id: params.instrumentoId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
