import { register } from 'register-service-worker';

/* ===========================================================
   REGISTRO DO APLICATIVO OFFLINE

   Quando uma versão nova termina de baixar, ela assume o controle
   e a página recarrega uma vez para mostrar o conteúdo atualizado.
=========================================================== */

register(process.env.SERVICE_WORKER_FILE, {
  updated(registration) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  },
  error(error) {
    console.error('Falha ao registrar o aplicativo offline.', error);
  },
});
