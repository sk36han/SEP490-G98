import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './app/theme';
import AppRoutes from './app/routes';
import './App.css';

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div className="App">
                <Router>
                    <AppRoutes />
                </Router>
            </div>
        </ThemeProvider>
    );
}

export default App;
