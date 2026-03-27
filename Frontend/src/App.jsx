import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './app/theme';
import AppRoutes from './app/routes';
import { AuthProvider } from './app/context/AuthContext';
import { ToastProvider } from './app/context/ToastContext';
import { MasterDataProvider } from './app/context/MasterDataContext';
import { RoleProvider } from './app/context/RoleContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import './App.css';

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ToastProvider>
                <AuthProvider>
                    <MasterDataProvider />
                    <RoleProvider>
                        <ToastContainer />
                        <Router>
                            <AppRoutes />
                        </Router>
                    </RoleProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
