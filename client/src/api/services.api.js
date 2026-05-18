import httpClient from "./httpClient";

export const servicesApi = {
    getAll: (params) => httpClient.get("/services", { params }),
    create: (payload, config) => httpClient.post("/services", payload, config),
    update: (id, payload, config) => httpClient.put(`/services/${id}`, payload, config),
    remove: (id) => httpClient.delete(`/services/${id}`),
    updateStatus: (id, payload) => httpClient.put(`/services/${id}`, payload),
};

export default servicesApi;
