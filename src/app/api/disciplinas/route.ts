import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId, requireAdminId } from '@/lib/auth';
import { disciplinaSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const comContagem = req.nextUrl.searchParams.get('comContagem') === '1';
    const disciplinas = await prisma.disciplina.findMany({
      orderBy: { nome: 'asc' },
      ...(comContagem ? { include: { _count: { select: { turmaDisciplinas: true } } } } : {}),
    });
    return NextResponse.json(disciplinas);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminId();
    const data = disciplinaSchema.parse(await req.json());
    const disciplina = await prisma.disciplina.create({
      data: { nome: data.nome, ciclo: data.ciclo ?? null },
    });
    return NextResponse.json(disciplina, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
