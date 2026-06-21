import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
});

// Add JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors globally — but not on the login route itself
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/api/auth/register', data),
  login: (data) => API.post('/api/auth/login', data),
  getMe: () => API.get('/api/auth/me'),
  updateProfile: (data) => API.put('/api/auth/profile', data),
};

// Groups
export const groupAPI = {
  create: (data) => API.post('/api/groups', data),
  join: (data) => API.post('/api/groups/join', data),
  getAll: () => API.get('/api/groups'),
  getById: (id) => API.get(`/api/groups/${id}`),
  invite: (id, data) => API.post(`/api/groups/${id}/invite`, data),
  removeMember: (groupId, memberId) => API.delete(`/api/groups/${groupId}/members/${memberId}`),
  deleteGroup:  (groupId)           => API.delete(`/api/groups/${groupId}`),
  leave:        (id)                => API.delete(`/api/groups/${id}/leave`),
};

// Expenses
export const expenseAPI = {
  create: (data) => API.post('/api/expenses', data),
  getByGroup: (groupId, params) => API.get(`/api/expenses/group/${groupId}`, { params }),
  getBalances: (groupId) => API.get(`/api/expenses/group/${groupId}/balances`),
  getById: (id) => API.get(`/api/expenses/${id}`),
  update: (id, data) => API.put(`/api/expenses/${id}`, data),
  delete: (id) => API.delete(`/api/expenses/${id}`),
};

// Settlements
export const settlementAPI = {
  generate:        (groupId)           => API.post(`/api/settlements/generate/${groupId}`),
  getByGroup:      (groupId, params)   => API.get(`/api/settlements/group/${groupId}`, { params }),
  settle:          (id, data)          => API.put(`/api/settlements/${id}/settle`, data),
  reopen:          (id)                => API.put(`/api/settlements/${id}/reopen`),
  deleteSettled:   (id)                => API.delete(`/api/settlements/${id}`),
  // New request workflow
  createRequest:   (id, data)          => API.post(`/api/settlements/${id}/request`, data),
  getRequests:     (id)                => API.get(`/api/settlements/${id}/requests`),
  getPendingForMe: (groupId)           => API.get(`/api/settlements/requests/pending/${groupId}`),
  approveRequest:  (requestId)         => API.put(`/api/settlements/requests/${requestId}/approve`),
  rejectRequest:   (requestId, data)   => API.put(`/api/settlements/requests/${requestId}/reject`, data),
};

// Reports
export const reportAPI = {
  getMonthlyReport: (groupId, params) => API.get(`/api/reports/group/${groupId}`, { params }),
  getSummary: (groupId) => API.get(`/api/reports/group/${groupId}/summary`),
};

export default API;
