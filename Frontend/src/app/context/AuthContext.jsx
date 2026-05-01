import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import authService from '../../shared/lib/authService';
import apiClient from '../../shared/lib/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Rehydrate user from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem('userInfo');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password, rememberMe = false) => {
        const result = await authService.login(email, password, rememberMe);
        if (result?.requiresOtp) {
            return result;
        }
        const token = result?.accessToken ?? result?.token;
        if (token) {
            if (result.expiresAt) localStorage.setItem('tokenExpiresAt', result.expiresAt);
            const stored = authService.getUser();
            if (stored) {
                setUser(stored);
            } else {
                const userData = {
                    userId: result.userId,
                    email: result.email,
                    fullName: result.fullName,
                    role: result.role,
                };
                setUser(userData);
            }
        }
        return result;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('user');
        localStorage.removeItem('userInfo');
        setUser(null);
    }, []);

    const isAuthenticated = useCallback(() => {
        const token = localStorage.getItem('token');
        const expiresAt = localStorage.getItem('tokenExpiresAt');
        if (!token) return false;
        if (expiresAt && Date.now() > Number(expiresAt)) {
            logout();
            return false;
        }
        return true;
    }, [logout]);

    const value = useMemo(() => ({
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        apiClient,
    }), [user, loading, login, logout, isAuthenticated]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
