# Modelo de dados e privacidade

## Princípio

A identidade usada pelas regras é sempre o `uid` do Firebase Authentication.
E-mail e telefone não são usados como chave de presença e não aparecem no
diretório lido pelos membros.

## Coleções

### `players`

Elenco público e notas usadas para equilibrar os times. Diretoria e
administração aprovadas podem editar.

### `users/{uid}`

Perfil administrável: nome, e-mail de referência, usuário, papel, situação e
eventual `playerId`.

- papéis: `member`, `director`, `admin`;
- situações: `pending`, `approved`, `rejected`;
- perfis antigos sem `status` são tratados como aprovados para compatibilidade.

O perfil completo pode ser lido pelo titular ou por um administrador ativo.

### `userContacts/{uid}`

Telefone privado no formato `(XX) XXX XXX XXX`. O documento é separado para que
consultas esportivas não exponham o contato.

### `memberDirectory/{uid}`

Diretório mínimo de contas aprovadas: nome, `uid` e vínculo esportivo. Não
contém e-mail, telefone ou credenciais.

### `playerLinks/{playerId}`

Reserva canônica entre atleta e conta. Usar o atleta como ID impede dois
vínculos concorrentes para a mesma pessoa.

### `games/{gameId}`

Título, data, local, observações, autor e marcadores das notificações. Cada jogo
possui `attendances/{uid}`, com a resposta e quem a registrou.

### `delegations/{fromUid}/delegates/{toUid}`

Autorização explícita para `toUid` responder pela presença de `fromUid`.

### `users/{uid}/pushSubscriptions/{tokenHash}`

Token do aparelho, plataforma Web e data de atualização. O ID é um hash do
token; cada conta administra apenas os próprios aparelhos.

### `auditLogs/{id}`

Registra autor, alvo, tipo da ação e nomes dos campos alterados. Valores
anteriores, senhas, links de redefinição e tokens nunca entram na auditoria.

## Ativação de conta

Uma conta só participa de presença, delegação e notificações quando as duas
condições são verdadeiras:

1. o Firebase Authentication informa `emailVerified`;
2. o perfil está com `status: approved`.

O administrador altera a situação no painel. Aprovação cria o diretório mínimo;
rejeição ou desativação remove o documento correspondente.
