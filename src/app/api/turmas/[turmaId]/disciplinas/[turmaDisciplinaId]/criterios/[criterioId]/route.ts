import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { criterioSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; criterioId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const data = criterioSchema.partial().parse(await req.json());
    const criterio = await prisma.criterio.update({ where: { id: params.criterioId }, data });
    return NextResponse.json(criterio);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; criterioId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    await prisma.criterio.delete({ where: { id: params.criterioId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
