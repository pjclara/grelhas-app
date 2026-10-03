import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { criterioSchema } from '@/lib/validation';
import { ConflictError, handleApiError, NotFoundError } from '@/lib/api-helpers';
import {
  atualizarCriterio,
  contarInstrumentosEmUso,
  criterioInclude,
  existeCriterioComNome,
  validarReferenciasCriterio,
} from '@/lib/criterios';

export async function GET(_req: NextRequest, { params }: { params: { criterioId: string } }) {
  try {
    await requireUserId();
    const criterio = await prisma.criterio.findUnique({
      where: { id: params.criterioId },
      include: criterioInclude,
    });
    if (!criterio) throw new NotFoundError('Critério não encontrado');
    return NextResponse.json(criterio);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Atualiza o critério e a sua árvore preservando os ids (ver atualizarCriterio
 * em src/lib/criterios.ts), para não apagar instrumentos e notas de turmas que
 * apontem para eles.
 */
export async function PATCH(req: NextRequest, { params }: { params: { criterioId: string } }) {
  try {
    await requireAdminId();
    const data = criterioSchema.parse(await req.json());

    const existente = await prisma.criterio.findUnique({ where: { id: params.criterioId }, select: { id: true } });
    if (!existente) throw new NotFoundError('Critério não encontrado');
    await validarReferenciasCriterio(data);

    if (await existeCriterioComNome(data, params.criterioId)) {
      throw new ConflictError('Já existe um critério com este nome.');
    }

    return NextResponse.json(await atualizarCriterio(params.criterioId, data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { criterioId: string } }) {
  try {
    await requireAdminId();
    const existente = await prisma.criterio.findUnique({ where: { id: params.criterioId }, select: { id: true } });
    if (!existente) throw new NotFoundError('Critério não encontrado');

    const emUso = await contarInstrumentosEmUso(params.criterioId);
    if (emUso > 0) {
      throw new ConflictError(
        `Este critério está em uso por ${emUso} instrumento(s) de turmas e não pode ser eliminado.`
      );
    }
    await prisma.criterio.delete({ where: { id: params.criterioId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
