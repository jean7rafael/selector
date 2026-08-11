import { defineConfig } from '@quasar/app-vite/wrappers';

export default defineConfig(() => ({
  /* =========================================================
     INICIALIZAÇÃO E ESTILOS GLOBAIS

     Firebase prepara autenticação e banco. Notifications escuta
     mensagens recebidas enquanto o aplicativo está aberto.
  ========================================================= */

  boot: ['firebase', 'notifications'],
  css: ['app.scss'],

  /* =========================================================
     FONTES E ÍCONES UTILIZADOS PELA INTERFACE
  ========================================================= */

  extras: ['roboto-font', 'material-icons'],

  /* =========================================================
     COMPILAÇÃO E VARIÁVEIS PÚBLICAS DO FIREBASE

     Os valores de demonstração permitem usar os emuladores sem
     criar um arquivo .env. Em produção, os segredos do GitHub
     substituem todos eles durante a compilação.
  ========================================================= */

  build: {
    vueRouterMode: 'hash',
    env: {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'demo-selector',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '1:123456789:web:selector-local',
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'selector-local-api-key',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || 'demo-selector.firebaseapp.com',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
      FIREBASE_VAPID_KEY: process.env.FIREBASE_VAPID_KEY || '',
    },
  },

  /* =========================================================
     SERVIDOR LOCAL DE DESENVOLVIMENTO
  ========================================================= */

  devServer: {
    port: 3003,
    open: false,
  },

  /* =========================================================
     COMPONENTES GLOBAIS DO QUASAR
  ========================================================= */

  framework: {
    plugins: ['Notify'],
  },
  animations: [],

  /* =========================================================
     APLICATIVO INSTALÁVEL E FUNCIONAMENTO OFFLINE

     InjectManifest une o cache do Workbox ao recebimento de
     notificações em segundo plano definido em src-pwa.
  ========================================================= */

  pwa: {
    workboxMode: 'InjectManifest',
  },
}));
