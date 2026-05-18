import { useEffect, useRef } from "react";

/**
 * Gọi callback khi user quay lại tab (visibilitychange → visible)
 * hoặc khi cửa sổ được focus lại.
 * Dùng để tự động refetch dữ liệu mà không cần polling liên tục.
 */
export function usePageFocus(callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") callbackRef.current();
    };
    const handleFocus = () => callbackRef.current();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}
