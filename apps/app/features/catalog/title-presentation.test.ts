import { describe, expect, it } from 'vitest';

import { formatRuntime, parseTmdbId, releaseYear, titleSubtitle } from './title-presentation';

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

describe('parseTmdbId', () => {
  it('aceita id numérico', () => {
    expect(parseTmdbId('27205')).toBe(27205);
  });

  it('usa o primeiro valor quando a rota repete o parâmetro', () => {
    expect(parseTmdbId(['27205', '999'])).toBe(27205);
  });

  it('recusa o que não é id, para não pedir /movie/NaN ao TMDB', () => {
    expect(parseTmdbId('abc')).toBeNull();
    expect(parseTmdbId('27205x')).toBeNull();
    expect(parseTmdbId('-1')).toBeNull();
    expect(parseTmdbId('0')).toBeNull();
    expect(parseTmdbId('1.5')).toBeNull();
    expect(parseTmdbId(undefined)).toBeNull();
  });

  it('recusa número grande demais para ser um id íntegro', () => {
    expect(parseTmdbId('99999999999999999999')).toBeNull();
  });
});
