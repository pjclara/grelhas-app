import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { instrumentoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const instrumento = await prisma.instrumento.findFirst({
      where: { id: params.instrumentoId, turmaId: params.turmaId },
      include: {
        perguntas: { orderBy: { ordem: 'asc' }, include: { notas: true } },
        criterio: true,
        periodo: true,
      },
    });
    if (!instrumento) throw new NotFoundError('Instrumento não encontrado');
    return NextResponse.json(instrumento);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Atualiza os metadados do instrumento e sincroniza a lista de perguntas:
 * perguntas com `id` são atualizadas, sem `id` são criadas, e as que
 * existiam na BD mas não vêm no pedido são apagadas (e as suas notas em
 * cascata).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { turmaId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = instrumentoSchema.parse(await req.json());

    const existente = await prisma.instrumento.findFirst({
      where: { id: params.instrumentoId, turmaId: params.turmaId },
      include: { perguntas: true },
    });
    if (!existente) throw new NotFoundError('Instrumento não encontrado');

    const idsRecebidos = new Set(data.perguntas.filter((p) => p.id).map((p) => p.id as string));
    const idsParaApagar = existente.perguntas
      .filter((p) => !idsRecebidos.has(p.id))
      .map((p) => p.id);

    await prisma.$transaction([
      prisma.pergunta.deleteMany({ where: { id: { in: idsParaApagar } } }),
      ...data.perguntas.map((p) =>
        p.id
          ? prisma.pergunta.update({
              where: { id: p.id },
              data: { codigo: p.codigo, valorMax: p.valorMax, ordem: p.ordem },
            })
          : prisma.pergunta.create({
              data: {
                instrumentoId: params.instrumentoId,
                codigo: p.codigo,
                valorMax: p.valorMax,
                ordem: p.ordem,
              },
            })
      ),
      prisma.instrumento.update({
        where: { id: params.instrumentoId },
        data: {
          periodoId: data.periodoId,
          criterioId: data.criterioId,
          nome: data.nome,
          modo: data.modo,
          escalaMax: data.escalaMax,
          unidade: data.unidade ?? null,
          tema: data.tema ?? null,
          data: data.data ? new Date(data.data) : null,
          ordem: data.ordem ?? existente.ordem,
        },
      }),
    ]);

    const instrumento = await prisma.instrumento.findUnique({
      where: { id: params.instrumentoId },
      include: { perguntas: { orderBy: { ordem: 'asc' } } },
    });

    return NextResponse.json(instrumento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { turmaId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    await prisma.instrumento.delete({ where: { id: params.instrumentoId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
