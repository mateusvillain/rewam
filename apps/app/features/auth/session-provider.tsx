import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

  useEffect(() => {
    let active = true;

    // A restauração inicial e o listener correm em paralelo; `active` evita que
    // a resposta mais lenta sobrescreva um estado mais novo depois do unmount.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsRestoring(false);
    });

    // Cobre login, logout, refresh de token e logout em outra aba na web.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setIsRestoring(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

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

/**
 * Atalho para telas que só renderizam autenticadas. Lança se não houver usuário,
 * poupando cada tela de tratar um caso que o roteamento já impede.
 */
export function useAuthenticatedUser(): User {
  const { user } = useSession();
  if (!user) {
    throw new Error('useAuthenticatedUser foi usado fora da área autenticada.');
  }
  return user;
}
