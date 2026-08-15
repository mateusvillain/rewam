import { useCallback, useEffect, useState } from 'react';
import { classifyAuthError, translateAuthError, type AuthErrorLike } from './error-messages';
import { canResend, remainingCooldownSeconds, resendLabel } from './resend-cooldown';

export type ResendFeedback = { tone: 'erro' | 'neutro'; message: string } | null;

/**
 * Reenvio de código com espera entre tentativas, compartilhado pelas telas de
 * confirmação de cadastro e de troca de senha — os dois fluxos consomem a mesma
 * cota de e-mails do Supabase, então faz pouco sentido só um deles esperar.
 *
 * A espera é conforto e freio contra toque repetido; o limite que vale de fato
 * é o do servidor, e por isso o erro de cota continua sendo exibido quando vem.
 */
export function useResendCooldown(send: () => Promise<{ error: AuthErrorLike }>) {
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState<ResendFeedback>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (lastSentAt === null) return;

    const id = setInterval(() => {
      const left = remainingCooldownSeconds(lastSentAt, Date.now());
      setRemaining(left);
      // Sem isto o intervalo seguiria disparando de segundo em segundo até o
      // componente desmontar, muito depois de a espera ter acabado.
      if (left === 0) clearInterval(id);
    }, 1000);

    setRemaining(remainingCooldownSeconds(lastSentAt, Date.now()));

    return () => clearInterval(id);
  }, [lastSentAt]);

  const resend = useCallback(async () => {
    if (!canResend(lastSentAt, Date.now())) return;

    setIsSending(true);
    setFeedback(null);

    const { error } = await send();

    if (error && classifyAuthError(error) === 'infra') {
      setFeedback({ tone: 'erro', message: translateAuthError(error) });
    } else {
      // Sucesso e erro de usuário respondem igual: nada aqui pode revelar se o
      // e-mail digitado corresponde a uma conta.
      setFeedback({ tone: 'neutro', message: 'Enviamos um novo código.' });
      setLastSentAt(Date.now());
    }

    setIsSending(false);
  }, [lastSentAt, send]);

  return {
    resend,
    isSending,
    feedback,
    remainingSeconds: remaining,
    isBlocked: remaining > 0,
    label: isSending ? 'Reenviando…' : resendLabel(remaining),
  };
}
