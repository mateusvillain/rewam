/**
 * Só o que outras pastas consomem, como em `features/catalog`.
 *
 * As regras de rótulo e a escolha do registro a remover são detalhe interno
 * desta pasta — os testes as alcançam pelo módulo.
 */
export { useWatchEventsByTitle, watchEventsByTitleKey, watchEventsKey } from './use-watch-events';
export { WatchActions } from './WatchActions';
