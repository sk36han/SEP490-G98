import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    FileText,
    Truck,
    ShoppingCart,
    User,
} from 'lucide-react';
import '../styles/Home.css';
import logoImg from '../assets/logo.png';

/**
 * Layout chuẩn của dự án: sidebar (giống Home) + Outlet.
 * Supplier View và Dashboard hiển thị trong main content, không đổi sidebar.
 */
const HomeLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);
    const handleLogout = () => navigate('/login');
    const handleProfileClick = () => navigate('/profile');

    const isDashboard = location.pathname === '/home' || location.pathname === '/home/';
    const isSuppliers = location.pathname.startsWith('/home/suppliers');

    return (
        <div className="home-layout">
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
                <div className="sidebar-header">
                    {!isCollapsed && (
                        <div className="logo-area">
                            <img src={logoImg} alt="Warehouse Logo" className="logo-img" />
                        </div>
                    )}
                </div>
                <button
                    className="sidebar-toggle-btn"
                    onClick={toggleSidebar}
                    title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <nav className="sidebar-menu">
                    <div className="menu-group">
                        <div
                            className={`menu-item ${isDashboard ? 'active' : ''}`}
                            title="Dashboard"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/home')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/home'); } }}
                        >
                            <LayoutDashboard size={20} />
                            {!isCollapsed && <span className="menu-label">Dashboard</span>}
                        </div>
                        <div className="menu-item" title="Kho hàng">
                            <Box size={20} />
                            {!isCollapsed && <span className="menu-label">Kho hàng</span>}
                        </div>
                        <div
                            className={`menu-item ${isSuppliers ? 'active' : ''}`}
                            title="Nhà cung cấp"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/home/suppliers')}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/home/suppliers'); } }}
                        >
                            <Truck size={20} />
                            {!isCollapsed && <span className="menu-label">Nhà cung cấp</span>}
                        </div>
                        <div className="menu-item" title="Đơn hàng">
                            <ShoppingCart size={20} />
                            {!isCollapsed && <span className="menu-label">Đơn hàng</span>}
                        </div>
                        <div className="menu-item" title="Báo cáo">
                            <FileText size={20} />
                            {!isCollapsed && <span className="menu-label">Báo cáo</span>}
                        </div>
                        <div className="menu-item" title="Nhân viên">
                            <Users size={20} />
                            {!isCollapsed && <span className="menu-label">Nhân viên</span>}
                        </div>
                        <div className="menu-item" title="Cài đặt">
                            <Settings size={20} />
                            {!isCollapsed && <span className="menu-label">Cài đặt</span>}
                        </div>
                    </div>
                </nav>
                <div className="sidebar-profile" onClick={handleProfileClick} title="Xem hồ sơ cá nhân">
                    <div className="profile-avatar">
                        <User size={20} />
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="profile-info">
                                <span className="user-name">Nguyễn Văn A</span>
                                <span className="user-role">Quản lý kho</span>
                            </div>
                            <button type="button" className="logout-btn-icon" onClick={(e) => { e.stopPropagation(); handleLogout(); }} title="Đăng xuất">
                                <LogOut size={18} />
                            </button>
                        </>
                    )}
                </div>
            </aside>
            <main className="main-content">
                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default HomeLayout;
