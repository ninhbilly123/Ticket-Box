'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthSession,
  fetchCurrentUser,
  login,
  logoutAuth,
  refreshAuth,
  register as registerAccount,
} from './api';

const SESSION_STORAGE_KEY = 'ticketbox_customer_session';
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface SignInInput {
  email: string;
  password: string;
}

interface RegisterInput extends SignInInput {
  fullName: string;
  phone?: string;
}

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession() {
  if (typeof window === 'undefined') return null;

  window.localStorage.removeItem(SESSION_STORAGE_KEY);

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const setAndStoreSession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);
    writeStoredSession(nextSession);
    setStatus(nextSession ? 'authenticated' : 'anonymous');
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = readStoredSession()?.refreshToken;
    setAndStoreSession(null);
    await logoutAuth(refreshToken);
  }, [setAndStoreSession]);

  const refreshSession = useCallback(async () => {
    const current = readStoredSession();
    if (!current?.refreshToken) {
      setAndStoreSession(null);
      return null;
    }

    try {
      const refreshed = await refreshAuth(current.refreshToken);
      setAndStoreSession(refreshed);
      return refreshed;
    } catch {
      setAndStoreSession(null);
      return null;
    }
  }, [setAndStoreSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = readStoredSession();
      if (!stored) {
        if (!cancelled) setStatus('anonymous');
        return;
      }

      if (!cancelled) {
        setSession(stored);
        setStatus('authenticated');
      }

      try {
        const profile = await fetchCurrentUser(stored.accessToken);
        if (!cancelled) {
          setAndStoreSession({ ...stored, user: profile });
        }
      } catch {
        if (!cancelled) {
          await refreshSession();
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, setAndStoreSession]);

  useEffect(() => {
    if (!session?.refreshToken) return;

    const timer = window.setInterval(() => {
      refreshSession();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refreshSession, session?.refreshToken]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const nextSession = await login(input);
      setAndStoreSession(nextSession);
      return nextSession;
    },
    [setAndStoreSession]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const nextSession = await registerAccount(input);
      setAndStoreSession(nextSession);
      return nextSession;
    },
    [setAndStoreSession]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(session),
      signIn,
      register,
      signOut,
      refreshSession,
    }),
    [refreshSession, register, session, signIn, signOut, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
