import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { notasLancamentoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

/** Grava em bloco a grelha de notas aluno × pergunta de um instrumento (upsert). */
export async function PUT(
  req: NextRequest,
  { params }: { params: { turmaId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);

    const instrumento = await prisma.instrumento.findFirst({
      where: { id: params.instrumentoId, turmaId: params.turmaId },
      include: { perguntas: true },
    });
    if (!instrumento) throw new NotFoundError('Instrumento não encontrado');
    const perguntaIds = new Set(instrumento.perguntas.map((p) => p.id));

    const { notas } = notasLancamentoSchema.parse(await req.json());

    const operacoes = [];
    for (const [alunoId, perguntas] of Object.entries(notas)) {
      for (const [perguntaId, valor] of Object.entries(perguntas)) {
        if (!perguntaIds.has(perguntaId)) continue; // ignora perguntas de outro instrumento
        operacoes.push(
          prisma.nota.upsert({
            where: { perguntaId_alunoId: { perguntaId, alunoId } },
            update: { valor },
            create: { perguntaId, alunoId, valor },
          })
        );
      }
    }

    if (operacoes.length > 0) {
      await prisma.$transaction(operacoes);
    }

    return NextResponse.json({ ok: true, gravadas: operacoes.length });
  } catch (error) {
    return handleApiError(error);
  }
}
