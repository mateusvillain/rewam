import { signOut } from '@rewam/auth';
import {
  createOwnProfile,
  deleteOwnAccount,
  getOwnProfile,
  updateOwnProfileName,
  type Profile,
} from '@rewam/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { supabase } from '@/lib/supabase';

export function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const;
}

export function useProfile() {
  const { user } = useSession();

  return useQuery({
    queryKey: profileQueryKey(user?.id),
    queryFn: () => getOwnProfile(supabase),
    enabled: user !== null,
  });
}

/**
 * Salvar o nome cobre também o caso de perfil inexistente: o trigger de cadastro
 * cria a linha, mas uma conta anterior a ele — ou um perfil apagado — deixaria a
 * pessoa sem nada para atualizar, e um update sem linha só devolveria erro.
 */
export function useSaveProfileName() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, hasProfile }: { name: string | null; hasProfile: boolean }) => {
      if (!user) throw new Error('Sem sessão para salvar o perfil.');

      return hasProfile
        ? updateOwnProfileName(supabase, user.id, name)
        : createOwnProfile(supabase, user.id, name);
    },
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(profileQueryKey(user?.id), profile);
    },
  });
}

/**
 * `signOut` devolve o erro em vez de lançar, então uma falha passaria batida se
 * a promise fosse apenas aguardada.
 */
export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await signOut(supabase);
      if (error) throw error;
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await deleteOwnAccount(supabase);

      // A conta já não existe; seguir com o token apontaria para um usuário
      // apagado. Uma falha aqui precisa aparecer, senão a pessoa continuaria
      // dentro do app achando que saiu.
      const { error } = await signOut(supabase);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
