import { subscribeToSession } from '@rewam/auth';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { resolveSessionStatus, type SessionStatus } from './session-status';

/** Estado da sessão para toda a árvore do app. */
export type SessionState = {
  status: SessionStatus;
  session: Session | null;
  user: User | null;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    // Uma única fonte de verdade: `INITIAL_SESSION` já entrega a sessão
    // restaurada do storage, então não há um getSession() concorrente cuja
    // resposta atrasada pudesse sobrescrever um evento mais novo.
    const unsubscribe = subscribeToSession(supabase, (nextSession) => {
      setSession(nextSession);
      setIsRestoring(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const currentUserId = session?.user.id ?? null;

    // Trocar de conta no mesmo processo precisa esvaziar o cache: o RLS protege
    // o banco, não o que o TanStack Query já guardou em memória.
    if (previousUserId.current !== null && previousUserId.current !== currentUserId) {
      queryClient.clear();
    }

    previousUserId.current = currentUserId;
  }, [queryClient, session]);

  const value = useMemo<SessionState>(
    () => ({
      status: resolveSessionStatus(isRestoring, session !== null),
      session,
      user: session?.user ?? null,
    }),
    [isRestoring, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  }
  return value;
}
