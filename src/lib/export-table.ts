import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/**
 * Descrição genérica de uma tabela a exportar: título + cabeçalho + linhas.
 * Generaliza o padrão usado em `.../periodos/[periodoId]/export/{pdf,xlsx}`
 * para as restantes tabelas da app (alunos, inscrições, grelhas, notas).
 */
export interface TabelaExport {
  titulo: string;
  subtitulo?: string;
  cabecalho: string[];
  linhas: Array<Array<string | number | null>>;
  /** Largura de cada coluna no PDF (pt). Por omissão, 90pt para todas. */
  largurasPdf?: number[];
  /** Largura de cada coluna no Excel (caracteres). Por omissão, 16 para todas. */
  largurasXlsx?: number[];
  /**
   * Para a última linha de `linhas`: por coluna, true = destacar a célula a
   * vermelho (ex.: ponderação abaixo de 50%). Mesmo tamanho de `cabecalho`.
   */
  ultimaLinhaAlerta?: boolean[];
}

const VERMELHO_ALERTA = { argb: 'FFDC2626' };
const VERMELHO_ALERTA_PDF = rgb(0.86, 0.15, 0.15);

export async function gerarXlsxTabela(t: TabelaExport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Grelhas de Avaliação';
  const sheet = workbook.addWorksheet(t.titulo.slice(0, 31) || 'Folha1');

  sheet.addRow([t.titulo]);
  sheet.mergeCells(1, 1, 1, t.cabecalho.length);
  sheet.getRow(1).font = { bold: true, size: 13 };

  if (t.subtitulo) {
    sheet.addRow([t.subtitulo]);
    sheet.mergeCells(2, 1, 2, t.cabecalho.length);
    sheet.getRow(2).font = { italic: true, color: { argb: 'FF64748B' } };
  }
  sheet.addRow([]);

  const headerRow = sheet.addRow(t.cabecalho);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDFB' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  t.linhas.forEach((linha, idx) => {
    const row = sheet.addRow(linha);
    if (t.ultimaLinhaAlerta && idx === t.linhas.length - 1) {
      t.ultimaLinhaAlerta.forEach((alerta, i) => {
        if (alerta) row.getCell(i + 1).font = { color: VERMELHO_ALERTA, bold: true };
      });
    }
  });

  t.cabecalho.forEach((_, i) => {
    sheet.getColumn(i + 1).width = t.largurasXlsx?.[i] ?? 16;
  });

  return workbook.xlsx.writeBuffer();
}

const PAGE_WIDTH = 841.89; // A4 landscape (pt)
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;

export async function gerarPdfTabela(t: TabelaExport) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const larguras = t.largurasPdf ?? t.cabecalho.map(() => 90);
  const colunas = t.cabecalho.map((titulo, i) => ({ titulo, largura: larguras[i] ?? 90 }));

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const desenharCabecalhoPagina = () => {
    page.drawText(t.titulo, { x: MARGIN, y, size: 11, font: fontBold });
    y -= 16;
    if (t.subtitulo) {
      page.drawText(t.subtitulo, { x: MARGIN, y, size: 9, font });
      y -= 14;
    }
    y = desenharLinhaTabela(page, colunas.map((c) => c.titulo), colunas, y, fontBold, true);
  };

  desenharCabecalhoPagina();

  t.linhas.forEach((linha, idx) => {
    if (y < MARGIN + 30) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      desenharCabecalhoPagina();
    }
    const valores = linha.map((v) => (v == null ? '—' : String(v)));
    const alerta = t.ultimaLinhaAlerta && idx === t.linhas.length - 1 ? t.ultimaLinhaAlerta : undefined;
    y = desenharLinhaTabela(page, valores, colunas, y, font, false, alerta);
  });

  return pdfDoc.save();
}

function desenharLinhaTabela(
  page: PDFPage,
  valores: string[],
  colunas: Array<{ titulo: string; largura: number }>,
  y: number,
  font: PDFFont,
  cabecalho: boolean,
  alerta?: boolean[]
): number {
  let x = MARGIN;
  const alturaLinha = 16;
  for (let i = 0; i < colunas.length; i++) {
    const texto = truncar(valores[i] ?? '', colunas[i].largura, font, 8);
    const cor = alerta?.[i] ? VERMELHO_ALERTA_PDF : rgb(0.1, 0.1, 0.1);
    page.drawText(texto, { x: x + 2, y, size: 8, font, color: cor });
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

/** Normaliza um nome para usar como nome de ficheiro (sem acentos/espaços). */
export function nomeFicheiroTabela(partes: string[], extensao: string): string {
  const base = partes
    .join('_')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base}.${extensao}`;
}
