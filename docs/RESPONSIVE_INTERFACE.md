# Interface responsiva do Vôlei Hub

## Objetivo

Todas as páginas devem continuar legíveis e operáveis no celular, no tablet e
no computador. A responsividade não fica limitada a correções isoladas: a base
compartilhada está em `src/css/app.scss` e deve ser reutilizada por novas telas.

## Estrutura compartilhada

- `app-page`: espaçamento externo da página;
- `app-page-content`: largura máxima e centralização do conteúdo;
- `app-page-header`: título e ações do cabeçalho;
- `app-page-actions` e `app-wrap-actions`: botões que podem mudar de linha;
- `app-table-toolbar`: título e controles superiores de listas;
- `app-dialog-card`: largura segura para diálogos;
- `app-mobile-full`: ação que ocupa a largura disponível no celular.

O cabeçalho passa a empilhar título e ações até 1023 px porque, em tablets, o
menu lateral reduz a área útil da página. Abaixo de 600 px, títulos, margens,
botões e diálogos recebem medidas próprias de telefone. Abaixo de 360 px, o
espaçamento é novamente reduzido.

## Comportamento das telas

- **Atletas:** a tabela tradicional vira uma lista de cartões abaixo de
  1024 px. Seleção, edição, exclusão, posição, ordem e relevância continuam
  disponíveis sem rolagem horizontal.
- **Jogos:** título e botões usam o cabeçalho global; os cartões passam a uma
  única coluna em celulares.
- **Ajustes:** botões e seletores de cada usuário passam para linhas próprias
  quando a área útil diminui. O histórico administrativo também reorganiza a
  data abaixo do conteúdo.
- **Início, acesso e página não encontrada:** textos, cartões, formulários e
  ações possuem tamanhos móveis e não ultrapassam a largura da tela.
- **Navegação:** o menu vira gaveta no celular e o cabeçalho reduz os espaços
  nas menores larguras suportadas.

## Exportação de atletas

O botão exporta **somente os atletas marcados** na tela de Atletas.

- sem seleção, o botão fica desativado e orienta a marcar ao menos uma pessoa;
- com seleção, o texto mostra `Exportar selecionados (N)`;
- a dica do botão informa que somente os marcados entrarão no arquivo;
- o download se chama `atletas-selecionados-selector.json`;
- uma confirmação informa quantos atletas foram exportados;
- a exportação não altera nem remove dados do Firebase;
- o campo temporário `selected` é gravado como `false` no JSON para que o
  arquivo não carregue uma seleção de interface como se fosse dado permanente.

A importação compatível com esse arquivo está detalhada em
`docs/PLAYER_TRANSFER.md`.

## Proteção contra regressões

Os testes completos do navegador verificam:

1. que o JSON contém exatamente os atletas selecionados;
2. que o nome e a quantidade aparecem no botão;
3. que Atletas usa cartões no celular;
4. que os controles administrativos continuam visíveis;
5. que Início, Atletas, Jogos, Ajustes e Acesso não criam rolagem horizontal
   em 320, 390 e 768 px.

Uma nova tela deve usar as classes compartilhadas e entrar nessa verificação
antes de ser publicada.
