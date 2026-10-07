import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_URL, withCredentials: true });

let accessToken = null;
let refreshPromise = null;
let sessionListener = () => {};

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};

export function onSessionChange(listener) {
  sessionListener = listener;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        sessionListener(data.data);
        return data.data;
      })
      .catch((err) => {
        setAccessToken(null);
        sessionListener(null);
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const SKIP_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const shouldRefresh =
      response?.status === 401 &&
      config &&
      !config._retry &&
      !SKIP_REFRESH.some((path) => config.url?.includes(path));

    if (!shouldRefresh) throw error;

    config._retry = true;
    await refreshSession();
    return api(config);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong') {
  const apiError = error?.response?.data?.error;
  if (apiError?.details?.length) return apiError.details.map((d) => d.message).join(', ');
  return apiError?.message || error?.message || fallback;
}

export default api;
