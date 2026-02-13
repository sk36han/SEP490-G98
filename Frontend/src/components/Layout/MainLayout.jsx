import React from 'react';
import Box from '@mui/material/Box';
import Sidebar from '../Sidebar/Sidebar';
import './MainLayout.css'; // Keep consistent with existing styles for now, or remove if not needed.

const MainLayout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex' }}>
            <Sidebar />
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                {children}
            </Box>
        </Box>
    );
};

export default MainLayout;
