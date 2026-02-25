import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
    const auth = JSON.parse(localStorage.getItem('vms_auth'));
    if (auth && auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
