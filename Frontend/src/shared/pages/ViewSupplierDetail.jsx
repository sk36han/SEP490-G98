import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
} from '@mui/material';
import {
    ArrowLeft,
    Building2,
    FileText,
    Phone,
    Mail,
    MapPin,
    Calendar,
    User,
    Package,
    Truck,
    AlertCircle,
    Edit,
} from 'lucide-react';
import MonthPickerCalendar from '../components/DateRangePicker';
import '../styles/CreateSupplier.css';

// Mock data for testing
const MOCK_SUPPLIER = {
    supplierId: 'SUP001',
    supplierCode: 'NCC001',
    supplierName: 'Công Ty TNHH Thương Mại ABC',
    taxCode: '0123456789',
    phone: '028 1234 5678',
    email: 'contact@abccorp.com',
    address: '123 Đường Lạc Long Quân',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    isActive: true,
    createdByName: 'Nguyễn Văn A',
    createdDate: '2024-01-15T10:30:00Z',
};

const MOCK_STATS = {
    createdGRNs: 5,
    createdGRNsAmount: 150000000,
    pendingPaymentGRNs: 2,
    pendingPaymentGRNsAmount: 45000000,
    createdReturnOrders: 1,
    createdReturnOrdersAmount: 12000000,
    pendingRefundReturnOrders: 0,
    pendingRefundReturnOrdersAmount: 0,
};

const MOCK_HISTORY = [
    {
        time: '14:30',
        date: '20/01/2025',
        title: 'Tạo đơn nhập hàng #GRN001',
        user: 'Nguyễn Văn A',
    },
    {
        time: '10:15',
        date: '18/01/2025',
        title: 'Cập nhật thông tin nhà cung cấp',
        user: 'Nguyễn Văn B',
    },
    {
        time: '09:00',
        date: '15/01/2025',
        title: 'Tạo đơn nhập hàng #GRN002',
        user: 'Nguyễn Văn A',
    },
];

const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
};

