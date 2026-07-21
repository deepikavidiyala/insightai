import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStore.get());
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState(null);

  useEffect(() => {
    function handleUnauthorized() {
      tokenStore.clear();
      setToken(null);
      setUser(null);
    }
    window.addEventListener("insightai:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("insightai:unauthorized", handleUnauthorized);
  }, []);

  // Whenever we have a token but no user profile yet (e.g. on page reload,
  // where only the JWT survives in localStorage), fetch it once.
  useEffect(() => {
    if (token && !user) {
      api
        .getMe()
        .then(({ data }) => setUser(data))
        .catch(() => {
          /* 401 is already handled globally; other errors just leave user null */
        });
    }
  }, [token, user]);

  function applyAuthResult(data) {
    tokenStore.set(data.access_token);
    setToken(data.access_token);
    setUser(data.user || null);
  }

  async function login(username, password) {
    setStatus("loading");
    setError(null);
    try {
      const { data } = await api.login(username, password);
      applyAuthResult(data);
      setStatus("idle");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  async function register(username, email, password) {
    setStatus("loading");
    setError(null);
    try {
      const { data } = await api.register(username, email, password);
      applyAuthResult(data);
      setStatus("idle");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  async function loginWithGoogle(credential) {
    setStatus("loading");
    setError(null);
    try {
      const { data } = await api.googleLogin(credential);
      applyAuthResult(data);
      setStatus("idle");
      return true;
    } catch (err) {
      setError(err.message);
      setStatus("error");
      return false;
    }
  }

  function logout() {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }

  async function updateAvatar(dataUrl) {
    const { data } = await api.updateAvatar(dataUrl);
    setUser(data);
    return data;
  }

  async function removeAvatar() {
    const { data } = await api.removeAvatar();
    setUser(data);
    return data;
  }

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      user,
      login,
      register,
      loginWithGoogle,
      logout,
      updateAvatar,
      removeAvatar,
      status,
      error,
    }),
    [token, user, status, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
