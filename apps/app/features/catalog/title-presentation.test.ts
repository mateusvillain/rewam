import { describe, expect, it } from 'vitest';

import { formatRuntime, releaseYear, titleSubtitle } from './title-presentation';

describe('releaseYear', () => {
  it('tira o ano da data do TMDB', () => {
    expect(releaseYear('2010-07-15')).toBe('2010');
  });

  it('não desloca o ano por fuso, como new Date faria', () => {
    // `new Date('2011-01-01')` é meia-noite UTC e, em fuso negativo, volta como
    // 31/12/2010 — o filme mudaria de ano só de ser exibido no Brasil.
    expect(releaseYear('2011-01-01')).toBe('2011');
  });

  it('devolve null quando não há data', () => {
    expect(releaseYear(null)).toBeNull();
  });

  it('devolve null para data malformada, em vez de exibir lixo', () => {
    expect(releaseYear('sem data')).toBeNull();
    expect(releaseYear('20')).toBeNull();
    expect(releaseYear('')).toBeNull();
  });
});

describe('formatRuntime', () => {
  it('formata a duração conhecida', () => {
    expect(formatRuntime(148)).toBe('2 h 28 min');
  });

  it('diz que não sabe, em vez de mostrar zero', () => {
    expect(formatRuntime(null)).toBe('Duração desconhecida');
  });
});

describe('titleSubtitle', () => {
  it('junta ano e tipo', () => {
    expect(titleSubtitle('2010', 'movie')).toBe('2010 · Filme');
    expect(titleSubtitle('2008', 'tv')).toBe('2008 · Série');
  });

  it('não deixa separador sobrando sem ano', () => {
    expect(titleSubtitle(null, 'movie')).toBe('Filme');
  });
});
