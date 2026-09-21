import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { disciplinaSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

const INCLUDE = {
  grupoDisciplinar: true,
  ciclos: { include: { ciclo: true as const } },
  anosEscolaridade: { include: { anoEscolaridade: true as const } },
};

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const comContagem = req.nextUrl.searchParams.get('comContagem') === '1';
    const disciplinas = await prisma.disciplina.findMany({
      orderBy: { nome: 'asc' },
      include: { ...INCLUDE, ...(comContagem ? { _count: { select: { turmaDisciplinas: true } } } : {}) },
    });
    return NextResponse.json(disciplinas);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = disciplinaSchema.parse(await req.json());
    const disciplina = await prisma.disciplina.create({
      data: {
        nome: data.nome,
        grupoDisciplinarId: data.grupoDisciplinarId,
        ciclos: { create: data.cicloIds.map((cicloId) => ({ cicloId })) },
        anosEscolaridade: { create: data.anoEscolaridadeIds.map((anoEscolaridadeId) => ({ anoEscolaridadeId })) },
      },
      include: INCLUDE,
    });
    return NextResponse.json(disciplina, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
