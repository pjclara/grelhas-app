import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { tabelaInscricoesDisciplina } from '@/lib/export-tabelas';
import { gerarXlsxTabela, nomeFicheiroTabela } from '@/lib/export-table';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const { nomeBase, tabela } = await tabelaInscricoesDisciplina(params.turmaId, params.turmaDisciplinaId);
    const buffer = await gerarXlsxTabela(tabela);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nomeFicheiroTabela(nomeBase, 'xlsx')}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
