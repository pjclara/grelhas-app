import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { construirResumoPeriodo } from '@/lib/resumo';
import { construirLinhas, nomeFicheiro } from '@/lib/export-format';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const PAGE_WIDTH = 841.89; // A4 landscape (pt)
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; periodoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);
    const resumo = await construirResumoPeriodo(params.turmaId, params.periodoId);
    const linhas = construirLinhas(resumo);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colunas = [
      { titulo: 'Nº', largura: 24 },
      { titulo: 'Nome', largura: 150 },
      ...resumo.criterios.map((c) => ({
        titulo: `${c.nome} (${Math.round(c.peso * 100)}%)`,
        largura: 100,
      })),
      { titulo: 'Final (0-20)', largura: 60 },
      { titulo: 'Nível', largura: 40 },
    ];

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const desenharCabecalhoPagina = () => {
      page.drawText(
        `Grelha de Avaliação — ${resumo.turma.disciplina} — Turma ${resumo.turma.nome} — ${resumo.turma.anoLetivo}`,
        { x: MARGIN, y, size: 11, font: fontBold }
      );
      y -= 16;
      page.drawText(resumo.periodo.nome, { x: MARGIN, y, size: 9, font });
      y -= 14;
      y = desenharLinhaTabela(page, colunas.map((c) => c.titulo), colunas, y, fontBold, true);
    };

    desenharCabecalhoPagina();

    for (const linha of linhas) {
      if (y < MARGIN + 40) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        desenharCabecalhoPagina();
      }
      const valores = [
        String(linha.numero),
        linha.nome,
        ...linha.porCriterio.map((c) => c.valor),
        linha.notaFinal20,
        linha.nivel,
      ];
      y = desenharLinhaTabela(page, valores, colunas, y, font, false);
    }

    y -= 10;
    if (y < MARGIN + 20) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(
      `Média da turma (0-20): ${resumo.estatisticas.mediaTurma20?.toFixed(2).replace('.', ',') ?? '—'}    ` +
        `% negativas: ${resumo.estatisticas.percentNegativas?.toFixed(1).replace('.', ',') ?? '—'}%`,
      { x: MARGIN, y, size: 9, font }
    );

    const bytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeFicheiro(resumo, 'pdf')}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function desenharLinhaTabela(
  page: PDFPage,
  valores: string[],
  colunas: Array<{ titulo: string; largura: number }>,
  y: number,
  font: PDFFont,
  cabecalho: boolean
): number {
  let x = MARGIN;
  const alturaLinha = 16;
  for (let i = 0; i < colunas.length; i++) {
    const texto = truncar(valores[i] ?? '', colunas[i].largura, font, 8);
    page.drawText(texto, { x: x + 2, y, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
    x += colunas[i].largura;
  }
  if (cabecalho) {
    page.drawLine({
      start: { x: MARGIN, y: y - 4 },
      end: { x, y: y - 4 },
      thickness: 0.75,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
  return y - alturaLinha;
}

function truncar(texto: string, larguraMax: number, font: PDFFont, size: number): string {
  let resultado = texto;
  while (font.widthOfTextAtSize(resultado, size) > larguraMax - 4 && resultado.length > 1) {
    resultado = resultado.slice(0, -2) + '…';
  }
  return resultado;
}
