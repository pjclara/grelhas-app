import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { tabelaAlunosTurma } from '@/lib/export-tabelas';
import { gerarPdfTabela, nomeFicheiroTabela } from '@/lib/export-table';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const { nomeBase, tabela } = await tabelaAlunosTurma(params.turmaId);
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
