import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || 'http://13.214.165.214:3001';

export const http = axios.create({
  baseURL: `${baseURL.replace(/\/$/, '')}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
