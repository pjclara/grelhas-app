import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { instrumentoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';
import { comCriterio, folhasAplicaveis, resolverFolha } from '@/lib/criterios';

export async function GET(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const periodoId = req.nextUrl.searchParams.get('periodoId') ?? undefined;
    const instrumentos = await prisma.instrumento.findMany({
      where: { turmaDisciplinaId: params.turmaDisciplinaId, ...(periodoId ? { periodoId } : {}) },
      include: {
        perguntas: { orderBy: { ordem: 'asc' } },
        periodo: true,
      },
      orderBy: [{ periodoId: 'asc' }, { ordem: 'asc' }],
    });
    return NextResponse.json(comCriterio(instrumentos, await folhasAplicaveis(params.turmaDisciplinaId)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const data = instrumentoSchema.parse(await req.json());
    const folha = resolverFolha(await folhasAplicaveis(params.turmaDisciplinaId), data.criterioId);

    const instrumento = await prisma.instrumento.create({
      data: {
        turmaDisciplinaId: params.turmaDisciplinaId,
        periodoId: data.periodoId,
        instrumentoRecolhaId: folha.recolhaId as string,
        subInstrumentoId: folha.subId,
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
