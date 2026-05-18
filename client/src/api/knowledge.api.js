import httpClient from "./httpClient";

export const knowledgeApi = {
    getItems: (params) => httpClient.get("/knowledge", { params }),
    createItem: (payload) => httpClient.post("/knowledge", payload),
    updateItem: (id, payload) => httpClient.put(`/knowledge/${id}`, payload),
    deleteItem: (id) => httpClient.delete(`/knowledge/${id}`),
    getDocuments: () => httpClient.get("/knowledge/documents"),
    uploadDocument: (formData) => httpClient.post("/knowledge/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    createSheetSource: (payload) => httpClient.post("/knowledge/sheets", payload),
    deleteDocument: (id) => httpClient.delete(`/knowledge/documents/${id}`),
    reindexDocument: (id) => httpClient.post(`/knowledge/documents/${id}/reindex`),
    testQuery: (payload) => httpClient.post("/knowledge/test-query", payload),
};

export default knowledgeApi;
