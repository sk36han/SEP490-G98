import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../../shared/lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = authService.getUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (identifier, password, rememberMe = false) => {
    const response = await authService.login(identifier, password, rememberMe);
    const { accessToken, user } = response;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('userInfo', JSON.stringify(user));

    setUser(user);
    setIsAuthenticated(true);

    return response;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');

    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = authService.getUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
