import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
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
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteMaterial: (id) => api.delete(`/materials/${id}`),
};

export const ALLOWED_MATERIAL_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
export const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024;

export default api;
