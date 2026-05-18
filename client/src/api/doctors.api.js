import httpClient from "./httpClient";

export const doctorsApi = {
    getAll: (params) => httpClient.get("/doctors", { params }),
    getById: (id) => httpClient.get(`/doctors/${id}`),
    create: (payload) => httpClient.post("/doctors", payload),
    update: (id, payload) => httpClient.put(`/doctors/${id}`, payload),
    remove: (id) => httpClient.delete(`/doctors/${id}`),
    getMyProfile: () => httpClient.get("/doctors/profile/me"),
    updateMyProfile: (payload) => httpClient.put("/doctors/profile/me", payload),
    getAggregatedSlots: (params) => httpClient.get("/doctors/aggregated-slots", { params }),
    getAvailableSlots: (doctorId, params) => httpClient.get(`/doctors/${doctorId}/available-slots`, { params }),
};

export default doctorsApi;
