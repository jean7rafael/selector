# Vôlei Hub — Selector

[![Qualidade](https://github.com/jean7rafael/selector/actions/workflows/ci.yml/badge.svg)](https://github.com/jean7rafael/selector/actions/workflows/ci.yml)

Aplicativo Web instalável para cadastrar atletas, formar times equilibrados,
agendar jogos e confirmar presença.

- Aplicativo: [banco-de-dados-seletor-times.web.app](https://banco-de-dados-seletor-times.web.app/)
- Código: [github.com/jean7rafael/selector](https://github.com/jean7rafael/selector)
- Contexto técnico: [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)
- Arquitetura PWA: [docs/PWA_ARCHITECTURE.md](docs/PWA_ARCHITECTURE.md)
- Operação no Firebase: [docs/FIREBASE_SPARK_OPERATIONS.md](docs/FIREBASE_SPARK_OPERATIONS.md)
- Modelo de dados: [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- Interface responsiva: [docs/RESPONSIVE_INTERFACE.md](docs/RESPONSIVE_INTERFACE.md)
- Transferência de atletas: [docs/PLAYER_TRANSFER.md](docs/PLAYER_TRANSFER.md)

## O que funciona

- lista pública de atletas com alterações restritas à diretoria;
- formação de dois ou três times para grupos de 8 a 21 atletas;
- equilíbrio opcional da quantidade de mulheres;
- exportação em JSON somente dos atletas marcados, com contagem no botão;
- importação administrativa de arquivos JSON, com prévia e sem duplicar nomes;
- interface responsiva compartilhada para celular, tablet e computador;
- criação de conta com e-mail, telefone e repetição da senha;
- verificação do e-mail e aprovação administrativa antes da participação;
- nome de usuário iniciado com a parte do e-mail anterior ao `@`;
- recuperação de senha por link seguro enviado ao titular;
- painel administrativo para editar perfil, papel, situação e atleta vinculado;
- desativação reversível de conta sem depender de um serviço pago;
- vínculo exclusivo entre uma conta e um atleta;
- histórico imutável das ações administrativas, sem senhas ou segredos;
- agenda pública, URL própria para cada jogo e confirmação de presença;
- delegação explícita para outra pessoa responder pela presença;
- instalação como PWA, cache offline e estrutura de Web Push;
- testes unitários, regras do Firestore, navegador e automação no GitHub.

## Decisão Web/PWA

O produto não mantém mais projetos nativos separados para Android e iOS. O
mesmo endereço Web pode ser instalado pela opção **Adicionar à Tela de Início**
ou **Instalar aplicativo** do navegador. Essa decisão reduz manutenção sem
retirar o uso em celular, tablet ou computador.

## Ambiente local

O projeto usa Node 22 e Java 21. Neste Mac, as versões corretas estão instaladas
pelo Homebrew:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
npm ci
```

Para iniciar Firebase Auth e Firestore locais com dados de demonstração:

```bash
npx firebase emulators:exec --project demo-selector --only auth,firestore \
  "npm run seed:emulators && npm run dev -- --host 127.0.0.1"
```

Contas locais, todas com a senha `selector123`:

- `admin@selector.local` — administrador aprovado e verificado;
- `diretoria@selector.local` — diretoria aprovada e verificada;
- `membro@selector.local` — membro aprovado, com e-mail ainda não verificado;
- `pendente@selector.local` — membro verificado aguardando aprovação.

Essas contas existem apenas nos emuladores.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run test:e2e
npm run build:pwa
```

## Publicação gratuita

O Firebase `banco-de-dados-seletor-times` é o ambiente público oficial e
permanece no plano Spark, sem cobrança:

- pull requests recebem uma prévia temporária do Hosting;
- alterações aprovadas em `main` publicam a PWA, as regras e os índices;
- o GitHub agenda a rotina de avisos de jogos, substituindo Cloud Functions;
- nenhuma automação deste repositório habilita o plano Blaze.

A chave pública Web Push está configurada no secret
`STAGE_FIREBASE_VAPID_KEY`. Os nomes `STAGE_*` foram preservados para não quebrar
os secrets existentes, embora o projeto seja agora a produção oficial.

## Limites de segurança no plano gratuito

- senhas nunca podem ser lidas nem exibidas; o administrador envia um link de
  redefinição para o e-mail cadastrado;
- o administrador desativa a conta pelo app; exclusão definitiva no Firebase é
  um procedimento manual e excepcional;
- o e-mail de outra pessoa não é alterado pelo navegador, pois ele é uma
  credencial do Firebase Authentication;
- notificações agendadas podem levar até o próximo ciclo do GitHub para chegar.

Os procedimentos correspondentes estão em
[docs/FIREBASE_SPARK_OPERATIONS.md](docs/FIREBASE_SPARK_OPERATIONS.md).
