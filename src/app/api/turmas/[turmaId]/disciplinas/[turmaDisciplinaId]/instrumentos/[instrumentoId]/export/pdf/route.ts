import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { tabelaInstrumento } from '@/lib/export-tabelas';
import { gerarPdfTabela, nomeFicheiroTabela } from '@/lib/export-table';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; instrumentoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const { nomeBase, tabela } = await tabelaInstrumento(
      params.turmaId,
      params.turmaDisciplinaId,
      params.instrumentoId
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
