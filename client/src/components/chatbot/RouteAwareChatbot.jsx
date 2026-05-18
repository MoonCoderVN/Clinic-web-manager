import { useLocation } from "react-router-dom";
import ChatbotWidget from "./ChatbotWidget";

const hiddenRoutes = new Set([
  "/login",
  "/register",
]);

export default function RouteAwareChatbot() {
  const { pathname } = useLocation();

  if (
    pathname.startsWith("/patient") ||
    hiddenRoutes.has(pathname) ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/doctor")
  ) {
    return null;
  }

  return <ChatbotWidget />;
}
