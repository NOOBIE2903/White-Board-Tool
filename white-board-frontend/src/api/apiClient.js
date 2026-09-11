import axios from "axios";
import { getBackendUrl } from "../config/api";

const apiClient = axios.create({
  baseURL: `${getBackendUrl()}/api`,
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