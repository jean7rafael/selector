/* eslint-disable */

declare namespace NodeJS {
  interface ProcessEnv {
    SERVICE_WORKER_FILE: string;
    PWA_FALLBACK_HTML: string;
    PWA_SERVICE_WORKER_REGEX: string;
    FIREBASE_PROJECT_ID: string | undefined;
    FIREBASE_APP_ID: string | undefined;
    FIREBASE_API_KEY: string | undefined;
    FIREBASE_AUTH_DOMAIN: string | undefined;
    FIREBASE_MESSAGING_SENDER_ID: string | undefined;
  }
}
