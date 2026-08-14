# Arquitetura Web/PWA

## Decisão

O Vôlei Hub possui uma única aplicação Web instalável. Android, iPhone, iPad e
computadores abrem o mesmo código publicado pelo Firebase Hosting. Não há APK,
projeto Xcode, TestFlight ou lojas de aplicativos no fluxo atual.

Essa decisão mantém uma só interface, um só sistema de autenticação e uma só
publicação. Os diretórios nativos antigos foram removidos do repositório, mas
continuam recuperáveis pelo histórico do Git.

## Instalação pelo usuário

- iPhone ou iPad: abrir no Safari ou Edge, usar **Compartilhar** e escolher
  **Adicionar à Tela de Início**;
- Android: abrir no navegador e escolher **Instalar aplicativo** ou **Adicionar
  à tela inicial**;
- computador: usar o ícone de instalação oferecido pelo navegador.

No iPhone e no iPad, Web Push está disponível a partir do iOS/iPadOS 16.4 e
somente quando o usuário abre o ícone instalado. Dentro de uma aba do Safari ou
Edge, a tela mostra as etapas de instalação em vez de informar incorretamente
que o navegador é incompatível. Em qualquer plataforma, a permissão só é
solicitada depois do clique em **Ativar notificações**.

## Componentes

1. Quasar/Vue renderiza as telas e cria o manifesto instalável.
2. O service worker do Workbox guarda os arquivos essenciais para reabertura.
3. Firebase Authentication identifica a conta.
4. Firestore mantém atletas, jogos, presença, perfis e tokens Web Push.
5. Firebase Cloud Messaging entrega mensagens ao navegador.
6. GitHub Actions encontra jogos novos e lembretes, sem Cloud Functions.

## Rotas compartilháveis

A aplicação usa URLs com `#`, compatíveis com o Firebase Hosting e com a PWA
instalada. Cada jogo possui o endereço `/#/jogos/{gameId}`. O clique em uma
notificação valida que o destino é interno e abre essa chamada diretamente.

## Funcionamento sem rede

O service worker armazena os arquivos compilados da interface. Isso permite
reabrir a estrutura da PWA, mas dados novos, login, gravações e atualização de
presenças continuam dependendo do Firebase e, portanto, de conexão.

## Comentários no código

Os arquivos principais estão separados em blocos comentados por
responsabilidade. Comentários explicam decisões, limites de segurança e etapas
menos óbvias; operações triviais permanecem legíveis pelo próprio nome para
evitar comentários desatualizados.
