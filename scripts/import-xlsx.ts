/**
 * Importa os dados da grelha de Excel original (alunos, critérios,
 * instrumentos e notas já lançadas) para a base de dados da aplicação.
 *
 * Uso:
 *   npm run import:xlsx -- --email=professor@exemplo.com --file="Grelha avaliação 9F_2.xlsx"
 *
 * Pressupõe que o professor já criou a conta em /register (o script associa
 * a turma importada a esse utilizador, não cria contas novas).
 */
import * as XLSX from 'xlsx';
import { PrismaClient, ModoAvaliacao } from '@prisma/client';

const prisma = new PrismaClient();

function arg(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

function cell(ws: XLSX.WorkSheet, colLetter: string, row: number): unknown {
  const ref = `${colLetter}${row}`;
  return ws[ref]?.v;
}

function colToLetter(col0: number): string {
  return XLSX.utils.encode_col(col0);
}

async function main() {
  const email = arg('email');
  const file = arg('file');
  if (!email || !file) {
    console.error('Uso: npm run import:xlsx -- --email=voce@exemplo.com --file="ficheiro.xlsx"');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`Não existe nenhum utilizador com o email ${email}. Crie a conta em /register primeiro.`);
    process.exit(1);
  }

  const wb = XLSX.readFile(file);

  // ---------- Alunos e Turma ----------
  const wsAlunos = wb.Sheets['Alunos e Turma'];
  const turmaNome = String(cell(wsAlunos, 'H', 5) ?? 'Turma sem nome');
  const anoLetivoNome = String(cell(wsAlunos, 'H', 7) ?? '—/—');
  const nivelEnsino = cell(wsAlunos, 'H', 9) as string | undefined;
  const disciplinaNome = String(cell(wsAlunos, 'H', 11) ?? 'Disciplina');

  const alunosOrigem: Array<{ numero: number; nome: string; medidas?: string; aliena?: string }> = [];
  for (let row = 6; row <= 200; row++) {
    const numero = cell(wsAlunos, 'B', row);
    const nome = cell(wsAlunos, 'C', row);
    if (numero === undefined || nome === undefined || String(nome).trim() === '') continue;
    alunosOrigem.push({
      numero: Number(numero),
      nome: String(nome).trim(),
      medidas: (cell(wsAlunos, 'D', row) as string | undefined) ?? undefined,
      aliena: (cell(wsAlunos, 'E', row) as string | undefined) ?? undefined,
    });
  }
  console.log(`Alunos encontrados: ${alunosOrigem.length}`);

  // ---------- Critérios de avaliação ----------
  const wsCriterios = wb.Sheets['Critérios de avaliação'];
  const pesoTestes = Number(cell(wsCriterios, 'E', 5) ?? 0.45);
  const pesoOutros = Number(cell(wsCriterios, 'E', 6) ?? 0.3);
  const atitudeDefs = [15, 16, 17, 19, 20].map((row) => ({
    nome: String(cell(wsCriterios, 'D', row) ?? `Atitude (linha ${row})`).trim(),
    peso: Number(cell(wsCriterios, 'E', row) ?? 0.05),
  }));

  // ---------- Criar disciplina / ano letivo (catálogo global, não por utilizador) / turma ----------
  const disciplina = await prisma.disciplina.upsert({
    where: { nome: disciplinaNome },
    update: {},
    create: { nome: disciplinaNome },
  });
  const anoLetivo = await prisma.anoLetivo.upsert({
    where: { nome: anoLetivoNome },
    update: {},
    create: { nome: anoLetivoNome },
  });

  const turma = await prisma.turma.create({
    data: {
      userId: user.id,
      anoLetivoId: anoLetivo.id,
      nome: turmaNome,
      nivelEnsino: nivelEnsino ?? null,
    },
  });
  console.log(`Turma criada: ${turma.nome} (${turma.id})`);

  const turmaDisciplina = await prisma.turmaDisciplina.create({
    data: { turmaId: turma.id, disciplinaId: disciplina.id },
  });

  const alunosCriados = await Promise.all(
    alunosOrigem.map((a) =>
      prisma.aluno.create({
        data: { turmaId: turma.id, numero: a.numero, nome: a.nome, medidas: a.medidas, aliena: a.aliena },
      })
    )
  );
  const alunoIdPorNumero = new Map(alunosCriados.map((a) => [a.numero, a.id]));

  // A importação assume que todos os alunos da turma estão inscritos na
  // disciplina importada (era essa a premissa da grelha de Excel original).
  await prisma.alunoDisciplina.createMany({
    data: alunosCriados.map((a) => ({ alunoId: a.id, turmaDisciplinaId: turmaDisciplina.id })),
  });

  const criterioTestes = await prisma.criterio.create({
    data: { turmaDisciplinaId: turmaDisciplina.id, grupo: 'Conhecimentos e Capacidades', nome: 'Testes de avaliação', peso: pesoTestes, ordem: 0 },
  });
  const criterioOutros = await prisma.criterio.create({
    data: { turmaDisciplinaId: turmaDisciplina.id, grupo: 'Conhecimentos e Capacidades', nome: 'Outros instrumentos', peso: pesoOutros, ordem: 1 },
  });
  const criteriosAtitude = await Promise.all(
    atitudeDefs.map((def, idx) =>
      prisma.criterio.create({
        data: { turmaDisciplinaId: turmaDisciplina.id, grupo: 'Atitudes', nome: def.nome, peso: def.peso, ordem: 2 + idx },
      })
    )
  );

  const periodo1 = await prisma.periodo.create({ data: { turmaId: turma.id, nome: '1.º Semestre', ordem: 1 } });
  const periodo2 = await prisma.periodo.create({ data: { turmaId: turma.id, nome: '2.º Semestre', ordem: 2 } });

  // ---------- Testes e outros instrumentos ----------
  async function importarInstrumentoPontos(
    sheetName: string,
    criterioId: string,
    periodoId: string,
    ordem: number
  ) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`Folha "${sheetName}" não encontrada — a ignorar.`);
      return;
    }
    const nomeInstrumento = String(cell(ws, 'B', 2) ?? sheetName);
    const tema = cell(ws, 'G', 4) as string | undefined;

    // Descobrir colunas de perguntas: da coluna E (4, 0-indexed) até encontrar 'TOTAL' na linha 7
    const perguntas: Array<{ codigo: string; valorMax: number; col: number }> = [];
    for (let col = 4; col < 40; col++) {
      const codigo = cell(ws, colToLetter(col), 7);
      if (codigo === undefined) continue;
      if (String(codigo).trim().toUpperCase() === 'TOTAL') break;
      const valorMax = cell(ws, colToLetter(col), 8);
      if (valorMax === undefined) continue;
      perguntas.push({ codigo: String(codigo), valorMax: Number(valorMax), col });
    }
    if (perguntas.length === 0) {
      console.warn(`Folha "${sheetName}" sem perguntas detetadas — a ignorar.`);
      return;
    }

    const instrumento = await prisma.instrumento.create({
      data: {
        turmaDisciplinaId: turmaDisciplina.id,
        periodoId,
        criterioId,
        nome: nomeInstrumento,
        modo: ModoAvaliacao.PONTOS,
        tema: tema ?? null,
        ordem,
        perguntas: {
          create: perguntas.map((p, idx) => ({ codigo: p.codigo, valorMax: p.valorMax, ordem: idx })),
        },
      },
      include: { perguntas: true },
    });

    // Notas: linha do aluno j (0-indexed na lista alunosOrigem) está na linha 9+j da folha
    const operacoes = [];
    for (let j = 0; j < alunosOrigem.length; j++) {
      const linha = 9 + j;
      const alunoId = alunoIdPorNumero.get(alunosOrigem[j].numero);
      if (!alunoId) continue;
      for (let k = 0; k < perguntas.length; k++) {
        const valor = cell(ws, colToLetter(perguntas[k].col), linha);
        if (valor === undefined) continue;
        operacoes.push(
          prisma.nota.create({
            data: { perguntaId: instrumento.perguntas[k].id, alunoId, valor: Number(valor) },
          })
        );
      }
    }
    if (operacoes.length > 0) await prisma.$transaction(operacoes);
    console.log(`Importado "${nomeInstrumento}" (${sheetName}): ${perguntas.length} perguntas, ${operacoes.length} notas.`);
  }

  async function importarAtitudes(sheetName: string, periodoId: string) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`Folha "${sheetName}" não encontrada — a ignorar.`);
      return;
    }
    // Colunas D, E, F, G, H correspondem, por esta ordem, aos 5 critérios de atitude
    const colunas = ['D', 'E', 'F', 'G', 'H'];
    for (let idx = 0; idx < colunas.length; idx++) {
      const criterio = criteriosAtitude[idx];
      const instrumento = await prisma.instrumento.create({
        data: {
          turmaDisciplinaId: turmaDisciplina.id,
          periodoId,
          criterioId: criterio.id,
          nome: criterio.nome,
          modo: ModoAvaliacao.ESCALA,
          escalaMax: 5,
          ordem: idx,
          perguntas: { create: [{ codigo: 'Avaliação', valorMax: 5, ordem: 0 }] },
        },
        include: { perguntas: true },
      });

      const operacoes = [];
      for (let j = 0; j < alunosOrigem.length; j++) {
        const linha = 8 + j;
        const alunoId = alunoIdPorNumero.get(alunosOrigem[j].numero);
        if (!alunoId) continue;
        const valor = cell(ws, colunas[idx], linha);
        if (valor === undefined) continue;
        operacoes.push(
          prisma.nota.create({
            data: { perguntaId: instrumento.perguntas[0].id, alunoId, valor: Number(valor) },
          })
        );
      }
      if (operacoes.length > 0) await prisma.$transaction(operacoes);
      console.log(`Importado item de atitude "${criterio.nome}" (${sheetName}): ${operacoes.length} notas.`);
    }
  }

  await importarInstrumentoPontos('Teste de Avaliação 1_1S', criterioTestes.id, periodo1.id, 0);
  await importarInstrumentoPontos('Teste de Avaliação 2_1S', criterioTestes.id, periodo1.id, 1);
  await importarInstrumentoPontos('Outro instrumento 1_1S', criterioOutros.id, periodo1.id, 0);
  await importarInstrumentoPontos('Outro instrumento 2_1S', criterioOutros.id, periodo1.id, 1);
  await importarInstrumentoPontos('Outro instrumento 3_1S', criterioOutros.id, periodo1.id, 2);
  await importarAtitudes('Atitudes 1S', periodo1.id);

  await importarInstrumentoPontos('Teste de Avaliação 3_2S', criterioTestes.id, periodo2.id, 0);
  await importarInstrumentoPontos('Teste de Avaliação 4_2S', criterioTestes.id, periodo2.id, 1);
  await importarInstrumentoPontos('Outro instrumento 4_2S', criterioOutros.id, periodo2.id, 0);
  await importarInstrumentoPontos('Outro instrumento 5_2S', criterioOutros.id, periodo2.id, 1);
  await importarInstrumentoPontos('Outro instrumento 6_2S', criterioOutros.id, periodo2.id, 2);
  await importarAtitudes('Atitudes 2S', periodo2.id);

  console.log('\nImportação concluída.');
  console.log(`Abra a aplicação e consulte a turma "${turma.nome}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
