import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { disciplinaSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    const userId = await requireUserId();
    const disciplinas = await prisma.disciplina.findMany({
      where: { userId },
      orderBy: { nome: 'asc' },
    });
    return NextResponse.json(disciplinas);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const data = disciplinaSchema.parse(await req.json());
    const disciplina = await prisma.disciplina.create({
      data: { userId, nome: data.nome },
    });
    return NextResponse.json(disciplina, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
