/* eslint-disable react-refresh/only-export-components */
// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "@/api/httpClient";
import decodeToken from "../utils/decodeToken";

const AuthContext = createContext(null);

const normalizeUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const id = user._id || user.id;
  return {
    ...user,
    ...(id ? { _id: id, id } : {}),
  };
};

const normalizeAuthPayload = (payload) => {
  const data = payload?.data || payload || {};
  const token = data.token || data.accessToken || payload?.token || payload?.accessToken;
  const user = normalizeUser(data.user || payload?.user);

  if (!token || !user?.role) {
    throw new Error("Phản hồi đăng nhập không hợp lệ");
  }

  return { token, user };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // ── Derived state ──────────────────────────────────────────────
  const isAuthenticated = !!user && !!token;
  const role = user?.role ?? null;

  // ── logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      console.error("Logout API failed", error);
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      axiosInstance.defaults.headers.common["Authorization"] = "";
      // Navigate via window.location to reset all state cleanly
      window.location.href = "/";
    }
  }, []);

  // ── login(token, user) – called after successful API response ──
  const login = useCallback(async (email, password) => {
    const response = await axiosInstance.post("/auth/login", { email, password });
    const { token: newToken, user: userData } = normalizeAuthPayload(response.data);

    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

    return userData; // caller can switch on userData.role
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    const response = await axiosInstance.post("/auth/google", { idToken });
    const { token: newToken, user: userData } = normalizeAuthPayload(response.data);

    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

    return userData;
  }, []);

  // ── On mount: validate token from localStorage ──────────────────
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");

      if (!storedToken) {
        setLoading(false);
        return;
      }

      // 1. Decode & check expiry client-side first (fast path)
      const decoded = decodeToken(storedToken);
      if (!decoded || decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        axiosInstance.defaults.headers.common["Authorization"] = "";
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // 2. Set axios header
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;

      // 3. Verify with backend & fetch fresh user data
      try {
        const { data } = await axiosInstance.get("/users/me");
        setUser(data.data);
        setToken(storedToken);
      } catch {
        // Server rejected token (revoked / DB issue) — clear silently
        localStorage.removeItem("token");
        axiosInstance.defaults.headers.common["Authorization"] = "";
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, role, isAuthenticated, loading, login, loginWithGoogle, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
