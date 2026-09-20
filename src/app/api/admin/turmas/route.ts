import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireAdminId();
    const turmas = await prisma.turma.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        disciplinas: { include: { disciplina: { select: { nome: true } } } },
        anoLetivo: { select: { nome: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { alunos: true } },
      },
    });
    return NextResponse.json(turmas);
  } catch (error) {
    return handleApiError(error);
  }
}
