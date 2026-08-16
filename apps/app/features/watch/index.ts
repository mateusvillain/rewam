/**
 * Só o que outras pastas consomem, como em `features/catalog`.
 *
 * As regras de rótulo e a escolha do registro a remover são detalhe interno
 * desta pasta — os testes as alcançam pelo módulo.
 */
export { useWatchEventsByTitle, watchEventsByTitleKey, watchEventsKey } from './use-watch-events';
export { WatchActions } from './WatchActions';
// A tradução de erro do banco não é específica de registrar: a tela de início
// mostra a mesma mensagem quando o total falha. Exportada para não virar uma
// segunda cópia do mesmo `switch` em `features/home`.
export { describeWatchError, type WatchErrorPresentation } from './watch-error';
