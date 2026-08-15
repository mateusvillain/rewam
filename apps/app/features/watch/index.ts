/**
 * Só o que outras pastas consomem, como em `features/catalog`.
 *
 * As regras de data e o schema do formulário são detalhe interno desta pasta —
 * os testes as alcançam pelo módulo. As chaves de cache das listas nascem nas
 * issues que de fato as consultam (E4.4, E4.5, E4.6); o que precisa existir
 * desde já é a raiz que a invalidação do registro usa.
 */
export { useCreateWatchEvent, watchEventsKey } from './use-watch-events';
export { WatchEventForm } from './WatchEventForm';
