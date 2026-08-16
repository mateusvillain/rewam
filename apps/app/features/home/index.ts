/**
 * Só o que a tela consome; as regras de apresentação ficam no módulo.
 *
 * `watchStatsKey` não sai daqui: a invalidação é por prefixo da raiz
 * `['watch-events']`, feita em `features/watch`, e ninguém precisa nomear esta
 * chave de fora.
 */
export { useWatchStats } from './use-watch-stats';
export { describeIncompleteTotal, hasNothingYet } from './watch-total';
