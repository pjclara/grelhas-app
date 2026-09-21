import { NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { assertTurmaOwnership } from '@/lib/turma-access';
import { parsearAlunosPdf, type LinhaAlunoPdf } from '@/lib/importar-alunos-pdf';
import { handleApiError } from '@/lib/api-helpers';

/**
 * Importa alunos a partir de um PDF com uma tabela "Nº Turma / Nº
 * Processo / Nome" (ver src/lib/importar-alunos-pdf.ts). Cada linha é
 * criada isoladamente (não numa única transação) para que uma linha em
 * conflito (nº de turma ou nº de processo já existente) seja apenas
 * saltada e reportada, sem impedir a importação das restantes.
 */
export async function POST(req: NextRequest, { params }: { params: { turmaId: string } }) {
  try {
    const userId = await requireUserId();
    await assertTurmaOwnership(params.turmaId, userId);

    const formData = await req.formData();
    const ficheiro = formData.get('ficheiro');
    if (!(ficheiro instanceof File) || ficheiro.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Envie um ficheiro PDF.' }, { status: 400 });
    }

    const buffer = new Uint8Array(await ficheiro.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });

    const linhas = parsearAlunosPdf(text);
    if (linhas.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível encontrar no PDF uma tabela com as colunas Nº Turma, Nº Processo e Nome.' },
        { status: 400 }
      );
    }

    let importados = 0;
    const saltados: Array<{ linha: LinhaAlunoPdf; motivo: string }> = [];

    for (const linha of linhas) {
      try {
        await prisma.aluno.create({
          data: {
            userId,
            numeroProcesso: linha.numeroProcesso,
            nome: linha.nome,
            matriculas: { create: { turmaId: params.turmaId, numero: linha.numero } },
          },
        });
        importados += 1;
      } catch (error) {
        const motivo =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
            ? 'Nº de turma ou nº de processo já existente.'
            : 'Erro ao importar esta linha.';
        saltados.push({ linha, motivo });
      }
    }

    return NextResponse.json({ importados, saltados });
  } catch (error) {
    return handleApiError(error);
  }
}
