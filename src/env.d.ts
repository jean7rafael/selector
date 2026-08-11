/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
    FIREBASE_PROJECT_ID: string | undefined;
    FIREBASE_APP_ID: string | undefined;
    FIREBASE_API_KEY: string | undefined;
    FIREBASE_AUTH_DOMAIN: string | undefined;
    FIREBASE_MESSAGING_SENDER_ID: string | undefined;
    FIREBASE_VAPID_KEY: string | undefined;
    FIREBASE_USE_EMULATORS: string | undefined;
  }
}
