import { catalogEpisodeSchema, catalogTitleDetailSchema } from '@rewam/types';
import { describe, expect, it } from 'vitest';

import {
  normalizeEpisode,
  normalizeMovieDetail,
  normalizeSearchResult,
  normalizeSearchResults,
  normalizeTvDetail,
} from './normalize';
import {
  tmdbEpisodeSchema,
  tmdbMovieDetailSchema,
  tmdbSearchResultSchema,
  tmdbTvDetailSchema,
} from './payloads';

describe('normalizeMovieDetail', () => {
  const base = {
    id: 27205,
    title: 'A Origem',
    original_title: 'Inception',
    poster_path: '/inception.jpg',
    release_date: '2010-07-15',
    overview: 'Um ladrão que invade sonhos.',
    runtime: 148,
  };

  it('normaliza um filme com duração', () => {
    expect(normalizeMovieDetail(base)).toEqual({
      tmdbId: 27205,
      mediaType: 'movie',
      title: 'A Origem',
      originalTitle: 'Inception',
      posterPath: '/inception.jpg',
      releaseDate: '2010-07-15',
      runtimeMinutes: 148,
      overview: 'Um ladrão que invade sonhos.',
    });
  });

  it('trata duração ausente como null, sem inventar valor', () => {
    expect(normalizeMovieDetail({ ...base, runtime: null }).runtimeMinutes).toBeNull();
    expect(normalizeMovieDetail({ ...base, runtime: undefined }).runtimeMinutes).toBeNull();
  });

  it('trata o zero do TMDB como duração desconhecida', () => {
    expect(normalizeMovieDetail({ ...base, runtime: 0 }).runtimeMinutes).toBeNull();
  });

  it('converte texto vazio do TMDB em null', () => {
    const semDados = normalizeMovieDetail({
      ...base,
      original_title: '',
      poster_path: null,
      release_date: '   ',
      overview: '',
    });

    expect(semDados.originalTitle).toBeNull();
    expect(semDados.posterPath).toBeNull();
    expect(semDados.releaseDate).toBeNull();
    expect(semDados.overview).toBeNull();
  });
});

describe('normalizeTvDetail', () => {
  const base = {
    id: 1396,
    name: 'Breaking Bad',
    original_name: 'Breaking Bad',
    poster_path: '/bb.jpg',
    first_air_date: '2008-01-20',
    overview: 'Um professor de química vira fabricante de metanfetamina.',
    episode_run_time: [45, 47],
  };

  it('usa a primeira duração típica de episódio', () => {
    expect(normalizeTvDetail(base)).toEqual({
      tmdbId: 1396,
      mediaType: 'tv',
      title: 'Breaking Bad',
      originalTitle: 'Breaking Bad',
      posterPath: '/bb.jpg',
      releaseDate: '2008-01-20',
      runtimeMinutes: 45,
      overview: 'Um professor de química vira fabricante de metanfetamina.',
    });
  });

  it('trata lista vazia ou ausente como duração desconhecida', () => {
    expect(normalizeTvDetail({ ...base, episode_run_time: [] }).runtimeMinutes).toBeNull();
    expect(normalizeTvDetail({ ...base, episode_run_time: null }).runtimeMinutes).toBeNull();
  });

  it('ignora zeros antes de achar uma duração válida', () => {
    expect(normalizeTvDetail({ ...base, episode_run_time: [0, 22] }).runtimeMinutes).toBe(22);
  });
});

describe('normalizeEpisode', () => {
  const base = {
    id: 62085,
    season_number: 1,
    episode_number: 1,
    name: 'Piloto',
    runtime: 58,
    air_date: '2008-01-20',
  };

  it('normaliza um episódio', () => {
    expect(normalizeEpisode(base)).toEqual({
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      name: 'Piloto',
      runtimeMinutes: 58,
      airDate: '2008-01-20',
    });
  });

  it('aceita temporada zero, usada para especiais', () => {
    expect(normalizeEpisode({ ...base, season_number: 0 }).seasonNumber).toBe(0);
  });

  it('trata duração e data ausentes como null', () => {
    const semDados = normalizeEpisode({ ...base, runtime: null, air_date: '', name: null });

    expect(semDados.runtimeMinutes).toBeNull();
    expect(semDados.airDate).toBeNull();
    expect(semDados.name).toBeNull();
  });
});

describe('normalizeSearchResult', () => {
  it('lê os campos de filme quando o media_type é movie', () => {
    const result = normalizeSearchResult({
      id: 27205,
      media_type: 'movie',
      title: 'A Origem',
      original_title: 'Inception',
      poster_path: '/inception.jpg',
      release_date: '2010-07-15',
    });

    expect(result).toEqual({
      tmdbId: 27205,
      mediaType: 'movie',
      title: 'A Origem',
      originalTitle: 'Inception',
      posterPath: '/inception.jpg',
      releaseDate: '2010-07-15',
    });
  });

  it('lê name e first_air_date quando o media_type é tv', () => {
    const result = normalizeSearchResult({
      id: 1396,
      media_type: 'tv',
      name: 'Breaking Bad',
      original_name: 'Breaking Bad',
      first_air_date: '2008-01-20',
    });

    expect(result).toMatchObject({
      mediaType: 'tv',
      title: 'Breaking Bad',
      releaseDate: '2008-01-20',
    });
  });

  it('usa o tipo de apoio quando o TMDB não manda media_type', () => {
    const result = normalizeSearchResult({ id: 27205, title: 'A Origem' }, 'movie');

    expect(result).toMatchObject({ mediaType: 'movie', title: 'A Origem' });
  });

  it('descarta o que não é filme nem série', () => {
    expect(
      normalizeSearchResult({ id: 1, media_type: 'person', name: 'Christopher Nolan' }),
    ).toBeNull();
  });

  it('descarta tipo desconhecido em vez de confiar no tipo de apoio', () => {
    expect(
      normalizeSearchResult({ id: 1, media_type: 'collection', title: 'Trilogia' }),
    ).toBeNull();
  });

  it('descarta resultado sem tipo algum', () => {
    expect(normalizeSearchResult({ id: 1, title: 'A Origem' })).toBeNull();
  });

  it('descarta resultado sem título', () => {
    expect(normalizeSearchResult({ id: 1, media_type: 'movie', title: '   ' })).toBeNull();
  });
});

