import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteStravaAppConfig,
  disconnectStravaAccount,
  getCurrentUser,
  login,
  logout,
  saveStravaAppConfig,
  signup,
} from "../services/auth.service.js";
import { AuthContext } from "./AuthContextBase.js";

const INITIAL_STATE = {
  user: null,
  error: "",
  isLoading: true,
  isReady: false,
};

function extractErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}


export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: "" }));
  }, []);

  const handleResolvedUser = useCallback((user) => {
    setState({
      user: user || null,
      error: "",
      isLoading: false,
      isReady: true,
    });

    return user || null;
  }, []);

  const refreshUser = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setState((current) => ({
        ...current,
        isLoading: true,
        error: current.isReady ? current.error : "",
      }));
    }

    try {
      const user = await getCurrentUser();
      return handleResolvedUser(user);
    } catch (error) {
      if (error?.response?.status === 401) {
        return handleResolvedUser(null);
      }

      const message = extractErrorMessage(error, "Impossible de verifier la session RunNSee.");
      setState((current) => ({
        ...current,
        user: null,
        error: message,
        isLoading: false,
        isReady: true,
      }));
      throw error;
    }
  }, [handleResolvedUser]);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleUnauthorized = () => {
      setState((current) => ({
        ...current,
        user: null,
        error: "",
        isLoading: false,
        isReady: true,
      }));
    };

    window.addEventListener("runsee:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("runsee:unauthorized", handleUnauthorized);
  }, []);

  const loginWithPassword = useCallback(async ({ email, password }) => {
    clearError();
    setState((current) => ({ ...current, isLoading: true }));

    try {
      const user = await login({ email, password });
      return handleResolvedUser(user);
    } catch (error) {
      const message = extractErrorMessage(error, "Connexion impossible.");
      setState((current) => ({
        ...current,
        user: null,
        error: message,
        isLoading: false,
        isReady: true,
      }));
      throw error;
    }
  }, [clearError, handleResolvedUser]);

  const signupWithPassword = useCallback(async ({ displayName, email, password }) => {
    clearError();
    setState((current) => ({ ...current, isLoading: true }));

    try {
      const user = await signup({ displayName, email, password });
      return handleResolvedUser(user);
    } catch (error) {
      const message = extractErrorMessage(error, "Creation du compte impossible.");
      setState((current) => ({
        ...current,
        user: null,
        error: message,
        isLoading: false,
        isReady: true,
      }));
      throw error;
    }
  }, [clearError, handleResolvedUser]);

  const logoutCurrentUser = useCallback(async () => {
    try {
      await logout();
    } finally {
      setState((current) => ({
        ...current,
        user: null,
        error: "",
        isLoading: false,
        isReady: true,
      }));
    }
  }, []);

  const disconnectStrava = useCallback(async () => {
    const result = await disconnectStravaAccount();
    const user = await refreshUser({ silent: true });

    return {
      ...result,
      user,
    };
  }, [refreshUser]);

  const saveUserStravaApp = useCallback(async ({ clientId, clientSecret }) => {
    const result = await saveStravaAppConfig({ clientId, clientSecret });
    const user = handleResolvedUser(result?.user ?? null);
    return {
      ...result,
      user,
    };
  }, [handleResolvedUser]);

  const deleteUserStravaApp = useCallback(async () => {
    const result = await deleteStravaAppConfig();
    const user = handleResolvedUser(result?.user ?? null);
    return {
      ...result,
      user,
    };
  }, [handleResolvedUser]);

  const value = useMemo(
    () => ({
      user: state.user,
      error: state.error,
      isLoading: state.isLoading,
      isReady: state.isReady,
      isAuthenticated: Boolean(state.user),
      clearError,
      refreshUser,
      login: loginWithPassword,
      signup: signupWithPassword,
      logout: logoutCurrentUser,
      disconnectStrava,
      saveStravaApp: saveUserStravaApp,
      deleteStravaApp: deleteUserStravaApp,
    }),
    [
      clearError,
      deleteUserStravaApp,
      disconnectStrava,
      loginWithPassword,
      logoutCurrentUser,
      refreshUser,
      saveUserStravaApp,
      signupWithPassword,
      state.error,
      state.isLoading,
      state.isReady,
      state.user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
