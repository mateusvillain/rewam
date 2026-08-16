import { colors, radii, spacing, typography } from '@rewam/tokens';
import type { CatalogSeason, EpisodeWatchCount } from '@rewam/types';

import type { SelectionSummary } from './batch-selection';
import { Button, FormDescription, FormMessage } from '@rewam/ui';

import { useCreateWatchEvent, useCreateWatchEvents, useDeleteWatchEvent } from '@/features/watch';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { describeCatalogError } from './catalog-error';
import { formatRuntime } from './title-presentation';
import { useSeasonEpisodes } from './use-series';
import {
  describeSelection,
  summarizeSelection,
  toggleSelection,
  toggleWholeSeason,
} from './batch-selection';
import { describeEpisodeCount, formatProgress, type Progress } from './series-progress';

export type SeasonSectionProps = {
  season: CatalogSeason;
  titleId: string | null;
  tmdbId: number | null;
  /** Progresso desta temporada, calculado uma vez pela tela. */
  progress: Progress;
  /** Contagem por `episodes.id`, montada uma vez pela tela. */
  watchedByEpisode: ReadonlyMap<string, EpisodeWatchCount>;
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * Uma temporada na lista, que carrega os episódios ao ser aberta.
 *
 * O progresso aparece com a temporada ainda fechada: `episode_watch_counts`
 * devolve o número da temporada junto da contagem, justamente para a tela não
 * precisar carregar os episódios só para dizer quantos foram assistidos.
 */
export function SeasonSection({
  season,
  titleId,
  tmdbId,
  progress,
  watchedByEpisode,
  isOpen,
  onToggle,
}: SeasonSectionProps) {
  const episodes = useSeasonEpisodes(titleId, tmdbId, season.seasonNumber, isOpen);

  const label = season.name ?? `Temporada ${season.seasonNumber}`;

  // Uma mutação por temporada, e não por linha: 24 episódios seriam 48
  // observadores de mutação montados só para ficarem ociosos.
  const create = useCreateWatchEvent();
  const remove = useDeleteWatchEvent();

  // Quais episódios estão em voo, por id.
  //
  // Só a linha tocada trava, e não a temporada inteira: episódios têm contagens
  // independentes — `episode_watch_counts` agrupa por `episode_id` —, então
  // marcar o 3 enquanto o 1 grava não disputa nada. Travar as 24 linhas a cada
  // toque faria uma temporada longa parecer quebrada.
  //
  // O conjunto vem daqui, e não das variáveis da mutação, porque elas guardam
  // uma chamada só: com duas em voo, a segunda apagaria o rastro da primeira.
  const [pendingEpisodes, setPendingEpisodes] = useState<ReadonlySet<string>>(new Set());

  // Seleção múltipla, para marcar uma temporada sem tocar episódio a episódio.
  // Vive por temporada: selecionar em duas ao mesmo tempo pediria um resumo que
  // some coisas que a pessoa não vê juntas na tela.
  //
  // O modo é estado próprio, e não derivado de `selected.size > 0`: derivado,
  // não haveria como começar a selecionar — o controle de cada linha só
  // apareceria depois de já haver alguém selecionado, e a única entrada seria
  // "temporada inteira". Escolher três episódios de vinte e quatro ficaria
  // impossível.
  const [isSelecting, setIsSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const batch = useCreateWatchEvents();

  function leaveSelection() {
    setIsSelecting(false);
    setSelected(new Set());
  }

  function markPending(episodeId: string, isPending: boolean) {
    setPendingEpisodes((current) => {
      const next = new Set(current);
      if (isPending) next.add(episodeId);
      else next.delete(episodeId);
      return next;
    });
  }

  // Sem isto o toque simplesmente não acontece: o botão destrava, a contagem
  // não muda e nada explica por quê. É o que `WatchActions` já faz no filme.
  const failure = create.isError
    ? describeCatalogError(create.error, 'tv')
    : remove.isError
      ? describeCatalogError(remove.error, 'tv')
      : batch.isError
        ? describeCatalogError(batch.error, 'tv')
        : null;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        // `expanded` é o que faz o leitor de tela anunciar que isto abre e
        // fecha; sem ele, é um botão que muda a tela sem avisar como.
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${label}. ${formatProgress(progress)}.`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.headerText}>
          <Text style={styles.seasonName}>{label}</Text>
          <Text style={styles.progress}>{formatProgress(progress)}</Text>
        </View>
        <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.body}>
          {/* A condição fica inline, e não numa variável derivada: é ela que
              faz o TypeScript estreitar `titleId` no ramo de baixo, onde a
              gravação precisa dele. Um booleano nomeado obrigaria a asseverar
              com `!` o que a própria condição já garante.

              Uma consulta desligada também é `pending` no TanStack v5. Sem
              distinguir, uma temporada aberta antes de o título estar gravado
              giraria o indicador para sempre. */}
          {titleId === null || tmdbId === null ? (
            <FormDescription>
              Aguardando a série ser guardada para carregar os episódios.
            </FormDescription>
          ) : episodes.isPending ? (
            <ActivityIndicator accessibilityLabel={`Carregando ${label}`} />
          ) : episodes.isError ? (
            <SeasonError
              error={episodes.error}
              isRetrying={episodes.isFetching}
              onRetry={() => void episodes.refetch()}
            />
          ) : episodes.data.length === 0 ? (
            <FormDescription>Esta temporada ainda não tem episódios no catálogo.</FormDescription>
          ) : (
            episodes.data.map((episode) => (
              <EpisodeRow
                key={episode.id}
                number={episode.episodeNumber}
                name={episode.name}
                runtimeMinutes={episode.runtimeMinutes}
                watched={watchedByEpisode.get(episode.id) ?? null}
                isBusy={pendingEpisodes.has(episode.id)}
                isSelecting={isSelecting}
                isSelected={selected.has(episode.id)}
                onToggleSelection={() =>
                  setSelected((current) => toggleSelection(current, episode.id))
                }
                onMark={() => {
                  markPending(episode.id, true);
                  create.mutate(
                    {
                      titleId,
                      episodeId: episode.id,
                      watchedAt: new Date().toISOString(),
                      durationMinutes: episode.runtimeMinutes,
                      notes: null,
                    },
                    { onSettled: () => markPending(episode.id, false) },
                  );
                }}
                onUndo={(eventId) => {
                  markPending(episode.id, true);
                  remove.mutate(eventId, {
                    onSettled: () => markPending(episode.id, false),
                  });
                }}
              />
            ))
          )}

          {failure ? <FormMessage>{failure.detail}</FormMessage> : null}

          {episodes.data && episodes.data.length > 0 && titleId !== null ? (
            <BatchBar
              isSelecting={isSelecting}
              summary={summarizeSelection(episodes.data, selected)}
              isSaving={batch.isPending}
              allSelected={
                episodes.data.length > 0 && episodes.data.every((e) => selected.has(e.id))
              }
              onStart={() => setIsSelecting(true)}
              onToggleAll={() =>
                setSelected((current) => toggleWholeSeason(current, episodes.data))
              }
              onConfirm={() => {
                const now = new Date().toISOString();
                batch.mutate(
                  episodes.data
                    .filter((episode) => selected.has(episode.id))
                    .map((episode) => ({
                      titleId,
                      episodeId: episode.id,
                      // Todos com a mesma data: foi uma sessão só, e datas
                      // diferentes por milissegundo não significam nada.
                      watchedAt: now,
                      durationMinutes: episode.runtimeMinutes,
                      notes: null,
                    })),
                  { onSuccess: leaveSelection },
                );
              }}
              onCancel={leaveSelection}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A falha ao carregar uma temporada.
 *
 * `describeCatalogError`, e não o tradutor de exibições: esta consulta busca no
 * TMDB **e** grava no banco, então tanto `TmdbError` quanto `DatabaseError`
 * passam por aqui — e é ele que sabe dos dois.
 */
function SeasonError({
  error,
  isRetrying,
  onRetry,
}: {
  error: unknown;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const failure = describeCatalogError(error, 'tv');

  return (
    <View style={styles.error}>
      <FormMessage>{failure.detail}</FormMessage>
      {failure.canRetry ? (
        <Button
          label={isRetrying ? 'Tentando…' : 'Tentar de novo'}
          variant="ghost"
          disabled={isRetrying}
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

/**
 * A barra de seleção em lote.
 *
 * O resumo aparece antes de confirmar porque é o que o briefing pede: a pessoa
 * precisa saber quantos minutos está prestes a somar ao total. Sem ele,
 * "marcar temporada" é um botão que muda um número invisível.
 */
function BatchBar({
  isSelecting,
  summary,
  isSaving,
  allSelected,
  onStart,
  onToggleAll,
  onConfirm,
  onCancel,
}: {
  isSelecting: boolean;
  summary: SelectionSummary;
  isSaving: boolean;
  allSelected: boolean;
  onStart: () => void;
  onToggleAll: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isSelecting) {
    return (
      <View style={styles.batch}>
        <Button label="Selecionar vários" variant="ghost" onPress={onStart} />
      </View>
    );
  }

  return (
    <View style={styles.batch}>
      <Button
        label={allSelected ? 'Desmarcar temporada' : 'Selecionar temporada'}
        variant="ghost"
        disabled={isSaving}
        onPress={onToggleAll}
      />

      {summary.count > 0 ? (
        <>
          {/* Agrupado com o texto do resumo para o leitor de tela anunciar o
              que será gravado, e não só o rótulo do botão. */}
          <View accessible accessibilityLabel={`Selecionado: ${describeSelection(summary)}`}>
            <FormDescription>{describeSelection(summary)}</FormDescription>
          </View>

          <View style={styles.batchActions}>
            <Button label="Cancelar" variant="ghost" disabled={isSaving} onPress={onCancel} />
            <Button
              label={isSaving ? 'Registrando…' : 'Registrar selecionados'}
              disabled={isSaving}
              onPress={onConfirm}
            />
          </View>
        </>
      ) : (
        <Button label="Cancelar" variant="ghost" disabled={isSaving} onPress={onCancel} />
      )}
    </View>
  );
}

function EpisodeRow({
  number,
  name,
  runtimeMinutes,
  watched,
  isBusy,
  isSelecting,
  isSelected,
  onToggleSelection,
  onMark,
  onUndo,
}: {
  number: number;
  name: string | null;
  runtimeMinutes: number | null;
  watched: EpisodeWatchCount | null;
  isBusy: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onMark: () => void;
  onUndo: (eventId: string) => void;
}) {
  const duration = formatRuntime(runtimeMinutes);
  const count = watched?.watchCount ?? 0;
  const label = name ?? `Episódio ${number}`;

  return (
    // Agrupado num anúncio só: lidos soltos, número, nome e duração viram três
    // itens sem relação para quem usa leitor de tela. Os botões ficam fora do
    // grupo para continuarem alcançáveis como controles.
    <View style={styles.episode}>
      <View
        accessible
        accessibilityLabel={`Episódio ${number}. ${label}. ${duration}. ${describeEpisodeCount(count)}`}
        style={styles.episodeInfo}
      >
        <Text style={styles.episodeNumber}>{number}</Text>

        <View style={styles.episodeText}>
          <Text style={styles.episodeName} numberOfLines={2}>
            {label}
          </Text>
          {/* A contagem é texto, e não só cor: cor sozinha não chega a quem não
              a distingue, e é a informação da linha que muda. Assistido não fica
              mais apagado que não assistido — apagar é o que a interface faz com
              o que está desabilitado, e é o oposto do que aconteceu aqui. */}
          <Text style={styles.episodeMeta}>{duration}</Text>
          {count > 0 ? (
            <Text style={styles.watchedCount}>{describeEpisodeCount(count)}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.episodeActions}>
        {/* Em modo de seleção os controles de um episódio só somem: com os dois
            à mão, um toque em "Marcar" gravaria um enquanto a seleção espera
            para gravar vários, e a contagem mudaria por baixo do resumo. */}
        {isSelecting ? (
          <Button
            label={isSelected ? 'Selecionado' : 'Selecionar'}
            variant={isSelected ? 'primary' : 'ghost'}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`Episódio ${number}`}
            onPress={onToggleSelection}
          />
        ) : (
          <>
            {watched ? (
              <Button
                label="Desfazer"
                variant="ghost"
                // O rótulo visível diz o gesto; o acessível diz sobre o quê, porque
                // fora da linha "Desfazer" sozinho não tem alvo.
                accessibilityLabel={`Remover o último registro do episódio ${number}`}
                disabled={isBusy}
                onPress={() => onUndo(watched.latestEventId)}
              />
            ) : null}

            <Button
              label={isBusy ? 'Salvando…' : 'Marcar'}
              variant={count > 0 ? 'ghost' : 'primary'}
              // O estado entra no rótulo acessível: mudar só o texto visível deixa
              // o leitor de tela anunciando o mesmo nome antes, durante e depois.
              accessibilityLabel={
                isBusy
                  ? `Salvando o episódio ${number}`
                  : count > 0
                    ? `Marcar episódio ${number} como reassistido`
                    : `Marcar episódio ${number} como assistido`
              }
              disabled={isBusy}
              onPress={onMark}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  seasonName: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  progress: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: typography.title.fontSize,
  },
  body: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  error: {
    gap: spacing.sm,
  },
  episode: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  episodeInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  episodeActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  batch: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  batchActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  episodeNumber: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    minWidth: 24,
    textAlign: 'right',
  },
  episodeText: {
    flex: 1,
    gap: spacing.xs,
  },
  episodeName: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  episodeMeta: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  watchedCount: {
    color: colors.success,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