describe('normalizeSearchResults', () => {
  it('mantém filmes e séries e remove o resto', () => {
    const results = normalizeSearchResults([
      { id: 27205, media_type: 'movie', title: 'A Origem' },
      { id: 2, media_type: 'person', name: 'Christopher Nolan' },
      { id: 1396, media_type: 'tv', name: 'Breaking Bad' },
      { id: 3, media_type: 'movie', title: '' },
    ]);

    expect(results.map((result) => result.tmdbId)).toEqual([27205, 1396]);
  });

  it('aplica o tipo de apoio a uma página inteira de /search/movie', () => {
    const results = normalizeSearchResults(
      [
        { id: 27205, title: 'A Origem' },
        { id: 155, title: 'Batman: O Cavaleiro das Trevas' },
      ],
      'movie',
    );

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.mediaType === 'movie')).toBe(true);
  });
});

describe('saída conforme os contratos de @rewam/types', () => {
  // Sem isto o tipo de retorno é só asserção do TypeScript: nada garante que o
  // valor produzido sobreviveria ao schema que o resto do produto exige.

  it('produz detalhe de filme válido, inclusive sem duração', () => {
    const comDuracao = normalizeMovieDetail({ id: 27205, title: 'A Origem', runtime: 148 });
    const semDuracao = normalizeMovieDetail({ id: 27205, title: 'A Origem', runtime: 0 });

    expect(() => catalogTitleDetailSchema.parse(comDuracao)).not.toThrow();
    expect(() => catalogTitleDetailSchema.parse(semDuracao)).not.toThrow();
  });

  it('produz detalhe de série válido', () => {
    const serie = normalizeTvDetail({ id: 1396, name: 'Breaking Bad', episode_run_time: [45] });

    expect(() => catalogTitleDetailSchema.parse(serie)).not.toThrow();
  });

  it('produz episódio válido', () => {
    const episodio = normalizeEpisode({
      id: 62085,
      season_number: 1,
      episode_number: 1,
      runtime: 58,
    });

    expect(() => catalogEpisodeSchema.parse(episodio)).not.toThrow();
  });

  it('nunca devolve duração fracionária arredondada para zero', () => {
    // `0.4` é positivo, mas arredonda para zero — que o titleSchema rejeita.
    const quaseZero = normalizeMovieDetail({ id: 27205, title: 'A Origem', runtime: 0.4 });

    expect(quaseZero.runtimeMinutes).toBeNull();
    expect(() => catalogTitleDetailSchema.parse(quaseZero)).not.toThrow();
  });

  it('arredonda duração fracionária que ainda é uma duração', () => {
    expect(
      normalizeMovieDetail({ id: 27205, title: 'A Origem', runtime: 148.6 }).runtimeMinutes,
    ).toBe(149);
  });
});

describe('schemas de payload', () => {
  it('ignora campos que o TMDB acrescenta', () => {
    const parsed = tmdbSearchResultSchema.parse({
      id: 27205,
      media_type: 'movie',
      title: 'A Origem',
      popularity: 98.4,
      campo_novo_do_tmdb: true,
    });

    expect(parsed).not.toHaveProperty('campo_novo_do_tmdb');
    expect(parsed.id).toBe(27205);
  });

  it('recusa detalhe de filme sem título, que não daria para exibir nem gravar', () => {
    expect(() => tmdbMovieDetailSchema.parse({ id: 27205, runtime: 148 })).toThrow();
  });

  it('recusa detalhe cujo título é só espaço', () => {
    expect(() => tmdbMovieDetailSchema.parse({ id: 27205, title: '   ' })).toThrow();
    expect(() => tmdbTvDetailSchema.parse({ id: 1396, name: '  ' })).toThrow();
  });

  it('apara o título do detalhe', () => {
    expect(tmdbMovieDetailSchema.parse({ id: 27205, title: '  A Origem  ' }).title).toBe(
      'A Origem',
    );
  });

  it('aceita detalhe de série sem duração típica de episódio', () => {
    expect(
      tmdbTvDetailSchema.parse({ id: 1396, name: 'Breaking Bad' }).episode_run_time,
    ).toBeUndefined();
  });

  it('recusa episódio sem numeração, que não daria para ordenar nem gravar', () => {
    expect(() => tmdbEpisodeSchema.parse({ id: 62085, season_number: 1 })).toThrow();
  });
});
