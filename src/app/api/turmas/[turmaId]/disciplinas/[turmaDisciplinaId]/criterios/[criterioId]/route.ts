import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { turmaDisciplinaInstrumentoPesoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';
import { criterioInclude, paraCriterioDTO } from '@/lib/criterio-dto';

/** Só o peso é editável por turma — nome/grupo vêm sempre do catálogo. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; criterioId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const data = turmaDisciplinaInstrumentoPesoSchema.parse(await req.json());
    const criterio = await prisma.turmaDisciplinaInstrumento.update({
      where: { id: params.criterioId },
      data: { peso: data.peso },
      include: criterioInclude,
    });
    return NextResponse.json(paraCriterioDTO(criterio));
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
    await prisma.turmaDisciplinaInstrumento.delete({ where: { id: params.criterioId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
