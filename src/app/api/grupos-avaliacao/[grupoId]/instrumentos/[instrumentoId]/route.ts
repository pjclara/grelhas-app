import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminId } from '@/lib/auth';
import { instrumentoAvaliacaoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';
import { sincronizarAtivacoesInstrumento } from '@/lib/catalogo-sync';

async function assertExists(grupoId: string, instrumentoId: string) {
  const instrumento = await prisma.instrumentoAvaliacao.findFirst({
    where: { id: instrumentoId, grupoId },
  });
  if (!instrumento) throw new NotFoundError('Instrumento não encontrado');
  return instrumento;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { grupoId: string; instrumentoId: string } }
) {
  try {
    await requireAdminId();
    await assertExists(params.grupoId, params.instrumentoId);
    const data = instrumentoAvaliacaoSchema.partial().parse(await req.json());

    if (data.pesos) {
      const disciplinas = await prisma.disciplina.findMany({
        where: { id: { in: data.pesos.map((p) => p.disciplinaId) } },
        select: { id: true },
      });
      if (disciplinas.length !== data.pesos.length) {
        throw new NotFoundError('Uma ou mais disciplinas não foram encontradas');
      }
    }

    const instrumento = await prisma.$transaction(async (tx) => {
      if (data.pesos) {
        await tx.instrumentoPeso.deleteMany({ where: { instrumentoId: params.instrumentoId } });
      }
      const atualizado = await tx.instrumentoAvaliacao.update({
        where: { id: params.instrumentoId },
        data: {
          nome: data.nome,
          ordem: data.ordem,
          ...(data.pesos ? { pesos: { create: data.pesos } } : {}),
        },
        include: { pesos: true },
      });
      if (data.pesos) {
        await sincronizarAtivacoesInstrumento(tx, params.grupoId, params.instrumentoId, data.pesos);
      }
      return atualizado;
    });
    return NextResponse.json(instrumento);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { grupoId: string; instrumentoId: string } }
) {
  try {
    await requireAdminId();
    await assertExists(params.grupoId, params.instrumentoId);
    await prisma.instrumentoAvaliacao.delete({ where: { id: params.instrumentoId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
