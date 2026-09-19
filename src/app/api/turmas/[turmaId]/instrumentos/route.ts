import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { instrumentoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const periodoId = req.nextUrl.searchParams.get('periodoId') ?? undefined;
    const instrumentos = await prisma.instrumento.findMany({
      where: { turmaId: params.turmaId, ...(periodoId ? { periodoId } : {}) },
      include: { perguntas: { orderBy: { ordem: 'asc' } }, criterio: true, periodo: true },
      orderBy: [{ periodoId: 'asc' }, { ordem: 'asc' }],
    });
    return NextResponse.json(instrumentos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = instrumentoSchema.parse(await req.json());

    const instrumento = await prisma.instrumento.create({
      data: {
        turmaId: params.turmaId,
        periodoId: data.periodoId,
        criterioId: data.criterioId,
        nome: data.nome,
        modo: data.modo,
        escalaMax: data.escalaMax,
        unidade: data.unidade ?? null,
        tema: data.tema ?? null,
        data: data.data ? new Date(data.data) : null,
        ordem: data.ordem ?? 0,
        perguntas: {
          create: data.perguntas.map((p) => ({
            codigo: p.codigo,
            valorMax: p.valorMax,
            ordem: p.ordem,
          })),
        },
      },
      include: { perguntas: true },
    });

    return NextResponse.json(instrumento, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
