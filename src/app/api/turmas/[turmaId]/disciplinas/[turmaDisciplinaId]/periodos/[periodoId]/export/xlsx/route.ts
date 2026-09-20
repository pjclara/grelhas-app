import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { construirResumoPeriodo } from '@/lib/resumo';
import { construirLinhas, mostraNivel, nomeFicheiro } from '@/lib/export-format';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; periodoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const resumo = await construirResumoPeriodo(params.turmaId, params.turmaDisciplinaId, params.periodoId);
    const linhas = construirLinhas(resumo);
    const comNivel = mostraNivel(resumo);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Grelhas de Avaliação';
    const sheet = workbook.addWorksheet(resumo.periodo.nome.slice(0, 31));

    sheet.addRow([
      `Grelha de Avaliação — ${resumo.turma.disciplina} — Turma ${resumo.turma.nome} — Ano letivo ${resumo.turma.anoLetivo}`,
    ]);
    sheet.mergeCells(1, 1, 1, 4 + resumo.criterios.length);
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.addRow([]);

    const cabecalho = [
      'Nº',
      'Nome',
      ...resumo.criterios.map((c) => `${c.nome} (${Math.round(c.peso * 100)}%)`),
      'Nota final (0-20)',
      ...(comNivel ? ['Nível'] : []),
    ];
    const headerRow = sheet.addRow(cabecalho);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDFB' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    for (const linha of linhas) {
      sheet.addRow([
        linha.numero,
        linha.nome,
        ...linha.porCriterio.map((c) => c.valor),
        linha.notaFinal20,
        ...(comNivel ? [linha.nivel] : []),
      ]);
    }

    const comNota20 = resumo.resultados.filter((r) => r.notaFinal20 != null);
    const percentNegativas = comNivel
      ? resumo.estatisticas.percentNegativas
      : comNota20.length > 0
        ? (comNota20.filter((r) => (r.notaFinal20 as number) < 10).length / comNota20.length) * 100
        : null;

    sheet.addRow([]);
    const estatRow = sheet.addRow([
      'Média da turma (0-20):',
      resumo.estatisticas.mediaTurma20?.toFixed(2).replace('.', ',') ?? '—',
      '% negativas:',
      percentNegativas != null ? percentNegativas.toFixed(1).replace('.', ',') + '%' : '—',
    ]);
    estatRow.font = { italic: true };

    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 32;
    for (let i = 0; i < resumo.criterios.length; i++) {
      sheet.getColumn(3 + i).width = 20;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nomeFicheiro(resumo, 'xlsx')}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
