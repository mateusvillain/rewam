import type { PosterSize } from '@rewam/tmdb';

/**
 * Regras de pôster que não dependem de React, separadas do componente para
 * poderem ser testadas — o pacote ainda não tem teste de componente (E8.1).
 */

/** Proporção de pôster do TMDB (2:3). O espaço reservado mantém a mesma, para o layout não pular. */
export const POSTER_ASPECT_RATIO = 2 / 3;

export type PosterSizeName = 'sm' | 'md' | 'lg';

/**
 * Largura de layout e o tamanho pedido ao TMDB, definidos juntos.
 *
 * O tamanho remoto é maior que a largura renderizada de propósito: tela retina
 * pede o dobro de pixels, e pedir `w500` para um item de lista gastaria banda
 * que ninguém vê. Manter os dois no mesmo lugar evita que uma tela troque a
 * largura e esqueça de trocar o tamanho da imagem.
 */
export const POSTER_SIZES: Record<PosterSizeName, { width: number; remote: PosterSize }> = {
  sm: { width: 64, remote: 'w154' },
  md: { width: 120, remote: 'w342' },
  lg: { width: 200, remote: 'w500' },
};

export function posterHeight(width: number): number {
  return Math.round(width / POSTER_ASPECT_RATIO);
}

/**
 * Iniciais para o espaço reservado de um título sem imagem.
 *
 * Duas letras no máximo: mais que isso não cabe num pôster pequeno. Devolve
 * string vazia quando não há nada aproveitável, e aí o componente cai no ícone
 * — inventar uma letra seria pior que não mostrar nenhuma.
 */
export function posterInitials(title: string | null | undefined): string {
  const words = (title ?? '').trim().split(/\s+/).filter(Boolean);

  return (
    words
      .slice(0, 2)
      // Array.from, e não [0], para não partir letra acentuada nem emoji ao meio.
      .map((word) => Array.from(word)[0] ?? '')
      .join('')
      .toLocaleUpperCase('pt-BR')
  );
}
