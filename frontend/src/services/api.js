import axios from 'axios';

const resolveApiBaseUrl = () => {
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

  if (fromEnv) {
    return fromEnv.endsWith('/api') ? fromEnv : `${fromEnv}/api`;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }

  console.error('[API] VITE_API_URL tidak ditemukan pada production build.');
  return '';
};

const API_URL = resolveApiBaseUrl();

if (import.meta.env.DEV) {
  console.info('[API] baseURL:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

const buildRequestUrl = (config) => {
  const base = (config.baseURL || API_URL).replace(/\/$/, '');
  const path = (config.url || '').replace(/^\//, '');
  return path ? `${base}/${path}` : base;
};

const logApiError = (err) => {
  const config = err.config || {};
  console.error('[API Error]', {
    requestUrl: buildRequestUrl(config),
    method: (config.method || 'GET').toUpperCase(),
    statusCode: err.response?.status ?? null,
    responseBody: err.response?.data ?? null,
    errorMessage: err.message,
  });
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['ngrok-skip-browser-warning'] = 'true';

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    logApiError(err);

    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const chatAPI = {
  getSessions: () => api.get('/chats'),
  getMessages: (id) => api.get(`/chats/${id}`),
  createSession: () => api.post('/chats/new'),
  sendMessage: (session_id, message) => api.post('/chat', { session_id, message }),
  deleteSession: (id) => api.delete(`/chats/${id}`),
};

export const materialAPI = {
  getMaterials: (conversationId) =>
    api.get('/materials', { params: { conversationId } }),
  uploadMaterial: (formData) =>
    api.post('/materials/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'ngrok-skip-browser-warning': 'true',
      },
    }),
  deleteMaterial: (id) => api.delete(`/materials/${id}`),
};

export const ALLOWED_MATERIAL_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
export const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024;

export default api;
