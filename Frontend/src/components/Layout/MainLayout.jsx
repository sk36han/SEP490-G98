import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import './MainLayout.css';

const MainLayout = ({ children }) => {
    return (
        <div className="app-layout">
            {/* Sidebar Component */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="main-content">
                <div className="content-container">
                    {/* Render children components */}
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
