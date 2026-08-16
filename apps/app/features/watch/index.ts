/**
 * Só o que outras pastas consomem, como em `features/catalog`.
 *
 * Os rótulos da ação são detalhe interno desta pasta — os testes os alcançam
 * pelo módulo. A raiz das chaves sai porque as consultas de série (E5.2)
 * descendem dela: é o que faz o progresso da tela mudar sozinho quando um
 * episódio é registrado.
 */
// As mutações saem porque a lista de episódios (E5.3) registra e desfaz por
// episódio: é a mesma operação do filme, com outro alvo, e duplicá-la seria
// duplicar a invalidação de cache junto.
export {
  useCreateWatchEvent,
  useCreateWatchEvents,
  useDeleteWatchEvent,
  watchEventsKey,
} from './use-watch-events';
export { WatchActions } from './WatchActions';
// A tradução de erro do banco não é específica de registrar: a tela de início
// mostra a mesma mensagem quando o total falha. Exportada para não virar uma
// segunda cópia do mesmo `switch` em `features/home`.
export { describeWatchError, type WatchErrorPresentation } from './watch-error';
