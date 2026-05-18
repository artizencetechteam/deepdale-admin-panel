import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

import {
  apiRequest,
  ApiClientError,
  setUnauthorizedHandler
} from "./api-client";
import type { AdminUser, AuthState, LoginResponse } from "./api-types";

const MOCK_AUTH_ENABLED = false;
const MOCK_AUTH_STORAGE_KEY = "dd_admin_mock_auth";
const MOCK_CSRF_TOKEN = "mock-csrf-token";
const MOCK_EMAIL = "admin@deepdale.local";
const MOCK_PASSWORD = "ChangeMe123!";

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function goToLogin() {
  if (window.location.pathname !== "/admin/login") {
    window.location.assign("/admin/login");
  }
}

function createMockUser(lastLoginAt: string | null): AdminUser {
  const timestamp = new Date().toISOString();

  return {
    id: "mock-admin-user",
    email: MOCK_EMAIL,
    name: "Deepdale Admin",
    role: "superadmin",
    isActive: true,
    lastLoginAt,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function getMockAuthActive() {
  return sessionStorage.getItem(MOCK_AUTH_STORAGE_KEY) === "1";
}

function setMockAuthActive(active: boolean) {
  if (active) {
    sessionStorage.setItem(MOCK_AUTH_STORAGE_KEY, "1");
    return;
  }

  sessionStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    csrfToken: null
  });

  async function refresh() {
    if (MOCK_AUTH_ENABLED) {
      const isAuthenticated = getMockAuthActive();

      startTransition(() => {
        setState(
          isAuthenticated
            ? {
              status: "authenticated",
              user: createMockUser(new Date().toISOString()),
              csrfToken: MOCK_CSRF_TOKEN
            }
            : {
              status: "anonymous",
              user: null,
              csrfToken: null
            }
        );
      });

      return;
    }

    try {
      const user = await apiRequest<AdminUser>("/api/admin/auth/me", {
        ignoreUnauthorized: true
      });
      const csrf = await apiRequest<{ csrfToken: string }>("/api/admin/auth/csrf", {
        ignoreUnauthorized: true
      });

      startTransition(() => {
        setState({
          status: "authenticated",
          user,
          csrfToken: csrf.csrfToken
        });
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        startTransition(() => {
          setState({
            status: "anonymous",
            user: null,
            csrfToken: null
          });
        });
        return;
      }

      console.error("Unable to bootstrap admin session", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      startTransition(() => {
        setState({
          status: "anonymous",
          user: null,
          csrfToken: null
        });
      });
    }
  }

  async function login(email: string, password: string) {
    if (MOCK_AUTH_ENABLED) {
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail !== MOCK_EMAIL || password !== MOCK_PASSWORD) {
        throw new ApiClientError(
          "Invalid email or password",
          401,
          "invalid_credentials"
        );
      }

      setMockAuthActive(true);
      startTransition(() => {
        setState({
          status: "authenticated",
          user: createMockUser(new Date().toISOString()),
          csrfToken: MOCK_CSRF_TOKEN
        });
      });

      return;
    }

    const response = await apiRequest<LoginResponse>("/api/admin/auth/login", {
      method: "POST",
      body: {
        email,
        password
      },
      ignoreUnauthorized: true
    });

    startTransition(() => {
      setState({
        status: "authenticated",
        user: response.user,
        csrfToken: response.csrfToken
      });
    });
  }

  async function logout() {
    if (MOCK_AUTH_ENABLED) {
      setMockAuthActive(false);
      startTransition(() => {
        setState({
          status: "anonymous",
          user: null,
          csrfToken: null
        });
      });
      goToLogin();
      return;
    }

    if (!state.csrfToken) {
      startTransition(() => {
        setState({
          status: "anonymous",
          user: null,
          csrfToken: null
        });
      });
      return;
    }

    await apiRequest<void>("/api/admin/auth/logout", {
      method: "POST",
      csrfToken: state.csrfToken,
      ignoreUnauthorized: true
    });

    startTransition(() => {
      setState({
        status: "anonymous",
        user: null,
        csrfToken: null
      });
    });
    goToLogin();
  }

  useEffect(() => {
    if (MOCK_AUTH_ENABLED) {
      void refresh();
      return;
    }

    setUnauthorizedHandler(() => {
      startTransition(() => {
        setState({
          status: "anonymous",
          user: null,
          csrfToken: null
        });
      });
      goToLogin();
    });

    void refresh();

    return () => {
      setUnauthorizedHandler(undefined);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refresh
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
