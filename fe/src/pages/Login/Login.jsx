import React, { useState } from 'react';
import './Login.css';
import logo from '../../assets/images/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { email, password, rememberMe });
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-form-container">
          <div className="login-form">
            <div className="logo-section">
              <img src={logo} alt="Minh Khanh Logo" className="company-logo" />
            </div>
            
            <p className="welcome-text">Vui lòng đăng nhập để tiếp tục</p>
            
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
              
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
              
              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Ghi nhớ
                </label>
                <a href="#" className="forgot-password">Quên mật khẩu?</a>
              </div>
              
              <button type="submit" className="login-button">
                Đăng nhập
              </button>
            </form>
            
            <div className="footer-text">
              © 2026 Minh Khanh Warehouse Management System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
