const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w154' | 'w342' | 'w500' | 'original';
export type BackdropSize = 'w780' | 'w1280' | 'original';

export function posterUrl(path: string | null, size: PosterSize = 'w342'): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: BackdropSize = 'w780'): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

/** Atribuição exigida pelos termos de uso do TMDB. */
export const TMDB_ATTRIBUTION =
  'Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.';
