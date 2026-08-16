export { describeCatalogError, type CatalogErrorPresentation } from './catalog-error';
export { CatalogErrorNotice } from './CatalogErrorNotice';
export { parseTmdbId } from './route-params';
export { formatRuntime, releaseYear, titleSubtitle } from './title-presentation';
export { titleQueryKey, useUpsertTitle } from './use-title';
export { SeasonSection } from './SeasonSection';
// Só o que a tela consome. `seasonProgress` e `indexByEpisode` são chamados
// pela própria tela para calcular uma vez e passar adiante, em vez de cada
// temporada refazer a conta a cada render — inclusive fechada.
export {
  countRegularSeasons,
  formatProgress,
  formatSeasonCount,
  indexByEpisode,
  seasonProgress,
  seriesProgress,
  type Progress,
} from './series-progress';
export { useEpisodeWatchCounts, usePersistSeasons, useSeriesDetail } from './use-series';
export { titleDetailQueryKey, usePersistOpenedTitle, useTitleDetail } from './use-title-detail';
