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
import authService from '../../shared/lib/authService';
import logo from '../../shared/assets/logo.png';
import './Sidebar.css';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // Get user data from authService (real data from backend)
    const userInfo = authService.getUser();
    // Try roleCode first (what backend uses), fallback to roleName
    const roleFromBackend = userInfo?.roleCode || userInfo?.roleName || 'STAFF';
    const user = {
        name: userInfo?.fullName || 'User',
        role: roleFromBackend.toUpperCase(), // Normalize to uppercase
        email: userInfo?.email || ''
    };

    // Toggle Sidebar
    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Logout Handler
    const handleLogout = () => {
        if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
            authService.logout();
            navigate('/login');
        }
    };

    // Menu Configuration based on Roles
    const getMenuItems = (role) => {
        const common = [
            { path: '/profile', icon: User, label: 'Hồ sơ cá nhân' },
        ];

        const adminItems = [
            { path: '/admin/home', icon: LayoutDashboard, label: 'Trang chủ' },
            { path: '/admin/users', icon: Users, label: 'Quản lý người dùng' },
            { path: '/inventory', icon: Box, label: 'Quản lý kho' },
            { path: '/suppliers', icon: Truck, label: 'Nhà cung cấp' },
            { path: '/orders', icon: ShoppingCart, label: 'Đơn hàng' },
            { path: '/reports', icon: FileText, label: 'Báo cáo' },
            { path: '/settings', icon: Settings, label: 'Cài đặt' },
        ];

        const managerItems = [
            { path: '/manager/home', icon: LayoutDashboard, label: 'Trang chủ' },
            { path: '/inventory', icon: Box, label: 'Quản lý kho' },
            { path: '/suppliers', icon: Truck, label: 'Nhà cung cấp' },
            { path: '/orders', icon: ShoppingCart, label: 'Đơn hàng' },
            { path: '/reports', icon: FileText, label: 'Báo cáo' },
        ];

        const staffItems = [
            { path: '/staff/home', icon: LayoutDashboard, label: 'Trang chủ' },
            { path: '/orders', icon: ShoppingCart, label: 'Đơn hàng' },
        ];

        // Role-based menu rendering
        if (role === 'ADMIN') {
            return [...common, ...adminItems];
        } else if (role === 'MANAGER' || role === 'Warehouse Manager') {
            return [...common, ...managerItems];
        }

        return [...common, ...staffItems];
    };

    const menuItems = getMenuItems(user.role);

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
            {/* Header / Logo */}
            <div className="sidebar-header">
                <div className="logo-container">
                    <img src={logo} alt="Logo" className="logo-image" />
                </div>
            </div>

            {/* Toggle Button - Circular, centered on right edge */}
            <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title={isCollapsed ? "Mở rộng" : "Thu gọn"}
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>



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
