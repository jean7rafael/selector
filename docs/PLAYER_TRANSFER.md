# Transferência de atletas por JSON

## Finalidade

O Vôlei Hub pode transferir parte de um elenco entre instalações sem reativar
o antigo carregamento automático de dados. A operação é sempre iniciada por
uma pessoa, mostra uma prévia e só grava depois da confirmação.

## Exportar

Na página **Atletas**:

1. marque as pessoas desejadas;
2. confira a quantidade em **Exportar selecionados (N)**;
3. passe o cursor ou mantenha o foco no botão para ler a orientação;
4. clique para baixar `atletas-selecionados-selector.json`.

O arquivo contém somente os atletas marcados. Exportar não altera o Firebase,
não exclui ninguém e não inclui usuários, telefones, senhas ou presenças.

## Importar

O botão **Importar arquivo** aparece na página **Atletas** somente para
administração e diretoria aprovadas. Esse local mantém entrada, saída e edição
do elenco no mesmo fluxo.

1. abra **Importar arquivo**;
2. escolha um `.json` gerado pelo botão de exportação;
3. confira quantos atletas serão adicionados, repetidos ou inválidos;
4. confirme em **Importar N atletas**.

O arquivo pode vir de outra instalação do Vôlei Hub. Os identificadores do
Firebase de origem nunca são reutilizados: cada atleta importado recebe um novo
documento no destino.

## Validações e duplicidades

- o conteúdo principal precisa ser uma lista JSON;
- o arquivo pode ter até 1 MB e 450 registros;
- registros sem nome ou com nome acima de 120 caracteres são ignorados;
- habilidades são limitadas ao intervalo de zero a cinco;
- relevância base negativa é convertida para zero;
- gênero, números e campos antigos passam pelo normalizador do projeto;
- nomes são comparados sem diferenças de maiúsculas, espaços ou acentos;
- um nome já cadastrado não é substituído;
- nomes repetidos dentro do próprio arquivo também entram somente uma vez;
- a ordem dos novos atletas continua depois do elenco existente.

Ignorar duplicados evita sobrescrever avaliações já ajustadas no destino. Uma
alteração de um atleta existente continua sendo feita pelo botão de edição.

## Gravação e segurança

Todos os candidatos aprovados na prévia são enviados ao Firestore em um único
lote. Se uma operação for recusada, nenhuma pessoa do lote é gravada. As regras
do Firestore continuam exigindo diretoria ou administração; esconder o botão
de visitantes é apenas uma proteção adicional de interface.

O teste completo do navegador cria um arquivo em memória, importa um atleta,
ignora um nome existente e um registro inválido e confirma o novo atleta na
lista. Os testes unitários cobrem normalização, limites e campos inválidos.
