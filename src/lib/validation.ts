import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome demasiado curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
});

export const disciplinaSchema = z.object({
  nome: z.string().min(2),
  grupoDisciplinarId: z.string().min(1),
  cicloIds: z.array(z.string()).min(1),
  anoEscolaridadeIds: z.array(z.string()).min(1),
  ativo: z.boolean().optional(),
});

export const grupoDisciplinarSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
});

export const cicloSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional().nullable(),
});

export const anoEscolaridadeSchema = z.object({
  nome: z.string().min(2),
  ordem: z.number().int().optional(),
});

export const anoLetivoSchema = z.object({
  nome: z.string().regex(/^\d{4}\/\d{4}$/, 'Formato esperado: 2025/2026'),
});

export const turmaSchema = z.object({
  anoLetivoId: z.string().min(1),
  nome: z.string().min(1),
  nivelEnsino: z.string().min(1).optional().nullable(),
});

export const turmaDisciplinaSchema = z.object({
  disciplinaId: z.string().min(1),
});

export const turmaLimiaresSchema = z.object({
  limiarNivel2: z.number().min(0).max(100),
  limiarNivel3: z.number().min(0).max(100),
  limiarNivel4: z.number().min(0).max(100),
  limiarNivel5: z.number().min(0).max(100),
});

export const alunoDisciplinaSchema = z.object({
  alunoId: z.string().min(1),
});

export const alunoSchema = z.object({
  numeroProcesso: z.string().min(1),
  numero: z.number().int().positive(),
  nome: z.string().min(1),
  medidaIds: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

export const transferenciaAlunoSchema = z.object({
  turmaDestinoId: z.string().min(1),
  numero: z.number().int().positive(),
});

export const periodoSchema = z.object({
  nome: z.string().min(1),
  ordem: z.number().int().min(1),
});

export const perguntaInputSchema = z.object({
  id: z.string().optional(), // presente = atualizar, ausente = criar
  codigo: z.string().min(1),
  valorMax: z.number().positive(),
  ordem: z.number().int().min(0),
});

export const instrumentoSchema = z.object({
  periodoId: z.string().min(1),
  criterioId: z.string().min(1),
  nome: z.string().min(1),
  modo: z.enum(['PONTOS', 'ESCALA']),
  escalaMax: z.number().int().positive().default(5),
  unidade: z.string().optional().nullable(),
  tema: z.string().optional().nullable(),
  data: z.string().datetime().optional().nullable(),
  ordem: z.number().int().min(0).optional(),
  perguntas: z.array(perguntaInputSchema).min(1),
});

export const roleUpdateSchema = z.object({
  role: z.enum(['PROFESSOR', 'ADMIN']),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Nome demasiado curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  role: z.enum(['PROFESSOR', 'ADMIN']).default('PROFESSOR'),
});

export const notasLancamentoSchema = z.object({
  // notas[alunoId][perguntaId] = valor | null
  notas: z.record(z.string(), z.record(z.string(), z.number().nullable())),
});

// ---------- Critérios de avaliação (ano letivo + ciclo) ----------

const pesoCriterioSchema = z.number().min(0).max(1);
const TOLERANCIA_PESOS = 0.001;

const subInstrumentoInputSchema = z.object({
  id: z.string().min(1).optional(), // presente = atualizar, ausente = criar
  nome: z.string().trim().min(1, 'Indique o nome do sub-instrumento'),
  peso: pesoCriterioSchema.nullable().optional(),
});

const instrumentoRecolhaInputSchema = z.object({
  id: z.string().min(1).optional(), // presente = atualizar, ausente = criar
  nome: z.string().trim().min(1, 'Indique o nome do instrumento'),
  peso: pesoCriterioSchema.nullable().optional(),
  subInstrumentos: z.array(subInstrumentoInputSchema).default([]),
});

/**
 * Irmãos: ou nenhum tem peso (média simples) ou todos têm e somam o peso do
 * item pai (`total`). Os instrumentos de recolha somam o peso do critério; os
 * sub-instrumentos somam o peso do instrumento. O que soma 100% é o conjunto
 * dos critérios aplicáveis a uma disciplina, não os filhos de cada critério.
 */
function mensagemPesosIrmaos(itens: { peso?: number | null }[], total: number | null): string | null {
  const comPeso = itens.filter((i) => i.peso !== null && i.peso !== undefined);
  if (comPeso.length === 0) return null;
  if (total === null) return 'Defina primeiro o peso do item pai para poder dar peso a estes itens.';
  if (comPeso.length !== itens.length) return 'Ou todos os itens têm peso, ou nenhum tem.';
  const soma = comPeso.reduce((acc, i) => acc + (i.peso ?? 0), 0);
  if (Math.abs(soma - total) > TOLERANCIA_PESOS) {
    return `Os pesos somam ${Math.round(soma * 10000) / 100}% e têm de somar ${Math.round(total * 10000) / 100}%.`;
  }
  return null;
}

export const criterioSchema = z
  .object({
    anoLetivoId: z.string().min(1),
    cicloId: z.string().min(1),
    nome: z.string().trim().min(2, 'Nome demasiado curto'),
    peso: pesoCriterioSchema,
    tipo: z.enum(['GERAL', 'ESPECIFICO']),
    grupoDisciplinarId: z.string().min(1).optional().nullable(),
    instrumentosRecolha: z.array(instrumentoRecolhaInputSchema).default([]),
  })
  .superRefine((c, ctx) => {
    if (c.tipo === 'ESPECIFICO' && !c.grupoDisciplinarId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grupoDisciplinarId'],
        message: 'Escolha o grupo disciplinar do critério específico.',
      });
    }
    if (c.tipo === 'GERAL' && c.grupoDisciplinarId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['grupoDisciplinarId'],
        message: 'Um critério geral não tem grupo disciplinar.',
      });
    }
    const msgInstrumentos = mensagemPesosIrmaos(c.instrumentosRecolha, c.peso);
    if (msgInstrumentos) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['instrumentosRecolha'], message: msgInstrumentos });
    }
    c.instrumentosRecolha.forEach((ir, i) => {
      if (c.tipo === 'GERAL' && ir.subInstrumentos.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['instrumentosRecolha', i, 'subInstrumentos'],
          message: 'Só os critérios específicos têm sub-instrumentos.',
        });
      }
      const msgSub = mensagemPesosIrmaos(ir.subInstrumentos, ir.peso ?? null);
      if (msgSub) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['instrumentosRecolha', i, 'subInstrumentos'],
          message: msgSub,
        });
      }
    });
  });

// Grelhas de notas (critérios gerais / sub-instrumentos): escala fixa de 1 a 5.
export const ocorrenciaSchema = z.coerce.number().int().min(1).max(50);

export const grelhaNotasSchema = z.object({
  // notas[alunoId][colunaId] = valor | null
  notas: z.record(z.string(), z.record(z.string(), z.number().min(1).max(5).nullable())),
});
