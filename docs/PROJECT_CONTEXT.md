# Contexto do projeto Selector

## Objetivo

O Vôlei Hub organiza o cadastro de atletas, a divisão equilibrada dos times, a agenda e a confirmação de presença. O repositório principal é `jean7rafael/selector`.

## Localização atual

O projeto ativo foi movido do Desktop sincronizado pelo OneDrive para:

`/Users/jean7rafael/Downloads/Programas de Programador/times-volei/selector`

O remoto local se chama `origin` e aponta para `https://github.com/jean7rafael/selector.git`.

## Arquitetura

- `src/domain`: regras puras de atleta e seleção de times;
- `src/misc`: sessão, Firestore, jogos, delegações e notificações;
- `src/pages`: telas Quasar;
- `src-pwa`: manifesto, cache offline e service worker do FCM;
- `functions`: notificações de novo jogo e lembretes;
- `src-capacitor`: projetos Android e iOS;
- `tests`: regras do Firestore e fluxos completos no navegador.

## Permissões

- visitantes leem atletas, jogos e presenças;
- membros autenticados respondem por si e administram suas delegações;
- delegados respondem pelas pessoas que os autorizaram;
- diretoria e administração gerenciam atletas, jogos e qualquer presença;
- apenas administração pode alterar papéis de usuários.

As decisões são repetidas em `firestore.rules`; ocultar um botão na interface nunca é tratado como segurança suficiente.

## Firebase

- homologação: `banco-de-dados-seletor-times`;
- produção: `volei-hub`;
- Hosting publica `dist/pwa`;
- funções agendadas exigem Blaze;
- Web Push exige `FIREBASE_VAPID_KEY`;
- push nativo exige os arquivos de configuração Android/iOS e APNs configurado no Firebase.

## Ferramentas no Mac

- Node 22.23.2: `/opt/homebrew/opt/node@22/bin`;
- Java 21: `/opt/homebrew/opt/openjdk@21`;
- Android SDK: `/opt/homebrew/share/android-commandlinetools`;
- Xcode: `/Applications/Xcode.app`.

O `/usr/local/bin/node` continua sendo a versão antiga. Os comandos devem colocar o Node do Homebrew no começo do `PATH`.

## Estado validado em 11 de agosto de 2026

- lint: aprovado;
- 10 testes unitários: aprovados;
- 5 testes de regras: aprovados;
- 2 testes completos no Chromium: aprovados;
- PWA: compilada;
- Android: projeto, APK de release sem assinatura e APK de testes assinado gerados;
- iOS: projeto sincronizado e dependências fixadas; o Xcode local informou CoreSimulator desatualizado, e a assinatura/publicação depende também das credenciais Apple;
- notificações automáticas: implementadas, com deploy dependente do plano Blaze.

## Pendências externas

1. adicionar/confirmar as chaves Web Push nos secrets do GitHub;
2. habilitar Blaze para publicar Cloud Functions;
3. fornecer conta/keystore Google Play para uma versão assinada;
4. fornecer Apple Developer Team, certificados e perfil de provisionamento;
5. adicionar `google-services.json` e `GoogleService-Info.plist` para push nativo.
