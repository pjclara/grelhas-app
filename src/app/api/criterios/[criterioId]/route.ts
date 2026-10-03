import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { criterioSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';
import {
  criterioInclude,
  existeCriterioComNome,
  instrumentosRecolhaCreate,
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
 * Substitui o critério e toda a sua árvore de instrumentos de recolha e
 * sub-instrumentos. Seguro enquanto nada referencia estes registos; quando
 * Instrumento/Nota passarem a apontar para eles, tem de passar a atualizar
 * por id em vez de recriar.
 */
export async function PATCH(req: NextRequest, { params }: { params: { criterioId: string } }) {
  try {
    await requireAdminId();
    const data = criterioSchema.parse(await req.json());

    const existente = await prisma.criterio.findUnique({ where: { id: params.criterioId }, select: { id: true } });
    if (!existente) throw new NotFoundError('Critério não encontrado');
    await validarReferenciasCriterio(data);

    if (await existeCriterioComNome(data, params.criterioId)) {
      return NextResponse.json({ error: 'Já existe um critério com este nome.' }, { status: 409 });
    }

    const criterio = await prisma.$transaction(async (tx) => {
      await tx.instrumentoRecolha.deleteMany({ where: { criterioId: params.criterioId } });
      return tx.criterio.update({
        where: { id: params.criterioId },
        data: {
          anoLetivoId: data.anoLetivoId,
          cicloId: data.cicloId,
          nome: data.nome,
          peso: data.peso,
          tipo: data.tipo,
          grupoDisciplinarId: data.tipo === 'ESPECIFICO' ? data.grupoDisciplinarId : null,
          instrumentosRecolha: { create: instrumentosRecolhaCreate(data) },
        },
        include: criterioInclude,
      });
    });
    return NextResponse.json(criterio);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { criterioId: string } }) {
  try {
    await requireAdminId();
    const existente = await prisma.criterio.findUnique({ where: { id: params.criterioId }, select: { id: true } });
    if (!existente) throw new NotFoundError('Critério não encontrado');
    await prisma.criterio.delete({ where: { id: params.criterioId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
