/**
 * Espera mínima entre reenvios de código.
 *
 * O Supabase limita quantos e-mails saem por hora e recusa pedidos seguidos com
 * erro. Sem uma espera no cliente, dois toques no botão já gastariam a cota e a
 * pessoa ficaria sem conseguir reenviar quando realmente precisasse.
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Segundos que ainda faltam para liberar um novo envio. */
export function remainingCooldownSeconds(
  lastSentAt: number | null,
  now: number,
  cooldownSeconds: number = RESEND_COOLDOWN_SECONDS,
): number {
  if (lastSentAt === null) return 0;

  const elapsed = Math.floor((now - lastSentAt) / 1000);
  return Math.max(0, cooldownSeconds - elapsed);
}

export function canResend(lastSentAt: number | null, now: number): boolean {
  return remainingCooldownSeconds(lastSentAt, now) === 0;
}

/** Rótulo do botão, que também comunica quanto falta. */
export function resendLabel(remainingSeconds: number): string {
  return remainingSeconds > 0 ? `Reenviar em ${remainingSeconds}s` : 'Reenviar código';
}
