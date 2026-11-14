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
      { largura: larguraNome, esquerda: true },
      ...tabela.colunas.map((c) => ({ largura: c.texto ? larguraTexto : larguraCol, esquerda: !!c.texto })),
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
      y = desenharCabecalhoTabela(page, tabela.colunas, colunas, y, fontBold, tamanho);
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

    // Tabela de estatísticas: nº de alunos por intervalo de classificação.
    novaPaginaSeNecessario(70);
    y -= 14;
    page.drawText('ESTATÍSTICAS', { x: MARGIN, y, size: 9, font: fontBold });
    y -= 14;
    const colunasEstat = [{ largura: 90, esquerda: true }, ...tabela.intervalos.map(() => ({ largura: 60 }))];
    y = desenharLinhaTabela(page, ['Classificação', ...tabela.intervalos.map((i) => i.label)], colunasEstat, y, fontBold, 8, true);
    desenharLinhaTabela(page, ['Nº de alunos', ...tabela.intervalos.map((i) => String(i.total))], colunasEstat, y, font, 8, false);

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
  colunas: Array<{ largura: number; esquerda?: boolean }>,
  y: number,
  font: PDFFont,
  tamanho: number,
  linhaSeparadora: boolean
): number {
  let x = MARGIN;
  const alturaLinha = 14;
  for (let i = 0; i < colunas.length; i++) {
    const texto = truncar(valores[i] ?? '', colunas[i].largura, font, tamanho);
    // Nomes/texto alinhados à esquerda; tudo o resto (números) centrado na coluna.
    const xTexto = colunas[i].esquerda
      ? x + 2
      : x + (colunas[i].largura - font.widthOfTextAtSize(texto, tamanho)) / 2;
    page.drawText(texto, { x: xTexto, y, size: tamanho, font, color: rgb(0.1, 0.1, 0.1) });
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

/** Quebra o texto por palavras (e por caracteres, se uma palavra for maior que a largura) sem cortar nada. */
function quebrarTexto(texto: string, larguraMax: number, font: PDFFont, size: number): string[] {
  const largura = Math.max(larguraMax - 4, 10);
  const linhas: string[] = [];
  let atual = '';
  const caber = (t: string) => font.widthOfTextAtSize(t, size) <= largura;
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    let resto = palavra;
    // Palavra maior do que a coluna: parte-a em pedaços que caibam.
    while (!caber(resto)) {
      let n = resto.length - 1;
      while (n > 1 && !caber(resto.slice(0, n))) n--;
      if (atual) {
        linhas.push(atual);
        atual = '';
      }
      linhas.push(resto.slice(0, n));
      resto = resto.slice(n);
    }
    const tentativa = atual ? `${atual} ${resto}` : resto;
    if (caber(tentativa)) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = resto;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Cabeçalho em duas linhas, com texto completo (quebrado em várias linhas, nunca cortado):
 * nome do critério uma só vez sobre as suas colunas e, por baixo, o nome de cada coluna.
 */
function desenharCabecalhoTabela(
  page: PDFPage,
  dados: Array<{ grupo: string | null; titulo: string; texto?: boolean }>,
  colunas: Array<{ largura: number; esquerda?: boolean }>,
  y: number,
  font: PDFFont,
  tamanho: number
): number {
  const alturaLinha = tamanho + 2;
  const cor = rgb(0.1, 0.1, 0.1);

  // Blocos do cabeçalho: [índice da coluna, nº de colunas, texto, linha (0 = critério, 1 = coluna)]
  type Bloco = { inicio: number; largura: number; linhas: string[]; esquerda: boolean; x: number; nivel: 0 | 1 };
  const blocos: Bloco[] = [];
  const xInicio: number[] = [];
  let acc = MARGIN;
  for (const c of colunas) {
    xInicio.push(acc);
    acc += c.largura;
  }
  const xFim = acc;

  blocos.push({ inicio: 0, x: xInicio[0], largura: colunas[0].largura, linhas: ['Nº'], esquerda: false, nivel: 1 });
  blocos.push({ inicio: 1, x: xInicio[1], largura: colunas[1].largura, linhas: ['Nome'], esquerda: true, nivel: 1 });

  let i = 0;
  while (i < dados.length) {
    const idx = i + 2;
    const d = dados[i];
    if (d.grupo) {
      let fim = i;
      while (fim + 1 < dados.length && dados[fim + 1].grupo === d.grupo) fim++;
      const largura = xInicio[fim + 2] + colunas[fim + 2].largura - xInicio[idx];
      blocos.push({ inicio: idx, x: xInicio[idx], largura, linhas: quebrarTexto(d.grupo, largura, font, tamanho), esquerda: false, nivel: 0 });
      for (let k = i; k <= fim; k++) {
        blocos.push({
          inicio: k + 2,
          x: xInicio[k + 2],
          largura: colunas[k + 2].largura,
          linhas: quebrarTexto(dados[k].titulo, colunas[k + 2].largura, font, tamanho),
          esquerda: false,
          nivel: 1,
        });
      }
      i = fim + 1;
    } else {
      blocos.push({
        inicio: idx,
        x: xInicio[idx],
        largura: colunas[idx].largura,
        linhas: quebrarTexto(d.titulo, colunas[idx].largura, font, tamanho),
        esquerda: !!d.texto,
        nivel: 1,
      });
      i++;
    }
  }

  const linhasNivel = (nivel: 0 | 1) => Math.max(0, ...blocos.filter((b) => b.nivel === nivel).map((b) => b.linhas.length));
  const nGrupo = linhasNivel(0);
  const nTitulo = linhasNivel(1);

  for (const b of blocos) {
    const yBase = b.nivel === 0 ? y : y - nGrupo * alturaLinha;
    b.linhas.forEach((linha, k) => {
      const w = font.widthOfTextAtSize(linha, tamanho);
      const x = b.esquerda ? b.x + 2 : b.x + (b.largura - w) / 2;
      page.drawText(linha, { x, y: yBase - k * alturaLinha, size: tamanho, font, color: cor });
    });
  }

  const yFim = y - (nGrupo + nTitulo) * alturaLinha;
  page.drawLine({
    start: { x: MARGIN, y: yFim + alturaLinha - 3 },
    end: { x: xFim, y: yFim + alturaLinha - 3 },
    thickness: 0.75,
    color: rgb(0.4, 0.4, 0.4),
  });
  return yFim - 2;
}

function truncar(texto: string, larguraMax: number, font: PDFFont, size: number): string {
  let resultado = texto;
  while (font.widthOfTextAtSize(resultado, size) > larguraMax - 4 && resultado.length > 1) {
    resultado = resultado.slice(0, -2) + '…';
  }
  return resultado;
}
