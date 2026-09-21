import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { transferenciaAlunoSchema } from '@/lib/validation';
import { handleApiError, NotFoundError } from '@/lib/api-helpers';

/**
 * Transfere um aluno para outra turma do mesmo professor (a meio do ano ou
 * para um ano letivo seguinte). Fecha a matrícula e as inscrições em
 * disciplinas da turma de origem (sem as apagar — fica o histórico) e cria
 * uma matrícula nova na turma de destino. Notas e medidas já lançadas não
 * são tocadas, porque não dependem da turma atual do aluno.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { turmaId: string; alunoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = transferenciaAlunoSchema.parse(await req.json());

    if (data.turmaDestinoId === params.turmaId) {
      return NextResponse.json(
        { error: 'A turma de destino tem de ser diferente da atual.' },
        { status: 400 }
      );
    }
    await assertTurmaOwnership(data.turmaDestinoId, userId);

    const matriculaOrigem = await prisma.matricula.findFirst({
      where: { alunoId: params.alunoId, turmaId: params.turmaId, ativa: true },
    });
    if (!matriculaOrigem) throw new NotFoundError('Aluno não encontrado nesta turma');

    await prisma.$transaction(async (tx) => {
      await tx.matricula.update({
        where: { id: matriculaOrigem.id },
        data: { ativa: false, terminadaEm: new Date() },
      });
      await tx.alunoDisciplina.updateMany({
        where: {
          alunoId: params.alunoId,
          ativo: true,
          turmaDisciplina: { turmaId: params.turmaId },
        },
        data: { ativo: false },
      });
      await tx.matricula.create({
        data: { alunoId: params.alunoId, turmaId: data.turmaDestinoId, numero: data.numero },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
