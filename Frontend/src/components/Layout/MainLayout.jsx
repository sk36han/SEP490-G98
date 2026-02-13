import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import './MainLayout.css';

const MainLayout = ({ children }) => { // Children or Outlet depending on usage, but Outlet is better for Router
    return (
        <div className="app-layout">
            {/* Sidebar Component */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="main-content">
                <div className="content-container">
                    {/* Render nested routes here */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
