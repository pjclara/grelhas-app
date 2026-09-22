import { z } from 'zod';
import { NIVEIS_ENSINO } from '@/lib/types';

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
  nivelEnsino: z.enum(NIVEIS_ENSINO).optional().nullable(),
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

export const grupoAvaliacaoSchema = z.object({
  anoLetivoId: z.string().min(1),
  nome: z.string().min(1),
  ordem: z.number().int().min(0).optional(),
});

export const instrumentoPesoSchema = z.object({
  disciplinaId: z.string().min(1),
  peso: z.number().min(0).max(1),
});

export const instrumentoAvaliacaoSchema = z.object({
  nome: z.string().min(1),
  ordem: z.number().int().min(0).optional(),
  pesos: z
    .array(instrumentoPesoSchema)
    .refine(
      (pesos) => new Set(pesos.map((p) => p.disciplinaId)).size === pesos.length,
      'Cada disciplina só pode aparecer uma vez.'
    ),
});

export const turmaDisciplinaInstrumentoSchema = z.object({
  instrumentoAvaliacaoId: z.string().min(1),
  peso: z.number().min(0).max(1),
  ordem: z.number().int().min(0).optional(),
});

export const turmaDisciplinaInstrumentoPesoSchema = z.object({
  peso: z.number().min(0).max(1),
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
