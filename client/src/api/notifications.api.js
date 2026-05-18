import httpClient from "./httpClient";

export const notificationsApi = {
    getUnreadCount: () => httpClient.get("/notifications/unread-count"),
    getAll: () => httpClient.get("/notifications"),
    markRead: (id) => httpClient.patch(`/notifications/${id}/read`),
    markAllRead: () => httpClient.patch("/notifications/read-all"),
    remove: (id) => httpClient.delete(`/notifications/${id}`),
};

export default notificationsApi;
