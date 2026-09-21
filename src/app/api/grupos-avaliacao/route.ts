import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { grupoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const INCLUDE = {
  instrumentos: { orderBy: { ordem: 'asc' as const }, include: { pesos: true } },
};

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const anoLetivoId = req.nextUrl.searchParams.get('anoLetivoId');
    if (!anoLetivoId) {
      return NextResponse.json({ error: 'anoLetivoId é obrigatório' }, { status: 400 });
    }
    const grupos = await prisma.grupoAvaliacao.findMany({
      where: { anoLetivoId },
      orderBy: { ordem: 'asc' },
      include: INCLUDE,
    });
    return NextResponse.json(grupos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = grupoAvaliacaoSchema.parse(await req.json());

    const anoLetivo = await prisma.anoLetivo.findFirst({
      where: { id: data.anoLetivoId },
    });
    if (!anoLetivo) throw new NotFoundError('Ano letivo não encontrado');

    const grupo = await prisma.grupoAvaliacao.create({
      data: {
        anoLetivoId: data.anoLetivoId,
        nome: data.nome,
        ordem: data.ordem ?? 0,
      },
      include: INCLUDE,
    });
    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
