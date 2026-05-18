export const formatDateShort = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "-";

export const formatDateLong = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa có ngày";

export const formatDateMedium = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa có ngày";
