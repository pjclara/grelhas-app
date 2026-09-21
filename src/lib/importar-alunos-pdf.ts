export interface LinhaAlunoPdf {
  numero: number;
  numeroProcesso: string;
  nome: string;
}

// Formato observado na extração de texto real (biblioteca `unpdf`): o
// nome fica colado ao nº de turma, sem separador nenhum (ex.:
// "Alexandre Marques dos Santos1 28016 NI"), seguido do nº de processo e,
// por vezes, códigos de disciplina (NI, MT...) que são ignorados.
const LINHA_NOME_COLADO = /^([^\d\n]+?)(\d+)\s+(\d+)(?:\s|$)/;

// "<nº turma> <nº processo> Nome" — ordem alternativa, para o caso de uma
// extração de texto diferente separar as colunas doutra forma.
const LINHA_NUMEROS_PRIMEIRO = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/;

// Um nome de aluno só deve ter letras, espaços e pontuação típica de
// nomes próprios — rejeita linhas de texto "normal" (títulos, totais,
// rodapé) que por coincidência tenham dois números seguidos.
const NOME_VALIDO = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'.\s-]*$/;

// Remove códigos de disciplina (ex.: "NI", "MT MT") que por vezes ficam
// colados ao fim do nome quando a extração de texto não os separa.
function limparNome(nome: string): string {
  return nome.replace(/\s+(?:[A-ZÀ-Ú]{2,4}\s*)+$/, '').trim();
}

function linhaValida(numero: number, numeroProcesso: string, nome: string): boolean {
  return (
    Number.isInteger(numero) &&
    numero > 0 &&
    numeroProcesso.length > 0 &&
    nome.length > 1 &&
    NOME_VALIDO.test(nome)
  );
}

/**
 * Extrai as linhas da tabela "Nº Turma / Nº Processo / Nome" do texto de
 * um PDF (já extraído, ex. com `unpdf`). É inerentemente heurístico —
 * extração de texto de PDF não garante ordem/colunas — por isso tenta
 * dois formatos de linha conhecidos e valida o resultado antes de
 * aceitar; quem chama esta função deve reportar o total encontrado, não
 * assumir que apanhou a tabela toda.
 */
export function parsearAlunosPdf(texto: string): LinhaAlunoPdf[] {
  const resultado: LinhaAlunoPdf[] = [];

  for (const linhaBruta of texto.split('\n')) {
    const linha = linhaBruta.trim();
    if (!linha) continue;

    const mColado = linha.match(LINHA_NOME_COLADO);
    if (mColado) {
      const nome = limparNome(mColado[1]);
      const numero = Number(mColado[2]);
      const numeroProcesso = mColado[3];
      if (linhaValida(numero, numeroProcesso, nome)) {
        resultado.push({ numero, numeroProcesso, nome });
        continue;
      }
    }

    const mNumeros = linha.match(LINHA_NUMEROS_PRIMEIRO);
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
