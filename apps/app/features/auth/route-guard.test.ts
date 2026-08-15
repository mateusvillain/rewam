import { describe, expect, it } from 'vitest';
import { resolveGuardDecision } from './route-guard';

describe('resolveGuardDecision', () => {
  it('espera enquanto a sessão não terminou de ser restaurada', () => {
    // O caso que importa: tratar isto como "sem sessão" expulsaria quem está
    // logado no primeiro instante de cada abertura do app.
    expect(resolveGuardDecision('loading', 'protegida')).toBe('aguardar');
    expect(resolveGuardDecision('loading', 'autenticacao')).toBe('aguardar');
  });

  it('deixa entrar na área protegida só com sessão', () => {
    expect(resolveGuardDecision('signedIn', 'protegida')).toBe('renderizar');
    expect(resolveGuardDecision('signedOut', 'protegida')).toBe('redirecionar');
  });

  it('tira de telas de login quem já está autenticado', () => {
    expect(resolveGuardDecision('signedIn', 'autenticacao')).toBe('redirecionar');
    expect(resolveGuardDecision('signedOut', 'autenticacao')).toBe('renderizar');
  });
});
