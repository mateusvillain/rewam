import { DatabaseError } from '@rewam/database';
import { TmdbError } from '@rewam/tmdb';
import { describe, expect, it } from 'vitest';

import { describeCatalogError } from './catalog-error';

describe('describeCatalogError', () => {
  it('trata falha de rede como repetível', () => {
    const presentation = describeCatalogError(new TmdbError('sem resposta', 0));

    expect(presentation.canRetry).toBe(true);
    expect(presentation.title).toMatch(/conexão/i);
  });

  it('não oferece repetir para filme inexistente', () => {
    // Insistir num 404 traz outro 404: o botão seria uma promessa falsa.
    expect(describeCatalogError(new TmdbError('não achou', 404))).toMatchObject({
      title: 'Filme não encontrado',
      canRetry: false,
    });
  });

  it('não oferece repetir para credencial recusada', () => {
    expect(describeCatalogError(new TmdbError('sem permissão', 401)).canRetry).toBe(false);
    expect(describeCatalogError(new TmdbError('proibido', 403)).canRetry).toBe(false);
  });

  it('oferece repetir quando o TMDB pede pausa ou está fora', () => {
    expect(describeCatalogError(new TmdbError('devagar', 429)).canRetry).toBe(true);
    expect(describeCatalogError(new TmdbError('caiu', 503)).canRetry).toBe(true);
  });

  it('não oferece repetir para erro de cliente que não seja pausa', () => {
    expect(describeCatalogError(new TmdbError('parâmetro inválido', 422)).canRetry).toBe(false);
  });

  it('trata formato inesperado como não repetível', () => {
    // ZodError: o contrato do TMDB mudou. Repetir traria a mesma resposta.
    const presentation = describeCatalogError(new Error('invalid_type em results'));

    expect(presentation.canRetry).toBe(false);
    expect(presentation.title).toMatch(/inesperada/i);
  });
});

describe('describeCatalogError por tipo de mídia', () => {
  it('fala de série quando a tela é de série', () => {
    // Dizer "filme não encontrado" numa tela de série manda a pessoa procurar
    // o problema no lugar errado.
    const presentation = describeCatalogError(new TmdbError('não encontrado', 404), 'tv');

    expect(presentation.title).toBe('Série não encontrada');
    expect(presentation.detail).toContain('nenhuma série');
  });

  it('continua falando de filme por padrão', () => {
    expect(describeCatalogError(new TmdbError('não encontrado', 404)).title).toBe(
      'Filme não encontrado',
    );
  });

  it('reconhece falha de gravação, não só do TMDB', () => {
    // Carregar uma temporada busca no TMDB e grava no banco: sem este ramo,
    // uma falha de gravação apareceria como "resposta inesperada do TMDB".
    const presentation = describeCatalogError(
      new DatabaseError('sem-permissao', 'Você não tem permissão para esta operação.'),
    );

    expect(presentation.detail).toBe('Você não tem permissão para esta operação.');
    expect(presentation.canRetry).toBe(false);
  });
});
