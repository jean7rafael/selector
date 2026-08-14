import { describe, expect, it } from 'vitest';
import {
  isAppleMobilePlatform,
  pushAvailabilityForContext,
  type PushRuntimeContext,
} from './push-support';

const available: PushRuntimeContext = {
  firebaseSupported: true,
  hasNotificationApi: true,
  hasServiceWorker: true,
  isAppleMobile: false,
  isStandalone: false,
  notificationPermission: 'default',
};

describe('suporte a notificações Web', () => {
  it('orienta a instalação quando Safari ou Edge estão em uma aba do iPhone', () => {
    expect(
      pushAvailabilityForContext({
        ...available,
        firebaseSupported: false,
        hasNotificationApi: false,
        isAppleMobile: true,
      }),
    ).toBe('install-required');
  });

  it('libera a ativação quando a PWA está aberta pela Tela de Início', () => {
    expect(
      pushAvailabilityForContext({
        ...available,
        isAppleMobile: true,
        isStandalone: true,
      }),
    ).toBe('available');
  });

  it('não exige instalação em navegadores de computador com suporte', () => {
    expect(pushAvailabilityForContext(available)).toBe('available');
  });

  it('distingue permissão bloqueada de falta de suporte', () => {
    expect(
      pushAvailabilityForContext({
        ...available,
        notificationPermission: 'denied',
      }),
    ).toBe('permission-denied');
  });

  it('identifica navegadores realmente incompatíveis', () => {
    expect(
      pushAvailabilityForContext({
        ...available,
        firebaseSupported: false,
      }),
    ).toBe('unsupported');
  });

  it('reconhece iPhone, Edge no iPhone e iPadOS com identificação de Mac', () => {
    expect(
      isAppleMobilePlatform({
        maxTouchPoints: 5,
        platform: 'iPhone',
        userAgent: 'Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1',
      }),
    ).toBe(true);
    expect(
      isAppleMobilePlatform({
        maxTouchPoints: 5,
        platform: 'iPhone',
        userAgent: 'Mozilla/5.0 (iPhone) Mobile Safari EdgiOS/138.0',
      }),
    ).toBe(true);
    expect(
      isAppleMobilePlatform({
        maxTouchPoints: 5,
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1.15',
      }),
    ).toBe(true);
  });
});
