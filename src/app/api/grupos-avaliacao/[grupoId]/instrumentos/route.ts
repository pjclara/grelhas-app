import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminId } from '@/lib/auth';
import { instrumentoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';
import { sincronizarAtivacoesInstrumento } from '@/lib/catalogo-sync';

export async function POST(req: NextRequest, { params }: { params: { grupoId: string } }) {
  try {
    await requireAdminId();
    const grupo = await prisma.grupoAvaliacao.findFirst({
      where: { id: params.grupoId },
    });
    if (!grupo) throw new NotFoundError('Grupo de avaliação não encontrado');

    const data = instrumentoAvaliacaoSchema.parse(await req.json());

    if (data.pesos.length > 0) {
      const disciplinas = await prisma.disciplina.findMany({
        where: { id: { in: data.pesos.map((p) => p.disciplinaId) } },
        select: { id: true },
      });
      if (disciplinas.length !== data.pesos.length) {
        throw new NotFoundError('Uma ou mais disciplinas não foram encontradas');
      }
    }

    const instrumento = await prisma.$transaction(async (tx) => {
      const criado = await tx.instrumentoAvaliacao.create({
        data: {
          grupoId: params.grupoId,
          nome: data.nome,
          ordem: data.ordem ?? 0,
          pesos: { create: data.pesos },
        },
        include: { pesos: true },
      });
      await sincronizarAtivacoesInstrumento(tx, params.grupoId, criado.id, data.pesos);
      return criado;
    });
    return NextResponse.json(instrumento, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
