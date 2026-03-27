import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import {
    ArrowLeft,
    Plus,
    X,
    Warehouse,
    MapPin,
    Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';
import { createWarehouse } from '../lib/warehouseService';
import '../styles/CreateSupplier.css';

const CreateWarehouse = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        warehouseCode: '',
        warehouseName: '',
        address: '',
        isActive: true
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.warehouseCode.trim()) {
            newErrors.warehouseCode = 'Mã kho là bắt buộc';
        } else if (formData.warehouseCode.trim().length > 50) {
            newErrors.warehouseCode = 'Mã kho không được quá 50 ký tự';
        }

        if (!formData.warehouseName.trim()) {
            newErrors.warehouseName = 'Tên kho là bắt buộc';
        } else if (formData.warehouseName.trim().length > 255) {
            newErrors.warehouseName = 'Tên kho không được quá 255 ký tự';
        }

        if (formData.address && formData.address.trim().length > 500) {
            newErrors.address = 'Địa chỉ không được quá 500 ký tự';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                document.getElementsByName(firstErrorField)[0]?.focus();
            }
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                warehouseCode: formData.warehouseCode.trim(),
                warehouseName: formData.warehouseName.trim(),
                address: formData.address?.trim() || null,
                isActive: formData.isActive
            };

            console.log('Sending payload to API:', payload);

            await createWarehouse(payload);
            showToast('Tạo kho thành công!', 'success');
            setTimeout(() => {
                navigate(-1);
            }, 1500);
        } catch (error) {
            console.error('API Error:', error);
            const errorMessage = error?.response?.data?.message ||
                error?.response?.data?.Message ||
                error?.message ||
                'Có lỗi xảy ra khi tạo kho';
            showToast(errorMessage, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="create-supplier-page">
            {/* Thanh trên: Trái = Quay lại | Phải = Hủy + Tạo kho */}
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
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={() => document.getElementById('create-warehouse-form')?.requestSubmit()}
                    >
                        {submitting ? (
                            <>
                                <Loader size={16} className="btn-icon spinner" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Plus size={16} className="btn-icon" />
                                Tạo kho
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Card form */}
            <div className="form-card">
                <form id="create-warehouse-form" onSubmit={handleSubmit} className="form-wrapper">
                    {/* Tiêu đề và mô tả */}
                    <div className="form-card-intro">
                        <h1 className="page-title">Thêm mới kho</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Card 1: Thông tin kho */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin kho</h2>
                        </div>
                        <div className="form-grid">
                            {/* Mã kho */}
                            <div className="form-field">
                                <label htmlFor="warehouseCode" className="form-label">
                                    Mã kho <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <Warehouse className="input-icon" size={16} />
                                    <input
                                        id="warehouseCode"
                                        type="text"
                                        name="warehouseCode"
                                        value={formData.warehouseCode}
                                        onChange={handleChange}
                                        placeholder="Nhập mã kho"
                                        className={`form-input ${errors.warehouseCode ? 'error' : ''}`}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.warehouseCode && (
                                    <span className="error-message" role="alert">{errors.warehouseCode}</span>
                                )}
                            </div>

                            {/* Tên kho */}
                            <div className="form-field">
                                <label htmlFor="warehouseName" className="form-label">
                                    Tên kho <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <Warehouse className="input-icon" size={16} />
                                    <input
                                        id="warehouseName"
                                        type="text"
                                        name="warehouseName"
                                        value={formData.warehouseName}
                                        onChange={handleChange}
                                        placeholder="Nhập tên kho"
                                        className={`form-input ${errors.warehouseName ? 'error' : ''}`}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.warehouseName && (
                                    <span className="error-message" role="alert">{errors.warehouseName}</span>
                                )}
                            </div>

                            {/* Địa chỉ */}
                            <div className="form-field span-2">
                                <label htmlFor="address" className="form-label">Địa chỉ</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <input
                                        id="address"
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Nhập địa chỉ kho"
                                        className={`form-input ${errors.address ? 'error' : ''}`}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.address && (
                                    <span className="error-message" role="alert">{errors.address}</span>
                                )}
                            </div>

                            {/* Trạng thái hoạt động */}
                            <div className="form-field">
                                <label className="toggle-container">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        className="toggle-checkbox"
                                    />
                                    <span className="toggle-slider"></span>
                                    <span className="toggle-label">Hoạt động</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={clearToast}
                />
            )}
        </div>
    );
};

export default CreateWarehouse;
