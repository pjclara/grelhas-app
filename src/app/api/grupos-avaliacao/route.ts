import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { grupoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

const INCLUDE = {
  disciplinas: true,
  instrumentos: { orderBy: { ordem: 'asc' as const } },
};

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const anoLetivoId = req.nextUrl.searchParams.get('anoLetivoId');
    if (!anoLetivoId) {
      return NextResponse.json({ error: 'anoLetivoId é obrigatório' }, { status: 400 });
    }
    const grupos = await prisma.grupoAvaliacao.findMany({
      where: { userId, anoLetivoId },
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
    const userId = await requireUserId();
    const data = grupoAvaliacaoSchema.parse(await req.json());

    const anoLetivo = await prisma.anoLetivo.findFirst({
      where: { id: data.anoLetivoId, userId },
    });
    if (!anoLetivo) throw new NotFoundError('Ano letivo não encontrado');

    const disciplinas = await prisma.disciplina.findMany({
      where: { id: { in: data.disciplinaIds }, userId },
      select: { id: true },
    });
    if (disciplinas.length !== data.disciplinaIds.length) {
      throw new NotFoundError('Uma ou mais disciplinas não foram encontradas');
    }

    const grupo = await prisma.grupoAvaliacao.create({
      data: {
        userId,
        anoLetivoId: data.anoLetivoId,
        nome: data.nome,
        ordem: data.ordem ?? 0,
        disciplinas: { connect: data.disciplinaIds.map((id) => ({ id })) },
      },
      include: INCLUDE,
    });
    return NextResponse.json(grupo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
