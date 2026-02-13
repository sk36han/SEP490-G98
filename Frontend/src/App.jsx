import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './shared/pages/Login'
import ForgotPassword from './shared/pages/ForgotPassword'
import ResetPassword from './shared/pages/ResetPassword'
import Profile from './shared/pages/Profile'
import Home from './shared/pages/Home'
// import CreateSupplier from './shared/pages/CreateSupplier' // Có thể import nếu cần dùng cho route con
import './App.css'

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Default Redirect: / -> /home */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Main Dashboard Layout (Sidebar is inside Home) */}
          <Route path="/home" element={<Home />} />

          {/* Profile Page (Standalone, no sidebar) */}
          <Route path="/profile" element={<Profile />} />

          {/* Các routes khác nếu cần, ví dụ tạo supplier có thể nằm trong Home hoặc riêng */}
          {/* <Route path="/supplier/create" element={<CreateSupplier />} /> */}
        </Routes>
      </Router>
    </div>
  )
}

export default App
