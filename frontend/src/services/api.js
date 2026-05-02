import axios from 'axios';
import { getToken } from '../utils/storage';

// Base URL — points to the backend server
// Update this when deploying to production
const BASE_URL = __DEV__
  ? 'http://192.168.1.17:5000/api'
  : 'https://your-production-url.onrender.com/api';

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Something went wrong';

    console.error('API Error:', message);

    // You can add global error handling here
    // e.g., redirect to login on 401

    return Promise.reject({
      status: error.response?.status,
      message,
    });
  }
);

export default api;
