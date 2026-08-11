# Vôlei Hub — Selector

[![Qualidade](https://github.com/jean7rafael/selector/actions/workflows/ci.yml/badge.svg)](https://github.com/jean7rafael/selector/actions/workflows/ci.yml)

Aplicativo para cadastrar atletas, formar times equilibrados, agendar jogos e confirmar presença.

- Web/PWA: [banco-de-dados-seletor-times.web.app](https://banco-de-dados-seletor-times.web.app/)
- Código: [github.com/jean7rafael/selector](https://github.com/jean7rafael/selector)
- Contexto técnico: [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)

## O que já funciona

- lista pública de atletas com alterações restritas à administração e diretoria;
- criação de conta pelo aplicativo com e-mail, telefone privado e confirmação da senha;
- recuperação de senha e envio/reenvio da verificação de e-mail;
- nome de usuário derivado automaticamente da parte do e-mail anterior ao `@`;
- painel administrativo para editar perfis, alterar funções e excluir contas;
- vínculo exclusivo entre uma conta e um atleta do elenco;
- histórico imutável das ações administrativas, sem senhas ou segredos;
- troca segura de e-mail e senha pelo backend, sem possibilidade de revelar a senha atual;
- formação de dois ou três times para grupos de 8 a 21 atletas;
- equilíbrio opcional da quantidade de mulheres;
- agenda pública e confirmação `vou`, `talvez` ou `não vou`;
- delegação explícita para outra pessoa responder pela presença;
- instalação como PWA, cache offline e notificações push;
- projetos nativos Android e iOS com Capacitor;
- testes unitários, regras do Firestore, navegador e automação no GitHub.

## Ambiente local

O projeto usa Node 22.22+, Java 21 e, para Android, o SDK 36. Neste Mac eles foram instalados pelo Homebrew em `/opt/homebrew`.

```bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
npm ci
```

Para iniciar Firebase Auth e Firestore locais com 12 atletas e três perfis:

```bash
npx firebase emulators:exec --project demo-selector --only auth,firestore \
  "npm run seed:emulators && npm run dev -- --host 127.0.0.1"
```

Contas locais, todas com a senha `selector123`:

- `admin@selector.local` — administrador;
- `diretoria@selector.local` — diretoria;
- `membro@selector.local` — membro.

Essas contas existem apenas nos emuladores.

## Verificações

```bash
npm run lint
npm test
npm run test:rules
npm run test:e2e
npm run build:pwa
```

## Android e iOS

Os projetos ficam em `src-capacitor/android` e `src-capacitor/ios`.

Antes de compilar localmente, copie `.env.example` para `.env`, preencha as variáveis com o aplicativo Web do Firebase e exporte-as no terminal (`set -a; source .env; set +a`). No GitHub, o workflow móvel recebe automaticamente as variáveis da homologação.

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
npm run build:android
npm run build:android:apk

npm run build:ios
```

`build:android:apk` gera um APK assinado com a chave de desenvolvimento, adequado para instalação e testes. Uma versão de loja precisa de uma chave permanente e conta Google Play. O iOS precisa de Apple Developer Team, certificados e perfis de provisionamento para produzir o `.ipa` e publicar na App Store.

`build:ios` atualiza os arquivos web no projeto nativo e compila para o simulador. Para abrir o projeto e configurar a conta Apple, use `open src-capacitor/ios/App/App.xcodeproj`.

Neste Mac, o Xcode completo, o CoreSimulator e a plataforma iOS 26.5 estão configurados. O pacote Swift foi resolvido e o Vôlei Hub foi compilado, instalado e aberto com sucesso no simulador. Assinatura, TestFlight e App Store continuam dependendo da conta Apple Developer.

Para push nativo, coloque os arquivos fornecidos pelo Firebase em:

- Android: `src-capacitor/android/app/google-services.json`;
- iOS: `src-capacitor/ios/App/App/GoogleService-Info.plist`.

Esses arquivos não devem ser versionados.

## Publicação

- Pull requests recebem uma prévia temporária no Firebase Hosting.
- Alterações em `main` publicam a homologação automaticamente.
- O workflow manual `Publicar produção` usa o projeto `volei-hub`.
- Funções de push, lembretes e administração de credenciais exigem que o projeto Firebase esteja no plano Blaze.

As variáveis esperadas pelo GitHub estão listadas em `.env.example` e nos workflows de `.github/workflows`.
