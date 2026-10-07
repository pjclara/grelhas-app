import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { tabelaAlunosTurma } from '@/lib/export-tabelas';
import { gerarXlsxTabela, nomeFicheiroTabela } from '@/lib/export-table';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const { nomeBase, tabela } = await tabelaAlunosTurma(params.turmaId);
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
