import axios from 'axios';

/** Usa o mesmo host da página (localhost ou IP da rede) para a API funcionar na LAN. */
function resolveApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  if (fromEnv && isLocalHost) return fromEnv;
  return `${window.location.protocol}//${host}:8000/api/v1`;
}

const baseURL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('whatsapp_status');
      Object.keys(localStorage)
        .filter((k) => k.startsWith('whatsapp_status_'))
        .forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(err, fallback = 'Ocorreu um erro.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');
  }
  return fallback;
}
