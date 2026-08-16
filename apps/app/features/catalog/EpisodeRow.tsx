import { colors, spacing, typography } from '@rewam/tokens';
import type { EpisodeWatchCount } from '@rewam/types';
import { Button } from '@rewam/ui';
import { StyleSheet, Text, View } from 'react-native';

import { describeEpisodeCount } from './series-progress';
import { formatRuntime } from './title-presentation';

/**
 * Uma linha de episódio: o que é, quantas vezes foi assistido, e o que dá para
 * fazer com ele.
 *
 * Mora em arquivo próprio porque `SeasonSection` já carrega busca, mutações,
 * seleção e estados de erro — a linha é a única parte que só desenha.
 */
export type EpisodeRowProps = {
  number: number;
  name: string | null;
  runtimeMinutes: number | null;
  watched: EpisodeWatchCount | null;
  isBusy: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  /** Verdadeiro enquanto o lote grava: mexer na seleção agora seria descartado. */
  isLocked: boolean;
  onToggleSelection: () => void;
  onMark: () => void;
  onUndo: (eventId: string) => void;
};

export function EpisodeRow({
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
  isLocked,
}: EpisodeRowProps) {
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
            disabled={isLocked}
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
