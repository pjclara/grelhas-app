import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { criterioSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';
import {
  criterioInclude,
  existeCriterioComNome,
  instrumentosRecolhaCreate,
  validarReferenciasCriterio,
} from '@/lib/criterios';

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const anoLetivoId = req.nextUrl.searchParams.get('anoLetivoId');
    const cicloId = req.nextUrl.searchParams.get('cicloId');
    const criterios = await prisma.criterio.findMany({
      where: {
        ...(anoLetivoId ? { anoLetivoId } : {}),
        ...(cicloId ? { cicloId } : {}),
      },
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
      include: criterioInclude,
    });
    return NextResponse.json(criterios);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = criterioSchema.parse(await req.json());
    await validarReferenciasCriterio(data);

    if (await existeCriterioComNome(data)) {
      return NextResponse.json({ error: 'Já existe um critério com este nome.' }, { status: 409 });
    }

    const criterio = await prisma.criterio.create({
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
    return NextResponse.json(criterio, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
