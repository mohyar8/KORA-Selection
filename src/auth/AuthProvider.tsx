import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiClientError,
  apiClient,
  setUnauthorizedHandler,
} from '../api/apiClient';

const knownRoles = [
  'PROJECT_LEAD',
  'PROJECT_MEMBER',
  'TEAM_LEADER',
  'TEAM_DEPUTY',
  'VIEWER',
] as const;

export type UserRole = (typeof knownRoles)[number];

export type CurrentUser = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  teamId: string | null;
};

type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'
  | 'verification-error';

type AuthContextValue = {
  status: AuthStatus;
  user: CurrentUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retrySession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && knownRoles.some((role) => role === value);
}

function isCurrentUser(value: unknown): value is CurrentUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.username === 'string' &&
    isUserRole(value.role) &&
    (typeof value.teamId === 'string' || value.teamId === null)
  );
}

function getUserFromPayload(payload: unknown): CurrentUser | null {
  if (!isRecord(payload) || !isCurrentUser(payload.user)) {
    return null;
  }

  return payload.user;
}

function createInvalidResponseError(): ApiClientError {
  return new ApiClientError({
    kind: 'invalid-response',
  });
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const verifySession = async () => {
      try {
        const payload = await apiClient.requestJson('/auth/me', {
          signal: controller.signal,
        });

        const currentUser = getUserFromPayload(payload);

        if (!currentUser) {
          throw createInvalidResponseError();
        }

        if (isMounted) {
          setUser(currentUser);
          setStatus('authenticated');
        }
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setUser(null);
          setStatus('unauthenticated');
          return;
        }

        setUser(null);
        setStatus('verification-error');
      }
    };

    void verifySession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [verificationAttempt]);

  const login = useCallback(async (username: string, password: string) => {
    const payload = await apiClient.requestJson('/auth/login', {
      method: 'POST',
      jsonBody: {
        username,
        password,
      },
    });

    const currentUser = getUserFromPayload(payload);

    if (!currentUser) {
      throw createInvalidResponseError();
    }

    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const payload = await apiClient.requestJson('/auth/logout', {
      method: 'POST',
    });

    if (!isRecord(payload) || payload.status !== 'ok') {
      throw createInvalidResponseError();
    }

    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const retrySession = useCallback(() => {
    setUser(null);
    setStatus('initializing');
    setVerificationAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        logout,
        retrySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

type AuthConsumerProps = {
  children: (auth: AuthContextValue) => ReactNode;
};

export function AuthConsumer({ children }: AuthConsumerProps) {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('AuthConsumer يجب أن يُستخدم داخل AuthProvider.');
  }

  return <>{children(context)}</>;
}