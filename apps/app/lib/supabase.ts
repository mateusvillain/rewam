import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@rewam/database';
import { Platform } from 'react-native';
import { env } from './env';

export const supabase = createSupabaseClient({
  url: env.supabaseUrl,
  anonKey: env.supabaseAnonKey,
  options: {
    auth: {
      // Na web o storage padrão (localStorage) já persiste a sessão.
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
});
