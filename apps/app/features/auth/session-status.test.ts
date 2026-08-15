import { describe, expect, it } from 'vitest';
import { resolveSessionStatus } from './session-status';

describe('resolveSessionStatus', () => {
  it('mantém loading enquanto a restauração não termina, mesmo sem sessão', () => {
    expect(resolveSessionStatus(true, false)).toBe('loading');
  });

  it('mantém loading enquanto a restauração não termina, mesmo com sessão', () => {
    expect(resolveSessionStatus(true, true)).toBe('loading');
  });

  it('reporta signedOut só depois de a restauração terminar', () => {
    expect(resolveSessionStatus(false, false)).toBe('signedOut');
  });

  it('reporta signedIn quando há sessão restaurada', () => {
    expect(resolveSessionStatus(false, true)).toBe('signedIn');
  });
});
