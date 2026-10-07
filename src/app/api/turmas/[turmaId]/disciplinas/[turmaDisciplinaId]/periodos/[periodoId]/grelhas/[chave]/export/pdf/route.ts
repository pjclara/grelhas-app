import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertPeriodoDaDisciplina, assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { ocorrenciaSchema } from '@/lib/validation';
import { tabelaGrelha } from '@/lib/export-tabelas';
import { gerarPdfTabela, nomeFicheiroTabela } from '@/lib/export-table';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type Params = { turmaId: string; turmaDisciplinaId: string; periodoId: string; chave: string };

export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const userId = await requireUserId();
    const turmaDisciplina = await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    assertPeriodoDaDisciplina(turmaDisciplina, params.periodoId);
    const ocorrencia = ocorrenciaSchema.parse(req.nextUrl.searchParams.get('ocorrencia') ?? 1);
    const { nomeBase, tabela } = await tabelaGrelha(
      params.turmaId,
      params.turmaDisciplinaId,
      params.periodoId,
      decodeURIComponent(params.chave),
      ocorrencia
    );
    const bytes = await gerarPdfTabela(tabela);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeFicheiroTabela(nomeBase, 'pdf')}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
