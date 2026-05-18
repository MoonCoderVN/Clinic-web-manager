import httpClient from "./httpClient";

export const appointmentsApi = {
    getMine: (params) => httpClient.get("/appointments", { params }),
    getAll: (params) => httpClient.get("/appointments/all", { params }),
    create: (payload) => httpClient.post("/appointments", payload),
    getById: (id) => httpClient.get(`/appointments/${id}`),
    confirm: (id) => httpClient.patch(`/appointments/${id}/confirm`),
    checkIn: (id) => httpClient.patch(`/appointments/${id}/checkin`),
    complete: (id) => httpClient.patch(`/appointments/${id}/complete`),
    reschedule: (id, payload) => httpClient.put(`/appointments/${id}/reschedule`, payload),
    cancel: (id, payload) => httpClient.delete(`/appointments/${id}`, { data: payload }),
};

export default appointmentsApi;
