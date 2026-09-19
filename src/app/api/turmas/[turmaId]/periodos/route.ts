import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { periodoSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const periodos = await prisma.periodo.findMany({
      where: { turmaId: params.turmaId },
      orderBy: { ordem: 'asc' },
    });
    return NextResponse.json(periodos);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const data = periodoSchema.parse(await req.json());
    const periodo = await prisma.periodo.create({ data: { turmaId: params.turmaId, ...data } });
    return NextResponse.json(periodo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
