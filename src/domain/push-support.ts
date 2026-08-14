/* Estados apresentados pela tela de ajustes. Separar instalação, bloqueio e
   incompatibilidade evita tratar todo problema como navegador sem suporte. */
export type PushAvailability =
  'available' | 'install-required' | 'permission-denied' | 'unsupported';

export type PushRuntimeContext = {
  firebaseSupported: boolean;
  hasNotificationApi: boolean;
  hasServiceWorker: boolean;
  isAppleMobile: boolean;
  isStandalone: boolean;
  notificationPermission: 'default' | 'denied' | 'granted';
};

export type MobilePlatform = {
  maxTouchPoints: number;
  platform: string;
  userAgent: string;
};

/* iPadOS pode anunciar a plataforma como MacIntel. O toque diferencia esse
   caso de um Mac e mantém a detecção válida também para Edge no iPhone/iPad. */
export function isAppleMobilePlatform(platform: MobilePlatform) {
  return (
    /iPad|iPhone|iPod/i.test(platform.userAgent) ||
    (platform.platform === 'MacIntel' && platform.maxTouchPoints > 1)
  );
}

/* No iOS/iPadOS, as APIs de Push só aparecem depois que o site é instalado e
   aberto pela Tela de Início. Por isso essa regra precisa vir antes da
   detecção das APIs, que retornaria um falso “sem suporte” dentro da aba. */
export function pushAvailabilityForContext(
  context: PushRuntimeContext,
): PushAvailability {
  if (context.isAppleMobile && !context.isStandalone) return 'install-required';
  if (
    !context.hasNotificationApi ||
    !context.hasServiceWorker ||
    !context.firebaseSupported
  )
    return 'unsupported';
  if (context.notificationPermission === 'denied') return 'permission-denied';
  return 'available';
}
