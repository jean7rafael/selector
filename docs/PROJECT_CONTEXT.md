# Contexto do projeto Selector

## Objetivo

O Vôlei Hub organiza o cadastro de atletas, a divisão equilibrada dos times, a
agenda e a confirmação de presença. O repositório principal é
`jean7rafael/selector`.

## Localização e Git

O projeto ativo está em:

`/Users/jean7rafael/Downloads/Programas de Programador/times-volei/selector`

O remoto `origin` aponta para `https://github.com/jean7rafael/selector.git`.

## Arquitetura

- `src/domain`: regras puras de atleta, perfil e seleção de times;
- `src/misc`: sessão, Firestore, usuários, auditoria, jogos e notificações;
- `src/pages`: telas Quasar;
- `src-pwa`: cache offline, service worker e notificações em segundo plano;
- `scripts`: carga local e envio gratuito das notificações agendadas;
- `tests`: regras de segurança, domínio e fluxos completos no navegador;
- `.github/workflows`: revisão, prévia, publicação e avisos agendados.

Os antigos projetos nativos e as Cloud Functions foram removidos após a decisão
de manter somente a PWA no plano gratuito.

## Permissões

- visitantes leem atletas, jogos e presenças;
- novas contas entram como `member`, com situação `pending`;
- presença, delegação e push exigem e-mail verificado e conta aprovada;
- telefone fica separado e visível apenas ao titular e à administração;
- membros aprovados respondem por si e administram suas delegações;
- delegados respondem pelas pessoas que os autorizaram;
- diretoria aprovada gerencia atletas, jogos e presenças;
- administração aprovada consulta contatos, edita perfis, papéis e situações;
- cada atleta pode estar vinculado a no máximo uma conta;
- ações administrativas criam histórico imutável sem valores sensíveis;
- a própria conta administradora não pode ser rebaixada ou desativada na tela;
- exclusão direta de perfil pelo PWA é bloqueada;
- senhas nunca são recuperáveis; somente um link de redefinição é enviado.

As decisões são repetidas em `firestore.rules`; esconder botões não é usado como
mecanismo de segurança.

## Firebase e publicação

- produção oficial: `banco-de-dados-seletor-times`;
- plano: Spark, sem cobrança;
- Hosting: `dist/pwa`;
- Web Push: Firebase Cloud Messaging e `FIREBASE_VAPID_KEY`;
- avisos automáticos: rotina do GitHub a cada 15 minutos;
- desenvolvimento: emuladores locais, sem gravar no projeto oficial;
- projeto `volei-hub`: não participa da publicação atual.

## Estado validado em 14 de agosto de 2026

- revisão de estilo: aprovada;
- verificação de tipos: aprovada;
- 18 testes unitários: aprovados;
- 15 testes de regras do Firestore: aprovados;
- 6 fluxos completos no Chromium: aprovados, incluindo a orientação de
  instalação para Safari/Edge no iPhone;
- PWA: compilada;
- sintaxe da rotina de notificações: aprovada;
- chave VAPID e API FCM V1: configuradas;
- rotina gratuita, publicação real e proteção da branch: validadas;
- entrega Web Push em aparelho real: aguarda uma inscrição ativa.

## Pendências externas

1. instalar e abrir a PWA em um aparelho real, aceitar a permissão e confirmar
   que a inscrição ficou ativa;
2. criar um jogo de teste, executar a rotina e confirmar a notificação e o link
   individual aberto pelo toque.

Essas pendências só devem ser marcadas nas issues após a confirmação real.
