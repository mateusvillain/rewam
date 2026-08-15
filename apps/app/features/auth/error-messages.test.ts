import { describe, expect, it } from 'vitest';
import { translateAuthError } from './error-messages';

describe('translateAuthError', () => {
  it('traduz credenciais inválidas', () => {
    expect(translateAuthError({ message: 'Invalid login credentials' })).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('distingue código expirado de código inválido', () => {
    expect(translateAuthError({ message: 'Token has expired' })).toBe(
      'O código expirou. Peça um novo.',
    );
    expect(translateAuthError({ message: 'Invalid token' })).toBe(
      'Código inválido. Confira os 6 dígitos e tente de novo.',
    );
  });

  it('avisa sobre limite de tentativas', () => {
    expect(
      translateAuthError({ message: 'For security purposes, you can only request this after 55s' }),
    ).toBe('Muitas tentativas seguidas. Aguarde um minuto e tente de novo.');
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
