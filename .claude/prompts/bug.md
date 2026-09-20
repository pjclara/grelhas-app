# Prompt: corrigir um bug

Siga `claude.md` e as regras em `.claude/rules/` durante toda a tarefa.

## 1. Investigar antes de modificar

Determine, e apresente antes de mexer em código:

1. Onde o problema ocorre (página, rota de API, função em `src/lib/`).
2. Qual é o fluxo de execução completo até ao ponto de falha.
3. Qual é a causa raiz (não o sintoma).
4. Que ficheiros estão envolvidos.
5. Se existe comportamento semelhante noutro sítio do projeto que já trate
   este caso corretamente (para replicar a solução, não reinventar).

Não implemente um workaround antes de perceber a causa raiz.

## 2. Corrigir

* Aplique a menor correção necessária para resolver a causa raiz.
* Não aproveite para refatorar código à volta que não está relacionado com
  o bug.
* Se o bug envolver validação de input, autenticação ou autorização,
  reveja `.claude/rules/backend.md` e `.claude/rules/authentication.md`
  para garantir que a correção não introduz uma nova falha de segurança.

## 3. Testar

* Se existir framework de testes disponível (hoje não existe — ver
  `.claude/rules/testing.md`), adicione/atualize um teste que reproduza o
  bug e confirme que passa depois da correção.
* Caso contrário, descreva exatamente os passos manuais de reprodução
  antes e depois da correção.

## 4. Validar e apresentar

* Corra `npm run lint` e `npx tsc --noEmit`.
* Reveja o `git diff` e procure possíveis regressões (ex.: outros locais
  que chamam a mesma função alterada).
* Apresente: causa raiz, ficheiros alterados, validação feita, e qualquer
  risco residual.
