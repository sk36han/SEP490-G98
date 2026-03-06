import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    Building2,
    MapPin,
    User,
    Save,
    Send,
    Loader,
    Calendar,
    Trash2,
    Eye,
    Package
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import '../styles/CreateSupplier.css';

const CreatePurchaseOrder = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();
    
    const [formData, setFormData] = useState({
        supplierId: '',
        supplierName: '',
        warehouseId: '',
        warehouseName: '',
        creatorId: currentUser?.userId || '',
        creatorName: currentUser?.fullName || currentUser?.FullName || '',
        responsiblePersonId: '',
        responsiblePersonName: '',
        expectedReceiptDate: '',
        justification: '',
        discount: 0,
    });

    const MAX_JUSTIFICATION_LENGTH = 250;
    
    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Giới hạn 250 ký tự cho trường justification
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) {
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const addLine = () => {
        const newLine = { 
            id: Date.now(),
            itemId: '', 
            itemName: '', 
            orderedQty: 1, 
            unitPrice: 0,
            totalPrice: 0,
            note: '' 
        };
        setLines((prev) => [...prev, newLine]);
    };

    const updateLine = (index, field, value) => {
        setLines((prev) => prev.map((l, i) => {
            if (i === index) {
                const updated = { ...l, [field]: value };
                if (field === 'orderedQty' || field === 'unitPrice') {
                    updated.totalPrice = (Number(updated.orderedQty) || 0) * (Number(updated.unitPrice) || 0);
                }
                return updated;
            }
            return l;
        }));
    };

    const removeLine = (index) => {
        setLines((prev) => prev.filter((_, i) => i !== index));
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev => 
            prev.includes(lineId) 
                ? prev.filter(id => id !== lineId)
                : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLineIds.length === lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(lines.map(line => line.id));
        }
    };

    const removeSelectedLines = () => {
        if (selectedLineIds.length === 0) return;
        setLines(prev => prev.filter(line => !selectedLineIds.includes(line.id)));
        setSelectedLineIds([]);
    };

    const totalQuantity = lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount = (subtotal * (Number(formData.discount) || 0)) / 100;
    const grandTotal = subtotal - discountAmount;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.supplierName.trim()) {
            newErrors.supplierName = 'Nhà cung cấp là bắt buộc';
        }
        
        if (!formData.warehouseName.trim()) {
            newErrors.warehouseName = 'Kho nhận là bắt buộc';
        }

        const hasInvalidLine = lines.some(line => 
            !line.itemName.trim() || Number(line.orderedQty) <= 0
        );
        
        if (hasInvalidLine) {
            newErrors.lines = 'Vui lòng điền đầy đủ thông tin sản phẩm (Tên, Số lượng > 0)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveDraft = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }

        try {
            setSubmitting(true);
            showToast('Mock: Lưu nháp đơn mua hàng thành công.', 'success');
            setTimeout(() => navigate('/purchase-orders'), 1500);
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitForApproval = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }

        try {
            setSubmitting(true);
            showToast('Mock: Gửi duyệt đơn mua hàng thành công.', 'success');
            setTimeout(() => navigate('/purchase-orders'), 1500);
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={handleCancel} className="btn btn-cancel" disabled={submitting}>
                        <X size={16} className="btn-icon" />
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={submitting}
                        onClick={handleSaveDraft}
                    >
                        <Save size={16} className="btn-icon" />
                        Lưu nháp
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={handleSubmitForApproval}
                    >
                        {submitting ? (
                            <>
                                <Loader size={16} className="btn-icon spinner" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <Send size={16} className="btn-icon" />
                                Gửi duyệt
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form id="create-po-form" className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo đơn mua hàng (Purchase Order)</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Layout 2 cột: Chi tiết sản phẩm (trái) + Nhân viên (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* 1. Chi tiết sản phẩm (Trái) */}
                        <div className="info-section" style={{ margin: 0, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm (PO Lines)</h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {selectedLineIds.length > 0 && (
                                        <button 
                                            type="button" 
                                            onClick={removeSelectedLines} 
                                            className="btn btn-sm"
                                            style={{ 
                                                fontWeight: 600,
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none'
                                            }}
                                        >
                                            <Trash2 size={16} />
                                            Xóa ({selectedLineIds.length})
                                        </button>
                                    )}
                                    <button 
                                        type="button" 
                                        onClick={addLine} 
                                        className="btn btn-sm"
                                        style={{ fontSize: '14px', fontWeight: 600 }}
                                    >
                                        <Plus size={16} />
                                        Thêm sản phẩm
                                    </button>
                                </div>
                            </div>
                            
                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>{errors.lines}</div>
                            )}

                            {lines.length === 0 ? (
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '60px 20px',
                                    color: '#9ca3af'
                                }}>
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có sản phẩm nào</p>
                                    <p style={{ fontSize: '14px', margin: 0 }}>Nhấn "Thêm sản phẩm" để bắt đầu</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={lines.length > 0 && selectedLineIds.length === lines.length}
                                                        onChange={toggleSelectAll}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </th>
                                                <th style={{ width: '40px' }}>STT</th>
                                                <th>Sản phẩm *</th>
                                                <th style={{ width: '100px' }}>SL đặt *</th>
                                                <th style={{ width: '120px' }}>Đơn giá</th>
                                                <th style={{ width: '140px' }}>Thành tiền</th>
                                                <th style={{ width: '180px' }}>Ghi chú</th>
                                                <th style={{ width: '60px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLineIds.includes(line.id)}
                                                            onChange={() => toggleLineSelection(line.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                value={line.itemName}
                                                                onChange={(e) => updateLine(index, 'itemName', e.target.value)}
                                                                placeholder="Nhập tên sản phẩm"
                                                                className="form-input"
                                                                style={{ minWidth: '200px', flex: 1 }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn-icon-only"
                                                                style={{ color: '#2196F3' }}
                                                                title="Xem chi tiết sản phẩm"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={line.orderedQty}
                                                            onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                                            min="1"
                                                            className="form-input"
                                                            style={{ textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={line.unitPrice}
                                                            onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                                                            min="0"
                                                            className="form-input"
                                                            style={{ textAlign: 'right' }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={line.note}
                                                            onChange={(e) => updateLine(index, 'note', e.target.value)}
                                                            placeholder="Nhập ghi chú"
                                                            className="form-input"
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLine(index)}
                                                            className="btn-icon-only"
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* 2. Nhân viên (Phải) */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Nhân viên</h2>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label htmlFor="creatorName" className="form-label">
                                        Nhân viên tạo
                                    </label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            id="creatorName"
                                            type="text"
                                            name="creatorName"
                                            value={formData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: 0 }}>
                                        Tự động lấy từ tài khoản đăng nhập
                                    </p>
                                </div>

                                {/* Nhân viên phụ trách */}
                                <div className="form-field">
                                    <label htmlFor="responsiblePersonName" className="form-label">
                                        Nhân viên phụ trách
                                    </label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            id="responsiblePersonName"
                                            type="text"
                                            name="responsiblePersonName"
                                            value={formData.responsiblePersonName}
                                            onChange={handleChange}
                                            placeholder="Chọn nhân viên phụ trách"
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                {/* Kho nhận */}
                                <div className="form-field">
                                    <label htmlFor="warehouseName" className="form-label">
                                        Kho nhận <span className="required-mark">*</span>
                                    </label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            id="warehouseName"
                                            type="text"
                                            name="warehouseName"
                                            value={formData.warehouseName}
                                            onChange={handleChange}
                                            placeholder="Chọn kho nhận"
                                            className={`form-input ${errors.warehouseName ? 'error' : ''}`}
                                        />
                                    </div>
                                    {errors.warehouseName && (
                                        <span className="error-message">{errors.warehouseName}</span>
                                    )}
                                </div>

                                {/* Ngày dự kiến nhập */}
                                <div className="form-field">
                                    <label htmlFor="expectedReceiptDate" className="form-label">
                                        Ngày dự kiến nhập
                                    </label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            id="expectedReceiptDate"
                                            type="date"
                                            name="expectedReceiptDate"
                                            value={formData.expectedReceiptDate}
                                            onChange={handleChange}
                                            className="form-input"
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
                                    <label htmlFor="supplierName" className="form-label">
                                        Nhà cung cấp <span className="required-mark">*</span>
                                    </label>
                                    <div className="input-wrapper">
                                        <Building2 className="input-icon" size={16} />
                                        <input
                                            id="supplierName"
                                            type="text"
                                            name="supplierName"
                                            value={formData.supplierName}
                                            onChange={handleChange}
                                            placeholder="Chọn nhà cung cấp"
                                            className={`form-input ${errors.supplierName ? 'error' : ''}`}
                                        />
                                    </div>
                                    {errors.supplierName && (
                                        <span className="error-message">{errors.supplierName}</span>
                                    )}
                                </div>
                            </div>

                            {/* 4. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="justification" className="form-label">
                                        Ghi chú / Lý do đặt hàng
                                    </label>
                                    <textarea
                                        id="justification"
                                        name="justification"
                                        value={formData.justification}
                                        onChange={handleChange}
                                        placeholder="Nhập lý do đặt hàng hoặc ghi chú bổ sung (tối đa 250 ký tự)"
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical' }}
                                    />
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'flex-end', 
                                        fontSize: '12px', 
                                        color: formData.justification.length >= MAX_JUSTIFICATION_LENGTH ? '#ef4444' : '#6b7280',
                                        marginTop: '4px',
                                        fontWeight: 500
                                    }}>
                                        {formData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            {/* 5. Tổng hợp */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label">Tổng số lượng</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                            {totalQuantity} sản phẩm
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Tạm tính</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                            {formatCurrency(subtotal)}
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="discount" className="form-label">
                                            Chiết khấu (%)
                                        </label>
                                        <input
                                            id="discount"
                                            type="number"
                                            name="discount"
                                            value={formData.discount}
                                            onChange={handleChange}
                                            min="0"
                                            max="100"
                                            className="form-input"
                                        />
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
                                    {/* Timeline item */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            width: '10px', 
                                            height: '10px', 
                                            borderRadius: '50%', 
                                            backgroundColor: '#2196F3',
                                            marginTop: '6px',
                                            flexShrink: 0
                                        }}></div>
                                        <div style={{ flex: 1, borderLeft: '2px solid #e5e7eb', paddingLeft: '16px', paddingBottom: '12px' }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                marginBottom: '8px',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                            }}>
                                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                                    {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span style={{ fontSize: '13px', color: '#6b7280' }}>0866563616</span>
                                                <span style={{ fontSize: '13px', color: '#2196F3', fontWeight: 600 }}>
                                                    Thêm mới đơn nhập hàng PO001
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                {new Date().toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default CreatePurchaseOrder;
