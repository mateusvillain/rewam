import { describe, expect, it } from 'vitest';
import { resolveSignUpOutcome } from './sign-up-outcome';

describe('resolveSignUpOutcome', () => {
  it('entra direto quando o cadastro já devolve sessão', () => {
    expect(resolveSignUpOutcome(true)).toBe('signedIn');
  });

  it('pede confirmação quando o cadastro não devolve sessão', () => {
    expect(resolveSignUpOutcome(false)).toBe('needsConfirmation');
  });
});
