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
    RefreshCw,
} from 'lucide-react';
import DateRangeFilter from '../components/DateRangeFilter';
import { getSupplierById, getSupplierTransactions, updateSupplier } from '../lib/supplierService';
import '../styles/CreateSupplier.css';

const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return { time: '-', date: '-' };
    const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    return {
        time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    };
};

export default function ViewSupplierDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [statsSummary, setStatsSummary] = useState(null);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);

    const handleEditToggle = () => {
        setEditData({
            supplierName: supplier?.supplierName || '',
            taxCode: supplier?.taxCode || '',
            phone: supplier?.phone || '',
            email: supplier?.email || '',
            address: supplier?.address || '',
            city: supplier?.city || '',
            district: supplier?.district || '',
            ward: supplier?.ward || '',
        });
        setIsEditing(true);
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditData({});
    };

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSave = async () => {
        if (!editData.supplierName?.trim()) {
            alert('Tên nhà cung cấp là bắt buộc.');
            return;
        }
        setSaving(true);
        try {
            await updateSupplier(id, {
                supplierName: editData.supplierName.trim(),
                taxCode: editData.taxCode?.trim() || null,
                phone: editData.phone?.trim() || null,
                email: editData.email?.trim() || null,
                address: editData.address?.trim() || null,
                city: editData.city?.trim() || null,
                district: editData.district?.trim() || null,
                ward: editData.ward?.trim() || null,
                isActive: supplier?.isActive,
            });
            setIsEditing(false);
            await fetchSupplier(true);
        } catch (err) {
            alert(err.message || 'Lỗi khi cập nhật nhà cung cấp.');
        } finally {
            setSaving(false);
        }
    };

    const fetchSupplier = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await getSupplierById(id);
            setSupplier(data);
        } catch (err) {
            setError(err.message || 'Không thể tải thông tin nhà cung cấp.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchTransactions = async () => {
        setLoadingTransactions(true);
        try {
            const res = await getSupplierTransactions(id, {
                fromDate: dateFrom || null,
                toDate: dateTo || null,
            });
            setStatsSummary(res?.summary || null);
            setTransactions(res?.history?.items || []);
        } catch (err) {
            console.error('Failed to load transactions:', err);
        } finally {
            setLoadingTransactions(false);
        }
    };

    useEffect(() => {
        fetchSupplier();
        fetchTransactions();
    }, [id]);

    const handleDateFromChange = (date) => setDateFrom(date || '');
    const handleDateToChange = (date) => setDateTo(date || '');

    if (loading) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Đang tải...</Typography>
            </Box>
        );
    }

    if (error || !supplier) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">{error || 'Không tìm thấy nhà cung cấp.'}</Typography>
                <Box sx={{ mt: 2 }}>
                    <button type="button" onClick={() => navigate('/suppliers')} className="btn btn-secondary">
                        Quay lại danh sách
                    </button>
                </Box>
            </Box>
        );
    }

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
                    <button
                        type="button"
                        onClick={() => fetchSupplier(true)}
                        className="btn btn-secondary"
                        disabled={refreshing}
                        title="Tải lại"
                    >
                        <RefreshCw size={16} className={`btn-icon ${refreshing ? 'spinning' : ''}`} />
                        Làm mới
                    </button>
                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleEditCancel}
                                disabled={saving}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleEditSave}
                                disabled={saving}
                            >
                                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleEditToggle}
                        >
                            <Edit size={16} className="btn-icon" />
                            Chỉnh sửa
                        </button>
                    )}
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
                                {/* Date range filter */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                    {/* Left: Date Range Filter */}
                                    <Box sx={{ width: '40%', minWidth: 220 }}>
                                        <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 0.5, fontWeight: 500 }}>
                                            Chọn thời gian
                                        </Typography>
                                        <DateRangeFilter
                                            fromDate={dateFrom}
                                            toDate={dateTo}
                                            onFromDateChange={handleDateFromChange}
                                            onToDateChange={handleDateToChange}
                                            disableFuture
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
                                                    {loadingTransactions ? '...' : (statsSummary?.totalGoodsReceiptNotes ?? 0)} đơn
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
                                                    {loadingTransactions ? '...' : (statsSummary?.totalPurchaseOrders ?? 0)} đơn
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
                                    {loadingTransactions ? (
                                        <Typography sx={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', py: 2 }}>
                                            Đang tải lịch sử...
                                        </Typography>
                                    ) : transactions.length === 0 ? (
                                        <Typography sx={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', py: 2 }}>
                                            Chưa có giao dịch nào
                                        </Typography>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {transactions.map((item, index) => {
                                                const dt = formatDateTime(item.createdAt || item.transactionDate);
                                                const title =
                                                    item.transactionType === 'PO'
                                                        ? `Đơn đặt hàng #${item.transactionCode}`
                                                        : item.transactionType === 'GRN'
                                                            ? `Đơn nhập hàng #${item.transactionCode}`
                                                            : `${item.transactionType} #${item.transactionCode}`;
                                                return (
                                                    <Box
                                                        key={`${item.transactionType}-${item.transactionId}-${index}`}
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
                                                                borderLeft: index < transactions.length - 1 ? '2px solid #e5e7eb' : 'none',
                                                                pl: 2,
                                                                pb: index < transactions.length - 1 ? 2 : 0,
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                                                    {dt.time}
                                                                </Typography>
                                                                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                                                                    {dt.date}
                                                                </Typography>
                                                            </Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#2563eb', mb: 0.25 }}>
                                                                {title}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                                                                {item.createdBy || item.User || '-'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    )}
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
                                                value={isEditing ? editData.supplierName : (supplier.supplierName || '')}
                                                readOnly={!isEditing}
                                                onChange={(e) => handleEditChange('supplierName', e.target.value)}
                                                className="form-input"
                                                style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                                value={isEditing ? editData.taxCode : (supplier.taxCode || '')}
                                                readOnly={!isEditing}
                                                onChange={(e) => handleEditChange('taxCode', e.target.value)}
                                                className="form-input"
                                                style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                                value={isEditing ? editData.phone : (supplier.phone || '')}
                                                readOnly={!isEditing}
                                                onChange={(e) => handleEditChange('phone', e.target.value)}
                                                className="form-input"
                                                style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                                value={isEditing ? editData.email : (supplier.email || '')}
                                                readOnly={!isEditing}
                                                onChange={(e) => handleEditChange('email', e.target.value)}
                                                className="form-input"
                                                style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                        <label className="form-label">Ngày tạo</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={supplier.createdAt ? formatDate(supplier.createdAt) : '-'}
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
                                            value={isEditing ? editData.city : (supplier.city || '')}
                                            readOnly={!isEditing}
                                            onChange={(e) => handleEditChange('city', e.target.value)}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                            value={isEditing ? editData.district : (supplier.district || '')}
                                            readOnly={!isEditing}
                                            onChange={(e) => handleEditChange('district', e.target.value)}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                            value={isEditing ? editData.ward : (supplier.ward || '')}
                                            readOnly={!isEditing}
                                            onChange={(e) => handleEditChange('ward', e.target.value)}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
                                            value={isEditing ? editData.address : (supplier.address || '')}
                                            readOnly={!isEditing}
                                            onChange={(e) => handleEditChange('address', e.target.value)}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? '#fff' : '#f5f5f5' }}
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
