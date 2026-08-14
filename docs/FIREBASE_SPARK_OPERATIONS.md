# Operação no Firebase Spark

## Política de custo

O projeto oficial é `banco-de-dados-seletor-times` e deve permanecer no plano
Spark. Não habilite Blaze para executar este repositório. Cloud Functions foram
removidas e nenhuma automação solicita mudança de plano.

## Ambientes

- produção: Firebase Hosting do projeto oficial;
- prévia: canal temporário criado para cada pull request;
- desenvolvimento e testes: Firebase Emulator Suite com o projeto fictício
  `demo-selector`.

O projeto Firebase `volei-hub` não é alvo dos workflows atuais. Mantê-lo fora do
fluxo evita dividir Authentication e Firestore entre dois ambientes.

## Publicação

Uma alteração segue este caminho:

1. abrir pull request;
2. aguardar revisão de estilo, tipos, testes, regras e navegador;
3. conferir a prévia temporária;
4. integrar em `main`;
5. o workflow **Publicar produção Web** compila a PWA e publica Hosting, regras
   e índices no projeto oficial.

Os secrets com prefixo `STAGE_` continuam sendo usados por compatibilidade com a
configuração existente do GitHub. Neste repositório eles alimentam a produção
oficial.

## Notificações sem Cloud Functions

O workflow **Notificações Web** executa `scripts/send-web-notifications.mjs` no
GitHub:

1. autentica com a conta de serviço guardada no GitHub;
2. seleciona tokens de contas aprovadas e com e-mail verificado;
3. envia avisos de novos jogos ainda não processados;
4. envia lembretes de jogos nas próximas 24 horas;
5. remove tokens que o Firebase informou como inválidos;
6. marca no jogo o processamento concluído.

O intervalo nominal é de 15 minutos. Agendamentos do GitHub podem sofrer atraso
ou ser suspensos; o mesmo workflow pode ser executado manualmente na aba
**Actions**.

## Secrets necessários

- `FIREBASE_SERVICE_ACCOUNT_BANCO_DE_DADOS_SELETOR_TIMES`;
- `STAGE_FIREBASE_PROJECT_ID`;
- `STAGE_FIREBASE_APP_ID`;
- `STAGE_FIREBASE_API_KEY`;
- `STAGE_FIREBASE_AUTH_DOMAIN`;
- `STAGE_FIREBASE_MESSAGING_SENDER_ID`;
- `STAGE_FIREBASE_VAPID_KEY`.

A VAPID é uma chave pública e entra no aplicativo compilado. A chave privada da
conta de serviço permanece somente nos secrets do GitHub.

## Validação de Web Push

1. confirmar a chave Web Push no Firebase Cloud Messaging;
2. conferir o secret `STAGE_FIREBASE_VAPID_KEY`;
3. publicar a PWA;
4. entrar com conta verificada e aprovada;
5. instalar a PWA e clicar em **Ativar notificações**;
6. criar um jogo de teste;
7. executar manualmente **Notificações Web**;
8. confirmar a chegada e o endereço individual aberto pelo clique.

Só depois dessa entrega real a pendência de Web Push deve receber check na
issue.

## Administração de contas

### Senha

Senhas são hashes não recuperáveis no Firebase. O botão de cadeado envia um
link de redefinição ao e-mail da pessoa e registra a solicitação na auditoria.
Não existe botão de olho para revelar senha administrativa porque esse dado não
existe em formato legível.

### Desativação

O botão de pessoa desativada muda o perfil para `rejected`, remove a pessoa do
diretório interno e conserva o histórico. A administração pode reaprovar a
conta depois.

### Exclusão definitiva excepcional

A exclusão completa não é oferecida pelo PWA porque precisaria coordenar Auth e
Firestore com privilégio de servidor. Quando for legalmente ou operacionalmente
necessária, faça manualmente no console, conferindo o `uid` antes de remover:

1. desativar a conta no Vôlei Hub;
2. excluir a conta em Firebase Authentication;
3. remover `users/{uid}`, `userContacts/{uid}` e `memberDirectory/{uid}`;
4. remover inscrições push, delegações e eventual `playerLinks/{playerId}`;
5. preservar `auditLogs`, salvo decisão jurídica específica.

Esse procedimento é destrutivo e deve ser feito por uma pessoa responsável,
com conferência do alvo.

### Alteração do e-mail

O e-mail de outra conta fica somente leitura no painel. Uma alteração manual
deve atualizar primeiro o Firebase Authentication e depois o campo de referência
em `users/{uid}`, sempre usando o mesmo `uid`. Uma futura solução totalmente
automatizada pode ser reavaliada se houver um backend gratuito confiável.

## Diagnóstico

- botão de push indisponível: conferir aprovação, verificação e abertura como
  PWA instalada;
- mensagem de VAPID ausente: conferir o secret e republicar;
- aviso não chegou: executar o workflow manualmente e consultar seu registro;
- conta não aparece para delegação: conferir `status` e `memberDirectory`;
- permissão negada: conferir também as regras publicadas, não apenas a tela.
