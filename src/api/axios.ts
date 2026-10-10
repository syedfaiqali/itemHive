import axios from 'axios';
import { resolveApiUrl } from './apiUrl';

const api = axios.create({
    baseURL: resolveApiUrl(import.meta.env.DEV, import.meta.env.VITE_API_URL),
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const selectedWorkspaceId = localStorage.getItem('itemhive-workspace-id');
        if (selectedWorkspaceId) {
            config.headers['x-itemhive-workspace-id'] = selectedWorkspaceId;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors (like 401 Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.dispatchEvent(new Event('itemhive-auth-expired'));
        }
        return Promise.reject(error);
    }
);

export default api;
