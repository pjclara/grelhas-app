export interface LinhaAlunoPdf {
  numero: number;
  numeroProcesso: string;
  nome: string;
}

// "Nome <tab> <nº turma> <nº processo> [códigos de disciplina...]" — é o
// formato observado nos PDFs de "Matriz da Turma" gerados pelo sistema de
// gestão escolar: o texto da coluna Nome sai antes do bloco de números
// por causa da ordem de desenho no PDF, não da ordem visual das colunas,
// e cada linha pode ter códigos (ex.: "NI", "MT MT MT") depois do nº de
// processo, que são ignorados.
const LINHA_NOME_PRIMEIRO = /^(.+?)\t(\d+)\s+(\d+)(?:\s|$)/;

// "<nº turma> <nº processo> Nome" — ordem "clássica", colunas separadas
// só por espaços (sem tab), usada como alternativa quando a linha acima
// não bate certo.
const LINHA_NUMEROS_PRIMEIRO = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/;

// Remove códigos de disciplina (ex.: "NI", "MT MT") que por vezes ficam
// colados ao fim do nome quando não há tab a separá-los.
function limparNome(nome: string): string {
  return nome.replace(/\s+(?:[A-ZÀ-Ú]{2,4}\s*)+$/, '').trim();
}

function linhaValida(numero: number, numeroProcesso: string, nome: string): boolean {
  return Number.isInteger(numero) && numero > 0 && numeroProcesso.length > 0 && nome.length > 1;
}

/**
 * Extrai as linhas da tabela "Nº Turma / Nº Processo / Nome" do texto de
 * um PDF (já extraído com pdf-parse). É inerentemente heurístico —
 * extração de texto de PDF não garante ordem/colunas — por isso tenta
 * dois formatos de linha conhecidos e ignora tudo o que não bate certo;
 * quem chama esta função deve reportar o total encontrado, não assumir
 * que apanhou a tabela toda.
 */
export function parsearAlunosPdf(texto: string): LinhaAlunoPdf[] {
  const resultado: LinhaAlunoPdf[] = [];

  for (const linhaBruta of texto.split('\n')) {
    if (!linhaBruta.trim()) continue;

    const mNome = linhaBruta.match(LINHA_NOME_PRIMEIRO);
    if (mNome) {
      const nome = limparNome(mNome[1]);
      const numero = Number(mNome[2]);
      const numeroProcesso = mNome[3];
      if (linhaValida(numero, numeroProcesso, nome)) {
        resultado.push({ numero, numeroProcesso, nome });
        continue;
      }
    }

    const mNumeros = linhaBruta.trim().match(LINHA_NUMEROS_PRIMEIRO);
    if (mNumeros) {
      const numero = Number(mNumeros[1]);
      const numeroProcesso = mNumeros[2];
      const nome = limparNome(mNumeros[3]);
      if (linhaValida(numero, numeroProcesso, nome)) {
        resultado.push({ numero, numeroProcesso, nome });
      }
    }
  }

  return resultado;
}
