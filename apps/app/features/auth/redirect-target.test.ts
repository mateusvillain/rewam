import { describe, expect, it } from 'vitest';
import { resolveRedirectTarget } from './redirect-target';

describe('resolveRedirectTarget', () => {
  it('preserva o destino interno pretendido', () => {
    expect(resolveRedirectTarget('/historico')).toBe('/historico');
    expect(resolveRedirectTarget('/filme/123')).toBe('/filme/123');
  });

  it('cai no início quando não há destino', () => {
    expect(resolveRedirectTarget(undefined)).toBe('/');
    expect(resolveRedirectTarget('')).toBe('/');
  });

  it('recusa destino fora do app', () => {
    expect(resolveRedirectTarget('//site-falso.example')).toBe('/');
    expect(resolveRedirectTarget('https://site-falso.example')).toBe('/');
    expect(resolveRedirectTarget('rewam://qualquer')).toBe('/');
  });

  it('recusa contorno por barra invertida', () => {
    expect(resolveRedirectTarget('/\\site-falso.example')).toBe('/');
  });

  it('recusa telas de autenticação, que criariam ciclo', () => {
    expect(resolveRedirectTarget('/(auth)/entrar')).toBe('/');
    expect(resolveRedirectTarget('/entrar')).toBe('/');
    expect(resolveRedirectTarget('/confirmar-email?email=a@b.c')).toBe('/');
  });

  it('não recusa rota que apenas começa com o mesmo texto', () => {
    // A comparação é por segmento: casar por prefixo bloquearia uma rota
    // legítima como esta.
    expect(resolveRedirectTarget('/entrar-em-grupo')).toBe('/entrar-em-grupo');
  });

  it('usa o primeiro valor quando o parâmetro vem repetido', () => {
    expect(resolveRedirectTarget(['/estatisticas', '/outro'])).toBe('/estatisticas');
  });
});
