import { describe, expect, it } from 'vitest';

import { POSTER_ASPECT_RATIO, POSTER_SIZES, posterHeight, posterInitials } from './poster-rules';

describe('posterInitials', () => {
  it('usa a primeira letra das duas primeiras palavras', () => {
    expect(posterInitials('Breaking Bad')).toBe('BB');
    expect(posterInitials('O Senhor dos Anéis')).toBe('OS');
  });

  it('usa uma letra só quando o título tem uma palavra', () => {
    expect(posterInitials('Inception')).toBe('I');
  });

  it('não parte letra acentuada nem emoji ao meio', () => {
    expect(posterInitials('Ódio Ancestral')).toBe('ÓA');
    expect(posterInitials('🎬 Cinema')).toBe('🎬C');
  });

  it('ignora espaço sobrando', () => {
    expect(posterInitials('   Breaking   Bad  ')).toBe('BB');
  });

  it('devolve vazio quando não há título, para o componente cair no ícone', () => {
    expect(posterInitials(null)).toBe('');
    expect(posterInitials(undefined)).toBe('');
    expect(posterInitials('   ')).toBe('');
  });
});

describe('posterHeight', () => {
  it('mantém a proporção 2:3 do pôster', () => {
    expect(posterHeight(120)).toBe(180);
    expect(posterHeight(200)).toBe(300);
  });

  it('arredonda para pixel inteiro', () => {
    expect(Number.isInteger(posterHeight(65))).toBe(true);
  });
});

describe('POSTER_SIZES', () => {
  it('pede ao TMDB uma imagem maior que a largura renderizada, para tela retina', () => {
    // A largura sai do próprio nome do tamanho (`w342` → 342), em vez de uma
    // tabela redigitada aqui: duplicar os números deixaria o teste passar
    // afirmando algo que o @rewam/tmdb já não diz.
    const remoteWidth = (remote: string) =>
      remote === 'original' ? Number.POSITIVE_INFINITY : Number(remote.replace('w', ''));

    for (const { width, remote } of Object.values(POSTER_SIZES)) {
      expect(remoteWidth(remote)).toBeGreaterThanOrEqual(width * 2);
    }
  });

  it('mantém a proporção esperada', () => {
    expect(POSTER_ASPECT_RATIO).toBeCloseTo(2 / 3);
  });
});
