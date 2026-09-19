import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UnauthorizedError } from '@/lib/auth';

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: error.flatten() },
      { status: 400 }
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  // eslint-disable-next-line no-console
  console.error(error);
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
}

export class NotFoundError extends Error {}
