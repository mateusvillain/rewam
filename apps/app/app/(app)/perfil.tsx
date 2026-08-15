import { zodResolver } from '@hookform/resolvers/zod';
import { colors, spacing, typography } from '@rewam/tokens';
import { profileNameSchema } from '@rewam/types';
import {
  Button,
  ControlledTextField,
  FormDescription,
  FormMessage,
  FormTitle,
  LoadingScreen,
  Screen,
} from '@rewam/ui';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { translateAuthError, useSession } from '@/features/auth';
import { useDeleteAccount, useProfile, useSaveProfileName, useSignOut } from '@/features/profile';

const formSchema = z.object({ name: profileNameSchema });
type FormValues = z.infer<typeof formSchema>;

export default function PerfilScreen() {
  const { user } = useSession();
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);

  const profile = useProfile();
  const saveName = useSaveProfileName();
  const signOutMutation = useSignOut();
  const deleteAccount = useDeleteAccount();

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  // O formulário nasce vazio e recebe o valor quando a consulta responde.
  useEffect(() => {
    if (profile.data) {
      reset({ name: profile.data.name ?? '' });
    }
  }, [profile.data, reset]);

  function onSubmit({ name }: FormValues) {
    saveName.mutate(
      { name: name.length > 0 ? name : null, hasProfile: profile.data !== null },
      { onSuccess: (saved) => reset({ name: saved.name ?? '' }) },
    );
  }

  if (profile.isPending) {
    return <LoadingScreen label="Carregando seu perfil" />;
  }

  if (profile.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Perfil' }} />
        <FormTitle>Não foi possível carregar seu perfil</FormTitle>
        <FormDescription>
          Pode ter sido uma falha de conexão. Seus dados continuam salvos.
        </FormDescription>
        <Button
          label={profile.isRefetching ? 'Tentando…' : 'Tentar de novo'}
          disabled={profile.isRefetching}
          onPress={() => profile.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Perfil' }} />

      <FormTitle>Seu perfil</FormTitle>

      <View style={styles.field}>
        <Text style={styles.label}>E-mail</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
      </View>

      {profile.data === null ? (
        <FormMessage tone="neutro">
          Seu perfil ainda não tem nome. Escolha um abaixo para salvá-lo.
        </FormMessage>
      ) : null}

      <ControlledTextField
        control={control}
        name="name"
        label="Nome"
        error={formState.errors.name?.message}
        autoComplete="name"
        placeholder="Como quer ser chamado"
        onSubmitEditing={handleSubmit(onSubmit)}
      />

      {saveName.isError ? (
        <FormMessage>Não foi possível salvar seu nome. Tente de novo.</FormMessage>
      ) : null}
      {saveName.isSuccess && !formState.isDirty ? (
        <FormMessage tone="neutro">Nome salvo.</FormMessage>
      ) : null}

      <Button
        label={saveName.isPending ? 'Salvando…' : 'Salvar nome'}
        disabled={saveName.isPending || !formState.isDirty}
        onPress={handleSubmit(onSubmit)}
      />

      <View style={styles.divider} />

      {signOutMutation.isError ? (
        <FormMessage>{translateAuthError(signOutMutation.error)}</FormMessage>
      ) : null}

      <Button
        label={signOutMutation.isPending ? 'Saindo…' : 'Sair da conta'}
        variant="ghost"
        disabled={signOutMutation.isPending}
        onPress={() => signOutMutation.mutate()}
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
