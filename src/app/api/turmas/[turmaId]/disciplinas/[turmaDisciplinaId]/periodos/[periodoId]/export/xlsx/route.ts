import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { construirResumoPeriodo } from '@/lib/resumo';
import { construirTabela, nomeFicheiro } from '@/lib/export-format';
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
    const tabela = construirTabela(resumo);
    const colunas = tabela.colunas;
    const totalColunas = 2 + colunas.length;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Grelhas de Avaliação';
    const sheet = workbook.addWorksheet(resumo.periodo.nome.slice(0, 31));

    sheet.addRow([
      `Grelha de Avaliação — ${resumo.turma.disciplina} — Turma ${resumo.turma.nome} — Ano letivo ${resumo.turma.anoLetivo}`,
    ]);
    sheet.mergeCells(1, 1, 1, totalColunas);
    sheet.getRow(1).font = { bold: true, size: 13 };
    sheet.addRow([]);

    // Cabeçalho em duas linhas: critério (agrupado) e instrumento/coluna.
    const linhaGrupos = sheet.addRow(['Nº', 'Nome', ...colunas.map((c) => c.grupo ?? c.titulo)]);
    const linhaTitulos = sheet.addRow(['', '', ...colunas.map((c) => (c.grupo ? c.titulo : ''))]);
    const topo = linhaGrupos.number;
    for (let col = 1; col <= totalColunas; col++) {
      const c = col >= 3 ? colunas[col - 3] : null;
      if (!c || !c.grupo) sheet.mergeCells(topo, col, topo + 1, col);
    }
    // Junta as células do mesmo critério na primeira linha do cabeçalho.
    let inicio = 0;
    while (inicio < colunas.length) {
      let fim = inicio;
      while (colunas[inicio].grupo && fim + 1 < colunas.length && colunas[fim + 1].grupo === colunas[inicio].grupo) fim++;
      if (fim > inicio) sheet.mergeCells(topo, 3 + inicio, topo, 3 + fim);
      inicio = fim + 1;
    }
    for (const row of [linhaGrupos, linhaTitulos]) {
      row.font = { bold: true };
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDFB' } };
      });
    }
    linhaTitulos.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { bottom: { style: 'thin' } };
    });

    tabela.alunos.forEach((aluno, idx) => {
      const row = sheet.addRow([aluno.numero, aluno.nome, ...colunas.map((c) => c.valores[idx])]);
      row.alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'left' };
      colunas.forEach((c, i) => {
        if (c.destaque) row.getCell(3 + i).font = { bold: true };
        if (c.texto) row.getCell(3 + i).alignment = { horizontal: 'left', wrapText: true };
      });
    });

    const rodape = (rotulo: string, valores: string[]) => {
      const row = sheet.addRow([rotulo, '', ...valores]);
      sheet.mergeCells(row.number, 1, row.number, 2);
      row.font = { bold: true };
      row.alignment = { horizontal: 'center' };
      row.getCell(1).alignment = { horizontal: 'left' };
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
    };
    sheet.addRow([]).height = 6;
    rodape('Média da turma', colunas.map((c) => c.media));
    rodape('% negativas', colunas.map((c) => c.negativas));

    sheet.addRow([]);
    // Tabela de estatísticas a partir da coluna C.
    sheet.addRow(['', '', 'ESTATÍSTICAS']).font = { bold: true };
    const cabEstat = sheet.addRow(['', '', 'Classificação', ...tabela.intervalos.map((i) => i.label)]);
    const valEstat = sheet.addRow(['', '', 'Nº de alunos', ...tabela.intervalos.map((i) => i.total)]);
    for (const row of [cabEstat, valEstat]) {
      for (let col = 3; col <= 3 + tabela.intervalos.length; col++) {
        const cell = row.getCell(col);
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      }
    }
    cabEstat.font = { bold: true };
    cabEstat.eachCell((cell, col) => {
      if (col >= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDFB' } };
    });
    valEstat.getCell(3).font = { bold: true };

    sheet.getColumn(1).width = 14;
    sheet.getColumn(2).width = 32;
    for (let i = 0; i < colunas.length; i++) {
      sheet.getColumn(3 + i).width = colunas[i].texto ? 40 : colunas[i].grupo ? 14 : 18;
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
