import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { alunoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const alunos = await prisma.aluno.findMany({
      where: { turmaId: params.turmaId },
      orderBy: { numero: 'asc' },
    });
    return NextResponse.json(alunos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = alunoSchema.parse(await req.json());
    const aluno = await prisma.aluno.create({
      data: { turmaId: params.turmaId, ...data },
    });
    return NextResponse.json(aluno, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
