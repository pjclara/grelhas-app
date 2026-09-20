# Prompt: nova funcionalidade

Siga `claude.md` e as regras em `.claude/rules/` durante toda a tarefa.

## 1. Analisar (antes de tocar em código)

* Descreva a funcionalidade pedida com as suas próprias palavras e
  confirme o escopo exato (o que está incluído / excluído).
* Procure funcionalidades semelhantes já implementadas (ex.: outro CRUD
  como `disciplinas`, outra rota de API do mesmo tipo).
* Identifique os ficheiros a criar/alterar: schema (`prisma/schema.prisma`
  + migração), validação (`src/lib/validation.ts`), rota(s) de API
  (`src/app/api/**/route.ts`), página(s)/componentes.
* Determine, para cada página/componente novo, se deve ser Server ou
  Client Component (ver `.claude/rules/frontend.md`).
* Confirme os requisitos de autenticação/autorização (utilizador dono do
  recurso? só admin?) — ver `.claude/rules/authentication.md`.

## 2. Planejar

Apresente um plano curto antes de implementar, se a tarefa não for
trivial:

* ficheiros a criar/alterar;
* impacto no schema (nova migração?);
* riscos (ex.: alteração de contrato de API existente).

Não implemente ainda nesta fase.

## 3. Implementar

* Escopo restrito à funcionalidade pedida — sem refatorações paralelas.
* Reutilize `requireUserId`/`requireAdminId`, `handleApiError`, schemas Zod
  existentes e tipos de `src/lib/types.ts` sempre que possível.
* Não adicione dependências novas sem justificar.

## 4. Testar / validar

* Não existe framework de testes automatizados no projeto
  (`.claude/rules/testing.md`) — não afirme ter corrido testes que não
  existem.
* Corra `npm run lint` e `npx tsc --noEmit`.
* Descreva os passos de verificação manual feitos (ou a fazer, se não for
  possível correr a app no momento).

## 5. Revisar

* Reveja `git diff` — confirme que só ficheiros relacionados foram
  alterados.
* Passe pela checklist de revisão do `claude.md` (arquitetura, Next.js,
  React, TypeScript, segurança, testes, git).

## 6. Apresentar resultado

Informe claramente:

* **Alterações**: lista de ficheiros criados/alterados.
* **Validação**: comandos realmente executados e resultado.
* **Observações**: decisões tomadas, limitações, ou pontos que precisam de
  atenção do utilizador (ex.: migração pendente, framework de testes em
  falta).
