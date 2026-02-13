import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import Login from './shared/pages/Login'
import ForgotPassword from './shared/pages/ForgotPassword'
import ResetPassword from './shared/pages/ResetPassword'
import Profile from './shared/pages/Profile'
import Home from './shared/pages/Home'
import UserAccountList from './shared/pages/UserAccountList'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/Layout/MainLayout'
import './App.css'

// Create a theme instance with the new font
const theme = createTheme({
  typography: {
    fontFamily: "'Be Vietnam Pro', sans-serif",
  },
  palette: {
    primary: {
      main: '#1976d2',
    },
    // You can customize other colors here if needed
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
          </Routes>
        </Router>
      </div>
    </ThemeProvider>
  )
}

export default App
