# Design System e UI

## Princípio principal

Antes de criar ou alterar qualquer interface:

1. Analise as interfaces existentes.
2. Identifique o design system utilizado.
3. Procure componentes existentes que possam ser reutilizados.
4. Identifique padrões visuais já utilizados.
5. Só depois implemente a nova interface.

Não crie uma linguagem visual paralela dentro da aplicação.

---

## Consistência visual

Manter consistência entre:

* cores;
* tipografia;
* espaçamento;
* bordas;
* border-radius;
* sombras;
* tamanhos;
* ícones;
* botões;
* inputs;
* cards;
* modais;
* tabelas;
* navegação;
* estados de interação.

Quando existir um padrão no projeto, reutilizá-lo.

---

## Componentes

Antes de criar um novo componente:

1. procurar componentes existentes;
2. verificar variantes existentes;
3. verificar componentes compartilhados;
4. verificar se o componente pode ser composto a partir dos existentes.

Evitar criar componentes visualmente equivalentes com nomes diferentes.

---

## Layout

Regras detalhadas de layout, sidebar e responsividade vivem em
[`layout.md`](layout.md) — não duplicar aqui.

Resumo: priorizar hierarquia visual clara, espaçamento consistente,
alinhamento, proporções equilibradas e leitura fácil. Não utilizar
espaçamentos arbitrários quando o projeto já possuir uma escala definida.

---

## Tipografia

Respeitar a hierarquia existente.

Considerar:

* tamanho;
* peso;
* line-height;
* contraste;
* comprimento das linhas;
* hierarquia entre título, subtítulo, corpo e informação auxiliar.

Não criar novos tamanhos de fonte sem necessidade.

---

## Cores

Utilizar tokens ou variáveis existentes.

Não introduzir cores arbitrárias.

Quando não existir um sistema de cores, propor uma solução consistente antes de espalhar valores diretamente pelos componentes.

Considerar:

* texto;
* background;
* bordas;
* estados;
* feedback;
* ações primárias;
* ações secundárias;
* estados de erro;
* estados de sucesso;
* warning;
* informação.

---

## Estados da interface

Componentes interativos devem considerar, quando aplicável:

* default;
* hover;
* focus;
* active;
* disabled;
* loading;
* error;
* success;
* empty.

Não implementar somente o estado "feliz".

---

## Responsividade

Regras detalhadas (desktop, tablet, mobile, sidebar) vivem em
[`layout.md`](layout.md) — não duplicar aqui.

Resumo: toda interface deve funcionar em desktop, tablet e mobile — não
assumir que uma interface desktop simplesmente pode ser reduzida para
mobile. Verificar em particular: navegação, tabelas, formulários, modais,
cards, grids, espaçamento e tamanho dos elementos interativos.

---

## Acessibilidade

Priorizar:

* HTML semântico;
* navegação por teclado;
* foco visível;
* labels;
* contraste;
* tamanho adequado dos elementos interativos;
* mensagens de erro compreensíveis;
* suporte a leitores de tela quando necessário.

Não utilizar ARIA quando HTML semântico resolver o problema.

---

## UX

Antes de implementar uma interação, considerar:

* o que acontece quando não existem dados?
* o que acontece durante o carregamento?
* o que acontece quando ocorre um erro?
* o usuário recebe feedback?
* a ação pode ser desfeita?
* existe confirmação para ações destrutivas?
* a interface deixa claro o próximo passo?

Evitar interfaces que dependam exclusivamente de conhecimento prévio do usuário.

---

## Formulários

Formulários devem considerar:

* labels;
* valores iniciais;
* validação;
* mensagens de erro;
* loading;
* sucesso;
* campos obrigatórios;
* teclado;
* acessibilidade.

Erros devem aparecer próximos ao campo quando apropriado.

Não limpar os dados preenchidos pelo usuário sem motivo.

---

## Loading

Evitar telas completamente vazias durante operações demoradas.

Utilizar, conforme o padrão do projeto:

* skeleton;
* loading state;
* progress indicator;
* feedback contextual.

Não utilizar animações excessivas.

---

## Empty States

Quando uma lista ou página não possui dados, explicar:

1. o que está vazio;
2. por que pode estar vazio, quando relevante;
3. qual ação o usuário pode realizar.

Evitar simplesmente mostrar uma lista vazia.

---

## Erros

Erros apresentados ao usuário devem:

* ser compreensíveis;
* explicar o problema quando possível;
* indicar uma ação;
* não expor detalhes internos;
* não mostrar stack traces ou informações sensíveis.

---

## Feedback

Ações importantes devem fornecer feedback apropriado.

Exemplos:

* salvar;
* excluir;
* enviar;
* atualizar;
* importar;
* exportar.

O usuário deve conseguir perceber que a ação foi processada.

---

## Animações

Usar animações com moderação.

Priorizar:

* clareza;
* feedback;
* continuidade visual.

Evitar animações puramente decorativas que prejudiquem performance ou usabilidade.

Respeitar `prefers-reduced-motion` quando apropriado.

---

## Ícones

Reutilizar a biblioteca de ícones existente.

Não misturar estilos de ícones sem necessidade.

Ícones usados como ação devem possuir significado acessível.

Não usar emoji como substituto de ícones de interface sem uma razão específica.

---

## Imagens

Respeitar:

* proporção;
* qualidade;
* performance;
* lazy loading quando apropriado;
* alt text;
* comportamento responsivo.

No Next.js, seguir o mecanismo de imagens já utilizado pelo projeto.

---

## Mobile-first

Quando apropriado, pensar primeiro na experiência de telas pequenas e expandir para telas maiores.

Não tratar mobile como uma versão reduzida do desktop.

---

## Design existente

Quando houver inconsistência entre uma nova implementação e uma interface existente:

* não inventar uma solução isolada;
* identificar o padrão dominante;
* seguir o design system existente;
* sugerir uma melhoria global separadamente, se necessário.

---

## Regra de ouro

A nova interface deve parecer que sempre fez parte do produto.

O usuário não deve perceber que uma determinada tela foi criada posteriormente por outra pessoa ou ferramenta.
