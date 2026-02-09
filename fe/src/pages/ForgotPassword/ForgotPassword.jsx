import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPassword.css';
import logo from '../../assets/images/logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle forgot password logic here
    console.log('Forgot password attempt:', { email });
    setIsSubmitted(true);
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-background">
        <div className="forgot-password-form-container">
          <div className="forgot-password-form">
            <div className="logo-section">
              <img src={logo} alt="Minh Khanh Logo" className="company-logo" />
            </div>
            
            {!isSubmitted ? (
              <>
                <p className="forgot-password-subtitle">
                  Vui lòng nhập Email của bạn để tiếp tục
                </p>
                
                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="forgot-password-input"
                      required
                    />
                  </div>
                  
                  <button type="submit" className="forgot-password-button">
                    Khôi phục mật khẩu
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="success-message">
                  <h3>Email đã được gửi!</h3>
                  <p>
                    Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến email của bạn. 
                    Vui lòng kiểm tra hộp thư và làm theo hướng dẫn.
                  </p>
                </div>
              </>
            )}
            
            <div className="footer-text">
              © 2026 Minh Khanh Warehouse Management System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
