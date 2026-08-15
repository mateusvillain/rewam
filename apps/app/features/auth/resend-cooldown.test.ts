import { describe, expect, it } from 'vitest';
import {
  canResend,
  remainingCooldownSeconds,
  resendLabel,
  RESEND_COOLDOWN_SECONDS,
} from './resend-cooldown';

const AGORA = 1_700_000_000_000;

describe('remainingCooldownSeconds', () => {
  it('libera de imediato quando nada foi enviado ainda', () => {
    expect(remainingCooldownSeconds(null, AGORA)).toBe(0);
  });

  it('conta o tempo desde o último envio', () => {
    expect(remainingCooldownSeconds(AGORA - 10_000, AGORA)).toBe(RESEND_COOLDOWN_SECONDS - 10);
  });

  it('nunca devolve valor negativo', () => {
    expect(remainingCooldownSeconds(AGORA - 5 * 60_000, AGORA)).toBe(0);
  });

  it('libera exatamente ao completar a espera', () => {
    expect(remainingCooldownSeconds(AGORA - RESEND_COOLDOWN_SECONDS * 1000, AGORA)).toBe(0);
  });
});

describe('canResend', () => {
  it('bloqueia logo após um envio', () => {
    expect(canResend(AGORA, AGORA)).toBe(false);
  });

  it('libera depois da espera', () => {
    expect(canResend(AGORA - 61_000, AGORA)).toBe(true);
  });
});

describe('resendLabel', () => {
  it('mostra quanto falta enquanto está bloqueado', () => {
    expect(resendLabel(42)).toBe('Reenviar em 42s');
  });

  it('convida ao reenvio quando liberado', () => {
    expect(resendLabel(0)).toBe('Reenviar código');
  });
});
