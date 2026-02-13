import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Package,
    AlertTriangle,
    Clock,
    Plus,
    User
} from 'lucide-react';
import '../styles/Home.css';
import logoImg from '../assets/logo.png';

const Home = () => {
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Toggle Sidebar
    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    // Logout Handler
    const handleLogout = () => {
        // Clear auth token logic here
        navigate('/login');
    };

    // Navigate to Profile
    const handleProfileClick = () => {
        navigate('/profile');
    };

    // Mock Data for Dashboard Content
    const stats = [
        { label: 'Tổng Sản Phẩm', value: '1,248', icon: Package, colorClass: 'stat-blue' },
        { label: 'Nhà Cung Cấp', value: '48', icon: Truck, colorClass: 'stat-green' },
        { label: 'Đơn Hàng Mới', value: '86', icon: ShoppingCart, colorClass: 'stat-purple' },
        { label: 'Cảnh Báo', value: '12', icon: AlertTriangle, colorClass: 'stat-orange' },
    ];

    return (
        <div className="home-layout">

            {/* --- SIDEBAR SECTION --- */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>

                {/* Header: Logo Only */}
                <div className="sidebar-header">
                    {!isCollapsed && (
                        <div className="logo-area">
                            <img src={logoImg} alt="Warehouse Logo" className="logo-img" />
                        </div>
                    )}
                </div>

                {/* Toggle Button - Positioned at middle-right edge */}
                <button
                    className="sidebar-toggle-btn"
                    onClick={toggleSidebar}
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                {/* Menu Items (Centered) */}
                <nav className="sidebar-menu">
                    <div className="menu-group">
                        <div className="menu-item active" title="Dashboard">
                            <LayoutDashboard size={20} />
                            {!isCollapsed && <span className="menu-label">Dashboard</span>}
                        </div>

                        <div className="menu-item" title="Kho hàng">
                            <Box size={20} />
                            {!isCollapsed && <span className="menu-label">Kho hàng</span>}
                        </div>

                        <div className="menu-item" title="Nhà cung cấp">
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

                {/* Profile Block (Sticky Bottom) */}
                <div className="sidebar-profile" onClick={handleProfileClick} title="Xem hồ sơ cá nhân">
                    <div className="profile-avatar">
                        <User size={20} />
                    </div>

                    {!isCollapsed && (
                        <div className="profile-info">
                            <span className="user-name">Nguyễn Văn A</span>
                            <span className="user-role">Quản lý kho</span>
                        </div>
                    )}

                    {!isCollapsed && (
                        <button
                            className="logout-btn-icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLogout();
                            }}
                            title="Đăng xuất"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </aside>

            {/* --- MAIN CONTENT SECTION --- */}
            <main className="main-content">
                <div className="content-container">

                    {/* Welcome Header */}
                    <div className="welcome-section">
                        <h1 className="welcome-title">Tổng quan hệ thống</h1>
                        <p className="welcome-subtitle">Cập nhật lúc: {new Date().toLocaleTimeString()} - {new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-card">
                                <div className={`stat-icon-wrapper ${stat.colorClass}`}>
                                    <stat.icon size={24} />
                                </div>
                                <div className="stat-details">
                                    <div className="stat-value">{stat.value}</div>
                                    <div className="stat-label">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Activity Area */}
                    <div className="dashboard-panels">
                        {/* Chart Area */}
                        <div className="panel chart-panel">
                            <div className="panel-header">
                                <h3>Biểu đồ nhập xuất tuần này</h3>
                                <button className="link-btn">Chi tiết</button>
                            </div>
                            <div className="chart-placeholder">
                                {/* Simple CSS Chart Bars */}
                                <div className="bar" style={{ height: '40%' }} title="T2"></div>
                                <div className="bar" style={{ height: '70%' }} title="T3"></div>
                                <div className="bar" style={{ height: '50%' }} title="T4"></div>
                                <div className="bar" style={{ height: '90%' }} title="T5"></div>
                                <div className="bar" style={{ height: '60%' }} title="T6"></div>
                                <div className="bar" style={{ height: '80%' }} title="T7"></div>
                                <div className="bar" style={{ height: '45%' }} title="CN"></div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="panel activity-panel">
                            <div className="panel-header">
                                <h3>Hoạt động gần đây</h3>
                                <button className="link-btn">Xem tất cả</button>
                            </div>
                            <div className="activity-list">
                                <div className="activity-item">
                                    <div className="act-icon bg-blue"><Package size={16} /></div>
                                    <div className="act-text">
                                        <p><strong>Admin</strong> nhập kho 50 iPhone 15</p>
                                        <span>2 giờ trước</span>
                                    </div>
                                </div>
                                <div className="activity-item">
                                    <div className="act-icon bg-green"><Truck size={16} /></div>
                                    <div className="act-text">
                                        <p><strong>NV Kho</strong> xuất đơn hàng #DH005</p>
                                        <span>4 giờ trước</span>
                                    </div>
                                </div>
                                <div className="activity-item">
                                    <div className="act-icon bg-orange"><AlertTriangle size={16} /></div>
                                    <div className="act-text">
                                        <p>Cảnh báo tồn kho thấp: Samsung S24</p>
                                        <span>1 ngày trước</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions-bar">
                        <h3>Thao tác nhanh</h3>
                        <div className="quick-buttons">
                            <button className="quick-btn" onClick={() => navigate('/supplier/create')}>
                                <Plus size={18} /> Tạo nhà cung cấp
                            </button>
                            <button className="quick-btn">
                                <Plus size={18} /> Thêm sản phẩm mới
                            </button>
                            <button className="quick-btn">
                                <Plus size={18} /> Tạo đơn xuất kho
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Home;
