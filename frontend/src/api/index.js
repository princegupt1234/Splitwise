import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
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
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

// Groups
export const groupAPI = {
  create: (data) => API.post('/groups', data),
  join: (data) => API.post('/groups/join', data),
  getAll: () => API.get('/groups'),
  getById: (id) => API.get(`/groups/${id}`),
  invite: (id, data) => API.post(`/groups/${id}/invite`, data),
  removeMember: (groupId, memberId) => API.delete(`/groups/${groupId}/members/${memberId}`),
  deleteGroup:  (groupId)           => API.delete(`/groups/${groupId}`),
  leave:        (id)                => API.delete(`/groups/${id}/leave`),
};

// Expenses
export const expenseAPI = {
  create: (data) => API.post('/expenses', data),
  getByGroup: (groupId, params) => API.get(`/expenses/group/${groupId}`, { params }),
  getBalances: (groupId) => API.get(`/expenses/group/${groupId}/balances`),
  getById: (id) => API.get(`/expenses/${id}`),
  update: (id, data) => API.put(`/expenses/${id}`, data),
  delete: (id) => API.delete(`/expenses/${id}`),
};

// Settlements
export const settlementAPI = {
  generate:        (groupId)           => API.post(`/settlements/generate/${groupId}`),
  getByGroup:      (groupId, params)   => API.get(`/settlements/group/${groupId}`, { params }),
  settle:          (id, data)          => API.put(`/settlements/${id}/settle`, data),
  reopen:          (id)                => API.put(`/settlements/${id}/reopen`),
  deleteSettled:   (id)                => API.delete(`/settlements/${id}`),
  // New request workflow
  createRequest:   (id, data)          => API.post(`/settlements/${id}/request`, data),
  getRequests:     (id)                => API.get(`/settlements/${id}/requests`),
  getPendingForMe: (groupId)           => API.get(`/settlements/requests/pending/${groupId}`),
  approveRequest:  (requestId)         => API.put(`/settlements/requests/${requestId}/approve`),
  rejectRequest:   (requestId, data)   => API.put(`/settlements/requests/${requestId}/reject`, data),
};

// Reports
export const reportAPI = {
  getMonthlyReport: (groupId, params) => API.get(`/reports/group/${groupId}`, { params }),
  getSummary: (groupId) => API.get(`/reports/group/${groupId}/summary`),
};

export default API;
