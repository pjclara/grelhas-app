import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { grelhaNotasSchema } from '@/lib/validation';
import { handleApiError } from '@/lib/api-helpers';
import { carregarGrelha, gravarGrelha } from '@/lib/grelha';

type Params = { turmaId: string; turmaDisciplinaId: string; periodoId: string; chave: string };

/** Grelha de notas (alunos × colunas) de um critério geral, ou dos sub-instrumentos de um instrumento de recolha. */
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const grelha = await carregarGrelha(
      params.turmaId,
      params.turmaDisciplinaId,
      params.periodoId,
      decodeURIComponent(params.chave)
    );
    return NextResponse.json(grelha);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Grava notas em bloco; cria o instrumento de cada coluna na primeira nota lançada. */
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const { notas } = grelhaNotasSchema.parse(await req.json());
    const gravadas = await gravarGrelha(
      params.turmaId,
      params.turmaDisciplinaId,
      params.periodoId,
      decodeURIComponent(params.chave),
      notas
    );
    return NextResponse.json({ ok: true, gravadas });
  } catch (error) {
    return handleApiError(error);
  }
}
