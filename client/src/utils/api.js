import axios from 'axios';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Bearer token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Catch 401 authorization failures and logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/admin/login')) {
        window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { axios }; // exports standard axis too if needed
