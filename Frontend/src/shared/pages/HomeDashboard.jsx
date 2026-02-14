import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShoppingCart, Package, AlertTriangle, Plus } from 'lucide-react';
import '../styles/Home.css';

/** Dashboard content (trang tổng quan) – render bên trong HomeLayout. */
const HomeDashboard = () => {
    const navigate = useNavigate();
    const stats = [
        { label: 'Tổng Sản Phẩm', value: '1,248', icon: Package, colorClass: 'stat-blue' },
        { label: 'Nhà Cung Cấp', value: '48', icon: Truck, colorClass: 'stat-green' },
        { label: 'Đơn Hàng Mới', value: '86', icon: ShoppingCart, colorClass: 'stat-purple' },
        { label: 'Cảnh Báo', value: '12', icon: AlertTriangle, colorClass: 'stat-orange' },
    ];

    return (
        <>
            <div className="welcome-section">
                <h1 className="welcome-title">Tổng quan hệ thống</h1>
                <p className="welcome-subtitle">Cập nhật lúc: {new Date().toLocaleTimeString()} - {new Date().toLocaleDateString()}</p>
            </div>
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
            <div className="dashboard-panels">
                <div className="panel chart-panel">
                    <div className="panel-header">
                        <h3>Biểu đồ nhập xuất tuần này</h3>
                        <button type="button" className="link-btn">Chi tiết</button>
                    </div>
                    <div className="chart-placeholder">
                        <div className="bar" style={{ height: '40%' }} title="T2" />
                        <div className="bar" style={{ height: '70%' }} title="T3" />
                        <div className="bar" style={{ height: '50%' }} title="T4" />
                        <div className="bar" style={{ height: '90%' }} title="T5" />
                        <div className="bar" style={{ height: '60%' }} title="T6" />
                        <div className="bar" style={{ height: '80%' }} title="T7" />
                        <div className="bar" style={{ height: '45%' }} title="CN" />
                    </div>
                </div>
                <div className="panel activity-panel">
                    <div className="panel-header">
                        <h3>Hoạt động gần đây</h3>
                        <button type="button" className="link-btn">Xem tất cả</button>
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
            <div className="quick-actions-bar">
                <h3>Thao tác nhanh</h3>
                <div className="quick-buttons">
                    <button type="button" className="quick-btn" onClick={() => navigate('/supplier/create')}>
                        <Plus size={18} /> Tạo nhà cung cấp
                    </button>
                    <button type="button" className="quick-btn">
                        <Plus size={18} /> Thêm sản phẩm mới
                    </button>
                    <button type="button" className="quick-btn">
                        <Plus size={18} /> Tạo đơn xuất kho
                    </button>
                </div>
            </div>
        </>
    );
};

export default HomeDashboard;
