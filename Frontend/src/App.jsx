import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './shared/pages/Login'
import ForgotPassword from './shared/pages/ForgotPassword'
import ResetPassword from './shared/pages/ResetPassword'
import Profile from './shared/pages/Profile'
import Home from './shared/pages/Home'
import UserAccountList from './shared/pages/UserAccountList'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'
// import CreateSupplier from './shared/pages/CreateSupplier' // Có thể import nếu cần dùng cho route con
import './App.css'

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Default Redirect: / -> /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes - Require Authentication + Sidebar Layout */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Role-based home routes */}
          <Route
            path="/admin/home"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/home"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff/home"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes - Only accessible by ADMIN role */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <MainLayout>
                  <UserAccountList />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Các routes khác nếu cần, ví dụ tạo supplier có thể nằm trong Home hoặc riêng */}
          {/* <Route path="/supplier/create" element={<ProtectedRoute><MainLayout><CreateSupplier /></MainLayout></ProtectedRoute>} /> */}
        </Routes>
      </Router>
    </div>
  )
}

export default App
