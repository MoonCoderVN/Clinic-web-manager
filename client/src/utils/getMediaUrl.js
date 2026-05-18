const BASE_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5002";

export function getMediaUrl(path, cacheKey) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;
  return cacheKey ? `${url}?v=${encodeURIComponent(cacheKey)}` : url;
}

// Aliases kept for backward compatibility
export const getAvatarUrl = (avatar, _seed, cacheKey) => getMediaUrl(avatar, cacheKey);
export const getUploadUrl = (path, cacheKey) => getMediaUrl(path, cacheKey);
