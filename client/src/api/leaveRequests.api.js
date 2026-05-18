import httpClient from "./httpClient";

export const leaveRequestsApi = {
    create: (payload) => httpClient.post("/leave-requests", payload),
    getMine: () => httpClient.get("/leave-requests/me"),
    cancel: (id) => httpClient.put(`/leave-requests/${id}/cancel`),
    getAll: (params) => httpClient.get("/leave-requests", { params }),
    approve: (id, payload) => httpClient.put(`/leave-requests/${id}/approve`, payload),
    reject: (id, payload) => httpClient.put(`/leave-requests/${id}/reject`, payload),
};

export default leaveRequestsApi;
