import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { turmaDisciplinaInstrumentoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';
import { criterioInclude, paraCriterioDTO } from '@/lib/criterio-dto';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const criterios = await prisma.turmaDisciplinaInstrumento.findMany({
      where: { turmaDisciplinaId: params.turmaDisciplinaId },
      orderBy: { ordem: 'asc' },
      include: criterioInclude,
    });
    return NextResponse.json(criterios.map(paraCriterioDTO));
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Ativa, para esta turma+disciplina, um InstrumentoAvaliacao do catálogo
 * global (com um peso próprio desta turma). Não cria entradas novas no
 * catálogo — todo o critério usado numa turma tem de existir lá primeiro
 * (gerido pelo ADMIN em /criterios-avaliacao).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const data = turmaDisciplinaInstrumentoSchema.parse(await req.json());

    const existentes = await prisma.turmaDisciplinaInstrumento.count({
      where: { turmaDisciplinaId: params.turmaDisciplinaId },
    });

    const criterio = await prisma.turmaDisciplinaInstrumento.create({
      data: {
        turmaDisciplinaId: params.turmaDisciplinaId,
        instrumentoAvaliacaoId: data.instrumentoAvaliacaoId,
        peso: data.peso,
        ordem: data.ordem ?? existentes,
      },
      include: criterioInclude,
    });
    return NextResponse.json(paraCriterioDTO(criterio), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
