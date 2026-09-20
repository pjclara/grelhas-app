# Prompt: revisão de performance

Analise a área de código indicada (ou as alterações atuais) à procura de
problemas reais de performance. Não faça alterações nesta fase — apenas
analise e reporte, salvo pedido explícito para corrigir.

Pontos a verificar, específicos da stack real do projeto:

* **Queries Prisma N+1**: um `findMany` seguido de queries adicionais por
  item, em vez de usar `include`/`_count` numa única query (ver o padrão
  já usado em `src/app/api/turmas/route.ts`).
* **Over-fetching**: queries Prisma sem `select` que trazem colunas
  desnecessárias (especialmente relações grandes como `notas` de um
  `Aluno`).
* **Data fetching no cliente**: páginas que fazem `fetch` em cascata
  (esperar uma resposta para só depois disparar a próxima) onde os dados
  poderiam ser obtidos em paralelo ou diretamente no servidor
  (`.claude/rules/frontend.md`).
* **Re-renders desnecessários**: estado em Client Components que força
  recriação de listas/objetos a cada render sem `useMemo`/`useCallback`
  quando isso tem impacto mensurável (não sugerir memoização especulativa
  sem um problema real identificado).
* **Cálculo pesado no cliente**: lógica de `src/lib/calc.ts`/`resumo.ts`
  a correr no Client Component em vez de no servidor, para uma turma
  grande.
* **Exportação (PDF/Excel)**: geração de ficheiros grandes
  (`exceljs`/`pdf-lib`) de forma síncrona bloqueando a resposta — avalie se
  o volume de dados justifica preocupação real antes de sugerir mudanças.

Para cada problema encontrado, indique o ficheiro, o cenário concreto em
que o impacto aparece (ex.: "turma com 200 alunos"), e uma correção
proporcional ao ganho esperado. Não sugira otimizações prematuras sem um
cenário real de carga que as justifique.
