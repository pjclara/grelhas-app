# Regras de base de dados

Baseado em `prisma/schema.prisma` e `prisma/migrations/`.

## ORM e base de dados

* ORM: **Prisma 5.20.0**. Base de dados: **PostgreSQL** (`provider =
  "postgresql"` em `schema.prisma`).
* Cliente Prisma partilhado: `src/lib/prisma.ts` (padrão singleton via
  `globalForPrisma`, para evitar múltiplas ligações em desenvolvimento com
  hot reload). Importe sempre `prisma` deste ficheiro — não instancie
  `new PrismaClient()` noutro sítio.

## Estrutura do schema

Hierarquia real de dados (ver `schema.prisma`):

```
User (professor)
 ├─ Disciplina (única por [userId, nome])
 ├─ AnoLetivo (único por [userId, nome])
 └─ Turma (única por [userId, disciplinaId, anoLetivoId, nome])
      ├─ Aluno (único por [turmaId, numero])
      ├─ Periodo (único por [turmaId, ordem])
      └─ Instrumento (por turma/período; aponta para um InstrumentoRecolha ou SubInstrumento)
           └─ Pergunta → Nota (por aluno)
```

Critérios de avaliação (catálogo global, só ADMIN) — independentes do `User`:

```
Criterio (anoLetivo + ciclo; GERAL ou ESPECIFICO de um GrupoDisciplinar; peso)
 └─ InstrumentoRecolha (peso opcional; somam o peso do critério)
     └─ SubInstrumento (só em critérios específicos; peso opcional; somam o do instrumento)
```

Um critério aplica-se a uma `TurmaDisciplina` quando `Turma.anoLetivoId` e
`Turma.cicloId` coincidem e o critério é GERAL ou do
`Disciplina.grupoDisciplinarId` (ver `src/lib/criterios.ts`). O `Instrumento`
→ `InstrumentoRecolha`/`SubInstrumento` usa `onDelete: Restrict`: apagar um
critério em uso é bloqueado (409) em vez de apagar notas.

Todas as relações a partir do `User`/`Turma` têm `onDelete: Cascade` a partir do `User`/`Turma` — uma
eliminação em cascata é intencional e documentada nas próprias
confirmações da UI (ex.: `remover()` em `disciplinas/page.tsx` avisa quantas
turmas serão apagadas).

## Migrations

* Nunca edite ficheiros já aplicados em `prisma/migrations/`. Uma alteração
  ao schema gera sempre uma migração nova.
* Comando de desenvolvimento: `npm run prisma:migrate` (`prisma migrate
  dev`) — cria e aplica uma migração local. **Só correr quando o
  utilizador pedir explicitamente**, nunca automaticamente durante uma
  tarefa.
* Em produção/build, as migrações são aplicadas por `prisma migrate
  deploy`, que já corre automaticamente no script `build` do
  `package.json`. Não corra `prisma migrate deploy` manualmente contra a
  base de dados de produção sem confirmação do utilizador.
* Após qualquer alteração a `schema.prisma`, é necessário `npx prisma
  generate` para regenerar os tipos do `@prisma/client` usados em todo o
  projeto (ex.: `import type { Role } from '@prisma/client'` em
  `src/lib/auth.ts`).

## Queries

* Filtre sempre por `userId` (ou pela cadeia de posse via
  `assertTurmaOwnership`) nas queries que devolvem dados de um utilizador —
  nunca faça `findUnique`/`findMany` por `id` sozinho quando o recurso
  pertence a um utilizador.
* Use `select` explícito para nunca devolver campos sensíveis
  (`passwordHash`) — ver `src/app/api/admin/users/route.ts` como
  referência.
* Use `include`/`_count` do Prisma para dados relacionados em vez de fazer
  múltiplas queries manuais (ver `include: { disciplina: true, anoLetivo:
  true, _count: { select: { alunos: true } } }` em
  `src/app/api/turmas/route.ts`).

## Transações

* `prisma.$transaction` já é usado no projeto para operações com múltiplas
  escritas dependentes entre si — ver
  `src/app/api/turmas/[turmaId]/instrumentos/[instrumentoId]/route.ts`
  (atualização de um instrumento e das suas perguntas/notas) e
  `src/app/api/turmas/[turmaId]/instrumentos/[instrumentoId]/notas/route.ts`
  (lançamento de notas em lote). Siga este padrão sempre que uma operação
  nova precisar de atomicidade entre várias escritas — não assuma que
  chamadas Prisma sequenciais sem transação são seguras nesses casos.

## Segurança

* Nunca construa SQL manualmente a partir de input do utilizador. Não
  existe (nem deve ser introduzido sem justificação forte) uso de
  `$queryRawUnsafe`/`$executeRawUnsafe` no projeto.
* `DATABASE_URL` vem sempre de variável de ambiente (`.env`), nunca
  hardcoded.
