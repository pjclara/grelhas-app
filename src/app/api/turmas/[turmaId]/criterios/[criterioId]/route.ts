import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { criterioSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { turmaId: string; criterioId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = criterioSchema.partial().parse(await req.json());
    const criterio = await prisma.criterio.update({ where: { id: params.criterioId }, data });
    return NextResponse.json(criterio);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { turmaId: string; criterioId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    await prisma.criterio.delete({ where: { id: params.criterioId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
