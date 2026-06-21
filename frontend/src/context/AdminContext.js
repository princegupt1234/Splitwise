import React, { createContext, useContext, useState } from 'react';
import { adminAPI } from '../api/admin';

const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminUser')); } catch { return null; }
  });

  const login = async (credentials) => {
    const { data } = await adminAPI.login(credentials);
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUser', JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
  };

  return (
    <AdminContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