export default function ViewSupplierDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');

    // Handle month selection from MonthPickerCalendar
    const handleMonthChange = (dateInfo) => {
        if (dateInfo) {
            setDateFrom(dateInfo.from);
            setDateTo(dateInfo.to);
        }
    };

    useEffect(() => {
        // Simulate API loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Đang tải...</Typography>
            </Box>
        );
    }

    const supplier = MOCK_SUPPLIER;
    const stats = MOCK_STATS;
    const history = MOCK_HISTORY;

    return (
        <Box className="supplier-detail-page" sx={{ p: 3 }}>
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/suppliers')} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary">
                        <Edit size={16} className="btn-icon" />
                        Chỉnh sửa
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <div className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h1 className="page-title">Chi tiết nhà cung cấp</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã NCC: <span style={{ fontWeight: 600, color: '#2196F3' }}>{supplier.supplierCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: supplier.isActive ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)',
                                    color: supplier.isActive ? '#059669' : '#dc2626',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                }}>
                                    {supplier.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - 2 columns layout */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start', mt: 3 }}>
                        {/* Left Column - Thống kê và Lịch sử */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Card 1: Thống kê đơn hàng */}
                            <div className="info-section">
                                <div className="section-header-with-toggle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 className="section-title">Thống kê đơn hàng</h2>
                                </div>
                                {/* Calendar for month selection */}
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                    {/* Left: Calendar */}
                                    <Box sx={{ width: '40%', minWidth: 200 }}>
                                        <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                                            Chọn tháng
                                        </Typography>
                                        <MonthPickerCalendar
                                            value={dateFrom}
                                            onChange={handleMonthChange}
                                        />
                                    </Box>

                                    {/* Right: Stats */}
                                    <Box sx={{ width: '60%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {/* Đơn nhập đã tạo */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Package size={18} color="#0284c7" />
                                                <Typography sx={{ fontSize: '13px', color: '#374151' }}>
                                                    Đơn nhập đã tạo
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography sx={{ fontWeight: 700, color: '#0284c7', fontSize: '14px' }}>
                                                    {stats.createdGRNs} đơn
                                                </Typography>
                                                <Typography sx={{ fontSize: '12px', color: '#0284c7' }}>
                                                    {formatCurrency(stats.createdGRNsAmount)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {/* Đơn nhập chưa thanh toán */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#fef3c7', borderRadius: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <AlertCircle size={18} color="#d97706" />
                                                <Typography sx={{ fontSize: '13px', color: '#374151' }}>
                                                    Đơn nhập chưa thanh toán
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography sx={{ fontWeight: 700, color: '#d97706', fontSize: '14px' }}>
                                                    {stats.pendingPaymentGRNs} đơn
                                                </Typography>
                                                <Typography sx={{ fontSize: '12px', color: '#d97706' }}>
                                                    {formatCurrency(stats.pendingPaymentGRNsAmount)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {/* Đơn trả đã tạo */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Truck size={18} color="#16a34a" />
                                                <Typography sx={{ fontSize: '13px', color: '#374151' }}>
                                                    Đơn trả đã tạo
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography sx={{ fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>
                                                    {stats.createdReturnOrders} đơn
                                                </Typography>
                                                <Typography sx={{ fontSize: '12px', color: '#16a34a' }}>
                                                    {formatCurrency(stats.createdReturnOrdersAmount)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {/* Đơn trả chưa nhận hoàn tiền */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#fef2f2', borderRadius: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <AlertCircle size={18} color="#dc2626" />
                                                <Typography sx={{ fontSize: '13px', color: '#374151' }}>
                                                    Đơn trả chưa nhận hoàn tiền
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography sx={{ fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>
                                                    {stats.pendingRefundReturnOrders} đơn
                                                </Typography>
                                                <Typography sx={{ fontSize: '12px', color: '#dc2626' }}>
                                                    {formatCurrency(stats.pendingRefundReturnOrdersAmount)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </div>

                            {/* Card 2: Lịch sử nhập/trả hàng */}
                            <div className="info-section">
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Lịch sử nhập/trả hàng</h2>
                                </div>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {history.map((item, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    gap: 2,
                                                    alignItems: 'flex-start',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: index === 0 ? '#2196F3' : '#9ca3af',
                                                        mt: 0.75,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        borderLeft: index < history.length - 1 ? '2px solid #e5e7eb' : 'none',
                                                        pl: 2,
                                                        pb: index < history.length - 1 ? 2 : 0,
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                                            {item.time}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                                                            {item.date}
                                                        </Typography>
                                                    </Box>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#2563eb', mb: 0.25 }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                                                        {item.user}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </div>
                        </Box>

                        {/* Right Column - Thông tin chung và Địa chỉ (350px fixed) */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Card 3: Thông tin chung */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        
                                    <div className="form-field">
                                        <label className="form-label">Tên nhà cung cấp</label>
                                        <div className="input-wrapper">
                                            <Building2 className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.supplierName || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Mã số thuế</label>
                                        <div className="input-wrapper">
                                            <FileText className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.taxCode || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Số điện thoại</label>
                                        <div className="input-wrapper">
                                            <Phone className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.phone || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Email</label>
                                        <div className="input-wrapper">
                                            <Mail className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.email || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Trạng thái</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                                                readOnly
                                                className="form-input"
                                                style={{
                                                    backgroundColor: '#f5f5f5',
                                                    color: supplier.isActive ? '#059669' : '#dc2626',
                                                    fontWeight: 600,
                                                }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.createdByName || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ngày tạo</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={formatDate(supplier.createdDate)}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                                placeholder="-"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Địa chỉ */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Địa chỉ</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Tỉnh/Thành phố</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={supplier.city || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Quận/Huyện</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={supplier.district || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Phường/Xã</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={supplier.ward || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Địa chỉ cụ thể</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={supplier.address || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                            placeholder="-"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Box>
                    </Box>
                </div>
            </div>
        </Box>
    );
}
