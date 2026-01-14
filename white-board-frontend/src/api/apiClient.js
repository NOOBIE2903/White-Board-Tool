import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken")
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error);
    }
)

export default apiClient