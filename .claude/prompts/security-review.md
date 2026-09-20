# Prompt: revisão de segurança

Faça uma revisão de segurança das alterações atuais (ou de uma área
indicada do código). Não faça alterações nesta fase — apenas analise e
reporte, salvo pedido explícito para corrigir.

Verifique especificamente, com base nos padrões reais do projeto
(`.claude/rules/backend.md`, `.claude/rules/authentication.md`,
`.claude/rules/database.md`):

* **Autenticação**: toda rota nova em `src/app/api/**` chama
  `requireUserId()` ou `requireAdminId()` (`src/lib/auth.ts`) antes de
  aceder a dados?
* **Autorização**: rotas que operam sobre uma turma/recurso específico
  confirmam posse via `assertTurmaOwnership` (ou filtro `where: { userId }`
  equivalente)? Alguma rota de admin usa `requireUserId` em vez de
  `requireAdminId` por engano?
* **Validação de input**: todo `req.json()` é validado com um schema Zod
  de `src/lib/validation.ts` antes de ser usado numa query Prisma?
* **Dados do cliente**: existe algum `userId`, `role` ou outro campo
  sensível a ser lido diretamente do corpo do pedido em vez de vir da
  sessão validada no servidor?
* **Exposição de dados**: alguma resposta de API pode incluir
  `passwordHash` ou outro campo que não devia sair da BD (verifique
  `select`/`include` das queries Prisma)?
* **Secrets**: algum valor de `.env` (`DATABASE_URL`, `NEXTAUTH_SECRET`)
  aparece hardcoded, logado, ou em mensagens de erro devolvidas ao
  cliente?
* **SQL/injeção**: existe alguma query `$queryRawUnsafe`/
  `$executeRawUnsafe` nova? Se sim, está devidamente parametrizada/
  sanitizada?
* **Logs**: algum `console.log`/`console.error` regista dados sensíveis
  (palavras-passe, tokens, `passwordHash`)?
* **CSRF/sessão**: alguma alteração mexe em `src/middleware.ts` ou
  `authOptions` de forma a enfraquecer a proteção de rotas ou a validação
  de sessão do NextAuth?

Para cada problema, indique: ficheiro/linha, cenário de exploração
concreto, severidade e correção sugerida. Não reporte hipóteses vagas sem
um cenário de exploração real e verificável no código.
