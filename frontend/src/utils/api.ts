import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - auto-attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token expiry
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, { token });
          const newToken = response.data.token;
          localStorage.setItem('token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth helpers
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (email: string, password: string, username: string) => api.post('/auth/register', { email, password, username }),
  logout: () => { localStorage.removeItem('token'); },
  isAuthenticated: () => !!localStorage.getItem('token'),
};

// Music helpers
export const musicApi = {
  generate: (params: object) => api.post('/music/generate', params),
  getTracks: () => api.get('/music'),
  getTrack: (id: string) => api.get(`/music/${id}`),
  deleteTrack: (id: string) => api.delete(`/music/${id}`),
  getStyles: () => api.get('/music/meta/styles'),
};

// Video helpers
export const videoApi = {
  generate: (params: object) => api.post('/video/generate', params),
  getVideos: () => api.get('/video'),
  getVideo: (id: string) => api.get(`/video/${id}`),
  deleteVideo: (id: string) => api.delete(`/video/${id}`),
};

// AI helpers
export const aiApi = {
  chat: (message: string, context?: object[]) => api.post('/ai/chat', { message, context }),
  generateLyrics: (params: object) => api.post('/ai/lyrics', params),
  remix: (trackId: string, params: object) => api.post('/ai/remix', { trackId, ...params }),
  master: (trackId: string, params: object) => api.post('/ai/mastering', { trackId, ...params }),
  separateStems: (trackId: string) => api.post('/ai/stem-separation', { trackId }),
  getPerformance: () => api.get('/ai/performance'),
};

// User helpers
export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: object) => api.put('/users/profile', data),
  changePassword: (currentPassword: string, newPassword: string) => api.put('/users/password', { currentPassword, newPassword }),
  getStats: () => api.get('/users/stats'),
};

export default api;
