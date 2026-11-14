import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { requireUserId } from '@/lib/auth';
import { assertTurmaDisciplinaOwnership } from '@/lib/turma-access';
import { construirResumoPeriodo } from '@/lib/resumo';
import { construirTabela, nomeFicheiro } from '@/lib/export-format';
import { handleApiError } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const PAGE_WIDTH = 841.89; // A4 landscape (pt)
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;

export async function GET(
  _req: NextRequest,
  { params }: { params: { turmaId: string; turmaDisciplinaId: string; periodoId: string } }
) {
  try {
    const userId = await requireUserId();
    await assertTurmaDisciplinaOwnership(params.turmaId, params.turmaDisciplinaId, userId);
    const resumo = await construirResumoPeriodo(params.turmaId, params.turmaDisciplinaId, params.periodoId);
    const tabela = construirTabela(resumo);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Larguras ajustadas para a tabela caber sempre na largura útil da página.
    const larguraNum = 22;
    const larguraNome = 120;
    const larguraUtil = PAGE_WIDTH - 2 * MARGIN;
    const larguraTexto = 110;
    const numTexto = tabela.colunas.filter((c) => c.texto).length;
    const numOutras = tabela.colunas.length - numTexto;
    const larguraCol = Math.min(
      70,
      (larguraUtil - larguraNum - larguraNome - numTexto * larguraTexto) / Math.max(numOutras, 1)
    );
    const tamanho = larguraCol < 36 ? 6 : 8;
    const colunas = [
      { largura: larguraNum },
      { largura: larguraNome },
      ...tabela.colunas.map((c) => ({ largura: c.texto ? larguraTexto : larguraCol })),
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
      // Duas linhas de cabeçalho: critério (quando existe) e instrumento/coluna.
      y = desenharLinhaTabela(page, ['', '', ...tabela.colunas.map((c) => c.grupo ?? '')], colunas, y, fontBold, tamanho, false);
      y = desenharLinhaTabela(
        page,
        ['Nº', 'Nome', ...tabela.colunas.map((c) => c.titulo)],
        colunas,
        y,
        fontBold,
        tamanho,
        true
      );
    };

    desenharCabecalhoPagina();

    const novaPaginaSeNecessario = (espaco: number) => {
      if (y < MARGIN + espaco) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        desenharCabecalhoPagina();
      }
    };

    tabela.alunos.forEach((aluno, idx) => {
      novaPaginaSeNecessario(40);
      y = desenharLinhaTabela(
        page,
        [String(aluno.numero), aluno.nome, ...tabela.colunas.map((c) => c.valores[idx])],
        colunas,
        y,
        font,
        tamanho,
        false
      );
    });

    // Rodapé: média da turma e % de negativas por coluna.
    novaPaginaSeNecessario(40);
    y -= 4;
    y = desenharLinhaTabela(page, ['', 'Média da turma', ...tabela.colunas.map((c) => c.media)], colunas, y, fontBold, tamanho, false);
    y = desenharLinhaTabela(page, ['', '% negativas', ...tabela.colunas.map((c) => c.negativas)], colunas, y, fontBold, tamanho, false);

    novaPaginaSeNecessario(40);
    y -= 10;
    page.drawText(
      `Estatísticas — alunos por classificação:    ${tabela.intervalos.map((i) => `${i.label}: ${i.total}`).join('    ')}`,
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
  colunas: Array<{ largura: number }>,
  y: number,
  font: PDFFont,
  tamanho: number,
  linhaSeparadora: boolean
): number {
  let x = MARGIN;
  const alturaLinha = 14;
  for (let i = 0; i < colunas.length; i++) {
    const texto = truncar(valores[i] ?? '', colunas[i].largura, font, tamanho);
    page.drawText(texto, { x: x + 2, y, size: tamanho, font, color: rgb(0.1, 0.1, 0.1) });
    x += colunas[i].largura;
  }
  if (linhaSeparadora) {
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
