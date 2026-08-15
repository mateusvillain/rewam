import { colors } from '@rewam/tokens';

/**
 * Aparência de navegação compartilhada pelos grupos de rota.
 *
 * Vive fora dos layouts porque cada grupo declara o próprio `Stack`: sem um
 * lugar comum, o tema do cabeçalho ficava copiado em cada arquivo e nada
 * impediria os dois divergirem.
 */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  contentStyle: { backgroundColor: colors.background },
} as const;
