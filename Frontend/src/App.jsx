import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './app/theme';
import AppRoutes from './app/routes';
import { AuthProvider } from './app/context/AuthContext';
import { ToastProvider } from './app/context/ToastContext';
import { CategoryProvider } from './app/context/CategoryContext';
import { SupplierProvider } from './app/context/SupplierContext';
import { WarehouseProvider } from './app/context/WarehouseContext';
import { BrandProvider } from './app/context/BrandContext';
import { UomProvider } from './app/context/UomContext';
import { UserProvider } from './app/context/UserContext';
import { RoleProvider } from './app/context/RoleContext';
import { ToastContainer } from './components/Toast/ToastContainer';
import './App.css';

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ToastProvider>
                <AuthProvider>
                    <RoleProvider>
                        <CategoryProvider>
                            <SupplierProvider>
                                <WarehouseProvider>
                                    <BrandProvider>
                                        <UomProvider>
                                            <UserProvider>
                                                <ToastContainer />
                                                <Router>
                                                    <AppRoutes />
                                                </Router>
                                            </UserProvider>
                                        </UomProvider>
                                    </BrandProvider>
                                </WarehouseProvider>
                            </SupplierProvider>
                        </CategoryProvider>
                    </RoleProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
