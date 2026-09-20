import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

/** Termina a inscrição do aluno nesta disciplina (saída/mudança de disciplina), preservando o histórico. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; alunoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);

    const inscricao = await prisma.alunoDisciplina.findUnique({
      where: {
        alunoId_turmaDisciplinaId: {
          alunoId: params.alunoId,
          turmaDisciplinaId: params.turmaDisciplinaId,
        },
      },
    });
    if (!inscricao) throw new NotFoundError('Inscrição não encontrada');

    await prisma.alunoDisciplina.update({
      where: { id: inscricao.id },
      data: { ativo: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
