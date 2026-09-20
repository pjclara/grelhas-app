# Prompt: revisão de código

Faça uma revisão das alterações atuais (`git diff`). Não faça alterações
nesta fase — apenas analise e reporte.

Analise especificamente, usando `claude.md` e `.claude/rules/` como
referência:

* Server Components vs Client Components e uso de `"use client"`
  (`.claude/rules/frontend.md`);
* data fetching (servidor vs `useEffect`);
* estado React (necessário? derivável?);
* TypeScript (`any`, casts desnecessários, tipos desalinhados com
  `src/lib/types.ts`/Prisma);
* segurança: validação Zod, `requireUserId`/`requireAdminId`,
  `assertTurmaOwnership`, exposição de `passwordHash` ou outros dados
  sensíveis (`.claude/rules/backend.md`, `.claude/rules/authentication.md`);
* base de dados: queries sem filtro por `userId`, falta de `select`
  explícito, migrações inconsistentes (`.claude/rules/database.md`);
* tratamento de erros (uso de `handleApiError` e das classes de erro
  existentes);
* testes (não existem no projeto — sinalize se uma alteração de risco
  ficou sem qualquer verificação, manual ou automatizada);
* código duplicado (lógica repetida que já existe em `src/lib/`);
* possíveis regressões noutras rotas/páginas que dependem do código
  alterado.

Ignore questões puramente estilísticas sem benefício prático real.

Para cada problema encontrado, indique:

* ficheiro e trecho afetado;
* o problema;
* por que é um problema (impacto real);
* correção sugerida.

Classifique por importância prática (bloqueante / importante / menor).

Depois de apresentar a revisão, aguarde instrução antes de aplicar
qualquer correção.
