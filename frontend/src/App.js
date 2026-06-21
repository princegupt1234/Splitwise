import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { CreateGroup, JoinGroup, GroupDetail } from './pages/Groups';
import AddExpense from './pages/AddExpense';
import ExpenseHistory from './pages/ExpenseHistory';
import Settlements from './pages/Settlements';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGroups from './pages/admin/AdminGroups';
import AdminExpenses from './pages/admin/AdminExpenses';

const AdminRoute = () => {
  const { admin } = useAdmin();
  return admin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
      <AdminProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups/create" element={<CreateGroup />} />
              <Route path="/groups/join" element={<JoinGroup />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/expenses" element={<ExpenseHistory />} />
              <Route path="/expenses/add" element={<AddExpense />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/groups" element={<AdminGroups />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
