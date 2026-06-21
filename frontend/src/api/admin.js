import axios from 'axios';

const ADMIN_API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

ADMIN_API.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ADMIN_API.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const adminAPI = {
  login:          (data)              => ADMIN_API.post('/admin/login', data),
  getStats:       ()                  => ADMIN_API.get('/admin/stats'),
  getUsers:       (params)            => ADMIN_API.get('/admin/users', { params }),
  getUser:        (id)                => ADMIN_API.get(`/admin/users/${id}`),
  updateUser:     (id, data)          => ADMIN_API.put(`/admin/users/${id}`, data),
  deleteUser:     (id)                => ADMIN_API.delete(`/admin/users/${id}`),
  banUser:        (id)                => ADMIN_API.put(`/admin/users/${id}/ban`),
  unbanUser:      (id)                => ADMIN_API.put(`/admin/users/${id}/unban`),
  getGroups:      (params)            => ADMIN_API.get('/admin/groups', { params }),
  deleteGroup:    (id)                => ADMIN_API.delete(`/admin/groups/${id}`),
  getExpenses:    (params)            => ADMIN_API.get('/admin/expenses', { params }),
  deleteExpense:  (id)                => ADMIN_API.delete(`/admin/expenses/${id}`),
};

export default ADMIN_API;
