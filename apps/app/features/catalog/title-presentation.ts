import { formatDuration } from '@rewam/utils';

/**
 * Regras de apresentação de um título, separadas da tela para poderem ser
 * testadas — o app ainda não tem teste de componente (E8.1).
 */

/**
 * O ano, extraído da data do TMDB.
 *
 * A data chega como `YYYY-MM-DD` e às vezes não chega. Só o ano é exibido, e
 * cortar em vez de converter para `Date` evita o clássico: `new Date('2010-07-15')`
 * é UTC e, em fuso negativo como o nosso, volta como 14 de julho — o que
 * transformaria um filme de virada de ano no ano anterior.
 */
export function releaseYear(releaseDate: string | null): string | null {
  const year = releaseDate?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? year : null;
}

/**
 * Duração legível, ou a ausência dita por extenso.
 *
 * Zero nunca aparece aqui: `null` significa que o TMDB não informou, e mostrar
 * "0 min" afirmaria que o filme não dura nada.
 */
export function formatRuntime(runtimeMinutes: number | null): string {
  return runtimeMinutes === null ? 'Duração desconhecida' : formatDuration(runtimeMinutes);
}

/**
 * Linha de apoio sob o título: ano e tipo, sem separador sobrando quando falta
 * um dos dois.
 */
export function titleSubtitle(year: string | null, mediaType: 'movie' | 'tv'): string {
  return [year, mediaType === 'movie' ? 'Filme' : 'Série'].filter(Boolean).join(' · ');
}

/**
 * O id do TMDB vindo da rota.
 *
 * Parâmetro de rota é sempre texto e pode ser qualquer coisa que a pessoa
 * digite na barra de endereço. Devolver `null` deixa a tela mostrar erro em vez
 * de pedir `/movie/NaN` ao TMDB.
 */
export function parseTmdbId(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || !/^\d+$/.test(raw)) return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
