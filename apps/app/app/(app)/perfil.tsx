import { zodResolver } from '@hookform/resolvers/zod';
import { signOut } from '@rewam/auth';
import { deleteOwnAccount, getOwnProfile, updateOwnProfileName } from '@rewam/database';
import { colors, spacing, typography } from '@rewam/tokens';
import {
  Button,
  ControlledTextField,
  FormDescription,
  FormMessage,
  FormTitle,
  LoadingScreen,
  Screen,
} from '@rewam/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { useSession } from '@/features/auth';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  name: z.string().trim().max(100, 'Use no máximo 100 caracteres.'),
});
type FormValues = z.infer<typeof formSchema>;

export default function PerfilScreen() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getOwnProfile(supabase),
    enabled: user !== null,
  });

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  // O formulário nasce vazio e só recebe o valor quando a consulta responde.
  useEffect(() => {
    if (profileQuery.data) {
      reset({ name: profileQuery.data.name ?? '' });
    }
  }, [profileQuery.data, reset]);

  const saveName = useMutation({
    mutationFn: ({ name }: FormValues) =>
      updateOwnProfileName(supabase, name.length > 0 ? name : null),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', user?.id], profile);
      reset({ name: profile.name ?? '' });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => deleteOwnAccount(supabase),
    onSuccess: async () => {
      // A conta já não existe; encerrar a sessão evita o app seguir com um
      // token que aponta para um usuário apagado. O guard leva ao login.
      await signOut(supabase);
      queryClient.clear();
    },
  });

  if (profileQuery.isPending) {
    return <LoadingScreen label="Carregando seu perfil" />;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Perfil' }} />

      <FormTitle>Seu perfil</FormTitle>

      <View style={styles.field}>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
      </View>

      <ControlledTextField
        control={control}
        name="name"
        label="Nome"
        error={formState.errors.name?.message}
        autoComplete="name"
        placeholder="Como quer ser chamado"
        onSubmitEditing={handleSubmit((values) => saveName.mutate(values))}
      />

      {profileQuery.isError ? (
        <FormMessage>Não foi possível carregar seu perfil. Puxe para tentar de novo.</FormMessage>
      ) : null}
      {saveName.isError ? <FormMessage>Não foi possível salvar seu nome.</FormMessage> : null}
      {saveName.isSuccess && !formState.isDirty ? (
        <FormMessage tone="neutro">Nome salvo.</FormMessage>
      ) : null}

      <Button
        label={saveName.isPending ? 'Salvando…' : 'Salvar nome'}
        disabled={saveName.isPending || !formState.isDirty}
        onPress={handleSubmit((values) => saveName.mutate(values))}
      />

      <View style={styles.divider} />

      <Button
        label={signOutMutationLabel(deleteAccount.isPending)}
        variant="ghost"
        disabled={deleteAccount.isPending}
        onPress={() => signOut(supabase)}
      />

      {isConfirmingDeletion ? (
        <View style={styles.danger}>
          <FormTitle>Excluir sua conta</FormTitle>
          <FormDescription>
            Isso apaga sua conta, seu perfil e todas as exibições registradas. A ação não pode ser
            desfeita.
          </FormDescription>

          {deleteAccount.isError ? (
            <FormMessage>Não foi possível excluir sua conta agora. Tente de novo.</FormMessage>
          ) : null}

          <Button
            label={deleteAccount.isPending ? 'Excluindo…' : 'Sim, excluir minha conta'}
            disabled={deleteAccount.isPending}
            onPress={() => deleteAccount.mutate()}
          />
          <Button
            label="Cancelar"
            variant="ghost"
            disabled={deleteAccount.isPending}
            onPress={() => setIsConfirmingDeletion(false)}
          />
        </View>
      ) : (
        <Button
          label="Excluir minha conta"
          variant="ghost"
          onPress={() => setIsConfirmingDeletion(true)}
        />
      )}
    </Screen>
  );
}

function signOutMutationLabel(isDeleting: boolean): string {
  return isDeleting ? 'Aguarde…' : 'Sair da conta';
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.md,
  },
  danger: {
    borderColor: colors.danger,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
