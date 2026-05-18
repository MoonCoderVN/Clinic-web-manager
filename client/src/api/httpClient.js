import axios from "axios";
import { toast } from "sonner";

const httpClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5002/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
    withCredentials: true,
});

httpClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

httpClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const url = originalRequest?.url || "";

        if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/register") && !url.includes("/auth/refresh")) {
            if (!originalRequest._retry) {
                if (isRefreshing) {
                    try {
                        const token = await new Promise((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        });
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return httpClient(originalRequest);
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const res = await httpClient.post("/auth/refresh", {});
                    const newToken = res.data.data.token;

                    localStorage.setItem("token", newToken);
                    window.dispatchEvent(new CustomEvent("dentacare:token-refreshed", { detail: { token: newToken } }));
                    httpClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;

                    processQueue(null, newToken);

                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return httpClient(originalRequest);
                } catch (err) {
                    processQueue(err, null);
                    localStorage.removeItem("token");
                    toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
                    setTimeout(() => {
                        window.location.href = "/login"; // Changed from "/" to "/login"
                    }, 1500);
                    return Promise.reject(err);
                } finally {
                    isRefreshing = false;
                }
            }
        }

        return Promise.reject(error);
    }
);

export default httpClient;
