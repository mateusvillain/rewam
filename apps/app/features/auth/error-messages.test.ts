import { describe, expect, it } from 'vitest';
import { classifyAuthError, translateAuthError } from './error-messages';

describe('translateAuthError', () => {
  it('prefere o código ao texto da mensagem', () => {
    expect(translateAuthError({ code: 'otp_expired', message: 'qualquer texto' })).toBe(
      'O código expirou. Peça um novo.',
    );
  });

  it('cai no texto quando não há código', () => {
    expect(translateAuthError({ message: 'Invalid login credentials' })).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('não confunde refresh token inválido com código inválido', () => {
    // O texto casaria com uma regra ampla de "invalid token"; o resultado precisa
    // ser a mensagem genérica, não uma instrução para conferir 6 dígitos.
    const traduzido = translateAuthError({ message: 'Invalid Refresh Token: Already Used' });
    expect(traduzido).not.toContain('6 dígitos');
  });

  it('distingue código expirado de código inválido', () => {
    expect(translateAuthError({ code: 'otp_expired', message: '' })).toBe(
      'O código expirou. Peça um novo.',
    );
    expect(translateAuthError({ message: 'Token not found' })).toBe(
      'Código inválido. Confira os 6 dígitos e tente de novo.',
    );
  });

  it('não repassa mensagem técnica desconhecida', () => {
    const traduzido = translateAuthError({ message: 'PGRST301: JWSError JWSInvalidSignature' });
    expect(traduzido).not.toContain('PGRST301');
    expect(traduzido).toBe('Não foi possível concluir agora. Tente de novo em instantes.');
  });

  it('tem mensagem para erro ausente', () => {
    expect(translateAuthError(null)).toBe(
      'Não foi possível concluir agora. Tente de novo em instantes.',
    );
  });
});

describe('classifyAuthError', () => {
  it('trata limite de envio como falha de infraestrutura', () => {
    expect(classifyAuthError({ code: 'over_email_send_rate_limit', message: '' })).toBe('infra');
    expect(
      classifyAuthError({ message: 'For security purposes, you can only request this after 55s' }),
    ).toBe('infra');
  });

  it('trata erro corrigível pela pessoa como user', () => {
    expect(classifyAuthError({ code: 'invalid_credentials', message: '' })).toBe('user');
    expect(classifyAuthError({ code: 'same_password', message: '' })).toBe('user');
  });

  it('trata erro desconhecido como infraestrutura, que é o seguro de exibir', () => {
    expect(classifyAuthError({ message: 'algo inesperado' })).toBe('infra');
  });
});
