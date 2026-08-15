/**
 * Leitura de parâmetros de rota do catálogo.
 *
 * Fica separado da apresentação porque é a fronteira de entrada: o que chega
 * aqui é texto que qualquer pessoa pode digitar na barra de endereço.
 */

/**
 * O id do TMDB vindo da rota.
 *
 * Devolver `null` deixa a tela mostrar erro em vez de pedir `/movie/NaN` ao
 * TMDB.
 */
export function parseTmdbId(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || !/^\d+$/.test(raw)) return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
