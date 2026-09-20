# Prompt: investigar (sem implementar)

Investigue a questão indicada antes de propor qualquer alteração. Não
modifique ficheiros nesta fase.

Determine:

1. Onde no código o comportamento em questão está implementado (página,
   rota de API, função em `src/lib/`).
2. Qual é o fluxo de execução completo, desde a UI (se aplicável) até à
   base de dados.
3. Que ficheiros e funções estão envolvidos, e como se relacionam.
4. Se existe comportamento semelhante já resolvido noutro sítio do
   projeto (útil como referência para uma solução consistente).
5. Que suposições ou lacunas de informação existem (ex.: comportamento não
   documentado, decisão de produto pouco clara).

Apresente a investigação de forma estruturada:

* **Onde**: ficheiros/funções relevantes.
* **Como funciona hoje**: fluxo passo a passo.
* **Observações**: comportamento inesperado, dívida técnica relacionada,
  ou riscos identificados.
* **Perguntas em aberto**: o que precisa de decisão do utilizador antes de
  avançar para implementação.

Não avance para implementação nesta fase, mesmo que a correção pareça
óbvia — aguarde confirmação do próximo passo.
