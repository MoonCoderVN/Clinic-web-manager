import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ChatProvider } from "./context/ChatContext";
import { Toaster } from "sonner";
import App from "./App";
import RouteAwareChatbot from "./components/chatbot/RouteAwareChatbot";
import ErrorBoundary from "./components/common/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "missing-google-client-id"}>
        <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <ChatProvider>
              <App />
              <RouteAwareChatbot />
              <Toaster richColors position="top-right" />
            </ChatProvider>
          </SocketProvider>
        </AuthProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
