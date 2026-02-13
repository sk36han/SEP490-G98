import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    User,
    FileText,
    Truck,
    ShoppingCart
} from 'lucide-react';
import './Sidebar.css';

// Mock user data - In real app, get this from AuthService or Context
const MOCK_USER = {
    name: 'Nguyễn Văn A',
    role: 'Warehouse Manager', // 'Admin', 'Staff'
    email: 'manager@warehouse.com',
    avatar: '' // URL or empty
};

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [user, setUser] = useState(MOCK_USER);
    const location = useLocation();
    const navigate = useNavigate();

    // Toggle Sidebar
    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Logout Handler
    const handleLogout = () => {
        // Call AuthService.logout() here
        console.log('Logging out...');
        navigate('/login');
    };

    // Menu Configuration based on Roles
    const getMenuItems = (role) => {
        const common = [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/profile', icon: User, label: 'Cá nhân' },
        ];

        const managerItems = [
            { path: '/inventory', icon: Box, label: 'Kho hàng' },
            { path: '/suppliers', icon: Truck, label: 'Nhà cung cấp' },
            { path: '/supplier/create', icon: FileText, label: 'Tạo NCC (Mới)' }, // Added for easy access during dev
            { path: '/reports', icon: FileText, label: 'Báo cáo' },
            { path: '/users', icon: Users, label: 'Nhân viên' },
        ];

        const staffItems = [
            { path: '/inventory', icon: Box, label: 'Kho hàng' },
            { path: '/orders', icon: ShoppingCart, label: 'Đơn hàng' },
        ];

        // Simple role check logic
        if (role === 'Warehouse Manager' || role === 'Admin') {
            return [...common, ...managerItems, { path: '/settings', icon: Settings, label: 'Cài đặt' }];
        }

        return [...common, ...staffItems];
    };

    const menuItems = getMenuItems(user.role);

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
            {/* Header / Logo */}
            <div className="sidebar-header">
                <div className="logo-container">
                    <div className="logo-icon">W</div>
                    {!isCollapsed && <span>Warehouse</span>}
                </div>

                {/* Collapse Toggle Button */}
                {!isCollapsed && (
                    <div className="sidebar-toggle-wrapper">
                        <button onClick={toggleSidebar} className="collapse-trigger" title="Thu gọn">
                            <ChevronLeft size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Collapsed Toggle (Centered when collapsed) */}
            {isCollapsed && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                    <button onClick={toggleSidebar} className="collapse-trigger" title="Mở rộng">
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Navigation Menu */}
            <nav className="sidebar-nav">
                {menuItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        title={isCollapsed ? item.label : ''} // Native tooltip for collapsed
                    >
                        <div className="nav-icon">
                            <item.icon size={20} />
                        </div>
                        {!isCollapsed && <span className="nav-label">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Profile Footer */}
            <div className="sidebar-footer">
                <div className="profile-card">
                    <div className="profile-avatar">
                        {user.avatar ? (
                            <img src={user.avatar} alt="Avatar" />
                        ) : (
                            user.name.charAt(0)
                        )}
                    </div>

                    {!isCollapsed && (
                        <>
                            <div className="profile-info">
                                <span className="profile-name">{user.name}</span>
                                <span className="profile-role">{user.role}</span>
                            </div>
                            <button onClick={handleLogout} className="logout-btn-mini" title="Đăng xuất">
                                <LogOut size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
