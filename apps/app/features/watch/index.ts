/**
 * Só o que outras pastas consomem, como em `features/catalog`.
 *
 * Os rótulos da ação e a tradução de erro são detalhe interno desta pasta — os
 * testes os alcançam pelo módulo. As chaves de cache também: quem invalida é o
 * próprio `use-watch-events`, e a tela de início (E4.6) exporta a sua quando
 * precisar.
 */
export { WatchActions } from './WatchActions';
