import { useState, useCallback } from "react";

/**
 * Trả về [refreshKey, refresh]
 * Truyền refreshKey vào dependency array của useEffect để trigger re-fetch.
 * Gọi refresh() sau mỗi mutation thành công.
 */
export function useRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return [refreshKey, refresh];
}
