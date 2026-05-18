import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/api/httpClient";

const SocketContext = createContext(null);

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  return (import.meta.env.VITE_API_URL || "http://localhost:5002/api").replace(/\/api\/?$/, "");
};

const dispatchRealtimeEvent = (eventName, payload) => {
  window.dispatchEvent(
    new CustomEvent("dentacare:realtime", {
      detail: { eventName, payload },
    })
  );
  window.dispatchEvent(
    new CustomEvent(`dentacare:realtime:${eventName}`, {
      detail: payload,
    })
  );
};

const realtimeEvents = [
  "notification:new",
  "notification:changed",
  "appointment:changed",
  "slots:changed",
  "schedule:changed",
  "service:changed",
  "doctor:changed",
  "user:changed",
  "patient:changed",
  "profile:changed",
  "exam-result:changed",
  "settings:changed",
  "public:landing-changed",
];

export const SocketProvider = ({ children }) => {
  const { token, user, setUser } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [authToken, setAuthToken] = useState(token);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const handleTokenRefresh = (event) => setAuthToken(event.detail?.token || null);
    window.addEventListener("dentacare:token-refreshed", handleTokenRefresh);
    return () => window.removeEventListener("dentacare:token-refreshed", handleTokenRefresh);
  }, []);

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      withCredentials: true,
      auth: authToken ? { token: authToken } : {},
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, (payload) => {
        dispatchRealtimeEvent(eventName, payload);
      });
    });

    return () => {
      realtimeEvents.forEach((eventName) => socket.off(eventName));
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [authToken]);

  useEffect(() => {
    if (!user?._id && !user?.id) return undefined;

    const currentUserId = String(user._id || user.id);
    const syncCurrentUser = async (event) => {
      const eventUserId = event.detail?.userId;
      if (eventUserId && String(eventUserId) !== currentUserId) return;

      try {
        const res = await axiosInstance.get("/users/me");
        setUser(res.data.data);
      } catch (error) {
        console.error("Failed to refresh current user after realtime event:", error);
      }
    };

    window.addEventListener("dentacare:realtime:profile:changed", syncCurrentUser);
    window.addEventListener("dentacare:realtime:user:changed", syncCurrentUser);

    return () => {
      window.removeEventListener("dentacare:realtime:profile:changed", syncCurrentUser);
      window.removeEventListener("dentacare:realtime:user:changed", syncCurrentUser);
    };
  }, [setUser, user?._id, user?.id]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
    }),
    [connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
