import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-helpers';

export async function GET() {
  try {
    await requireUserId();
    const medidas = await prisma.medida.findMany({
      orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
    });
    return NextResponse.json(medidas);
  } catch (error) {
    return handleApiError(error);
  }
}
