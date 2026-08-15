import { colors, typography } from '@rewam/tokens';
import { formLinkStyle, FormLinks, Screen } from '@rewam/ui';
import { formatDuration } from '@rewam/utils';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

export default function HomeScreen() {
  // Placeholder até `watch_events` existir: a soma real vem do Supabase.
  const totalMinutes = 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Rewam' }} />

      <Text style={styles.title}>Rewam</Text>
      <Text style={styles.body}>Tempo assistido: {formatDuration(totalMinutes)}</Text>
      <Text style={styles.caption}>Histórico e estatísticas chegam nos próximos incrementos.</Text>

      <FormLinks>
        <Link href="/busca" style={formLinkStyle}>
          Buscar filmes e séries
        </Link>
        <Link href="/perfil" style={formLinkStyle}>
          Seu perfil
        </Link>
      </FormLinks>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.display.fontSize,
    fontWeight: '700',
  },
  body: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
