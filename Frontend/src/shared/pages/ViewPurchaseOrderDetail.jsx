import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    MapPin,
    User,
    Calendar,
    Package,
    Eye,
    ImageIcon,
    Edit,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    Save,
    X,
    Loader
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

const ViewPurchaseOrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const MAX_JUSTIFICATION_LENGTH = 250;

    // Mock data - sau này sẽ load từ API
    const [orderData, setOrderData] = useState({
        purchaseOrderId: 1,
        orderCode: 'PO-2025-001',
        supplierName: 'Công ty TNHH ABC',
        warehouseName: 'Kho Hà Nội',
        creatorName: 'Nguyễn Văn A',
        responsiblePersonName: 'Trần Thị B',
        expectedReceiptDate: '2025-03-15',
        justification: 'Đặt hàng bổ sung tồn kho cho quý 1/2025',
        discount: 5,
        approvalStatus: 'Approved', // Pending, Approved, Rejected
        receivingStatus: 'Partial', // Pending, Partial, Completed
        createdAt: '2025-03-01',
        lines: [
            {
                id: 1,
                itemId: 1,
                itemName: 'Laptop Dell XPS 13',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 10,
                receivedQty: 5,
                unitPrice: 25000000,
                totalPrice: 250000000,
                note: 'Cần giao trước ngày 15/3'
            },
            {
                id: 2,
                itemId: 2,
                itemName: 'Màn hình LG 27 inch',
                itemImage: null,
                orderedQty: 20,
                receivedQty: 20,
                unitPrice: 5000000,
                totalPrice: 100000000,
                note: ''
            },
            {
                id: 3,
                itemId: 3,
                itemName: 'Bàn phím cơ Keychron',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 15,
                receivedQty: 0,
                unitPrice: 2000000,
                totalPrice: 30000000,
                note: 'Ưu tiên giao sớm'
            },
            {
                id: 4,
                itemId: 4,
                itemName: 'Chuột Logitech MX Master 3',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 25,
                receivedQty: 15,
                unitPrice: 1500000,
                totalPrice: 37500000,
                note: ''
            },
            {
                id: 5,
                itemId: 5,
                itemName: 'Tai nghe Sony WH-1000XM4',
                itemImage: null,
                orderedQty: 12,
                receivedQty: 12,
                unitPrice: 7000000,
                totalPrice: 84000000,
                note: 'Đã nhập đủ'
            },
            {
                id: 6,
                itemId: 6,
                itemName: 'Webcam Logitech C920',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 30,
                receivedQty: 10,
                unitPrice: 1800000,
                totalPrice: 54000000,
                note: 'Còn thiếu 20 cái'
            },
            {
                id: 7,
                itemId: 7,
                itemName: 'USB Hub Anker 7-Port',
                itemImage: null,
                orderedQty: 40,
                receivedQty: 0,
                unitPrice: 500000,
                totalPrice: 20000000,
                note: 'Chưa nhập'
            },
            {
                id: 8,
                itemId: 8,
                itemName: 'Đế tản nhiệt laptop Cooler Master',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 18,
                receivedQty: 18,
                unitPrice: 800000,
                totalPrice: 14400000,
                note: ''
            },
            {
                id: 9,
                itemId: 9,
                itemName: 'Ổ cứng SSD Samsung 1TB',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 50,
                receivedQty: 25,
                unitPrice: 2500000,
                totalPrice: 125000000,
                note: 'Nhập từng đợt'
            },
            {
                id: 10,
                itemId: 10,
                itemName: 'RAM Corsair 16GB DDR4',
                itemImage: null,
                orderedQty: 35,
                receivedQty: 35,
                unitPrice: 1200000,
                totalPrice: 42000000,
                note: 'Hoàn thành'
            },
            {
                id: 11,
                itemId: 11,
                itemName: 'Cable HDMI 2.1 - 2m',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 100,
                receivedQty: 50,
                unitPrice: 150000,
                totalPrice: 15000000,
                note: 'Giao nốt 50 cái'
            },
            {
                id: 12,
                itemId: 12,
                itemName: 'Loa Bluetooth JBL Flip 5',
                itemImage: null,
                orderedQty: 22,
                receivedQty: 0,
                unitPrice: 2200000,
                totalPrice: 48400000,
                note: 'Đang chờ hàng về'
            },
            {
                id: 13,
                itemId: 13,
                itemName: 'Bộ chuyển đổi USB-C Hub',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 45,
                receivedQty: 22,
                unitPrice: 650000,
                totalPrice: 29250000,
                note: 'Còn thiếu 23 cái'
            },
            {
                id: 14,
                itemId: 14,
                itemName: 'Micro không dây Rode Wireless Go',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 8,
                receivedQty: 8,
                unitPrice: 5500000,
                totalPrice: 44000000,
                note: ''
            },
            {
                id: 15,
                itemId: 15,
                itemName: 'Đèn LED ring light 18 inch',
                itemImage: null,
                orderedQty: 16,
                receivedQty: 5,
                unitPrice: 1100000,
                totalPrice: 17600000,
                note: 'Đợt 1: 5 cái'
            }
        ],
        history: [
            { time: '14:30', phone: '0866563616', action: 'Đã phê duyệt đơn hàng', date: '2025-03-02' },
            { time: '10:15', phone: '0866563616', action: 'Gửi yêu cầu phê duyệt', date: '2025-03-01' },
            { time: '09:00', phone: '0866563616', action: 'Thêm mới đơn nhập hàng PO-2025-001', date: '2025-03-01' }
        ]
    });

    useEffect(() => {
        // Mock load data
        setTimeout(() => {
            setLoading(false);
        }, 500);
    }, [id]);

    const handleImageError = (id) => {
        setImageErrors(prev => ({ ...prev, [id]: true }));
    };

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const totalQuantity = orderData.lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const totalReceivedQty = orderData.lines.reduce((sum, line) => sum + (Number(line.receivedQty) || 0), 0);
    const subtotal = orderData.lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount = (subtotal * (Number(orderData.discount) || 0)) / 100;
    const grandTotal = subtotal - discountAmount;

    const getApprovalStatusStyle = (status) => {
        const styles = {
            'Pending': { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
            'Approved': { label: 'Đã duyệt', color: '#10b981', bgColor: '#d1fae5' },
            'Rejected': { label: 'Từ chối', color: '#ef4444', bgColor: '#fee2e2' }
        };
        return styles[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    };

    const getReceivingStatusStyle = (status) => {
        const styles = {
            'Pending': { label: 'Chờ nhập', color: '#f59e0b', bgColor: '#fef3c7' },
            'Partial': { label: 'Nhập một phần', color: '#3b82f6', bgColor: '#dbeafe' },
            'Completed': { label: 'Hoàn thành', color: '#10b981', bgColor: '#d1fae5' }
        };
        return styles[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    };

    const approvalStyle = getApprovalStatusStyle(orderData.approvalStatus);
    const receivingStyle = getReceivingStatusStyle(orderData.receivingStatus);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Giới hạn 250 ký tự cho trường justification
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) {
            return;
        }
        
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const updateLine = (index, field, value) => {
        setOrderData(prev => ({
            ...prev,
            lines: prev.lines.map((line, i) => {
                if (i === index) {
                    const updated = { ...line, [field]: value };
                    if (field === 'orderedQty' || field === 'unitPrice') {
                        updated.totalPrice = (Number(updated.orderedQty) || 0) * (Number(updated.unitPrice) || 0);
                    }
                    return updated;
                }
                return line;
            })
        }));
    };

    const handleSave = async () => {
        try {
            setSubmitting(true);
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Cập nhật đơn mua hàng thành công!', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reload data
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    if (loading) {
        return (
            <div className="create-supplier-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    {!isEditing ? (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit size={16} className="btn-icon" />
                            Chỉnh sửa
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-cancel"
                                disabled={submitting}
                            >
                                <X size={16} className="btn-icon" />
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submitting}
                                onClick={handleSave}
                            >
                                {submitting ? (
                                    <>
                                        <Loader size={16} className="btn-icon spinner" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} className="btn-icon" />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </>
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
                                <h1 className="page-title">Chi tiết đơn mua hàng</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã đơn: <span style={{ fontWeight: 600, color: '#2196F3' }}>{orderData.orderCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: approvalStyle.bgColor,
                                    color: approvalStyle.color,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {orderData.approvalStatus === 'Approved' && <CheckCircle size={16} />}
                                    {orderData.approvalStatus === 'Rejected' && <XCircle size={16} />}
                                    {orderData.approvalStatus === 'Pending' && <Clock size={16} />}
                                    {approvalStyle.label}
                                </div>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: receivingStyle.bgColor,
                                    color: receivingStyle.color,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {orderData.receivingStatus === 'Completed' && <CheckCircle size={16} />}
                                    {orderData.receivingStatus === 'Partial' && <Clock size={16} />}
                                    {orderData.receivingStatus === 'Pending' && <Clock size={16} />}
                                    {receivingStyle.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Chi tiết sản phẩm (trái) + Nhân viên (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'stretch' }}>
                        {/* 1. Chi tiết sản phẩm (Trái) */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm (PO Lines)</h2>
                            </div>

                            <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>STT</th>
                                            <th>Sản phẩm</th>
                                            <th style={{ width: '100px' }}>SL đặt</th>
                                            <th style={{ width: '100px' }}>SL đã nhập</th>
                                            <th style={{ width: '100px' }}>SL còn lại</th>
                                            <th style={{ width: '120px' }}>Đơn giá</th>
                                            <th style={{ width: '140px' }}>Thành tiền</th>
                                            <th style={{ width: '180px' }}>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderData.lines.map((line, index) => {
                                            const remainingQty = line.orderedQty - line.receivedQty;
                                            return (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            {/* Ảnh hoặc Icon sản phẩm */}
                                                            {isValidImageUrl(line.itemImage) && !imageErrors[`line-${line.id}`] ? (
                                                                <img 
                                                                    src={line.itemImage} 
                                                                    alt={line.itemName}
                                                                    onError={() => handleImageError(`line-${line.id}`)}
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        objectFit: 'cover',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #e5e7eb',
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    backgroundColor: '#f3f4f6',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Tên sản phẩm và icon Eye */}
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        console.log('View product detail:', line.itemId);
                                                                    }}
                                                                    style={{
                                                                        color: '#2196F3',
                                                                        textDecoration: 'none',
                                                                        fontSize: '14px',
                                                                        fontWeight: 500,
                                                                        flex: 1
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                                >
                                                                    {line.itemName}
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    className="btn-icon-only"
                                                                    style={{ color: '#2196F3' }}
                                                                    title="Xem chi tiết sản phẩm"
                                                                    onClick={() => {
                                                                        console.log('View product detail:', line.itemId);
                                                                    }}
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.orderedQty}
                                                                onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                                                min="1"
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '100%' }}
                                                            />
                                                        ) : (
                                                            line.orderedQty
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{line.receivedQty}</td>
                                                    <td style={{ 
                                                        textAlign: 'right', 
                                                        fontWeight: 600,
                                                        color: remainingQty > 0 ? '#f59e0b' : '#6b7280'
                                                    }}>
                                                        {remainingQty}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.unitPrice}
                                                                onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                                                                min="0"
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '100%' }}
                                                            />
                                                        ) : (
                                                            formatCurrency(line.unitPrice)
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: '#6b7280' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={line.note}
                                                                onChange={(e) => updateLine(index, 'note', e.target.value)}
                                                                placeholder="Nhập ghi chú"
                                                                className="form-input"
                                                                style={{ width: '100%' }}
                                                            />
                                                        ) : (
                                                            line.note || '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Nhân viên (Phải) */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Nhân viên</h2>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={orderData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Nhân viên phụ trách */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên phụ trách</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="responsiblePersonName"
                                            value={orderData.responsiblePersonName || ''}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                            placeholder={isEditing ? "Chọn nhân viên phụ trách" : "-"}
                                        />
                                    </div>
                                </div>

                                {/* Kho nhận */}
                                <div className="form-field">
                                    <label className="form-label">Kho nhận</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="warehouseName"
                                            value={orderData.warehouseName}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Ngày dự kiến nhập */}
                                <div className="form-field">
                                    <label className="form-label">Ngày dự kiến nhập</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type={isEditing ? "date" : "text"}
                                            name="expectedReceiptDate"
                                            value={isEditing ? orderData.expectedReceiptDate : new Date(orderData.expectedReceiptDate).toLocaleDateString('vi-VN')}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Ngày tạo */}
                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={new Date(orderData.createdAt).toLocaleDateString('vi-VN')}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: (Nhà cung cấp + Ghi chú + Tổng hợp) (trái), Lịch sử (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Cột trái: Nhà cung cấp + Ghi chú + Tổng hợp */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 3. Nhà cung cấp */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper">
                                        <Building2 className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="supplierName"
                                            value={orderData.supplierName}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú / Lý do đặt hàng</label>
                                    <textarea
                                        name="justification"
                                        value={orderData.justification || ''}
                                        onChange={handleChange}
                                        readOnly={!isEditing}
                                        rows={4}
                                        className="form-input"
                                        placeholder={isEditing ? "Nhập ghi chú / lý do đặt hàng" : ""}
                                        style={{ resize: 'vertical', backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                    />
                                    {isEditing && (
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'flex-end', 
                                            fontSize: '12px', 
                                            color: orderData.justification.length >= MAX_JUSTIFICATION_LENGTH ? '#ef4444' : '#6b7280',
                                            marginTop: '4px',
                                            fontWeight: 500
                                        }}>
                                            {orderData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 5. Tổng hợp */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label">Tổng số lượng đặt</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                            {totalQuantity} sản phẩm
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Tổng số lượng đã nhập</label>
                                        <div style={{ padding: '10px', backgroundColor: '#d1fae5', borderRadius: '8px', fontWeight: 600, color: '#10b981' }}>
                                            {totalReceivedQty} sản phẩm
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Tạm tính</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                            {formatCurrency(subtotal)}
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Chiết khấu (%)</label>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                name="discount"
                                                value={orderData.discount}
                                                onChange={handleChange}
                                                min="0"
                                                max="100"
                                                className="form-input"
                                            />
                                        ) : (
                                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                                {orderData.discount}%
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-field span-2">
                                        <div style={{ 
                                            padding: '20px', 
                                            backgroundColor: '#e3f2fd', 
                                            borderRadius: '12px', 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderLeft: '4px solid #2196F3'
                                        }}>
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#2196F3' }}>
                                                Tổng giá trị đơn:
                                            </span>
                                            <span style={{ fontSize: '24px', fontWeight: 700, color: '#2196F3' }}>
                                                {formatCurrency(grandTotal)}
                                            </span>
                                        </div>
                                        
                                        <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Chiết khấu:</span>
                                                <span style={{ color: '#ef4444' }}>- {formatCurrency(discountAmount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải: Lịch sử đơn đặt hàng nhập */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Lịch sử đơn đặt hàng nhập</h2>
                            </div>
                            
                            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {orderData.history.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ 
                                                width: '10px', 
                                                height: '10px', 
                                                borderRadius: '50%', 
                                                backgroundColor: index === 0 ? '#2196F3' : '#9ca3af',
                                                marginTop: '6px',
                                                flexShrink: 0
                                            }}></div>
                                            <div style={{ 
                                                flex: 1, 
                                                borderLeft: index < orderData.history.length - 1 ? '2px solid #e5e7eb' : 'none',
                                                paddingLeft: '16px', 
                                                paddingBottom: index < orderData.history.length - 1 ? '12px' : '0'
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    marginBottom: '8px',
                                                    flexWrap: 'wrap',
                                                    gap: '8px'
                                                }}>
                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.time}</span>
                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.phone}</span>
                                                    <span style={{ fontSize: '13px', color: '#2196F3', fontWeight: 600 }}>
                                                        {item.action}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.date}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default ViewPurchaseOrderDetail;
