import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './shared/pages/Login/Login'
import ForgotPassword from './shared/pages/ForgotPassword/ForgotPassword'
import ResetPassword from './shared/pages/ResetPassword/ResetPassword'
import Profile from './shared/pages/Profile/Profile'
import CreateSupplier from './shared/pages/CreateSupplier/CreateSupplier'
import './App.css'

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<CreateSupplier />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/supplier/create" element={<CreateSupplier />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
