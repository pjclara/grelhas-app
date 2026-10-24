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
   * Mesmo formato de `linhas`: true numa posição = destacar essa célula a
   * vermelho (ex.: total abaixo do mínimo). Linhas/colunas em falta = sem alerta.
   */
  alertas?: boolean[][];
  /** Notas de rodapé (ex.: legenda de um "*"), uma por linha, a seguir à tabela. */
  notas?: string[];
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
    t.alertas?.[idx]?.forEach((alerta, i) => {
      if (alerta) row.getCell(i + 1).font = { color: VERMELHO_ALERTA, bold: true };
    });
  });

  t.cabecalho.forEach((_, i) => {
    sheet.getColumn(i + 1).width = t.largurasXlsx?.[i] ?? 16;
  });

  if (t.notas && t.notas.length > 0) {
    sheet.addRow([]);
    for (const nota of t.notas) {
      const notaRow = sheet.addRow([nota]);
      notaRow.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
    }
  }

  return workbook.xlsx.writeBuffer();
}

const PAGE_WIDTH = 841.89; // A4 landscape (pt)
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;

/**
 * Agrupa os índices das colunas em grupos que cabem na largura disponível da
 * página, repetindo as primeiras `fixas` colunas (ex.: Nº, Nome) em cada
 * grupo para dar contexto — em vez de desenhar colunas fora da página
 * (que ficavam invisíveis no PDF final quando a tabela tinha muitas colunas).
 */
function agruparColunas(
  colunas: Array<{ titulo: string; largura: number }>,
  larguraDisponivel: number,
  fixas: number
): number[][] {
  const idxFixos = Array.from({ length: fixas }, (_, i) => i);
  const larguraFixos = idxFixos.reduce((acc, i) => acc + colunas[i].largura, 0);

  const grupos: number[][] = [];
  let atual: number[] = [...idxFixos];
  let larguraAtual = larguraFixos;

  for (let i = fixas; i < colunas.length; i++) {
    const larguraCol = colunas[i].largura;
    if (larguraAtual + larguraCol > larguraDisponivel && atual.length > fixas) {
      grupos.push(atual);
      atual = [...idxFixos];
      larguraAtual = larguraFixos;
    }
    atual.push(i);
    larguraAtual += larguraCol;
  }
  grupos.push(atual);
  return grupos;
}

export async function gerarPdfTabela(t: TabelaExport) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const larguras = t.largurasPdf ?? t.cabecalho.map(() => 90);
  const colunas = t.cabecalho.map((titulo, i) => ({ titulo, largura: larguras[i] ?? 90 }));

  const larguraDisponivel = PAGE_WIDTH - 2 * MARGIN;
  const colunasFixas = Math.min(2, colunas.length);
  const grupos = agruparColunas(colunas, larguraDisponivel, colunasFixas);

  let page: PDFPage;
  let y = 0;

  grupos.forEach((idxGrupo, grupoIdx) => {
    const colunasGrupo = idxGrupo.map((i) => colunas[i]);
    const subtituloGrupo =
      grupoIdx === 0 ? t.subtitulo : [t.subtitulo, '(continuação)'].filter(Boolean).join(' · ');

    const desenharCabecalhoPagina = () => {
      page.drawText(t.titulo, { x: MARGIN, y, size: 11, font: fontBold });
      y -= 16;
      if (subtituloGrupo) {
        page.drawText(subtituloGrupo, { x: MARGIN, y, size: 9, font });
        y -= 14;
      }
      y = desenharLinhaTabela(page, colunasGrupo.map((c) => c.titulo), colunasGrupo, y, fontBold, true);
    };

    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    desenharCabecalhoPagina();

    t.linhas.forEach((linha, idx) => {
      if (y < MARGIN + 30) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        desenharCabecalhoPagina();
      }
      const valores = idxGrupo.map((i) => (linha[i] == null ? '—' : String(linha[i])));
      const alertasLinha = idxGrupo.map((i) => t.alertas?.[idx]?.[i] ?? false);
      y = desenharLinhaTabela(page, valores, colunasGrupo, y, font, false, alertasLinha);
    });

    if (grupoIdx === grupos.length - 1 && t.notas && t.notas.length > 0) {
      y -= 6;
      for (const nota of t.notas) {
        if (y < MARGIN + 14) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
        page.drawText(nota, { x: MARGIN, y, size: 7, font, color: rgb(0.4, 0.45, 0.5) });
        y -= 12;
      }
    }
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
